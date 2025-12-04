import React, { useState, useEffect } from 'react';
import { getAllTimeEntries, getAllUsers, calculateWorkTime } from '../firebase/timeService';
import { isAdmin, getCurrentUserEmail } from '../firebase/authService';
import './Admin.css';

function Admin() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('today'); // 'today', 'all', 'users'

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
      if (view === 'today' || view === 'all') {
        const date = view === 'today' ? new Date(selectedDate) : null;
        const entries = await getAllTimeEntries(date);
        setTimeEntries(entries);
      }
      
      if (view === 'users') {
        const usersList = await getAllUsers();
        setUsers(usersList);
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

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-title-section">
          <h1>📊 Admin Dashboard</h1>
          <p className="admin-welcome">Welcome, {getCurrentUserEmail()}</p>
        </div>
        <div className="admin-nav">
          <button onClick={() => window.location.href = '/'} className="back-button">
            ← Back to TimeTracker
          </button>
        </div>
      </div>
      
      <div className="admin-controls">
        <div className="view-tabs">
          <button 
            className={view === 'today' ? 'tab active' : 'tab'}
            onClick={() => setView('today')}
          >
            Today
          </button>
          <button 
            className={view === 'all' ? 'tab active' : 'tab'}
            onClick={() => setView('all')}
          >
            All Recent
          </button>
          <button 
            className={view === 'users' ? 'tab active' : 'tab'}
            onClick={() => setView('users')}
          >
            Users
          </button>
        </div>
        
        {view === 'today' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-picker"
          />
        )}
      </div>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      )}

      {!loading && view === 'users' && (
        <div className="users-section">
          <h2>Registered Users ({users.length})</h2>
          <div className="users-grid">
            {users.map((user) => (
              <div key={user.userId} className="user-card">
                <div className="user-avatar">👤</div>
                <div className="user-info">
                  <div className="user-name">{user.userName}</div>
                  <div className="user-email">{user.userEmail}</div>
                  <div className="user-last-seen">
                    Last seen: {formatDateTime(user.lastSeen).date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (view === 'today' || view === 'all') && (
        <div className="entries-section">
          <div className="entries-summary">
            <h2>
              {view === 'today' ? `Entries for ${new Date(selectedDate).toLocaleDateString()}` : 'Recent Entries'} 
              ({timeEntries.length})
            </h2>
          </div>

          {view === 'today' && timeEntries.length > 0 && (
            <div className="daily-summary">
              <h3>Daily Summary by User</h3>
              <div className="summary-grid">
                {Object.entries(groupEntriesByUser()).map(([userId, userData]) => {
                  const workTime = calculateWorkTime(userData.entries);
                  return (
                    <div key={userId} className="summary-card">
                      <div className="summary-user">{userData.userName}</div>
                      <div className="summary-time">{workTime.formattedTime}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="entries-table">
            <div className="table-header">
              <span>User</span>
              <span>Action</span>
              <span>Date</span>
              <span>Time</span>
              <span>Location</span>
            </div>
            
            {timeEntries.map((entry) => {
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
                  <div className="date-cell">{dateTime.date}</div>
                  <div className="time-cell">{dateTime.time}</div>
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
                      <span className="location-unavailable">📍 Not available</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {timeEntries.length === 0 && (
            <div className="no-data">
              <p>No time entries found for the selected period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;