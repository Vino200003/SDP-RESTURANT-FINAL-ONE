import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import * as reportService from '../services/reportService';
import '../styles/Reports.css';

function Reports() {
  // State for date range
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // State for report data
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for report type
  const [reportType, setReportType] = useState('sales');
  
  // State for aggregation
  const [aggregation, setAggregation] = useState('daily');
  
  // Fetch report data when date range or report type changes
  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType, aggregation]);
  
  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch data based on report type
      let data;
      switch (reportType) {
        case 'sales':
          data = await reportService.getSalesReport(dateRange.startDate, dateRange.endDate, aggregation);
          break;
        case 'menu':
          data = await reportService.getMenuItemsReport(dateRange.startDate, dateRange.endDate);
          break;
        case 'reservations':
          data = await reportService.getReservationsReport(dateRange.startDate, dateRange.endDate, aggregation);
          break;
        default:
          data = await reportService.getSalesReport(dateRange.startDate, dateRange.endDate, aggregation);
      }
      
      // Ensure data has the expected properties
      ensureDataFormat(data);
      
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ensure the data has the expected format
  const ensureDataFormat = (data) => {
    // Make sure salesTimeline exists
    if (!data.salesTimeline && data.timeline) {
      data.salesTimeline = data.timeline;
    } else if (!data.salesTimeline) {
      data.salesTimeline = [];
    }
    
    // Make sure totalSales and totalOrders exist
    data.totalSales = data.totalSales || 0;
    data.totalOrders = data.totalOrders || 0;
    
    // Make sure topItems exists if it doesn't
    if (!data.topItems) {
      data.topItems = [];
    }
  };
  
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleExportReport = (format) => {
    if (!reportData) return;
    
    switch (format) {
      case 'pdf':
        reportService.exportAsPDF(reportData, reportType, dateRange);
        break;
      case 'csv':
        reportService.exportAsCSV(reportData, reportType);
        break;
      default:
        console.error('Unsupported export format:', format);
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Calculate percentage change
  const getPercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };
  
  // Function to format date (strip any time component)
  const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    
    // Handle date ranges for weekly reports (e.g., "2023-01-01 - 2023-01-07")
    if (typeof dateString === 'string' && dateString.includes(' - ')) {
      const [startDate, endDate] = dateString.split(' - ');
      return `${formatDateOnly(startDate)} - ${formatDateOnly(endDate)}`;
    }
    
    // If it's already a date-only string (YYYY-MM-DD), return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // For monthly reports that might be formatted as "January 2023"
    if (/^[A-Za-z]+ \d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // Otherwise, convert to Date object and extract date part
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (e) {
      // If anything goes wrong, return the original string
      return dateString;
    }
  };
  
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Reports" />
        
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={fetchReportData}>Retry</button>
          </div>
        )}
        
        <div className="reports-controls">
          <div className="report-type-selector">
            <label>Report Type:</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="sales">Sales Report</option>
              <option value="menu">Menu Items Report</option>
              <option value="reservations">Reservations Report</option>
            </select>
          </div>
          
          <div className="date-range-controls">
            <div className="date-input-group">
              <label>Start Date:</label>
              <input 
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateRangeChange}
                max={dateRange.endDate}
              />
            </div>
            <div className="date-input-group">
              <label>End Date:</label>
              <input 
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateRangeChange}
                min={dateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          <div className="aggregation-controls">
            <label>Group By:</label>
            <select 
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div className="export-controls">
            <button 
              className="export-btn pdf"
              onClick={() => handleExportReport('pdf')}
              disabled={!reportData || isLoading}
            >
              Export as PDF
            </button>
            <button 
              className="export-btn csv"
              onClick={() => handleExportReport('csv')}
              disabled={!reportData || isLoading}
            >
              Export as CSV
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Loading report data...</p>
          </div>
        ) : reportData ? (
          <div className="reports-content">
            {/* Summary Stats Cards */}
            <div className="summary-stats">
              <div className="stat-card total-sales">
                <h3>Total Sales</h3>
                <p className="stat-number">{formatCurrency(reportData.totalSales)}</p>
                <p className="stat-comparison">
                  {reportData.previousPeriodSales !== undefined && (
                    <>
                      {getPercentageChange(reportData.totalSales, reportData.previousPeriodSales) > 0 ? (
                        <span className="positive">↑ {getPercentageChange(reportData.totalSales, reportData.previousPeriodSales).toFixed(1)}%</span>
                      ) : (
                        <span className="negative">↓ {Math.abs(getPercentageChange(reportData.totalSales, reportData.previousPeriodSales)).toFixed(1)}%</span>
                      )}
                      {' from previous period'}
                    </>
                  )}
                </p>
              </div>
              
              <div className="stat-card total-orders">
                <h3>Total Orders</h3>
                <p className="stat-number">{reportData.totalOrders}</p>
                <p className="stat-comparison">
                  {reportData.previousPeriodOrders !== undefined && (
                    <>
                      {getPercentageChange(reportData.totalOrders, reportData.previousPeriodOrders) > 0 ? (
                        <span className="positive">↑ {getPercentageChange(reportData.totalOrders, reportData.previousPeriodOrders).toFixed(1)}%</span>
                      ) : (
                        <span className="negative">↓ {Math.abs(getPercentageChange(reportData.totalOrders, reportData.previousPeriodOrders)).toFixed(1)}%</span>
                      )}
                      {' from previous period'}
                    </>
                  )}
                </p>
              </div>
              
              <div className="stat-card avg-order">
                <h3>Avg. Order Value</h3>
                <p className="stat-number">
                  {reportData.totalOrders > 0 
                    ? formatCurrency(reportData.totalSales / reportData.totalOrders) 
                    : formatCurrency(0)
                  }
                </p>
                <p className="stat-comparison">
                  {reportData.previousPeriodSales !== undefined && reportData.previousPeriodOrders > 0 && (
                    <>
                      {getPercentageChange(
                        reportData.totalOrders > 0 ? reportData.totalSales / reportData.totalOrders : 0,
                        reportData.previousPeriodOrders > 0 ? reportData.previousPeriodSales / reportData.previousPeriodOrders : 0
                      ) > 0 ? (
                        <span className="positive">↑ {getPercentageChange(
                          reportData.totalOrders > 0 ? reportData.totalSales / reportData.totalOrders : 0,
                          reportData.previousPeriodOrders > 0 ? reportData.previousPeriodSales / reportData.previousPeriodOrders : 0
                        ).toFixed(1)}%</span>
                      ) : (
                        <span className="negative">↓ {Math.abs(getPercentageChange(
                          reportData.totalOrders > 0 ? reportData.totalSales / reportData.totalOrders : 0,
                          reportData.previousPeriodOrders > 0 ? reportData.previousPeriodSales / reportData.previousPeriodOrders : 0
                        )).toFixed(1)}%</span>
                      )}
                      {' from previous period'}
                    </>
                  )}
                </p>
              </div>
              
              {reportType === 'reservations' && (
                <div className="stat-card total-reservations">
                  <h3>Total Reservations</h3>
                  <p className="stat-number">{reportData.totalReservations}</p>
                  <p className="stat-comparison">
                    {reportData.previousPeriodReservations !== undefined && (
                      <>
                        {getPercentageChange(reportData.totalReservations, reportData.previousPeriodReservations) > 0 ? (
                          <span className="positive">↑ {getPercentageChange(reportData.totalReservations, reportData.previousPeriodReservations).toFixed(1)}%</span>
                        ) : (
                          <span className="negative">↓ {Math.abs(getPercentageChange(reportData.totalReservations, reportData.previousPeriodReservations)).toFixed(1)}%</span>
                        )}
                        {' from previous period'}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
            
            {/* Top Selling Items Table */}
            {reportData.topItems && reportData.topItems.length > 0 && (
              <div className="top-items-section">
                <h3>Top Selling Items</h3>
                <div className="table-container">
                  <table className="top-items-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Quantity Sold</th>
                        <th>Revenue</th>
                        <th>Average Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.topItems.map((item, index) => (
                        <tr key={item.menu_id || index}>
                          <td>{index + 1}</td>
                          <td>{item.item_name}</td>
                          <td>{item.category || 'N/A'}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.revenue)}</td>
                          <td>{formatCurrency(item.revenue / item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Daily Breakdown Table */}
            <div className="daily-breakdown-section">
              <h3>Sales Breakdown</h3>
              <div className="table-container">
                <table className="sales-breakdown-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Orders</th>
                      <th>Sales</th>
                      <th>Avg. Order Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.salesTimeline.map((day, index) => (
                      <tr key={index}>
                        <td>{formatDateOnly(day.date)}</td>
                        <td>{day.orders}</td>
                        <td>{formatCurrency(day.amount)}</td>
                        <td>{day.orders > 0 ? formatCurrency(day.amount / day.orders) : formatCurrency(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Add Revenue by Order Type Section */}
            {reportData.revenueByType && Object.keys(reportData.revenueByType).length > 0 && (
              <div className="order-type-section">
                <h3>Revenue by Order Type</h3>
                <div className="table-container">
                  <table className="order-type-table">
                    <thead>
                      <tr>
                        <th>Order Type</th>
                        <th>Revenue</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.revenueByType).map(([type, revenue], index) => {
                        const percentage = (revenue / reportData.totalSales * 100).toFixed(1);
                        return (
                          <tr key={index}>
                            <td>{type}</td>
                            <td>{formatCurrency(revenue)}</td>
                            <td>{percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-data-message">
            <p>Select a date range and report type to view data.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Reports;
