import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import OrdersManagement from './pages/OrdersManagement';
import ReservationManagement from './pages/ReservationManagement';
import InventoryManagement from './pages/InventoryManagement';
import Login from './pages/Login';
import StaffManagement from './pages/StaffManagement';
import DeliveryManagement from './pages/DeliveryManagement';
import AdminSettings from './pages/AdminSettings'; 
import Reports from './pages/Reports';
import { AuthProvider, useAuth } from './context/AuthContext';
import "./App.css";

// Add the ProtectedRoute component definition
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Adjust the login route to check authentication */}
          <Route 
            path="/login" 
            element={
              <LoginWrapper />
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/menu-management" element={
            <ProtectedRoute>
              <MenuManagement />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrdersManagement />
            </ProtectedRoute>
          } />
          <Route path="/reservations" element={
            <ProtectedRoute>
              <ReservationManagement />
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute>
              <InventoryManagement />
            </ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="/delivery" element={
            <ProtectedRoute>
              <DeliveryManagement />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// This component handles redirect logic for the login page
function LoginWrapper() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Login />;
}

export default App;
