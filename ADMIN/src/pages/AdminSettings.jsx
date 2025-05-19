import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import OperatingHours from '../components/OperatingHours';
import { 
  getAdminProfile, 
  updateAdminProfile, 
  changeAdminPassword, 
  createNewAdmin, 
  getAllAdmins, 
  deleteAdmin,
  checkSuperAdminStatus
} from '../services/adminService';
import '../styles/AdminSettings.css';

function AdminSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  });
  
  // State for profile editing
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: ''
  });
  
  // State for password changing
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // State for creating a new admin
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: ''
  });
  
  // Loading states
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // State for admin list
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showAdminDetails, setShowAdminDetails] = useState(false);
  
  // State for admin deletion
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // State for super admin check
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Fetch admin profile on component mount
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        setLoading(true);
        const data = await getAdminProfile();
        setProfile(data);
        setFormData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        toast.error('Failed to load admin profile');
        setLoading(false);
      }
    };
    
    fetchAdminProfile();
    fetchAllAdmins();
    checkSuperAdmin();
  }, []);
  
  // Check if current admin is super admin
  const checkSuperAdmin = async () => {
    try {
      const { isSuperAdmin } = await checkSuperAdminStatus();
      setIsSuperAdmin(isSuperAdmin);
    } catch (error) {
      console.error('Error checking super admin status:', error);
      setIsSuperAdmin(false);
    }
  };
  
  // Fetch all admins
  const fetchAllAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const data = await getAllAdmins();
      setAdmins(data);
      setLoadingAdmins(false);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Failed to load admin list');
      setLoadingAdmins(false);
    }
  };
  
  // Handle form input changes for profile
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle password form input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };
  
  // Handle new admin form input changes
  const handleNewAdminChange = (e) => {
    const { name, value } = e.target;
    setNewAdminData({ ...newAdminData, [name]: value });
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    if (editMode) {
      // If canceling, reset form to original values
      setFormData(profile);
    }
    setEditMode(!editMode);
  };
  
  // Toggle add admin form
  const toggleAddAdminForm = () => {
    setShowAddAdminForm(!showAddAdminForm);
    // Reset form when toggling
    if (!showAddAdminForm) {
      setNewAdminData({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        password: '',
        confirmPassword: ''
      });
    }
  };
  
  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('First name, last name, and email are required');
      return;
    }
    
    try {
      setUpdating(true);
      const result = await updateAdminProfile(formData);
      
      if (result.admin) {
        setProfile(result.admin);
        setEditMode(false);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };
  
  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    try {
      setChangingPassword(true);
      const result = await changeAdminPassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (result.message) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
        toast.success('Password changed successfully');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };
  
  // Handle creating a new admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!newAdminData.first_name || !newAdminData.last_name || !newAdminData.email || !newAdminData.password) {
      toast.error('First name, last name, email, and password are required');
      return;
    }
    
    // Validate password match
    if (newAdminData.password !== newAdminData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (newAdminData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setCreatingAdmin(true);
      const result = await createNewAdmin({
        first_name: newAdminData.first_name,
        last_name: newAdminData.last_name,
        email: newAdminData.email,
        phone_number: newAdminData.phone_number,
        password: newAdminData.password
      });
      
      if (result && result.message) {
        toast.success('New admin created successfully');
        // Reset form and hide it
        setNewAdminData({
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          password: '',
          confirmPassword: ''
        });
        setShowAddAdminForm(false);
        
        // Refresh the admin list
        fetchAllAdmins();
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin');
    } finally {
      setCreatingAdmin(false);
    }
  };
  
  // View admin details
  const handleViewAdminDetails = (admin) => {
    setSelectedAdmin(admin);
    setShowAdminDetails(true);
  };
  
  // Close admin details modal
  const closeAdminDetails = () => {
    setShowAdminDetails(false);
    setSelectedAdmin(null);
  };
  
  // Confirm admin deletion
  const confirmDeleteAdmin = (admin) => {
    // Don't allow deleting your own account
    const currentAdminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');
    if (admin.admin_id === currentAdminInfo.admin_id) {
      toast.error("You cannot delete your own admin account");
      return;
    }
    
    setAdminToDelete(admin);
    setShowDeleteConfirmation(true);
  };
  
  // Cancel admin deletion
  const cancelDeleteAdmin = () => {
    setAdminToDelete(null);
    setShowDeleteConfirmation(false);
  };
  
  // Handle admin deletion
  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    
    try {
      setDeleting(true);
      await deleteAdmin(adminToDelete.admin_id);
      
      // Success! Update the UI
      toast.success(`Admin ${adminToDelete.first_name} ${adminToDelete.last_name} has been removed`);
      
      // Close the modal and reset state
      setAdminToDelete(null);
      setShowDeleteConfirmation(false);
      
      // Refresh the admin list
      fetchAllAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error(error.message || 'Failed to delete admin');
    } finally {
      setDeleting(false);
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Account Settings" />
        
        <div className="admin-settings-container">
          {/* Profile Card */}
          <div className="admin-profile-card">
            <h2>Admin Profile</h2>
            
            {loading ? (
              <div className="loading-indicator">Loading profile information...</div>
            ) : (
              <>
                {!editMode ? (
                  <div className="profile-details">
                    <div className="profile-avatar">
                      <span>{profile.first_name?.[0]}{profile.last_name?.[0]}</span>
                    </div>
                    
                    <div className="profile-info">
                      <p><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
                      <p><strong>Email:</strong> {profile.email}</p>
                      <p><strong>Phone:</strong> {profile.phone_number || 'Not provided'}</p>
                      <p><strong>Joined:</strong> {formatDate(profile.created_at)}</p>
                    </div>
                    
                    <div className="profile-actions">
                      <button className="edit-profile-btn" onClick={toggleEditMode}>
                        Edit Profile
                      </button>
                      <button 
                        className="change-password-btn" 
                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                ) : (
                  <form className="edit-profile-form" onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                      <label htmlFor="first_name">First Name</label>
                      <input 
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="last_name">Last Name</label>
                      <input 
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input 
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="phone_number">Phone Number</label>
                      <input 
                        type="text"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number || ''}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={toggleEditMode}
                        disabled={updating}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="save-btn"
                        disabled={updating}
                      >
                        {updating ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}
                
                {showPasswordForm && (
                  <div className="password-change-section">
                    <h3>Change Password</h3>
                    <form onSubmit={handleChangePassword}>
                      <div className="form-group">
                        <label htmlFor="currentPassword">Current Password</label>
                        <input 
                          type="password"
                          id="currentPassword"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="newPassword">New Password</label>
                        <input 
                          type="password"
                          id="newPassword"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input 
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                      </div>
                      
                      <div className="form-actions">
                        <button 
                          type="button" 
                          className="cancel-btn"
                          onClick={() => setShowPasswordForm(false)}
                          disabled={changingPassword}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          className="save-btn"
                          disabled={changingPassword}
                        >
                          {changingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Admin Management Section - Only visible to super admin */}
          {isSuperAdmin && (
            <div className="admin-profile-card">
              <div className="card-header-with-action">
                <h2>Manage Administrators</h2>
                <button 
                  className="add-admin-toggle-btn" 
                  onClick={toggleAddAdminForm}
                >
                  {showAddAdminForm ? 'Cancel' : '+ Add New Admin'}
                </button>
              </div>
              
              {showAddAdminForm ? (
                <div className="add-admin-section">
                  <h3>Create New Administrator</h3>
                  <form className="add-admin-form" onSubmit={handleCreateAdmin}>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="new_first_name">First Name</label>
                        <input 
                          type="text"
                          id="new_first_name"
                          name="first_name"
                          value={newAdminData.first_name}
                          onChange={handleNewAdminChange}
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="new_last_name">Last Name</label>
                        <input 
                          type="text"
                          id="new_last_name"
                          name="last_name"
                          value={newAdminData.last_name}
                          onChange={handleNewAdminChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="new_email">Email</label>
                      <input 
                        type="email"
                        id="new_email"
                        name="email"
                        value={newAdminData.email}
                        onChange={handleNewAdminChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="new_phone">Phone Number (optional)</label>
                      <input 
                        type="text"
                        id="new_phone"
                        name="phone_number"
                        value={newAdminData.phone_number}
                        onChange={handleNewAdminChange}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="new_password">Password</label>
                        <input 
                          type="password"
                          id="new_password"
                          name="password"
                          value={newAdminData.password}
                          onChange={handleNewAdminChange}
                          required
                          minLength="6"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="new_confirm_password">Confirm Password</label>
                        <input 
                          type="password"
                          id="new_confirm_password"
                          name="confirmPassword"
                          value={newAdminData.confirmPassword}
                          onChange={handleNewAdminChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        type="button" 
                        className="cancel-btn"
                        onClick={toggleAddAdminForm}
                        disabled={creatingAdmin}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="save-btn"
                        disabled={creatingAdmin}
                      >
                        {creatingAdmin ? 'Creating...' : 'Create Admin'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Admin List Table */}
                  <div className="admin-list-section">
                    <h3>Administrator List</h3>
                    
                    {loadingAdmins ? (
                      <div className="loading-indicator">Loading administrators...</div>
                    ) : admins.length > 0 ? (
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admins.map(admin => (
                              <tr key={admin.admin_id} className={admin.admin_id === profile.admin_id ? 'current-admin-row' : ''}>
                                <td>{admin.first_name} {admin.last_name} {admin.admin_id === profile.admin_id ? '(You)' : ''}</td>
                                <td>{admin.email}</td>
                                <td>{admin.phone_number || 'N/A'}</td>
                                <td>{formatDate(admin.created_at)}</td>
                                <td>
                                  <div className="admin-actions">
                                    <button 
                                      className="view-details-btn"
                                      onClick={() => handleViewAdminDetails(admin)}
                                    >
                                      View
                                    </button>
                                    {/* Only show delete button for other admins */}
                                    {admin.admin_id !== profile.admin_id && (
                                      <button 
                                        className="delete-admin-btn"
                                        onClick={() => confirmDeleteAdmin(admin)}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="admin-info-message">
                        <p>No administrators found. Add your first admin using the button above.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Restaurant Operating Hours Section */}
          <div className="admin-profile-card">
            <h2>Restaurant Operating Hours</h2>
            <OperatingHours />
          </div>
          
          {/* For non-super admins, show message about admin permissions */}
          {!isSuperAdmin && (
            <div className="admin-profile-card">
              <h2>Administrator Privileges</h2>
              <div className="admin-info-message">
                <p>Only the primary administrator (first created in the system) has the ability to add or remove other administrators.</p>
                <p>If you need to add or remove administrators, please contact the primary administrator.</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Admin Details Modal */}
        {showAdminDetails && selectedAdmin && (
          <div className="modal-overlay">
            <div className="modal-content admin-details-modal">
              <div className="modal-header">
                <h2>Administrator Details</h2>
                <button className="close-modal-btn" onClick={closeAdminDetails}>×</button>
              </div>
              <div className="modal-body">
                <div className="admin-detail-content">
                  <div className="admin-avatar large">
                    <span>{selectedAdmin.first_name?.[0]}{selectedAdmin.last_name?.[0]}</span>
                  </div>
                  
                  <div className="admin-detail-info">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedAdmin.first_name} {selectedAdmin.last_name}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{selectedAdmin.email}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedAdmin.phone_number || 'Not provided'}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Account Created:</span>
                      <span className="detail-value">{formatDate(selectedAdmin.created_at)}</span>
                    </div>
                    
                    <div className="detail-item">
                      <span className="detail-label">Last Updated:</span>
                      <span className="detail-value">{formatDate(selectedAdmin.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="close-btn" onClick={closeAdminDetails}>Close</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && adminToDelete && (
          <div className="modal-overlay">
            <div className="modal-content delete-confirmation-modal">
              <div className="modal-header">
                <h2>Confirm Admin Removal</h2>
                <button className="close-modal-btn" onClick={cancelDeleteAdmin}>×</button>
              </div>
              <div className="modal-body">
                <div className="delete-warning">
                  <p>Are you sure you want to remove the following administrator?</p>
                  <p className="admin-to-delete">
                    <strong>{adminToDelete.first_name} {adminToDelete.last_name}</strong> ({adminToDelete.email})
                  </p>
                  <p className="warning-text">This action cannot be undone.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="cancel-btn" 
                  onClick={cancelDeleteAdmin}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button 
                  className="delete-btn" 
                  onClick={handleDeleteAdmin}
                  disabled={deleting}
                >
                  {deleting ? 'Removing...' : 'Remove Admin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminSettings;
