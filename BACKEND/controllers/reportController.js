const db = require('../config/db');
const reportUtils = require('../utils/reportUtils');

/**
 * Generate a comprehensive sales report with timeline data
 */
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, aggregation = 'daily' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ 
        message: 'Start date must be before end date'
      });
    }
    
    // Validate aggregation
    const validAggregations = ['daily', 'weekly', 'monthly'];
    if (!validAggregations.includes(aggregation)) {
      return res.status(400).json({ 
        message: 'Invalid aggregation. Valid values are: daily, weekly, monthly'
      });
    }
    
    // Calculate previous period dates for comparison
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const durationMs = endDateObj - startDateObj;
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    
    const prevStartDateObj = new Date(startDateObj);
    prevStartDateObj.setDate(prevStartDateObj.getDate() - durationDays);
    const prevEndDateObj = new Date(startDateObj);
    prevEndDateObj.setDate(prevEndDateObj.getDate() - 1);
    
    const prevStartDate = prevStartDateObj.toISOString().split('T')[0];
    const prevEndDate = prevEndDateObj.toISOString().split('T')[0];
    
    // Get current period sales data
    const currentPeriodData = await getSalesData(startDate, endDate, aggregation);
    
    // Get previous period data for comparison
    const previousPeriodData = await getSalesData(prevStartDate, prevEndDate, 'total');
    
    // Get revenue breakdown by order type
    const revenueByTypeQuery = `
      SELECT order_type, SUM(total_amount) as revenue 
      FROM orders 
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
      GROUP BY order_type
    `;
    
    const [revenueByTypeRows] = await db.promise().query(revenueByTypeQuery, [startDate, endDate]);
    
    // Format revenue by type
    const revenueByType = {};
    revenueByTypeRows.forEach(row => {
      revenueByType[row.order_type] = parseFloat(row.revenue);
    });
    
    // Get top selling items
    const topItemsQuery = `
      SELECT 
        m.menu_id, 
        m.menu_name as item_name, 
        c.category_name as category,
        SUM(oi.quantity) as quantity, 
        SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menu m ON oi.menu_id = m.menu_id
      LEFT JOIN categories c ON m.category_code = c.category_code
      WHERE o.created_at BETWEEN ? AND ?
      AND o.order_status != 'Cancelled'
      GROUP BY m.menu_id
      ORDER BY quantity DESC
      LIMIT 10
    `;
    
    const [topItemsRows] = await db.promise().query(topItemsQuery, [startDate, endDate]);
    
    // Compile final report
    const report = {
      period: {
        startDate,
        endDate,
        durationDays: Math.ceil(durationDays)
      },
      totalSales: parseFloat(currentPeriodData.totalSales || 0),
      totalOrders: parseInt(currentPeriodData.totalOrders || 0),
      previousPeriodSales: parseFloat(previousPeriodData.totalSales || 0),
      previousPeriodOrders: parseInt(previousPeriodData.totalOrders || 0),
      salesTimeline: currentPeriodData.timeline || [],
      topItems: topItemsRows,
      revenueByType
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ 
      message: 'Error generating sales report', 
      error: error.message
    });
  }
};

/**
 * Get a summary of sales metrics
 */
exports.getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    const query = `
      SELECT 
        COUNT(*) as totalOrders,
        SUM(total_amount) as totalSales,
        AVG(total_amount) as averageOrderValue,
        COUNT(DISTINCT user_id) as uniqueCustomers,
        SUM(CASE WHEN order_status = 'Completed' THEN 1 ELSE 0 END) as completedOrders,
        SUM(CASE WHEN order_status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledOrders,
        SUM(CASE WHEN order_type = 'Dine-in' THEN 1 ELSE 0 END) as dineInOrders,
        SUM(CASE WHEN order_type = 'Takeaway' THEN 1 ELSE 0 END) as takeawayOrders,
        SUM(CASE WHEN order_type = 'Delivery' THEN 1 ELSE 0 END) as deliveryOrders,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paidOrders,
        SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) as unpaidOrders
      FROM orders
      WHERE created_at BETWEEN ? AND ?
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No sales data found for the selected period' });
    }
    
    // Format the data
    const summary = {
      totalOrders: parseInt(rows[0].totalOrders || 0),
      totalSales: parseFloat(rows[0].totalSales || 0),
      averageOrderValue: parseFloat(rows[0].averageOrderValue || 0),
      uniqueCustomers: parseInt(rows[0].uniqueCustomers || 0),
      completedOrders: parseInt(rows[0].completedOrders || 0),
      cancelledOrders: parseInt(rows[0].cancelledOrders || 0),
      orderTypes: {
        dineIn: parseInt(rows[0].dineInOrders || 0),
        takeaway: parseInt(rows[0].takeawayOrders || 0),
        delivery: parseInt(rows[0].deliveryOrders || 0)
      },
      paymentStatus: {
        paid: parseInt(rows[0].paidOrders || 0),
        unpaid: parseInt(rows[0].unpaidOrders || 0)
      }
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error generating sales summary:', error);
    res.status(500).json({ 
      message: 'Error generating sales summary', 
      error: error.message
    });
  }
};

/**
 * Get sales data grouped by menu category
 */
exports.getSalesByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    const query = `
      SELECT 
        c.category_code,
        c.category_name,
        SUM(oi.quantity) as totalQuantity,
        SUM(oi.quantity * oi.price) as totalSales,
        COUNT(DISTINCT o.order_id) as orderCount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menu m ON oi.menu_id = m.menu_id
      JOIN categories c ON m.category_code = c.category_code
      WHERE o.created_at BETWEEN ? AND ?
      AND o.order_status != 'Cancelled'
      GROUP BY c.category_code
      ORDER BY totalSales DESC
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate]);
    
    // Get total sales for calculating percentages
    const totalSalesQuery = `
      SELECT SUM(total_amount) as totalSales
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
    `;
    
    const [totalSalesRows] = await db.promise().query(totalSalesQuery, [startDate, endDate]);
    const totalSales = parseFloat(totalSalesRows[0].totalSales || 0);
    
    // Format the data with percentages
    const categorySales = rows.map(row => ({
      categoryId: row.category_code,
      categoryName: row.category_name,
      totalQuantity: parseInt(row.totalQuantity),
      totalSales: parseFloat(row.totalSales),
      orderCount: parseInt(row.orderCount),
      percentage: totalSales > 0 ? (parseFloat(row.totalSales) / totalSales * 100).toFixed(2) : 0
    }));
    
    res.json({
      totalSales,
      categorySales
    });
  } catch (error) {
    console.error('Error getting sales by category:', error);
    res.status(500).json({ 
      message: 'Error getting sales by category', 
      error: error.message
    });
  }
};

/**
 * Get sales data grouped by payment method
 */
exports.getSalesByPaymentMethod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    const query = `
      SELECT 
        payment_type,
        COUNT(*) as orderCount,
        SUM(total_amount) as totalSales
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
      GROUP BY payment_type
      ORDER BY totalSales DESC
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate]);
    
    // Get total sales for calculating percentages
    const totalSalesQuery = `
      SELECT SUM(total_amount) as totalSales
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
    `;
    
    const [totalSalesRows] = await db.promise().query(totalSalesQuery, [startDate, endDate]);
    const totalSales = parseFloat(totalSalesRows[0].totalSales || 0);
    
    // Format the data with percentages
    const paymentMethodSales = rows.map(row => ({
      paymentMethod: row.payment_type || 'Unknown',
      orderCount: parseInt(row.orderCount),
      totalSales: parseFloat(row.totalSales),
      percentage: totalSales > 0 ? (parseFloat(row.totalSales) / totalSales * 100).toFixed(2) : 0
    }));
    
    res.json({
      totalSales,
      paymentMethodSales
    });
  } catch (error) {
    console.error('Error getting sales by payment method:', error);
    res.status(500).json({ 
      message: 'Error getting sales by payment method', 
      error: error.message
    });
  }
};

/**
 * Get sales data grouped by order type (Dine-in, Takeaway, Delivery)
 */
exports.getSalesByOrderType = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    const query = `
      SELECT 
        order_type,
        COUNT(*) as orderCount,
        SUM(total_amount) as totalSales,
        AVG(total_amount) as averageOrderValue
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
      GROUP BY order_type
      ORDER BY totalSales DESC
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate]);
    
    // Get total sales for calculating percentages
    const totalSalesQuery = `
      SELECT SUM(total_amount) as totalSales, COUNT(*) as totalOrders
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
    `;
    
    const [totalSalesRows] = await db.promise().query(totalSalesQuery, [startDate, endDate]);
    const totalSales = parseFloat(totalSalesRows[0].totalSales || 0);
    const totalOrders = parseInt(totalSalesRows[0].totalOrders || 0);
    
    // Format the data with percentages
    const orderTypeSales = rows.map(row => ({
      orderType: row.order_type,
      orderCount: parseInt(row.orderCount),
      totalSales: parseFloat(row.totalSales),
      averageOrderValue: parseFloat(row.averageOrderValue),
      percentageOfSales: totalSales > 0 ? (parseFloat(row.totalSales) / totalSales * 100).toFixed(2) : 0,
      percentageOfOrders: totalOrders > 0 ? (parseInt(row.orderCount) / totalOrders * 100).toFixed(2) : 0
    }));
    
    res.json({
      totalSales,
      totalOrders,
      orderTypeSales
    });
  } catch (error) {
    console.error('Error getting sales by order type:', error);
    res.status(500).json({ 
      message: 'Error getting sales by order type', 
      error: error.message
    });
  }
};

/**
 * Get menu items report with sales data
 */
exports.getMenuItemsReport = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100, categoryCode } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    // Build the query based on whether a category filter is provided
    let query = `
      SELECT 
        m.menu_id, 
        m.menu_name as item_name, 
        c.category_name as category,
        sc.subcategory_name as subcategory,
        SUM(oi.quantity) as quantity, 
        SUM(oi.quantity * oi.price) as revenue,
        COUNT(DISTINCT o.order_id) as orderCount,
        AVG(oi.price) as averagePrice
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menu m ON oi.menu_id = m.menu_id
      LEFT JOIN categories c ON m.category_code = c.category_code
      LEFT JOIN subcategories sc ON m.subcategory_code = sc.subcategory_code
      WHERE o.created_at BETWEEN ? AND ?
      AND o.order_status != 'Cancelled'
    `;
    
    let queryParams = [startDate, endDate];
    
    if (categoryCode) {
      query += ` AND m.category_code = ?`;
      queryParams.push(categoryCode);
    }
    
    query += `
      GROUP BY m.menu_id
      ORDER BY revenue DESC
      LIMIT ?
    `;
    
    queryParams.push(parseInt(limit));
    
    const [rows] = await db.promise().query(query, queryParams);
    
    // Get current period totals for comparison
    const currentPeriodData = await getSalesData(startDate, endDate, 'total');
    
    // Calculate previous period for comparison
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const durationMs = endDateObj - startDateObj;
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    
    const prevStartDateObj = new Date(startDateObj);
    prevStartDateObj.setDate(prevStartDateObj.getDate() - durationDays);
    const prevEndDateObj = new Date(startDateObj);
    prevEndDateObj.setDate(prevEndDateObj.getDate() - 1);
    
    const prevStartDate = prevStartDateObj.toISOString().split('T')[0];
    const prevEndDate = prevEndDateObj.toISOString().split('T')[0];
    
    // Get previous period data
    const previousPeriodData = await getSalesData(prevStartDate, prevEndDate, 'total');
    
    // Get category distribution
    const categoryQuery = `
      SELECT 
        c.category_name,
        SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menu m ON oi.menu_id = m.menu_id
      JOIN categories c ON m.category_code = c.category_code
      WHERE o.created_at BETWEEN ? AND ?
      AND o.order_status != 'Cancelled'
      GROUP BY c.category_name
      ORDER BY revenue DESC
    `;
    
    const [categoryRows] = await db.promise().query(categoryQuery, [startDate, endDate]);
    
    // Format category breakdown
    const categoryBreakdown = {};
    categoryRows.forEach(row => {
      categoryBreakdown[row.category_name] = parseFloat(row.revenue);
    });
    
    // Format response
    const report = {
      period: {
        startDate,
        endDate,
        durationDays: Math.ceil(durationDays)
      },
      totalSales: parseFloat(currentPeriodData.totalSales || 0),
      totalOrders: parseInt(currentPeriodData.totalOrders || 0),
      previousPeriodSales: parseFloat(previousPeriodData.totalSales || 0),
      previousPeriodOrders: parseInt(previousPeriodData.totalOrders || 0),
      topItems: rows,
      categoryBreakdown
    };
    
    res.json(report);
  } catch (error) {
    console.error('Error generating menu items report:', error);
    res.status(500).json({ 
      message: 'Error generating menu items report', 
      error: error.message
    });
  }
};

/**
 * Get top selling menu items
 */
exports.getTopSellingItems = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10, sortBy = 'quantity' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    // Validate sortBy parameter
    const validSortFields = ['quantity', 'revenue', 'orderCount'];
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        message: `Invalid sortBy parameter. Valid values are: ${validSortFields.join(', ')}`
      });
    }
    
    const query = `
      SELECT 
        m.menu_id, 
        m.menu_name, 
        c.category_name,
        SUM(oi.quantity) as quantity, 
        SUM(oi.quantity * oi.price) as revenue,
        COUNT(DISTINCT o.order_id) as orderCount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN menu m ON oi.menu_id = m.menu_id
      LEFT JOIN categories c ON m.category_code = c.category_code
      WHERE o.created_at BETWEEN ? AND ?
      AND o.order_status != 'Cancelled'
      GROUP BY m.menu_id
      ORDER BY ${sortBy} DESC
      LIMIT ?
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate, parseInt(limit)]);
    
    res.json(rows);
  } catch (error) {
    console.error('Error getting top selling items:', error);
    res.status(500).json({ 
      message: 'Error getting top selling items', 
      error: error.message
    });
  }
};

/**
 * Get daily sales report
 */
exports.getDailyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orderCount,
        SUM(total_amount) as totalSales,
        AVG(total_amount) as averageOrderValue,
        SUM(CASE WHEN order_type = 'Dine-in' THEN 1 ELSE 0 END) as dineInOrders,
        SUM(CASE WHEN order_type = 'Takeaway' THEN 1 ELSE 0 END) as takeawayOrders,
        SUM(CASE WHEN order_type = 'Delivery' THEN 1 ELSE 0 END) as deliveryOrders
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate]);
    
    // Format for timeline display
    const timeline = rows.map(row => ({
      date: row.date,
      orders: parseInt(row.orderCount),
      amount: parseFloat(row.totalSales),
      averageOrderValue: parseFloat(row.averageOrderValue),
      orderTypes: {
        dineIn: parseInt(row.dineInOrders),
        takeaway: parseInt(row.takeawayOrders),
        delivery: parseInt(row.deliveryOrders)
      }
    }));
    
    res.json(timeline);
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ 
      message: 'Error generating daily report', 
      error: error.message
    });
  }
};

/**
 * Get weekly sales report
 */
exports.getWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    const query = `
      SELECT 
        YEARWEEK(created_at, 1) as yearWeek,
        MIN(DATE(created_at)) as weekStart,
        MAX(DATE(created_at)) as weekEnd,
        COUNT(*) as orderCount,
        SUM(total_amount) as totalSales,
        AVG(total_amount) as averageOrderValue,
        SUM(CASE WHEN order_type = 'Dine-in' THEN 1 ELSE 0 END) as dineInOrders,
        SUM(CASE WHEN order_type = 'Takeaway' THEN 1 ELSE 0 END) as takeawayOrders,
        SUM(CASE WHEN order_type = 'Delivery' THEN 1 ELSE 0 END) as deliveryOrders
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
      GROUP BY YEARWEEK(created_at, 1)
      ORDER BY yearWeek
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate]);
    
    // Format for timeline display
    const timeline = rows.map(row => ({
      yearWeek: row.yearWeek,
      weekStart: row.weekStart,
      weekEnd: row.weekEnd,
      date: `${row.weekStart} - ${row.weekEnd}`,
      orders: parseInt(row.orderCount),
      amount: parseFloat(row.totalSales),
      averageOrderValue: parseFloat(row.averageOrderValue),
      orderTypes: {
        dineIn: parseInt(row.dineInOrders),
        takeaway: parseInt(row.takeawayOrders),
        delivery: parseInt(row.deliveryOrders)
      }
    }));
    
    res.json(timeline);
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ 
      message: 'Error generating weekly report', 
      error: error.message
    });
  }
};

/**
 * Get monthly sales report
 */
exports.getMonthlyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    const query = `
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        MIN(DATE(created_at)) as monthStart,
        MAX(DATE(created_at)) as monthEnd,
        COUNT(*) as orderCount,
        SUM(total_amount) as totalSales,
        AVG(total_amount) as averageOrderValue,
        SUM(CASE WHEN order_type = 'Dine-in' THEN 1 ELSE 0 END) as dineInOrders,
        SUM(CASE WHEN order_type = 'Takeaway' THEN 1 ELSE 0 END) as takeawayOrders,
        SUM(CASE WHEN order_type = 'Delivery' THEN 1 ELSE 0 END) as deliveryOrders
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `;
    
    const [rows] = await db.promise().query(query, [startDate, endDate]);
    
    // Format for timeline display
    const timeline = rows.map(row => ({
      month: row.month,
      monthStart: row.monthStart,
      monthEnd: row.monthEnd,
      date: reportUtils.formatMonthYear(row.month),
      orders: parseInt(row.orderCount),
      amount: parseFloat(row.totalSales),
      averageOrderValue: parseFloat(row.averageOrderValue),
      orderTypes: {
        dineIn: parseInt(row.dineInOrders),
        takeaway: parseInt(row.takeawayOrders),
        delivery: parseInt(row.deliveryOrders)
      }
    }));
    
    res.json(timeline);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ 
      message: 'Error generating monthly report', 
      error: error.message
    });
  }
};

/**
 * Helper function to get sales data for a specific time period
 */
async function getSalesData(startDate, endDate, aggregation) {
  try {
    // Get total sales and orders for the period
    const totalQuery = `
      SELECT 
        SUM(total_amount) as totalSales,
        COUNT(*) as totalOrders
      FROM orders
      WHERE created_at BETWEEN ? AND ?
      AND order_status != 'Cancelled'
    `;
    
    const [totalRows] = await db.promise().query(totalQuery, [startDate, endDate]);
    
    // If only totals are needed, return them
    if (aggregation === 'total') {
      return {
        totalSales: parseFloat(totalRows[0].totalSales || 0),
        totalOrders: parseInt(totalRows[0].totalOrders || 0)
      };
    }
    
    // Get sales timeline data based on aggregation
    let timelineQuery;
    
    if (aggregation === 'daily') {
      timelineQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orderCount,
          SUM(total_amount) as totalSales
        FROM orders
        WHERE created_at BETWEEN ? AND ?
        AND order_status != 'Cancelled'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
    } else if (aggregation === 'weekly') {
      timelineQuery = `
        SELECT 
          YEARWEEK(created_at, 1) as yearWeek,
          MIN(DATE(created_at)) as weekStart,
          MAX(DATE(created_at)) as weekEnd,
          COUNT(*) as orderCount,
          SUM(total_amount) as totalSales
        FROM orders
        WHERE created_at BETWEEN ? AND ?
        AND order_status != 'Cancelled'
        GROUP BY YEARWEEK(created_at, 1)
        ORDER BY yearWeek
      `;
    } else if (aggregation === 'monthly') {
      timelineQuery = `
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          MIN(DATE(created_at)) as monthStart,
          MAX(DATE(created_at)) as monthEnd,
          COUNT(*) as orderCount,
          SUM(total_amount) as totalSales
        FROM orders
        WHERE created_at BETWEEN ? AND ?
        AND order_status != 'Cancelled'
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month
      `;
    }
    
    const [timelineRows] = await db.promise().query(timelineQuery, [startDate, endDate]);
    
    // Format timeline data based on aggregation
    let timeline;
    
    if (aggregation === 'daily') {
      timeline = timelineRows.map(row => ({
        date: row.date,
        orders: parseInt(row.orderCount),
        amount: parseFloat(row.totalSales)
      }));
    } else if (aggregation === 'weekly') {
      timeline = timelineRows.map(row => ({
        date: `${row.weekStart} - ${row.weekEnd}`,
        orders: parseInt(row.orderCount),
        amount: parseFloat(row.totalSales)
      }));
    } else if (aggregation === 'monthly') {
      timeline = timelineRows.map(row => ({
        date: reportUtils.formatMonthYear(row.month),
        orders: parseInt(row.orderCount),
        amount: parseFloat(row.totalSales)
      }));
    }
    
    return {
      totalSales: parseFloat(totalRows[0].totalSales || 0),
      totalOrders: parseInt(totalRows[0].totalOrders || 0),
      timeline
    };
  } catch (error) {
    console.error('Error in getSalesData helper:', error);
    throw error;
  }
}
