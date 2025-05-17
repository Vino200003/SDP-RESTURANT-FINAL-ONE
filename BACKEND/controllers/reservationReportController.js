const db = require('../config/db');

/**
 * Get reservations report data with different aggregation options
 */
exports.getReservationsReport = async (req, res) => {
  try {
    const { startDate, endDate, aggregation = 'daily' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required'
      });
    }
    
    // Validate aggregation
    const validAggregations = ['daily', 'weekly', 'monthly'];
    if (!validAggregations.includes(aggregation)) {
      return res.status(400).json({ 
        message: 'Invalid aggregation. Valid values are: daily, weekly, monthly'
      });
    }
    
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
    
    // Get total reservations for current period
    const totalQuery = `
      SELECT COUNT(*) as totalReservations
      FROM reservations
      WHERE DATE(date_time) BETWEEN ? AND ?
    `;
    
    const [totalRows] = await db.promise().query(totalQuery, [startDate, endDate]);
    const totalReservations = parseInt(totalRows[0].totalReservations || 0);
    
    // Get total reservations for previous period
    const prevTotalQuery = `
      SELECT COUNT(*) as totalReservations
      FROM reservations
      WHERE DATE(date_time) BETWEEN ? AND ?
    `;
    
    const [prevTotalRows] = await db.promise().query(prevTotalQuery, [prevStartDate, prevEndDate]);
    const previousPeriodReservations = parseInt(prevTotalRows[0].totalReservations || 0);
    
    // Get reservations timeline with appropriate aggregation
    let timelineQuery;
    if (aggregation === 'daily') {
      timelineQuery = `
        SELECT 
          DATE(date_time) as date,
          COUNT(*) as reservations
        FROM reservations
        WHERE DATE(date_time) BETWEEN ? AND ?
        GROUP BY DATE(date_time)
        ORDER BY date
      `;
    } else if (aggregation === 'weekly') {
      timelineQuery = `
        SELECT 
          CONCAT(DATE(MIN(date_time)), ' - ', DATE(MAX(date_time))) as date,
          COUNT(*) as reservations
        FROM reservations
        WHERE DATE(date_time) BETWEEN ? AND ?
        GROUP BY YEARWEEK(date_time, 1)
        ORDER BY MIN(date_time)
      `;
    } else if (aggregation === 'monthly') {
      timelineQuery = `
        SELECT 
          DATE_FORMAT(date_time, '%Y-%m') as month,
          CONCAT(DATE_FORMAT(MIN(date_time), '%Y-%m-%d'), ' - ', 
                DATE_FORMAT(MAX(date_time), '%Y-%m-%d')) as date,
          COUNT(*) as reservations
        FROM reservations
        WHERE DATE(date_time) BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(date_time, '%Y-%m')
        ORDER BY month
      `;
    }
    
    const [timelineRows] = await db.promise().query(timelineQuery, [startDate, endDate]);
    
    // Get reservations by table
    const byTableQuery = `
      SELECT 
        table_no,
        COUNT(*) as reservationCount
      FROM reservations
      WHERE DATE(date_time) BETWEEN ? AND ?
      GROUP BY table_no
      ORDER BY reservationCount DESC
    `;
    
    const [reservationsByTable] = await db.promise().query(byTableQuery, [startDate, endDate]);
    
    // Get reservations by time of day
    const byTimeQuery = `
      SELECT 
        CASE
          WHEN HOUR(date_time) BETWEEN 6 AND 11 THEN 'Morning (6AM-12PM)'
          WHEN HOUR(date_time) BETWEEN 12 AND 16 THEN 'Afternoon (12PM-5PM)'
          WHEN HOUR(date_time) BETWEEN 17 AND 21 THEN 'Evening (5PM-10PM)'
          ELSE 'Night (10PM-6AM)'
        END AS time_of_day,
        COUNT(*) as reservationCount
      FROM reservations
      WHERE DATE(date_time) BETWEEN ? AND ?
      GROUP BY time_of_day
      ORDER BY FIELD(time_of_day, 'Morning (6AM-12PM)', 'Afternoon (12PM-5PM)', 'Evening (5PM-10PM)', 'Night (10PM-6AM)')
    `;
    
    const [reservationsByTimeOfDay] = await db.promise().query(byTimeQuery, [startDate, endDate]);
    
    // Format response for frontend
    const response = {
      totalReservations,
      previousPeriodReservations,
      averageReservationsPerDay: totalReservations / Math.max(1, Math.ceil(durationDays)),
      salesTimeline: timelineRows, // Using salesTimeline for frontend compatibility
      reservationsByTable,
      reservationsByTimeOfDay,
      period: {
        startDate,
        endDate,
        durationDays: Math.ceil(durationDays)
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error generating reservations report:', error);
    res.status(500).json({ 
      message: 'Error generating reservations report', 
      error: error.message
    });
  }
};
