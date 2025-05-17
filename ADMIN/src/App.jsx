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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/menu-management" element={<MenuManagement />} />
          <Route path="/orders" element={<OrdersManagement />} />
          <Route path="/reservations" element={<ReservationManagement />} />
          <Route path="/inventory" element={<InventoryManagement />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/delivery" element={<DeliveryManagement />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="/reports" element={<Reports />} />
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
