import React, { useState, useEffect } from 'react';
import { getAllTimeEntries, getAllUsers, calculateWorkTime, getTodayEntries } from '../firebase/timeService';
import { isAdmin, getCurrentUserEmail, signOutUser } from '../firebase/authService';
import './Admin.css';

function Admin() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'entries', 'users'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    todayEntries: 0,
    clockedInNow: 0
  });

  // Check if user is admin on component mount
  useEffect(() => {
    if (!isAdmin()) {
      // Redirect to main page if not admin
      window.location.href = '/';
      return;
    }
    loadData();
  }, [selectedDate, view]);

  // If not admin, show access denied
  if (!isAdmin()) {
    return (
      <div className="admin-container">
        <div className="access-denied">
          <h1>🚫 Access Denied</h1>
          <p>You don't have permission to access the admin panel.</p>
          <p>Current user: {getCurrentUserEmail() || 'Not signed in'}</p>
          <button onClick={() => window.location.href = '/'} className="back-button">
            Back to TimeTracker
          </button>
        </div>
      </div>
    );
  }

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users
      const usersList = await getAllUsers();
      setUsers(usersList);
      
      // Load entries based on view
      if (view === 'entries') {
        const date = selectedDate ? new Date(selectedDate) : null;
        const entries = await getAllTimeEntries(date);
        setTimeEntries(entries);
      } else if (view === 'dashboard') {
        // Load today's entries for dashboard stats
        const todayEntries = await getTodayEntries();
        setTimeEntries(todayEntries);
        
        // Calculate stats
        const activeUsers = new Set(todayEntries.map(e => e.userId));
        const clockedIn = todayEntries.reduce((acc, entry, idx, arr) => {
          const userLastEntry = arr.filter(e => e.userId === entry.userId).sort((a, b) => b.timestamp - a.timestamp)[0];
          return userLastEntry.type === 'clock-in' ? acc + 1 : acc;
        }, 0);
        
        setStats({
          totalUsers: usersList.length,
          activeToday: activeUsers.size,
          todayEntries: todayEntries.length,
          clockedInNow: Math.max(0, clockedIn)
        });
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    const date = timestamp.toDate();
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getUserWorkTime = (userId) => {
    const userEntries = timeEntries.filter(entry => entry.userId === userId);
    return calculateWorkTime(userEntries);
  };

  const groupEntriesByUser = () => {
    const grouped = {};
    timeEntries.forEach(entry => {
      if (!grouped[entry.userId]) {
        grouped[entry.userId] = {
          userName: entry.userName,
          userEmail: entry.userEmail,
          entries: []
        };
      }
      grouped[entry.userId].entries.push(entry);
    });
    return grouped;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedAndFilteredEntries = () => {
    let filtered = [...timeEntries];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.location?.address && entry.location.address.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortField) {
        case 'user':
          aVal = a.userName.toLowerCase();
          bVal = b.userName.toLowerCase();
          break;
        case 'timestamp':
          aVal = a.timestamp.seconds;
          bVal = b.timestamp.seconds;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };

  const getSortedUsers = () => {
    return [...users].sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.userName.localeCompare(b.userName)
          : b.userName.localeCompare(a.userName);
      } else if (sortField === 'lastSeen') {
        return sortDirection === 'asc'
          ? a.lastSeen.seconds - b.lastSeen.seconds
          : b.lastSeen.seconds - a.lastSeen.seconds;
      }
      return 0;
    });
  };

  const getFilteredUsers = () => {
    const filtered = getSortedUsers();
    
    if (searchTerm) {
      return filtered.filter(user =>
        user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getUserStats = (userId) => {
    const userEntries = timeEntries.filter(e => e.userId === userId);
    const lastEntry = userEntries.length > 0 ? userEntries[userEntries.length - 1] : null;
    const isClocked = lastEntry && lastEntry.type === 'clock-in';
    
    return {
      totalEntries: userEntries.length,
      isClocked,
      lastEntry
    };
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      window.location.href = '/';
    } catch (error) {
      // Silently handle error
    }
  };

  return (
    <div className="admin-container-pc">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>⏰ TimeTracker</h2>
          <p className="sidebar-subtitle">Admin Panel</p>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={view === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
          <button 
            className={view === 'entries' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('entries')}
          >
            <span className="nav-icon">📋</span>
            <span>Time Entries</span>
          </button>
          <button 
            className={view === 'users' ? 'nav-item active' : 'nav-item'}
            onClick={() => setView('users')}
          >
            <span className="nav-icon">👥</span>
            <span>Users</span>
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-avatar">👤</div>
            <div>
              <div className="admin-name">Admin</div>
              <div className="admin-email">{getCurrentUserEmail()}</div>
            </div>
          </div>
          <button onClick={() => window.location.href = '/'} className="sidebar-back-btn">
            ← Back to App
          </button>
          <button onClick={handleSignOut} className="sidebar-signout-btn">
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <div className="admin-main-header">
          <div>
            <h1 className="page-title">
              {view === 'dashboard' && '📊 Dashboard'}
              {view === 'entries' && '📋 Time Entries'}
              {view === 'users' && '👥 User Management'}
            </h1>
            <p className="page-subtitle">
              {view === 'dashboard' && 'Overview of system activity'}
              {view === 'entries' && 'View and manage all time entries'}
              {view === 'users' && 'Manage users and access'}
            </p>
          </div>
          <div className="header-actions">
            {(view === 'entries' || view === 'users') && (
              <input
                type="text"
                placeholder="🔍 Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            )}
            {view === 'entries' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {/* Dashboard View */}
            {view === 'dashboard' && (
              <div className="dashboard-content">
                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.totalUsers}</div>
                      <div className="stat-label">Total Users</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🟢</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.activeToday}</div>
                      <div className="stat-label">Active Today</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.todayEntries}</div>
                      <div className="stat-label">Today's Entries</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⏰</div>
                    <div className="stat-info">
                      <div className="stat-value">{stats.clockedInNow}</div>
                      <div className="stat-label">Clocked In Now</div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="dashboard-section">
                  <h2 className="section-title">Recent Activity</h2>
                  <div className="activity-table">
                    <div className="table-header">
                      <span>User</span>
                      <span>Action</span>
                      <span>Time</span>
                      <span>Location</span>
                    </div>
                    {timeEntries.slice(0, 10).map((entry) => {
                      const dateTime = formatDateTime(entry.timestamp);
                      return (
                        <div key={entry.id} className="table-row">
                          <div className="user-cell">
                            <div className="user-name">{entry.userName}</div>
                            <div className="user-email">{entry.userEmail}</div>
                          </div>
                          <div className={`action-cell ${entry.type}`}>
                            {entry.type === 'clock-in' ? '🟢 Clock In' : '🔴 Clock Out'}
                          </div>
                          <div className="time-cell">{dateTime.time}</div>
                          <div className="location-cell">
                            {entry.location?.address || entry.location ? '📍 ' + (entry.location.address || 'Coordinates available') : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* User Summary */}
                <div className="dashboard-section">
                  <h2 className="section-title">User Summary</h2>
                  <div className="summary-grid">
                    {Object.entries(groupEntriesByUser()).map(([userId, userData]) => {
                      const workTime = calculateWorkTime(userData.entries);
                      return (
                        <div key={userId} className="summary-card">
                          <div className="summary-user">{userData.userName}</div>
                          <div className="summary-time">{workTime.formattedTime}</div>
                          <div className="summary-entries">{userData.entries.length} entries</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Entries View */}
            {view === 'entries' && (
              <div className="entries-content">
                <div className="content-card">
                  <div className="card-header">
                    <h2>Time Entries ({getSortedAndFilteredEntries().length})</h2>
                  </div>
                  <div className="entries-table-pc">
                    <div className="table-header">
                      <span onClick={() => handleSort('user')} className="sortable">
                        User {sortField === 'user' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                      <span onClick={() => handleSort('type')} className="sortable">
                        Action {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                      <span onClick={() => handleSort('timestamp')} className="sortable">
                        Date & Time {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                      <span>Location</span>
                    </div>
                    {getSortedAndFilteredEntries().map((entry) => {
                      const dateTime = formatDateTime(entry.timestamp);
                      return (
                        <div key={entry.id} className="table-row">
                          <div className="user-cell">
                            <div className="user-name">{entry.userName}</div>
                            <div className="user-email">{entry.userEmail}</div>
                          </div>
                          <div className={`action-cell ${entry.type}`}>
                            {entry.type === 'clock-in' ? '🟢 Clock In' : '🔴 Clock Out'}
                          </div>
                          <div className="datetime-cell">
                            <div>{dateTime.date}</div>
                            <div className="time-small">{dateTime.time}</div>
                          </div>
                          <div className="location-cell">
                            {entry.location ? (
                              entry.location.address ? (
                                <span className="location-address" title={`${entry.location.latitude}, ${entry.location.longitude}`}>
                                  📍 {entry.location.address}
                                </span>
                              ) : (
                                <span className="location-coordinates" title="Address unavailable">
                                  📍 {entry.location.latitude.toFixed(6)}, {entry.location.longitude.toFixed(6)}
                                </span>
                              )
                            ) : (
                              <span className="location-unavailable">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {getSortedAndFilteredEntries().length === 0 && (
                    <div className="no-data">
                      <p>No entries found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users View */}
            {view === 'users' && (
              <div className="users-content">
                <div className="content-card">
                  <div className="card-header">
                    <h2>Registered Users ({getFilteredUsers().length})</h2>
                  </div>
                  <div className="users-table-pc">
                    <div className="table-header">
                      <span onClick={() => handleSort('name')} className="sortable">
                        Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                      <span>Email</span>
                      <span onClick={() => handleSort('lastSeen')} className="sortable">
                        Last Seen {sortField === 'lastSeen' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </span>
                      <span>Status</span>
                      <span>Activity</span>
                    </div>
                    {getFilteredUsers().map((user) => {
                      const dateTime = formatDateTime(user.lastSeen);
                      const stats = getUserStats(user.userId);
                      return (
                        <div key={user.userId} className="table-row">
                          <div className="user-cell">
                            <div className="user-avatar-small">👤</div>
                            <div className="user-name">{user.userName}</div>
                          </div>
                          <div className="email-cell">{user.userEmail}</div>
                          <div className="date-cell">
                            <div>{dateTime.date}</div>
                            <div className="time-small">{dateTime.time}</div>
                          </div>
                          <div className="status-cell">
                            {stats.isClocked ? (
                              <span className="status-badge clocked-in">🟢 Clocked In</span>
                            ) : (
                              <span className="status-badge clocked-out">🔴 Clocked Out</span>
                            )}
                          </div>
                          <div className="activity-cell">
                            <span className="activity-count">{stats.totalEntries} entries today</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {getFilteredUsers().length === 0 && (
                    <div className="no-data">
                      <p>No users found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Admin;