/**
 * Utility functions for generating reports and handling admin data
 */

// Get admin name from local storage
exports.getAdminName = () => {
  try {
    const adminInfo = localStorage.getItem('adminInfo');
    if (!adminInfo) return 'Admin';
    
    const admin = JSON.parse(adminInfo);
    if (admin.first_name && admin.last_name) {
      return `${admin.first_name} ${admin.last_name}`;
    } else if (admin.first_name) {
      return admin.first_name;
    } else if (admin.email) {
      // If no name, use email before @ symbol
      return admin.email.split('@')[0];
    }
    
    return 'Admin';
  } catch (error) {
    console.error('Error parsing admin info:', error);
    return 'Admin';
  }
};

// Format currency for reports
exports.formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Format date for reports
exports.formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format time for reports
exports.formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Time';
  
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format date and time for reports
exports.formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date/Time';
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format a date string to a human-readable format
exports.formatDateTime = (dateString) => {
  const date = new Date(dateString);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format month-year string (YYYY-MM) to a more readable format
exports.formatMonthYear = (monthYearString) => {
  const [year, month] = monthYearString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long'
  });
};

// Calculate percentage change between two values
exports.calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  
  return ((current - previous) / previous) * 100;
};

// Generate date range for reports
exports.generateDateRange = (startDate, endDate, aggregation = 'daily') => {
  const dates = [];
  let current = new Date(startDate);
  const end = new Date(endDate);
  
  if (aggregation === 'daily') {
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  } else if (aggregation === 'weekly') {
    // For weekly, we need to get the first day of each week
    while (current <= end) {
      // Get the first day of the week (Sunday)
      const firstDayOfWeek = new Date(current);
      firstDayOfWeek.setDate(current.getDate() - current.getDay());
      
      dates.push(firstDayOfWeek.toISOString().split('T')[0]);
      
      // Move to next week
      current.setDate(current.getDate() + 7);
    }
  } else if (aggregation === 'monthly') {
    while (current <= end) {
      // Get the first day of the month
      const firstDayOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
      
      dates.push(firstDayOfMonth.toISOString().split('T')[0]);
      
      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  return dates;
};

// Format currency amount
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2
  }).format(amount);
};

// Validate menu items in an order
exports.validateOrderItems = async (orderItems, MenuItem) => {
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    throw new Error('No order items provided');
  }
  
  // Extract all menu item IDs from the order
  const menuItemIds = orderItems.map(item => item.menuItemId);
  
  // Find all menu items in the database
  const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
  
  // Check if all menu items were found
  if (menuItems.length !== menuItemIds.length) {
    throw new Error('One or more menu items not found');
  }
  
  return menuItems;
};