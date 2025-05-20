import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { 
  getAllStaff, 
  getStaffById, 
  createStaff, 
  updateStaff, 
  deleteStaff,
  checkServerAvailability,
  serverStatus 
} from '../services/staffService';
import '../styles/StaffManagement.css';

function StaffManagement() {
  // State for staff data
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isServerDown, setIsServerDown] = useState(false);
    // State for staff operations
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Refs for form scrolling detection
  const addFormRef = useRef(null);
  const editFormRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchCategory, setSearchCategory] = useState('all');
  
  // Stats for dashboard
  const [stats, setStats] = useState({
    total: 0,
    waiters: 0,
    chefs: 0,
    delivery: 0,
    active: 0,
    inactive: 0
  });
  
  // Form state for adding/editing staff
  const [staffForm, setStaffForm] = useState({
    first_name: '',
    last_name: '',
    nic: '',
    email: '',
    password: '',
    confirmPassword: '', // Add confirm password field
    phone_number: '',
    role: 'waiter',
    active: true
  });
  
  // Load staff on component mount
  useEffect(() => {
    fetchStaff();
    checkServerConnection();
  }, []);
    // Update filtered staff when search or filter changes
  useEffect(() => {
    filterStaff();
  }, [searchTerm, roleFilter, statusFilter, staff, searchCategory]);
    // Handle form scroll detection for improved UX
  useEffect(() => {
    const checkFormScroll = (formRef) => {
      if (formRef && formRef.current) {
        const { scrollHeight, clientHeight } = formRef.current;
        // If content height is greater than visible height, add scrollable class
        if (scrollHeight > clientHeight) {
          formRef.current.classList.add('scrollable');
        } else {
          formRef.current.classList.remove('scrollable');
        }
      }
    };
    
    const handleResize = () => {
      if (isAddModalOpen) {
        checkFormScroll(addFormRef);
      }
      if (isEditModalOpen) {
        checkFormScroll(editFormRef);
      }
    };
    
    if (isAddModalOpen) {
      // Allow time for the modal to render
      setTimeout(() => checkFormScroll(addFormRef), 100);
    }
    
    if (isEditModalOpen) {
      // Allow time for the modal to render
      setTimeout(() => checkFormScroll(editFormRef), 100);
    }
    
    // Add resize listener to update scroll detection when window size changes
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isAddModalOpen, isEditModalOpen, selectedStaff]);
  
  // Check server status
  const checkServerConnection = async () => {
    const isAvailable = await checkServerAvailability();
    setIsServerDown(!isAvailable);
  };
  
  // Fetch all staff
  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const data = await getAllStaff();
      setStaff(data);
      setIsServerDown(!serverStatus.isAvailable);
      
      // Calculate stats
      const stats = {
        total: data.length,
        waiters: data.filter(s => s.role === 'waiter').length,
        chefs: data.filter(s => s.role === 'chef').length,
        delivery: data.filter(s => s.role === 'delivery').length,
        active: data.filter(s => s.active).length,
        inactive: data.filter(s => !s.active).length
      };
      setStats(stats);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setIsServerDown(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter staff based on search term, role filter, and active status
  const filterStaff = () => {
    let filtered = [...staff];
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => 
        member.role === roleFilter
      );
    }
    
    // Apply active status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => 
        (statusFilter === 'active' ? member.active : !member.active)
      );
    }
    
    // Apply search term filter based on selected category
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(member => {
        if (searchCategory === 'all') {
          return (
            member.first_name.toLowerCase().includes(search) ||
            member.last_name.toLowerCase().includes(search) ||
            member.nic.toLowerCase().includes(search) ||
            member.email.toLowerCase().includes(search) ||
            (member.phone_number && member.phone_number.toLowerCase().includes(search))
          );
        } else if (searchCategory === 'name') {
          return (
            member.first_name.toLowerCase().includes(search) ||
            member.last_name.toLowerCase().includes(search) ||
            `${member.first_name.toLowerCase()} ${member.last_name.toLowerCase()}`.includes(search)
          );
        } else if (searchCategory === 'nic') {
          return member.nic.toLowerCase().includes(search);
        } else if (searchCategory === 'email') {
          return member.email.toLowerCase().includes(search);
        } else if (searchCategory === 'phone') {
          return member.phone_number && member.phone_number.toLowerCase().includes(search);
        } else {
          return false;
        }
      });
    }
    
    setFilteredStaff(filtered);
  };
  
  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setStaffForm({
      ...staffForm,
      [name]: value
    });
  };
  
  // Handle add staff submit
  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(staffForm.email)) {
        alert('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
      
      // Validate NIC format (simple validation)
      if (!staffForm.nic || staffForm.nic.length < 5) {
        alert('Please enter a valid NIC number');
        setIsLoading(false);
        return;
      }
      
      // Validate phone number (simple validation)
      if (staffForm.phone_number && !/^\d{10}$/.test(staffForm.phone_number.replace(/[^0-9]/g, ''))) {
        alert('Please enter a valid 10-digit phone number');
        setIsLoading(false);
        return;
      }
      
      // Check if passwords match
      if (staffForm.password !== staffForm.confirmPassword) {
        alert('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      // Create new staff member - remove confirmPassword as it's not needed in the backend
      const staffData = {...staffForm};
      delete staffData.confirmPassword;
      const newStaff = await createStaff(staffData);
      
      setStaff([...staff, newStaff]);
      setIsAddModalOpen(false);
      resetForm();
      alert('Staff member added successfully!');
      
      // Update stats
      setStats({
        ...stats,
        total: stats.total + 1,
        [newStaff.role + 's']: stats[newStaff.role + 's'] + 1,
        active: newStaff.active ? stats.active + 1 : stats.active,
        inactive: !newStaff.active ? stats.inactive + 1 : stats.inactive
      });
    } catch (error) {
      console.error('Error adding staff:', error);
      alert(`Failed to add staff: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle edit staff submit
  const handleEditStaff = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(staffForm.email)) {
        alert('Please enter a valid email address');
        setIsLoading(false);
        return;
      }
      
      // Validate phone number (simple validation)
      if (staffForm.phone_number && !/^\d{10}$/.test(staffForm.phone_number.replace(/[^0-9]/g, ''))) {
        alert('Please enter a valid 10-digit phone number');
        setIsLoading(false);
        return;
      }
      
      // Update the staff member (without password if it's empty)
      const dataToUpdate = {...staffForm};
      if (!dataToUpdate.password) {
        delete dataToUpdate.password;
      }
      
      const updatedStaff = await updateStaff(staffForm.staff_id, dataToUpdate);
      
      // Update staff array with the edited staff member
      const previousRole = staff.find(s => s.staff_id === updatedStaff.staff_id)?.role;
      const previousActiveStatus = staff.find(s => s.staff_id === updatedStaff.staff_id)?.active;
      
      setStaff(staff.map(member => 
        member.staff_id === updatedStaff.staff_id ? updatedStaff : member
      ));
      
      setIsEditModalOpen(false);
      resetForm();
      alert('Staff member updated successfully!');
      
      // Update stats if role or active status changed
      if (previousRole !== updatedStaff.role || previousActiveStatus !== updatedStaff.active) {
        setStats({
          ...stats,
          [previousRole + 's']: stats[previousRole + 's'] - 1,
          [updatedStaff.role + 's']: stats[updatedStaff.role + 's'] + 1,
          active: updatedStaff.active ? stats.active + 1 : stats.active - 1,
          inactive: !updatedStaff.active ? stats.inactive + 1 : stats.inactive - 1
        });
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert(`Failed to update staff: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete staff
  const handleDeleteStaff = async () => {
    try {
      setIsLoading(true);
      await deleteStaff(selectedStaff.staff_id);
      
      // Remove the deleted staff from the staff array
      setStaff(staff.filter(member => member.staff_id !== selectedStaff.staff_id));
      
      setIsDeleteModalOpen(false);
      alert('Staff member deleted successfully!');
      
      // Update stats
      setStats({
        ...stats,
        total: stats.total - 1,
        [selectedStaff.role + 's']: stats[selectedStaff.role + 's'] - 1,
        active: selectedStaff.active ? stats.active - 1 : stats.active,
        inactive: !selectedStaff.active ? stats.inactive - 1 : stats.inactive
      });
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert(`Failed to delete staff: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle opening the edit modal
  const openEditModal = (staffMember) => {
    // Create a copy without the password field - we'll handle it separately
    const formData = {...staffMember};
    formData.password = ''; // Clear password field for security
    
    setStaffForm(formData);
    setIsEditModalOpen(true);
  };
  
  // Handle opening the delete modal
  const openDeleteModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setIsDeleteModalOpen(true);
  };
  
  // Reset form state
  const resetForm = () => {
    setStaffForm({
      first_name: '',
      last_name: '',
      nic: '',
      email: '',
      password: '',
      confirmPassword: '', // Reset confirm password too
      phone_number: '',
      role: 'waiter',
      active: true
    });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Staff Management" />
        
        {/* Server status warning */}
        {isServerDown && (
          <div className="server-status-notification warning">
            <p>
              <strong>Notice:</strong> Cannot connect to the server. Showing mock data that may not reflect your actual staff configuration.
            </p>
            <button onClick={checkServerConnection}>
              Retry Connection
            </button>
          </div>
        )}
        
        {/* Staff Overview Cards */}
        <div className="staff-overview">
          <div className="staff-stat-card total">
            <h3>Total Staff</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
          <div className="staff-stat-card waiters">
            <h3>Waiters</h3>
            <p className="stat-number">{stats.waiters}</p>
          </div>
          <div className="staff-stat-card chefs">
            <h3>Chefs</h3>
            <p className="stat-number">{stats.chefs}</p>
          </div>
          <div className="staff-stat-card delivery">
            <h3>Delivery</h3>
            <p className="stat-number">{stats.delivery}</p>
          </div>
          <div className="staff-stat-card active">
            <h3>Active</h3>
            <p className="stat-number">{stats.active || 0}</p>
          </div>
          <div className="staff-stat-card inactive">
            <h3>Inactive</h3>
            <p className="stat-number">{stats.inactive || 0}</p>
          </div>
        </div>
        
        {/* Filters and actions - with status filter */}
        <div className="filters-section">
          <div className="search-and-filter">
            <div className="search-container">
              <div className="search-category-selector">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                >
                  <option value="all">All Fields</option>
                  <option value="name">Name</option>
                  <option value="nic">NIC</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder={`Search by ${searchCategory === 'all' ? 'name, email or phone' : searchCategory}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="role-filter">
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="waiter">Waiters</option>
                <option value="chef">Chefs</option>
                <option value="delivery">Delivery Staff</option>
              </select>
            </div>
            
            <div className="status-filter">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              className="add-staff-btn"
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
            >
              Add New Staff
            </button>
          </div>
        </div>
        
        {/* Staff display */}
        {isLoading ? (
          <div className="loading">Loading staff members...</div>
        ) : (
          <div className="staff-table-container">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>NIC</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((member) => (
                    <tr key={member.staff_id}>
                      <td>{member.staff_id}</td>
                      <td>{`${member.first_name} ${member.last_name}`}</td>
                      <td>{member.nic}</td>
                      <td>{member.email}</td>
                      <td>{member.phone_number || 'N/A'}</td>
                      <td>
                        <span className={`role-badge ${member.role}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${member.active ? 'active' : 'inactive'}`}>
                          {member.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(member.created_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="edit-btn"
                            onClick={() => openEditModal(member)}
                          >
                            
                          </button>
                          <button 
                            className="delete-btn"
                            onClick={() => openDeleteModal(member)}
                          >
                            
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="no-staff">
                      No staff members match your search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Add Staff Modal */}
        {isAddModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content staff-form-modal">
              <div className="modal-header">
                <h2>Add New Staff Member</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              <form ref={addFormRef} className="staff-form" onSubmit={handleAddStaff}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name</label>
                    <input
                      type="text"
                      id="first_name"
                      name="first_name"
                      value={staffForm.first_name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name</label>
                    <input
                      type="text"
                      id="last_name"
                      name="last_name"
                      value={staffForm.last_name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="nic">NIC Number</label>
                  <input
                    type="text"
                    id="nic"
                    name="nic"
                    value={staffForm.nic}
                    onChange={handleFormChange}
                    required
                    placeholder="Enter National ID Number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={staffForm.email}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={staffForm.password}
                    onChange={handleFormChange}
                    required
                    minLength="6"
                  />
                  <small className="form-hint">Minimum 6 characters</small>
                </div>
                
                {/* Add Confirm Password field */}
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={staffForm.confirmPassword}
                    onChange={handleFormChange}
                    required
                    minLength="6"
                  />
                  <small className="form-hint">
                    {staffForm.password && staffForm.confirmPassword && 
                      (staffForm.password === staffForm.confirmPassword 
                        ? <span className="password-match">Passwords match</span> 
                        : <span className="password-mismatch">Passwords do not match</span>)
                    }
                  </small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone_number">Phone Number</label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={staffForm.phone_number}
                    onChange={handleFormChange}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={staffForm.role}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="waiter">Waiter</option>
                    <option value="chef">Chef</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="active">Status</label>
                  <div className="toggle-container">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        id="active"
                        name="active"
                        checked={staffForm.active}
                        onChange={(e) => setStaffForm({...staffForm, active: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">{staffForm.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading || (staffForm.password !== staffForm.confirmPassword && staffForm.confirmPassword)}
                  >
                    {isLoading ? 'Adding...' : 'Add Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Edit Staff Modal */}
        {isEditModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content staff-form-modal">
              <div className="modal-header">
                <h2>Edit Staff Member</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              <form ref={editFormRef} className="staff-form" onSubmit={handleEditStaff}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit_first_name">First Name</label>
                    <input
                      type="text"
                      id="edit_first_name"
                      name="first_name"
                      value={staffForm.first_name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_last_name">Last Name</label>
                    <input
                      type="text"
                      id="edit_last_name"
                      name="last_name"
                      value={staffForm.last_name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_nic">NIC Number</label>
                  <input
                    type="text"
                    id="edit_nic"
                    name="nic"
                    value={staffForm.nic}
                    onChange={handleFormChange}
                    required
                    placeholder="Enter National ID Number"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_email">Email</label>
                  <input
                    type="email"
                    id="edit_email"
                    name="email"
                    value={staffForm.email}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_password">Password</label>
                  <input
                    type="password"
                    id="edit_password"
                    name="password"
                    value={staffForm.password}
                    onChange={handleFormChange}
                    placeholder="Leave blank to keep current password"
                  />
                  <small className="form-hint">Leave blank to keep current password</small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_phone_number">Phone Number</label>
                  <input
                    type="tel"
                    id="edit_phone_number"
                    name="phone_number"
                    value={staffForm.phone_number}
                    onChange={handleFormChange}
                    placeholder="(xxx) xxx-xxxx"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_role">Role</label>
                  <select
                    id="edit_role"
                    name="role"
                    value={staffForm.role}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="waiter">Waiter</option>
                    <option value="chef">Chef</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="edit_active">Status</label>
                  <div className="toggle-container">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        id="edit_active"
                        name="active"
                        checked={staffForm.active}
                        onChange={(e) => setStaffForm({...staffForm, active: e.target.checked})}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">{staffForm.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedStaff && (
          <div className="modal-overlay">
            <div className="modal-content delete-confirmation-modal">
              <div className="modal-header">
                <h2>Confirm Delete</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  &times;
                </button>
              </div>
              <div className="delete-confirmation-content">
                <p>Are you sure you want to delete the staff member <strong>{selectedStaff.first_name} {selectedStaff.last_name}</strong>?</p>
                <p>This action cannot be undone.</p>
                
                <div className="delete-actions">
                  <button 
                    className="cancel-btn"
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="delete-confirm-btn"
                    onClick={handleDeleteStaff}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Delete Staff Member'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default StaffManagement;
