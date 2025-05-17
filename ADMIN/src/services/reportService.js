import { API_URL } from './menuService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to get admin token
const getAdminToken = () => {
  return localStorage.getItem('adminToken');
};

// Helper function to format date - ensure consistent date format without time
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

// Add helper for cleaning timeline data to remove time components
const cleanTimelineData = (data) => {
  if (!data || !data.timeline) return data;
  
  // Process timeline data to ensure dates don't have time components
  data.timeline = data.timeline.map(item => ({
    ...item,
    date: item.date.includes(' ') ? item.date.split(' ')[0] : item.date
  }));
  
  // Also clean salesTimeline if it exists
  if (data.salesTimeline) {
    data.salesTimeline = data.salesTimeline.map(item => ({
      ...item,
      date: item.date.includes(' ') ? item.date.split(' ')[0] : item.date
    }));
  }
  
  return data;
};

// Get sales report data
export const getSalesReport = async (startDate, endDate, aggregation = 'daily') => {
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      aggregation
    });
    
    const response = await fetch(`${API_URL}/admin/reports/sales?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch sales report');
    }
    
    const data = await response.json();
    return cleanTimelineData(data);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    // Return mock data in case of error (for development)
    return cleanTimelineData(getMockSalesReportData(startDate, endDate, aggregation));
  }
};

// Get menu items report data
export const getMenuItemsReport = async (startDate, endDate) => {
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const queryParams = new URLSearchParams({
      startDate,
      endDate
    });
    
    const response = await fetch(`${API_URL}/admin/reports/menu-items?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch menu items report');
    }
    
    const data = await response.json();
    return cleanTimelineData(data);
  } catch (error) {
    console.error('Error fetching menu items report:', error);
    // Return mock data in case of error (for development)
    return cleanTimelineData(getMockMenuItemsReportData());
  }
};

// Get reservations report data
export const getReservationsReport = async (startDate, endDate, aggregation = 'daily') => {
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
      aggregation
    });
    
    const response = await fetch(`${API_URL}/admin/reports/reservations?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch reservations report');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching reservations report:', error);
    // Return mock data for development
    return getMockReservationsReportData(startDate, endDate, aggregation);
  }
};

// Export report as PDF - Updated to include charts
export const exportAsPDF = (reportData, reportType, dateRange, chartRefs) => {
  try {
    // Create new jsPDF instance
    const doc = new jsPDF();
    
    // Add title
    const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
    const subtitle = `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(12);
    doc.text(subtitle, 14, 32);
    
    // Add summary section
    doc.setFontSize(14);
    doc.text('Summary', 14, 45);
    
    // Format summary data based on report type
    let summaryData;
    
    if (reportType === 'reservations') {
      // For reservations, only show reservation-specific metrics
      summaryData = [
        ['Total Reservations', `${reportData.totalReservations || 0}`],
        ['Avg. Daily Reservations', `${(reportData.averageReservationsPerDay || 0).toFixed(1)}`],
        ['Period Duration', `${reportData.period?.durationDays || 0} days`]
      ];
    } else {
      // For other reports, use existing summary format with sales data
      const totalSales = typeof reportData.totalSales === 'number' ? reportData.totalSales.toFixed(2) : '0.00';
      const totalOrders = reportData.totalOrders || 0;
      const avgOrderValue = totalOrders > 0 ? (reportData.totalSales / totalOrders).toFixed(2) : '0.00';
      
      summaryData = [
        ['Total Sales', `Rs. ${totalSales}`],
        ['Total Orders', `${totalOrders}`],
        ['Average Order Value', `Rs. ${avgOrderValue}`]
      ];
    }
    
    // Add summary table
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [75, 75, 75] }
    });
    
    let currentY = doc.lastAutoTable.finalY + 15;
    
    // Add charts if provided
    if (chartRefs && chartRefs.salesChart && chartRefs.salesChart.current) {
      try {
        // Convert sales chart to image
        const salesChartImg = chartRefs.salesChart.current.toDataURL('image/png');
        doc.setFontSize(14);
        doc.text('Sales Chart', 14, currentY);
        
        // Add sales chart image to PDF
        doc.addImage(
          salesChartImg, 
          'PNG', 
          15, // x position
          currentY + 5, // y position
          180, // width
          90  // height
        );
        
        currentY += 100; // Move down for next section
        
        // Add category chart if available
        if (chartRefs.categoryChart && chartRefs.categoryChart.current) {
          const categoryChartImg = chartRefs.categoryChart.current.toDataURL('image/png');
          doc.setFontSize(14);
          doc.text('Revenue by Order Type', 14, currentY);
          
          // Add category chart image to PDF
          doc.addImage(
            categoryChartImg, 
            'PNG', 
            50, // x position (centered)
            currentY + 5, // y position
            100, // width
            100 // height
          );
          
          currentY += 110; // Move down for next section
        }
        
        // Add page break if needed
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
      } catch (chartErr) {
        console.error('Error adding charts to PDF:', chartErr);
        // Continue without charts if there's an error
      }
    }
    
    // Customize the table data based on report type
    if (reportType === 'reservations') {
      if (reportData.salesTimeline && reportData.salesTimeline.length > 0) {
        doc.setFontSize(14);
        doc.text('Reservations Timeline', 14, currentY);
        
        const timelineHeaders = ['Date', 'Reservations'];
        const timelineData = reportData.salesTimeline.map(day => [
          day.date || '',
          day.reservations || 0
        ]);
        
        autoTable(doc, {
          startY: currentY + 5,
          head: [timelineHeaders],
          body: timelineData,
          theme: 'grid',
          headStyles: { fillColor: [75, 75, 75] },
          margin: { top: 10 }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
      }
      
      // Add table reservations if available
      if (reportData.reservationsByTable && reportData.reservationsByTable.length > 0) {
        doc.setFontSize(14);
        doc.text('Reservations by Table', 14, currentY);
        
        const tableHeaders = ['Table', 'Reservations', 'Percentage'];
        const tableData = reportData.reservationsByTable.map(item => [
          `Table ${item.table_no}`,
          item.reservationCount,
          `${((item.reservationCount / reportData.totalReservations) * 100).toFixed(1)}%`
        ]);
        
        autoTable(doc, {
          startY: currentY + 5,
          head: [tableHeaders],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [75, 75, 75] },
          margin: { top: 10 }
        });
      }
    } else {
      // For other report types, use existing code
      if (reportData.salesTimeline && reportData.salesTimeline.length > 0) {
        doc.setFontSize(14);
        doc.text('Sales Timeline', 14, currentY);
        
        const timelineHeaders = ['Date', 'Orders', 'Sales (Rs)'];
        const timelineData = reportData.salesTimeline.map(day => [
          // Ensure no time component in the date
          day.date ? (day.date.includes(' ') ? day.date.split(' ')[0] : day.date) : '',
          day.orders || 0,
          (parseFloat(day.amount) || 0).toFixed(2)
        ]);
        
        autoTable(doc, {
          startY: currentY + 5,
          head: [timelineHeaders],
          body: timelineData,
          theme: 'grid',
          headStyles: { fillColor: [75, 75, 75] },
          margin: { top: 10 }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;
      }
      
      // Add top items if available
      if (reportData.topItems && reportData.topItems.length > 0) {
        doc.setFontSize(14);
        doc.text('Top Selling Items', 14, currentY);
        
        const itemsHeaders = ['Item Name', 'Quantity', 'Revenue (Rs)'];
        const itemsData = reportData.topItems.map(item => {
          // Convert revenue to number safely before calling toFixed
          const revenue = parseFloat(item.revenue) || 0;
          
          return [
            item.item_name || item.menu_name || '',
            parseInt(item.quantity) || 0,
            revenue.toFixed(2)
          ];
        });
        
        autoTable(doc, {
          startY: currentY + 5,
          head: [itemsHeaders],
          body: itemsData,
          theme: 'grid',
          headStyles: { fillColor: [75, 75, 75] },
          margin: { top: 10 }
        });
      }
    }
    
    // Save the PDF
    doc.save(`${reportType}-report-${dateRange.startDate}-to-${dateRange.endDate}.pdf`);
    
    console.log('PDF exported successfully');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Failed to export PDF. See console for details.');
  }
};

// Export report as CSV
export const exportAsCSV = (reportData, reportType) => {
  // Create CSV content
  let csvContent = '';
  
  // Add summary data
  csvContent += 'Summary\n';
  csvContent += `Total Sales,${reportData.totalSales}\n`;
  csvContent += `Total Orders,${reportData.totalOrders}\n`;
  csvContent += `Average Order Value,${reportData.totalOrders > 0 ? reportData.totalSales / reportData.totalOrders : 0}\n\n`;
  
  if (reportType === 'reservations' && reportData.totalReservations !== undefined) {
    csvContent += `Total Reservations,${reportData.totalReservations}\n\n`;
  }
  
  // Add sales timeline
  csvContent += 'Sales Timeline\n';
  csvContent += 'Date,Orders,Sales\n';
  
  reportData.salesTimeline.forEach(day => {
    // Ensure no time component in the date
    const date = day.date ? (day.date.includes(' ') ? day.date.split(' ')[0] : day.date) : '';
    csvContent += `${date},${day.orders},${day.amount}\n`;
  });
  
  // Add top items if available
  if (reportData.topItems && reportData.topItems.length > 0) {
    csvContent += '\nTop Selling Items\n';
    csvContent += 'Item Name,Quantity Sold,Revenue\n';
    
    reportData.topItems.forEach(item => {
      csvContent += `${item.item_name || item.menu_name},${item.quantity},${item.revenue}\n`;
    });
  }
  
  // Add revenue by type if available
  if (reportData.revenueByType && Object.keys(reportData.revenueByType).length > 0) {
    csvContent += '\nRevenue by Order Type\n';
    csvContent += 'Order Type,Revenue,Percentage\n';
    
    Object.entries(reportData.revenueByType).forEach(([type, revenue]) => {
      const percentage = (revenue / reportData.totalSales * 100).toFixed(1);
      csvContent += `${type},${revenue},${percentage}%\n`;
    });
  }
  
  // Create and download CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${reportType}-report.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Mock data generators for development and testing - keeping these as fallbacks
function getMockSalesReportData(startDate, endDate, aggregation) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Generate daily data between start and end dates
  const salesTimeline = [];
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    // Random data for each day
    const amount = Math.floor(Math.random() * 20000) + 5000;
    const orders = Math.floor(Math.random() * 50) + 10;
    
    salesTimeline.push({
      date: currentDate.toISOString().split('T')[0],
      amount,
      orders
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate totals
  const totalSales = salesTimeline.reduce((sum, day) => sum + day.amount, 0);
  const totalOrders = salesTimeline.reduce((sum, day) => sum + day.orders, 0);
  
  // Generate mock data for previous period
  const previousPeriodSales = totalSales * (Math.random() * 0.4 + 0.8); // 80% to 120% of current
  const previousPeriodOrders = totalOrders * (Math.random() * 0.4 + 0.8); // 80% to 120% of current
  
  // Generate revenue breakdown by order type
  const revenueByType = {
    'Dine-in': totalSales * 0.4,
    'Takeaway': totalSales * 0.3,
    'Delivery': totalSales * 0.3
  };
  
  // Generate top items
  const topItems = [
    { menu_id: 1, item_name: 'Chicken Fried Rice', category: 'Main Course', quantity: 120, revenue: 108000 },
    { menu_id: 2, item_name: 'Vegetable Kottu', category: 'Main Course', quantity: 85, revenue: 63750 },
    { menu_id: 3, item_name: 'Masala Dosa', category: 'Breakfast', quantity: 95, revenue: 57000 },
    { menu_id: 4, item_name: 'Butter Chicken', category: 'Curry', quantity: 75, revenue: 75000 },
    { menu_id: 5, item_name: 'Mango Lassi', category: 'Beverages', quantity: 110, revenue: 33000 },
    { menu_id: 6, item_name: 'Chocolate Cake', category: 'Dessert', quantity: 65, revenue: 45500 },
    { menu_id: 7, item_name: 'Chicken Biryani', category: 'Rice', quantity: 82, revenue: 98400 },
    { menu_id: 8, item_name: 'Fresh Lime Soda', category: 'Beverages', quantity: 78, revenue: 15600 }
  ];
  
  return {
    salesTimeline,
    totalSales,
    totalOrders,
    previousPeriodSales,
    previousPeriodOrders,
    revenueByType,
    topItems
  };
}

function getMockMenuItemsReportData() {
  // This reuses parts of the sales report mock data
  const salesData = getMockSalesReportData(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0],
    'daily'
  );
  
  // Add more specific menu analysis data
  const categoryBreakdown = {
    'Main Course': 35,
    'Appetizers': 20,
    'Desserts': 15,
    'Beverages': 30
  };
  
  const popularityByTime = {
    'Breakfast': ['Masala Dosa', 'Idli Sambar', 'Coffee'],
    'Lunch': ['Chicken Biryani', 'Vegetable Kottu', 'Fresh Lime Soda'],
    'Dinner': ['Butter Chicken', 'Naan', 'Chocolate Cake']
  };
  
  return {
    ...salesData,
    categoryBreakdown,
    popularityByTime
  };
}

// Mock data function for reservations report - use until backend is ready
function getMockReservationsReportData(startDate, endDate, aggregation) {
  // Generate days between start and end date
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.round((end - start) / dayMs) + 1;
  
  // Generate daily mock data
  const timeline = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const reservations = Math.floor(Math.random() * 15) + 5; // Random between 5-20
    
    timeline.push({
      date: date.toISOString().split('T')[0],
      reservations
    });
  }
  
  // Calculate totals
  const totalReservations = timeline.reduce((sum, day) => sum + day.reservations, 0);
  
  // Generate mock table distribution data
  const reservationsByTable = [
    { table_no: 1, reservationCount: Math.floor(Math.random() * 30) + 10 },
    { table_no: 2, reservationCount: Math.floor(Math.random() * 30) + 10 },
    { table_no: 3, reservationCount: Math.floor(Math.random() * 30) + 10 },
    { table_no: 4, reservationCount: Math.floor(Math.random() * 30) + 10 },
    { table_no: 5, reservationCount: Math.floor(Math.random() * 30) + 10 },
    { table_no: 6, reservationCount: Math.floor(Math.random() * 30) + 10 }
  ];
  
  // Generate mock time of day distribution
  const reservationsByTimeOfDay = [
    { time_of_day: 'Morning (6AM-12PM)', reservationCount: Math.floor(Math.random() * 50) + 20 },
    { time_of_day: 'Afternoon (12PM-5PM)', reservationCount: Math.floor(Math.random() * 80) + 40 },
    { time_of_day: 'Evening (5PM-10PM)', reservationCount: Math.floor(Math.random() * 100) + 60 },
    { time_of_day: 'Night (10PM-6AM)', reservationCount: Math.floor(Math.random() * 30) + 5 }
  ];
  
  return {
    totalReservations,
    previousPeriodReservations: Math.floor(totalReservations * 0.9), // Mock 10% growth
    averageReservationsPerDay: totalReservations / days,
    salesTimeline: timeline,
    reservationsByTable,
    reservationsByTimeOfDay
  };
}
