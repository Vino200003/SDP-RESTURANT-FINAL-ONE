import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';
import logo from '../assets/logo.png';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
    console.log('User logged out');
  };

  const isRouteActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: '📊'
    },
    {
      name: 'Menu Management',
      path: '/menu-management',
      icon: '🍽️'
    },
    {
      name: 'Orders Management',
      path: '/orders',
      icon: '🛒'
    },
    {
      name: 'Table Reservations',
      path: '/reservations',
      icon: '📅'
    },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: '📦'
    },
    {
      name: 'Staff Management',
      path: '/staff',
      icon: '👥'
    },
    {
      name: 'Staff Attendance',
      path: '/attendance',
      icon: '⏱️'
    },
    {
      name: 'Delivery Management',
      path: '/delivery',
      icon: '🚚'
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: '📊'
    },
    {
      name: 'Admin Settings',
      path: '/settings',
      icon: '⚙️'
    }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Restaurant Logo" className="sidebar-logo" />
        <h3 className="sidebar-title">Restaurant Admin</h3>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link to={item.path} className={`nav-link ${isRouteActive(item.path) ? 'active' : ''}`}>
                <span className="icon">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          <span className="icon">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
