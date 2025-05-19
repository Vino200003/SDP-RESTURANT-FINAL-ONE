import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { getAllStaff } from '../services/staffService';
import '../styles/StaffAttendanceManagement.css';

function StaffAttendanceManagement() {
  // State for staff and attendance data
  const [staff, setStaff] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isServerDown, setIsServerDown] = useState(false);
  
  // State for attendance operations
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  // State for stats
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    averageWorkingHours: 0
  });
  
  // State for filters
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    date: selectedDate,
    searchTerm: '',
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  
  // State for form
  const [attendanceForm, setAttendanceForm] = useState({
    staff_id: '',
    date: selectedDate,
    status: 'present',
    check_in_time: '',
    check_out_time: '',
    notes: ''
  });
  
  // Load staff and attendance on component mount
  useEffect(() => {
    fetchStaffData();
    fetchAttendanceData();
  }, []);
  
  // Update filtered staff when filters change
  useEffect(() => {
    filterStaffAttendance();
  }, [staff, attendanceRecords, filters]);
  
  // Fetch staff data
  const fetchStaffData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllStaff();
      setStaff(data);
      setIsServerDown(false);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setIsServerDown(true);
      // Mock data for demo if server is down
      setStaff([
        { staff_id: 1, first_name: 'John', last_name: 'Doe', role: 'waiter', active: true },
        { staff_id: 2, first_name: 'Jane', last_name: 'Smith', role: 'chef', active: true },
        { staff_id: 3, first_name: 'Mike', last_name: 'Johnson', role: 'delivery', active: true },
        { staff_id: 4, first_name: 'Sarah', last_name: 'Williams', role: 'waiter', active: true },
        { staff_id: 5, first_name: 'David', last_name: 'Brown', role: 'chef', active: false }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch attendance data (mock function - would be replaced with actual API call)
  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      // This would be replaced with an actual API call in production
      // const data = await getAttendanceRecords(filters.date);
      
      // Mock data for demonstration
      const mockAttendance = [
        { id: 1, staff_id: 1, date: selectedDate, status: 'present', check_in_time: '08:55', check_out_time: '17:05', notes: '' },
        { id: 2, staff_id: 2, date: selectedDate, status: 'late', check_in_time: '09:20', check_out_time: '17:30', notes: 'Traffic delay' },
        { id: 3, staff_id: 3, date: selectedDate, status: 'absent', check_in_time: '', check_out_time: '', notes: 'Sick leave' },
        { id: 4, staff_id: 4, date: selectedDate, status: 'present', check_in_time: '08:45', check_out_time: '17:00', notes: '' }
      ];
      
      setAttendanceRecords(mockAttendance);
      calculateStats(mockAttendance);
      
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate attendance statistics
  const calculateStats = (records) => {
    const present = records.filter(record => record.status === 'present').length;
    const absent = records.filter(record => record.status === 'absent').length;
    const late = records.filter(record => record.status === 'late').length;
    const onLeave = records.filter(record => record.status === 'on_leave').length;
    
    // Calculate average working hours for present and late staff
    let totalHours = 0;
    let countWithHours = 0;
    
    records.forEach(record => {
      if ((record.status === 'present' || record.status === 'late') && record.check_in_time && record.check_out_time) {
        const checkIn = new Date(`${record.date}T${record.check_in_time}`);
        const checkOut = new Date(`${record.date}T${record.check_out_time}`);
        const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
        
        if (hoursWorked > 0) {
          totalHours += hoursWorked;
          countWithHours++;
        }
      }
    });
    
    const averageWorkingHours = countWithHours > 0 ? (totalHours / countWithHours) : 0;
    
    setStats({
      present,
      absent,
      late,
      onLeave,
      averageWorkingHours
    });
  };
  
  // Filter staff based on search, role, status
  const filterStaffAttendance = () => {
    if (!staff.length) return;
    
    let filtered = [...staff];
    
    // Filter by role
    if (filters.role !== 'all') {
      filtered = filtered.filter(member => member.role === filters.role);
    }
    
    // Filter by active status (only show active staff by default)
    filtered = filtered.filter(member => member.active);
    
    // Apply search term
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(search) ||
        member.staff_id.toString().includes(search)
      );
    }
    
    // Map attendance status to staff
    const staffWithAttendance = filtered.map(member => {
      const attendanceRecord = attendanceRecords.find(record => 
        record.staff_id === member.staff_id && record.date === filters.date
      );
      
      return {
        ...member,
        attendance: attendanceRecord || {
          status: 'not_marked',
          check_in_time: '',
          check_out_time: '',
          notes: ''
        }
      };
    });
    
    // Filter by attendance status if needed
    if (filters.status !== 'all') {
      const filteredByStatus = staffWithAttendance.filter(member => 
        member.attendance.status === filters.status
      );
      setFilteredStaff(filteredByStatus);
    } else {
      setFilteredStaff(staffWithAttendance);
    }
  };
  
  // Handle date change
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    setFilters({...filters, date: newDate});
    
    // In a real app, this would fetch new attendance data for the selected date
    // For now, we'll just leave the mock data as is
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({...filters, [name]: value});
  };
  
  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setAttendanceForm({...attendanceForm, [name]: value});
  };
  
  // Handle marking attendance for a single staff member
  const handleMarkAttendance = (staffMember, status = 'present') => {
    setSelectedStaff(staffMember);
    
    // Set default times based on status
    let checkInTime = '';
    let checkOutTime = '';
    
    if (status === 'present') {
      checkInTime = '09:00';
      checkOutTime = '17:00';
    } else if (status === 'late') {
      checkInTime = '09:30';
      checkOutTime = '17:00';
    }
    
    setAttendanceForm({
      staff_id: staffMember.staff_id,
      date: filters.date,
      status: status,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      notes: ''
    });
    
    setShowAddModal(true);
  };
  
  // Handle submitting attendance record
  const handleSubmitAttendance = (e) => {
    e.preventDefault();
    
    // In a real application, this would make an API call to save the attendance record
    // For demonstration, we'll just update the local state
    
    const existingIndex = attendanceRecords.findIndex(record => 
      record.staff_id === attendanceForm.staff_id && record.date === attendanceForm.date
    );
    
    if (existingIndex >= 0) {
      // Update existing record
      const updatedRecords = [...attendanceRecords];
      updatedRecords[existingIndex] = {
        ...updatedRecords[existingIndex],
        status: attendanceForm.status,
        check_in_time: attendanceForm.check_in_time,
        check_out_time: attendanceForm.check_out_time,
        notes: attendanceForm.notes
      };
      
      setAttendanceRecords(updatedRecords);
      calculateStats(updatedRecords);
    } else {
      // Add new record
      const newRecord = {
        id: Date.now(), // Generate a temporary ID
        staff_id: attendanceForm.staff_id,
        date: attendanceForm.date,
        status: attendanceForm.status,
        check_in_time: attendanceForm.check_in_time,
        check_out_time: attendanceForm.check_out_time,
        notes: attendanceForm.notes
      };
      
      const updatedRecords = [...attendanceRecords, newRecord];
      setAttendanceRecords(updatedRecords);
      calculateStats(updatedRecords);
    }
    
    // Close the modal and reset form
    setShowAddModal(false);
    setSelectedStaff(null);
  };
  
  // Handle bulk attendance marking
  const handleBulkAttendance = () => {
    // Show the bulk attendance modal
    setShowBulkModal(true);
  };
  
  // Submit bulk attendance
  const handleSubmitBulkAttendance = (status) => {
    // In a real app, this would make an API call
    // For now, we'll mark all filtered staff with the selected status
    
    const updatedRecords = [...attendanceRecords];
    
    filteredStaff.forEach(staffMember => {
      const existingIndex = updatedRecords.findIndex(record => 
        record.staff_id === staffMember.staff_id && record.date === filters.date
      );
      
      // Default times based on status
      let checkInTime = '';
      let checkOutTime = '';
      
      if (status === 'present') {
        checkInTime = '09:00';
        checkOutTime = '17:00';
      } else if (status === 'late') {
        checkInTime = '09:30';
        checkOutTime = '17:00';
      }
      
      if (existingIndex >= 0) {
        // Update existing record
        updatedRecords[existingIndex] = {
          ...updatedRecords[existingIndex],
          status: status,
          check_in_time: checkInTime,
          check_out_time: checkOutTime
        };
      } else {
        // Add new record
        updatedRecords.push({
          id: Date.now() + staffMember.staff_id, // Generate a temporary ID
          staff_id: staffMember.staff_id,
          date: filters.date,
          status: status,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          notes: ''
        });
      }
    });
    
    setAttendanceRecords(updatedRecords);
    calculateStats(updatedRecords);
    setShowBulkModal(false);
  };
  
  // Get status badge class based on attendance status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'present': return 'status-present';
      case 'absent': return 'status-absent';
      case 'late': return 'status-late';
      case 'on_leave': return 'status-leave';
      case 'not_marked': return 'status-not-marked';
      default: return '';
    }
  };
  
  // Format status text
  const formatStatus = (status) => {
    switch (status) {
      case 'not_marked': return 'Not Marked';
      case 'on_leave': return 'On Leave';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // Generate monthly calendar
  const generateCalendar = () => {
    const year = filters.year;
    const month = filters.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const calendar = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendar.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Count attendance status for this day
      const dayRecords = attendanceRecords.filter(record => record.date === date);
      const presentCount = dayRecords.filter(record => record.status === 'present').length;
      const absentCount = dayRecords.filter(record => record.status === 'absent').length;
      const lateCount = dayRecords.filter(record => record.status === 'late').length;
      
      const isToday = date === new Date().toISOString().split('T')[0];
      const isSelected = date === filters.date;
      
      calendar.push(
        <div 
          key={day} 
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => handleDateChange({ target: { value: date } })}
        >
          <div className="calendar-day-header">{day}</div>
          {dayRecords.length > 0 ? (
            <div className="attendance-indicators">
              {presentCount > 0 && <span className="indicator present">{presentCount}</span>}
              {lateCount > 0 && <span className="indicator late">{lateCount}</span>}
              {absentCount > 0 && <span className="indicator absent">{absentCount}</span>}
            </div>
          ) : (
            <div className="no-attendance">No data</div>
          )}
        </div>
      );
    }
    
    return calendar;
  };
  
  // Handle month navigation in calendar
  const handleMonthChange = (increment) => {
    let newMonth = filters.month + increment;
    let newYear = filters.year;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    
    setFilters({
      ...filters,
      month: newMonth,
      year: newYear
    });
  };
  
  // Format month name
  const getMonthName = (monthIndex) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  };

  // Handle check-in action
  const handleCheckIn = (staffMember) => {
    const now = new Date();
    const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const existingIndex = attendanceRecords.findIndex(record => 
      record.staff_id === staffMember.staff_id && record.date === filters.date
    );
    
    if (existingIndex >= 0) {
      // Update existing record
      const updatedRecords = [...attendanceRecords];
      updatedRecords[existingIndex] = {
        ...updatedRecords[existingIndex],
        status: 'present',
        check_in_time: checkInTime
      };
      
      setAttendanceRecords(updatedRecords);
      calculateStats(updatedRecords);
    } else {
      // Add new record
      const newRecord = {
        id: Date.now(), // Generate a temporary ID
        staff_id: staffMember.staff_id,
        date: filters.date,
        status: 'present',
        check_in_time: checkInTime,
        check_out_time: '',
        notes: ''
      };
      
      const updatedRecords = [...attendanceRecords, newRecord];
      setAttendanceRecords(updatedRecords);
      calculateStats(updatedRecords);
    }
  };
  
  // Handle check-out action
  const handleCheckOut = (staffMember) => {
    const now = new Date();
    const checkOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const existingIndex = attendanceRecords.findIndex(record => 
      record.staff_id === staffMember.staff_id && record.date === filters.date
    );
    
    if (existingIndex >= 0) {
      // Update existing record
      const updatedRecords = [...attendanceRecords];
      updatedRecords[existingIndex] = {
        ...updatedRecords[existingIndex],
        check_out_time: checkOutTime
      };
      
      setAttendanceRecords(updatedRecords);
      calculateStats(updatedRecords);
    } else {
      // Add new record - rare case, but handle it
      const newRecord = {
        id: Date.now(), // Generate a temporary ID
        staff_id: staffMember.staff_id,
        date: filters.date,
        status: 'present',
        check_in_time: '09:00', // Default check-in time
        check_out_time: checkOutTime,
        notes: 'Check-out recorded without check-in'
      };
      
      const updatedRecords = [...attendanceRecords, newRecord];
      setAttendanceRecords(updatedRecords);
      calculateStats(updatedRecords);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="dashboard-content">
        <Header title="Staff Attendance Management" />
        
        {/* Server status warning */}
        {isServerDown && (
          <div className="server-status-notification warning">
            <p>
              <strong>Notice:</strong> Cannot connect to the server. Showing mock data that may not reflect your actual staff attendance.
            </p>
          </div>
        )}
        
        {/* Attendance Stats */}
        <div className="attendance-overview">
          <div className="date-selector">
            <label htmlFor="attendance-date">Attendance Date:</label>
            <input 
              type="date" 
              id="attendance-date" 
              value={filters.date}
              onChange={handleDateChange}
            />
          </div>
          
          <div className="attendance-stats">
            <div className="stat-card present">
              <h3>Present</h3>
              <p className="stat-number">{stats.present}</p>
            </div>
            <div className="stat-card absent">
              <h3>Absent</h3>
              <p className="stat-number">{stats.absent}</p>
            </div>
            <div className="stat-card late">
              <h3>Late</h3>
              <p className="stat-number">{stats.late}</p>
            </div>
            <div className="stat-card leave">
              <h3>On Leave</h3>
              <p className="stat-number">{stats.onLeave}</p>
            </div>
            <div className="stat-card hours">
              <h3>Avg. Hours</h3>
              <p className="stat-number">{stats.averageWorkingHours.toFixed(1)}</p>
            </div>
          </div>
        </div>
        
        {/* Monthly Attendance Calendar */}
        <div className="monthly-calendar-section">
          <div className="calendar-header">
            <h2>Monthly Attendance Overview</h2>
            <div className="calendar-navigation">
              <button onClick={() => handleMonthChange(-1)} className="month-nav-btn">
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="current-month">{getMonthName(filters.month)} {filters.year}</span>
              <button onClick={() => handleMonthChange(1)} className="month-nav-btn">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
          
          <div className="calendar-container">
            <div className="calendar-weekdays">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>
            <div className="calendar-days">
              {generateCalendar()}
            </div>
          </div>
        </div>
        
        {/* Filters section */}
        <div className="filters-section">
          <div className="search-and-filter">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
              />
            </div>
            
            <div className="filter-options">
              <select 
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
              >
                <option value="all">All Roles</option>
                <option value="waiter">Waiters</option>
                <option value="chef">Chefs</option>
                <option value="delivery">Delivery Staff</option>
              </select>
              
              <select 
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="on_leave">On Leave</option>
                <option value="not_marked">Not Marked</option>
              </select>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              className="mark-all-btn"
              onClick={handleBulkAttendance}
            >
              Bulk Mark Attendance
            </button>
          </div>
        </div>
        
        {/* Attendance Table */}
        {isLoading ? (
          <div className="loading">Loading staff attendance...</div>
        ) : (
          <div className="attendance-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Check-in Time</th>
                  <th>Check-out Time</th>
                  <th>Working Hours</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staffMember) => {
                    // Calculate working hours if both check-in and check-out times exist
                    let workingHours = '-';
                    if (staffMember.attendance.check_in_time && staffMember.attendance.check_out_time) {
                      const checkIn = new Date(`${filters.date}T${staffMember.attendance.check_in_time}`);
                      const checkOut = new Date(`${filters.date}T${staffMember.attendance.check_out_time}`);
                      const hours = (checkOut - checkIn) / (1000 * 60 * 60);
                      workingHours = hours.toFixed(2);
                    }
                    
                    return (
                      <tr key={staffMember.staff_id}>
                        <td>{staffMember.staff_id}</td>
                        <td>{`${staffMember.first_name} ${staffMember.last_name}`}</td>
                        <td>{staffMember.role}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(staffMember.attendance.status)}`}>
                            {formatStatus(staffMember.attendance.status)}
                          </span>
                        </td>
                        <td>
                          {staffMember.attendance.check_in_time || '-'}
                          {!staffMember.attendance.check_in_time && (
                            <button 
                              className="check-time-btn check-in-btn" 
                              onClick={() => handleCheckIn(staffMember)}
                            >
                              Check In
                            </button>
                          )}
                        </td>
                        <td>
                          {staffMember.attendance.check_out_time || '-'}
                          {staffMember.attendance.check_in_time && !staffMember.attendance.check_out_time && (
                            <button 
                              className="check-time-btn check-out-btn" 
                              onClick={() => handleCheckOut(staffMember)}
                            >
                              Check Out
                            </button>
                          )}
                        </td>
                        <td>{workingHours}</td>
                        <td className="notes-cell">{staffMember.attendance.notes || '-'}</td>
                        <td>
                          <div className="attendance-actions">
                            {staffMember.attendance.status === 'not_marked' ? (
                              <>
                                <button 
                                  className="mark-present-btn"
                                  onClick={() => handleMarkAttendance(staffMember, 'present')}
                                >
                                  Mark Present
                                </button>
                                <button 
                                  className="mark-absent-btn"
                                  onClick={() => handleMarkAttendance(staffMember, 'absent')}
                                >
                                  Mark Absent
                                </button>
                              </>
                            ) : (
                              <button 
                                className="edit-attendance-btn"
                                onClick={() => handleMarkAttendance(staffMember, staffMember.attendance.status)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
        
        {/* Add/Edit Attendance Modal */}
        {showAddModal && selectedStaff && (
          <div className="modal-overlay">
            <div className="modal-content attendance-form-modal">
              <div className="modal-header">
                <h2>{attendanceForm.status === 'not_marked' ? 'Mark Attendance' : 'Edit Attendance'}</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  &times;
                </button>
              </div>
              <form className="attendance-form" onSubmit={handleSubmitAttendance}>
                <div className="form-group">
                  <label>Staff Member:</label>
                  <input
                    type="text"
                    value={`${selectedStaff.first_name} ${selectedStaff.last_name}`}
                    readOnly
                  />
                </div>
                
                <div className="form-group">
                  <label>Date:</label>
                  <input
                    type="date"
                    name="date"
                    value={attendanceForm.date}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Status:</label>
                  <select
                    name="status"
                    value={attendanceForm.status}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                
                {(attendanceForm.status === 'present' || attendanceForm.status === 'late') && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Check-in Time:</label>
                        <input
                          type="time"
                          name="check_in_time"
                          value={attendanceForm.check_in_time}
                          onChange={handleFormChange}
                          required={attendanceForm.status === 'present' || attendanceForm.status === 'late'}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Check-out Time:</label>
                        <input
                          type="time"
                          name="check_out_time"
                          value={attendanceForm.check_out_time}
                          onChange={handleFormChange}
                          required={attendanceForm.status === 'present' || attendanceForm.status === 'late'}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="form-group">
                  <label>Notes:</label>
                  <textarea
                    name="notes"
                    value={attendanceForm.notes}
                    onChange={handleFormChange}
                    placeholder="Add any notes or comments"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                  >
                    Save Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Bulk Attendance Modal */}
        {showBulkModal && (
          <div className="modal-overlay">
            <div className="modal-content bulk-attendance-modal">
              <div className="modal-header">
                <h2>Bulk Mark Attendance</h2>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowBulkModal(false)}
                >
                  &times;
                </button>
              </div>
              <div className="bulk-attendance-content">
                <p>Mark attendance for {filteredStaff.length} staff members on {filters.date}.</p>
                
                <div className="bulk-action-buttons">
                  <button 
                    className="bulk-present-btn"
                    onClick={() => handleSubmitBulkAttendance('present')}
                  >
                    Mark All Present
                  </button>
                  <button 
                    className="bulk-absent-btn"
                    onClick={() => handleSubmitBulkAttendance('absent')}
                  >
                    Mark All Absent
                  </button>
                  <button 
                    className="bulk-late-btn"
                    onClick={() => handleSubmitBulkAttendance('late')}
                  >
                    Mark All Late
                  </button>
                  <button 
                    className="bulk-leave-btn"
                    onClick={() => handleSubmitBulkAttendance('on_leave')}
                  >
                    Mark All On Leave
                  </button>
                </div>
                
                <div className="cancel-action">
                  <button 
                    className="cancel-btn"
                    onClick={() => setShowBulkModal(false)}
                  >
                    Cancel
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

export default StaffAttendanceManagement;
