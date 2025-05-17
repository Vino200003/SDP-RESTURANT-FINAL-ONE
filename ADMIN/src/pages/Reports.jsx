import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import * as reportService from '../services/reportService';
import '../styles/Reports.css';

// Register Chart.js components
Chart.register(...registerables);

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
  
  // Add chart refs
  const salesChartRef = useRef(null);
  const salesChartInstance = useRef(null);
  const categoryChartRef = useRef(null);
  const categoryChartInstance = useRef(null);
  
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
  
  // Initialize charts when report data is available
  useEffect(() => {
    if (reportData) {
      initCharts();
    }
    
    // Cleanup function to destroy charts when component unmounts
    return () => {
      if (salesChartInstance.current) {
        salesChartInstance.current.destroy();
      }
      if (categoryChartInstance.current) {
        categoryChartInstance.current.destroy();
      }
    };
  }, [reportData]);
  
  // Initialize charts
  const initCharts = () => {
    // Only initialize charts if we have data and DOM elements
    if (!reportData || !salesChartRef.current) return;
    
    // Initialize the appropriate chart based on report type
    if (reportType === 'sales') {
      initSalesChart();
    } else if (reportType === 'menu') {
      // Handle menu report chart if needed
    } else if (reportType === 'reservations') {
      initReservationsChart();
    }
    
    // Initialize category chart for non-reservations reports
    if (reportType === 'sales' && reportData.revenueByType && categoryChartRef.current) {
      initCategoryChart();
    }
  };
  
  // Initialize sales timeline chart
  const initSalesChart = () => {
    // Destroy previous chart instance if it exists
    if (salesChartInstance.current) {
      salesChartInstance.current.destroy();
    }
    
    const ctx = salesChartRef.current.getContext('2d');
    
    // Create new chart - simplified to show only sales by date
    salesChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: reportData.salesTimeline.map(item => formatDateOnly(item.date)),
        datasets: [
          {
            label: `${aggregation.charAt(0).toUpperCase() + aggregation.slice(1)} Sales`,
            data: reportData.salesTimeline.map(item => item.amount),
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Sales Amount (Rs)'
            }
          },
          x: {
            title: {
              display: true,
              text: aggregation.charAt(0).toUpperCase() + aggregation.slice(1)
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('en-LK', {
                    style: 'currency',
                    currency: 'LKR',
                    minimumFractionDigits: 2
                  }).format(context.parsed.y);
                }
                return label;
              }
            }
          },
          title: {
            display: true,
            text: `${aggregation.charAt(0).toUpperCase() + aggregation.slice(1)} Sales`
          }
        }
      }
    });
  };
  
  // Initialize category chart with percentages in the legend
  const initCategoryChart = () => {
    // Destroy previous chart instance if it exists
    if (categoryChartInstance.current) {
      categoryChartInstance.current.destroy();
    }
    
    const ctx = categoryChartRef.current.getContext('2d');
    
    // Prepare data for pie chart
    const labels = Object.keys(reportData.revenueByType);
    const data = Object.values(reportData.revenueByType);
    const totalRevenue = data.reduce((sum, value) => sum + value, 0);
    
    // Calculate percentages for each order type
    const percentages = data.map(value => ((value / totalRevenue) * 100).toFixed(1));
    
    // Create labels with percentages
    const labelsWithPercentages = labels.map((label, index) => 
      `${label} (${percentages[index]}%)`
    );
    
    // Create new chart
    categoryChartInstance.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labelsWithPercentages,
        datasets: [
          {
            label: 'Revenue',
            data: data,
            backgroundColor: [
              'rgba(255, 99, 132, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(255, 206, 86, 0.7)',
              'rgba(75, 192, 192, 0.7)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          title: {
            display: true,
            text: 'Revenue by Order Type'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const percentage = ((value / totalRevenue) * 100).toFixed(1);
                return `${context.label.split(' (')[0]}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  };
  
  // Initialize chart specifically for reservations report
  const initReservationsChart = () => {
    if (salesChartInstance.current) {
      salesChartInstance.current.destroy();
    }
    
    const ctx = salesChartRef.current.getContext('2d');
    
    salesChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: reportData.salesTimeline.map(item => formatDateOnly(item.date)),
        datasets: [
          {
            label: 'Reservations',
            data: reportData.salesTimeline.map(item => item.reservations),
            borderColor: 'rgba(75, 99, 255, 1)',
            backgroundColor: 'rgba(75, 99, 255, 0.2)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Reservations'
            }
          },
          x: {
            title: {
              display: true,
              text: aggregation.charAt(0).toUpperCase() + aggregation.slice(1)
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Reservations: ${context.parsed.y}`;
              }
            }
          },
          title: {
            display: true,
            text: `${aggregation.charAt(0).toUpperCase() + aggregation.slice(1)} Reservations`
          }
        }
      }
    });
    
    // Initialize table distribution chart if data exists
    if (reportData.reservationsByTable && reportData.reservationsByTable.length > 0 && categoryChartRef.current) {
      if (categoryChartInstance.current) {
        categoryChartInstance.current.destroy();
      }
      
      const tableCtx = categoryChartRef.current.getContext('2d');
      
      categoryChartInstance.current = new Chart(tableCtx, {
        type: 'bar',
        data: {
          labels: reportData.reservationsByTable.map(item => `Table ${item.table_no}`),
          datasets: [
            {
              label: 'Reservations',
              data: reportData.reservationsByTable.map(item => item.reservationCount),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Reservations by Table'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Reservations'
              }
            }
          }
        }
      });
    }
  };
  
  // When showing reservations report, ensure all summary stats cards are appropriate
  const renderSummaryStats = () => {
    if (reportType === 'reservations') {
      return (
        <div className="summary-stats">
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
          
          <div className="stat-card avg-reservation">
            <h3>Avg. Daily Reservations</h3>
            <p className="stat-number">
              {reportData.averageReservationsPerDay ? 
                reportData.averageReservationsPerDay.toFixed(1) : 
                (reportData.totalReservations / Math.max(1, reportData.period?.durationDays || 1)).toFixed(1)
              }
            </p>
          </div>
          
          {reportData.period && (
            <div className="stat-card report-period">
              <h3>Period Duration</h3>
              <p className="stat-number">{reportData.period.durationDays} days</p>
            </div>
          )}
        </div>
      );
    }
    
    // For other report types, use the existing summary stats
    return (
      <div className="summary-stats">
        {/* ...existing summary stats code... */}
      </div>
    );
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
            {/* Use conditional rendering for summary stats */}
            {renderSummaryStats()}
            
            {/* Charts */}
            <div className="report-charts">
              {/* Daily/Weekly/Monthly Sales Line Chart */}
              <div className="chart-container sales-chart">
                <h3>{aggregation.charAt(0).toUpperCase() + aggregation.slice(1)} Sales Trend</h3>
                <canvas ref={salesChartRef}></canvas>
              </div>
              
              {/* Revenue by Type Chart */}
              {reportData.revenueByType && Object.keys(reportData.revenueByType).length > 0 && (
                <div className="chart-container category-chart">
                  <h3>Revenue by Order Type</h3>
                  <canvas ref={categoryChartRef}></canvas>
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
            {reportType !== 'reservations' && (
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
            )}
            
            {/* Only show revenue by order type for sales reports */}
            {reportType === 'sales' && reportData.revenueByType && Object.keys(reportData.revenueByType).length > 0 && (
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
            
            {/* Add reservation-specific sections */}
            {reportType === 'reservations' && (
              <>
                <div className="reservation-stats">
                  {reportData.reservationsByTable && reportData.reservationsByTable.length > 0 && (
                    <div className="reservation-tables-section">
                      <h3>Reservations by Table</h3>
                      <div className="table-container">
                        <table className="reservations-table">
                          <thead>
                            <tr>
                              <th>Table</th>
                              <th>Count</th>
                              <th>Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.reservationsByTable.map((item, index) => {
                              const percentage = ((item.reservationCount / reportData.totalReservations) * 100).toFixed(1);
                              return (
                                <tr key={index}>
                                  <td>Table {item.table_no}</td>
                                  <td>{item.reservationCount}</td>
                                  <td>{percentage}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {reportData.reservationsByTimeOfDay && reportData.reservationsByTimeOfDay.length > 0 && (
                    <div className="reservation-times-section">
                      <h3>Reservations by Time of Day</h3>
                      <div className="table-container">
                        <table className="reservations-table">
                          <thead>
                            <tr>
                              <th>Time Period</th>
                              <th>Count</th>
                              <th>Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.reservationsByTimeOfDay.map((item, index) => {
                              const percentage = ((item.reservationCount / reportData.totalReservations) * 100).toFixed(1);
                              return (
                                <tr key={index}>
                                  <td>{item.time_of_day}</td>
                                  <td>{item.reservationCount}</td>
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
              </>
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