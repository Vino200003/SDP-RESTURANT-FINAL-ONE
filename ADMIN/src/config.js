/**
 * Application configuration settings
 */

const config = {
  API_URL: 'http://localhost:5000/api',
  // Add other configuration settings here
};

export default config;

// Backend API base URL
export const API_BASE_URL = 'http://localhost:5000'; // Update this to match your backend server URL

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/admin/login',
  REGISTER: '/api/admin/register',
  VALIDATE: '/api/admin/validateToken'
};

// API endpoints
export const API_ENDPOINTS = {
  // Menu related endpoints
  MENU: '/api/menu',
  MENU_CATEGORIES: '/api/menu/categories',
  
  // Order related endpoints
  ORDERS: '/api/admin/orders',
  ORDER_STATS: '/api/admin/orders/stats',
  
  // Reservation endpoints
  RESERVATIONS: '/api/reservations',
  
  // Staff management
  STAFF: '/api/staff',
  
  // Delivery management
  DELIVERY: '/api/delivery',
  
  // Inventory and suppliers
  INVENTORY: '/api/inventory',
  SUPPLIERS: '/api/suppliers',
  
  // Admin settings
  SETTINGS: '/api/admin/settings'
};

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 10;

// Image upload settings
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/jpg']
};
