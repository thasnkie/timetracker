import React, { useState, useEffect } from 'react';
import { addTimeEntry, getLastTimeEntry, getTodayEntries, getWeekEntries, getAllUserEntries, getAvailableMonths, calculateWorkTime } from '../firebase/timeService';
import { isAuthenticated, getCurrentUserName, isAdmin } from '../firebase/authService';
import LocationService from '../services/locationService';

function TimeTracker({ user, onSignOut }) {
  const [isClocked, setIsClocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayEntries, setTodayEntries] = useState([]);
  const [allTimeEntries, setAllTimeEntries] = useState([]);
  const [weekEntries, setWeekEntries] = useState([]);
  const [totalWorkTime, setTotalWorkTime] = useState({ formattedTime: '0h 0m' });
  const [weekWorkTime, setWeekWorkTime] = useState({ formattedTime: '0h 0m' });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'alltime'
  const [loadingAllTime, setLoadingAllTime] = useState(false);
  const [allTimeLastDoc, setAllTimeLastDoc] = useState(null);
  const [hasMoreEntries, setHasMoreEntries] = useState(true);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or month object
  const [selectedPeriod, setSelectedPeriod] = useState('full'); // 'full', 'first-half', 'second-half'
  const [locationPermission, setLocationPermission] = useState(null); // null, 'granted', 'denied'
  const [gettingLocation, setGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [notes, setNotes] = useState('');
  const [project, setProject] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Predefined project list
  const projects = [
    'General',
    'Development',
    'Marketing',
    'Support',
    'Meetings',
    'Training',
    'Other'
  ];

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadTimeData();
    }
  }, [user]);

  const loadTimeData = async () => {
    try {
      if (!isAuthenticated()) return;

      // Check if user is currently clocked in
      const lastEntry = await getLastTimeEntry();
      setIsClocked(lastEntry && lastEntry.type === 'clock-in');

      // Load today's entries
      const entries = await getTodayEntries();
      setTodayEntries(entries);

      // Load this week's entries (last 7 days)
      const weekData = await getWeekEntries();
      setWeekEntries(weekData);

      // Calculate total work time (exclude 1hr break per day)
      const workTime = calculateWorkTime(entries, true);
      setTotalWorkTime(workTime);

      // Calculate week work time (exclude 1hr break per day)
      const weekTime = calculateWorkTime(weekData, true);
      setWeekWorkTime(weekTime);
    } catch (error) {
      // Silently handle error
    }
  };

  const loadAllTimeEntries = async (loadMore = false) => {
    if (loadingAllTime) return;

    setLoadingAllTime(true);
    try {
      const monthFilter = selectedMonth === 'all' ? null : selectedMonth;
      const startAfter = loadMore ? allTimeLastDoc : null;
      const result = await getAllUserEntries(null, 20, startAfter, monthFilter);
      
      let updatedEntries;
      if (loadMore && !monthFilter) {
        updatedEntries = [...allTimeEntries, ...result.entries];
        setAllTimeEntries(updatedEntries);
      } else {
        updatedEntries = result.entries;
        setAllTimeEntries(updatedEntries);
      }
      
      setAllTimeLastDoc(result.lastDoc);
      setHasMoreEntries(result.hasMore !== false && result.entries.length === 20 && !monthFilter);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoadingAllTime(false);
    }
  };

  const loadAvailableMonths = async () => {
    try {
      const months = await getAvailableMonths();
      setAvailableMonths(months);
    } catch (error) {
      // Silently handle error
    }
  };

  // Handle month selection change
  const handleMonthChange = (event) => {
    const value = event.target.value;
    if (value === 'all') {
      setSelectedMonth('all');
      setSelectedPeriod('full'); // Reset period when viewing all months
    } else {
      const [year, month] = value.split('-').map(Number);
      setSelectedMonth({ year, month });
      setSelectedPeriod('full'); // Reset to full month when changing months
    }
    
    // Reset pagination and reload entries
    setAllTimeLastDoc(null);
    setHasMoreEntries(true);
  };

  // Reload entries when month selection changes
  useEffect(() => {
    if (viewMode === 'alltime' && user) {
      loadAllTimeEntries();
    }
  }, [selectedMonth]);

  // Check location permission on component mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const hasPermission = await LocationService.requestLocationPermission();
      setLocationPermission(hasPermission ? 'granted' : 'denied');
      
      if (hasPermission) {
        startLocationWatching();
      }
    } catch (error) {
      setLocationPermission('denied');
      setLocationError('Location access denied');
    }
  };

  const startLocationWatching = async () => {
    try {
      const watchId = await LocationService.watchPosition((locationData, error) => {
        if (error) {
          setLocationError(error.message);
          setCurrentLocation(null);
        } else {
          setCurrentLocation(locationData);
          setLocationError(null);
        }
      });
      setLocationWatchId(watchId);
    } catch (error) {
      setLocationError('Unable to track location');
    }
  };

  const stopLocationWatching = () => {
    if (locationWatchId) {
      LocationService.stopWatchingPosition(locationWatchId);
      setLocationWatchId(null);
    }
  };

  // Cleanup location watching on unmount
  useEffect(() => {
    return () => {
      stopLocationWatching();
    };
  }, [locationWatchId]);

  const refreshLocation = async () => {
    if (locationPermission !== 'granted') return;
    
    try {
      setLocationError(null);
      const locationData = await LocationService.getLocationWithAddress();
      setCurrentLocation(locationData);
    } catch (error) {
      setLocationError(error.message);
      setCurrentLocation(null);
    }
  };

  const getLocationForTimeEntry = async () => {
    if (locationPermission !== 'granted') {
      return null;
    }

    setGettingLocation(true);
    try {
      const locationData = await LocationService.getLocationWithAddress();
      return locationData;
    } catch (error) {
      // Silently fail location capture - don't block time entry
      return null;
    } finally {
      setGettingLocation(false);
    }
  };

  const handleTimeAction = async () => {
    if (loading || !isAuthenticated()) return;
    
    // Show notes modal before proceeding
    setShowNotesModal(true);
  };
  
  const confirmTimeAction = async () => {
    if (loading || !isAuthenticated()) return;

    setLoading(true);
    setShowNotesModal(false);
    
    try {
      const action = isClocked ? 'clock-out' : 'clock-in';
      
      // Get location data if permission is granted
      const locationData = await getLocationForTimeEntry();
      
      await addTimeEntry(action, null, locationData, notes, project);
      setIsClocked(!isClocked);
      
      // Clear notes and project after submission
      setNotes('');
      setProject('');
      
      await loadTimeData(); // Refresh data
    } catch (error) {
      alert('Failed to record time. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const cancelTimeAction = () => {
    setShowNotesModal(false);
    setNotes('');
    setProject('');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (date) => {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  };

  // Group entries by date for better display
  const groupEntriesByDate = (entries) => {
    const grouped = {};
    
    // Filter entries by selected period if a specific month is selected
    let filteredEntries = entries;
    if (selectedMonth !== 'all' && selectedPeriod !== 'full') {
      filteredEntries = entries.filter(entry => {
        const entryDate = entry.timestamp.toDate();
        const day = entryDate.getDate();
        
        if (selectedPeriod === 'first-half') {
          return day >= 1 && day <= 15;
        } else if (selectedPeriod === 'second-half') {
          return day >= 16;
        }
        return true;
      });
    }
    
    filteredEntries.forEach(entry => {
      const date = entry.timestamp.toDate().toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    
    // Sort entries within each day by timestamp ascending (oldest first)
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        const timeA = a.timestamp.toDate();
        const timeB = b.timestamp.toDate();
        return timeA - timeB;
      });
    });
    
    return grouped;
  };

  // Format month for display
  const formatMonth = (monthObj) => {
    const date = new Date(monthObj.year, monthObj.month);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <h1 className="title">⏰ TimeTracker</h1>
          <div className="header-buttons">
            {isAdmin() && (
              <a href="/admin" className="admin-link">Admin Panel</a>
            )}
            <button className="signout-button" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </div>
        {user && (
          <div className="user-info">
            <span className="user-name">👤 {user.displayName || getCurrentUserName() || 'User'}</span>
            <small>• {isClocked ? '🟢 Clocked In' : '🔴 Clocked Out'}</small>
            {locationPermission && (
              <div className="location-status">
                {locationPermission === 'granted' ? (
                  <div className="location-enabled">
                    {currentLocation ? (
                      <div className="current-location">
                        <div className="location-header">
                          {LocationService.getLocationAccuracyLevel(currentLocation.accuracy).icon}
                          <span style={{ color: LocationService.getLocationAccuracyLevel(currentLocation.accuracy).color }}>
                            Current Location
                          </span>
                          <button 
                            className="refresh-location-btn"
                            onClick={refreshLocation}
                            title="Refresh location"
                          >
                            🔄
                          </button>
                        </div>
                        <div className="location-details">
                          {LocationService.formatLocationForDisplay(currentLocation)}
                        </div>
                        <div className="location-timestamp">
                          Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ) : locationError ? (
                      <div className="location-error">
                        📍 {locationError}
                        <button 
                          className="refresh-location-btn"
                          onClick={refreshLocation}
                          title="Try again"
                        >
                          🔄
                        </button>
                      </div>
                    ) : (
                      <span className="location-loading">📍 Getting location...</span>
                    )}
                  </div>
                ) : (
                  <span className="location-disabled">
                    📍 Location disabled
                    <button 
                      className="enable-location-btn"
                      onClick={checkLocationPermission}
                      title="Enable location tracking"
                    >
                      Enable
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        <div className="date-time">
          <div className="current-time">{formatTime(currentTime)}</div>
          <div className="current-date">{formatDate(currentTime)}</div>
        </div>
      </header>

      {/* Status Card */}
      <div className={`status-card ${isClocked ? 'clocked-in' : 'clocked-out'}`}>
        <div className="status-text">
          {isClocked ? '🟢 Clocked In' : '🔴 Clocked Out'}
        </div>
        <div className="work-time-grid">
          <div className="work-time-item">
            <span className="work-time-label">Today:</span>
            <span className="work-time-value">{totalWorkTime.formattedTime}</span>
          </div>
          <div className="work-time-item">
            <span className="work-time-label">This Week:</span>
            <span className="work-time-value">{weekWorkTime.formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="action-section">
        <button 
          className={`action-button ${isClocked ? 'clock-out' : 'clock-in'} ${loading ? 'loading' : ''}`}
          onClick={handleTimeAction}
          disabled={loading || !user}
        >
          {loading ? (
            <div className="loading-content">
              <div className="loading-spinner"></div>
              <span className="loading-text">
                {gettingLocation ? 'Getting location...' : 'Processing...'}
              </span>
            </div>
          ) : (
            <>
              <span className="button-icon">{isClocked ? '⏹️' : '▶️'}</span>
              <span className="button-text">
                {isClocked ? 'Clock Out' : 'Clock In'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Activity Section with Toggle */}
      <div className="activity-section">
        {/* View Toggle */}
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'today' ? 'active' : ''}`}
            onClick={() => setViewMode('today')}
          >
            📅 Today
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'alltime' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('alltime');
              if (allTimeEntries.length === 0) {
                loadAllTimeEntries();
              }
              if (availableMonths.length === 0) {
                loadAvailableMonths();
              }
            }}
          >
            📊 All Time
          </button>
        </div>

        {/* Today's Activity */}
        {viewMode === 'today' && (
          <>
            {todayEntries.length > 0 ? (
              <>
                <h3 className="activity-title">📋 Today's Activity</h3>
                <div className="activity-table">
                  <div className="table-header">
                    <span>Action</span>
                    <span>Time</span>
                    <span>Duration</span>
                    <span>Location</span>
                  </div>
                  {(() => {
                    let lastClockIn = null;
                    return todayEntries.map((entry, index) => {
                      const entryTime = formatTime(entry.timestamp.toDate());
                      let duration = '';
                      
                      if (entry.type === 'clock-in') {
                        lastClockIn = entry.timestamp.toDate();
                        duration = '—';
                      } else if (entry.type === 'clock-out' && lastClockIn) {
                        const diff = entry.timestamp.toDate() - lastClockIn;
                        const minutes = Math.floor(diff / (1000 * 60));
                        const hours = Math.floor(minutes / 60);
                        duration = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
                        lastClockIn = null;
                      } else {
                        duration = '—';
                      }

                      return (
                        <div key={entry.id} className="table-row">
                          <span className={`action-cell ${entry.type}`}>
                            {entry.type === 'clock-in' ? '🟢 Clock In' : '🔴 Clock Out'}
                          </span>
                          <span className="time-cell">{entryTime}</span>
                          <span className="duration-cell">{duration}</span>
                          <span className="location-cell">
                            {entry.location ? 
                              LocationService.formatLocationForDisplay(entry.location) : 
                              '—'
                            }
                          </span>
                          {(entry.project || entry.notes) && (
                            <div className="entry-metadata" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                              {entry.project && (
                                <span className="entry-project">📁 {entry.project}</span>
                              )}
                              {entry.notes && (
                                <span className="entry-notes" style={{ marginLeft: entry.project ? '0.5rem' : '0' }}>
                                  💬 {entry.notes}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div className="daily-summary">
                  <div className="summary-item">
                    <span>Total Sessions:</span>
                    <span>{Math.floor(todayEntries.filter(e => e.type === 'clock-out').length)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Total Time:</span>
                    <span className="total-time">{totalWorkTime.formattedTime}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-activity">
                <p>📝 No activity today. Clock in to start tracking your time!</p>
              </div>
            )}
          </>
        )}

        {/* All Time Activity */}
        {viewMode === 'alltime' && (
          <>
            <h3 className="activity-title">📊 All Time Activity</h3>
            
            {/* Month Filter */}
            {availableMonths.length > 0 && (
              <div className="month-filter">
                <label htmlFor="month-select">Filter by Month:</label>
                <select 
                  id="month-select" 
                  value={selectedMonth === 'all' ? 'all' : `${selectedMonth.year}-${selectedMonth.month}`}
                  onChange={handleMonthChange}
                  className="month-selector"
                >
                  <option value="all">📅 All Months</option>
                  {availableMonths.map((month, index) => (
                    <option key={index} value={`${month.year}-${month.month}`}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
                
                {/* Period Filter (only show when specific month is selected) */}
                {selectedMonth !== 'all' && (
                  <select 
                    id="period-select" 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="period-selector"
                    style={{ marginLeft: '0.5rem' }}
                  >
                    <option value="full">📅 Full Month</option>
                    <option value="first-half">📅 1st - 15th</option>
                    <option value="second-half">📅 16th - End</option>
                  </select>
                )}
              </div>
            )}
            {loadingAllTime && allTimeEntries.length === 0 ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading your activity history...</p>
              </div>
            ) : allTimeEntries.length > 0 ? (
              <>
                <div className="all-time-entries">
                  {(() => {
                    const groupedEntries = groupEntriesByDate(allTimeEntries);
                    return Object.keys(groupedEntries).map(dateStr => {
                      const dayEntries = groupedEntries[dateStr];
                      const dayDate = new Date(dateStr);
                      
                      // Calculate daily work time (exclude 1hr break)
                      let dailyMinutes = 0;
                      let lastClockIn = null;
                      let completeSessions = 0;
                      
                      dayEntries.forEach(entry => {
                        if (entry.type === 'clock-in') {
                          lastClockIn = entry.timestamp.toDate();
                        } else if (entry.type === 'clock-out' && lastClockIn) {
                          const diff = entry.timestamp.toDate() - lastClockIn;
                          dailyMinutes += Math.floor(diff / (1000 * 60));
                          completeSessions++;
                          lastClockIn = null;
                        }
                      });
                      
                      // Subtract 1 hour break if there are complete sessions
                      if (completeSessions > 0) {
                        dailyMinutes = Math.max(0, dailyMinutes - 60);
                      }
                      
                      const dailyHours = Math.floor(dailyMinutes / 60);
                      const remainingMinutes = dailyMinutes % 60;
                      const dailyWorkTime = dailyHours > 0 ? `${dailyHours}h ${remainingMinutes}m` : `${remainingMinutes}m`;

                      return (
                        <div key={dateStr} className="day-group">
                          <div className="day-header">
                            <span className="day-date">{formatDate(dayDate)}</span>
                            <span className="day-total">{dailyWorkTime}</span>
                          </div>
                          <div className="day-entries">
                            {dayEntries.map((entry, index) => {
                              const entryTime = formatTime(entry.timestamp.toDate());
                              const location = entry.location ? 
                                LocationService.formatLocationForDisplay(entry.location) : 
                                'Location not recorded';
                              
                              return (
                                <div key={entry.id} className="entry-row">
                                  <div className="entry-main">
                                    <span className={`entry-action ${entry.type}`}>
                                      {entry.type === 'clock-in' ? '🟢 In' : '🔴 Out'}
                                    </span>
                                    <span className="entry-time">{entryTime}</span>
                                  </div>
                                  <div className="entry-location" title={location}>
                                    📍 {location}
                                  </div>
                                  {(entry.project || entry.notes) && (
                                    <div className="entry-metadata">
                                      {entry.project && (
                                        <span className="entry-project">📁 {entry.project}</span>
                                      )}
                                      {entry.notes && (
                                        <div className="entry-notes">💬 {entry.notes}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {/* Summary Section - Always shown */}
                <div className="month-summary">
                  <h4>📊 {selectedMonth !== 'all' ? 
                    `${formatMonth(selectedMonth)} ${selectedPeriod === 'first-half' ? '(1st-15th)' : selectedPeriod === 'second-half' ? '(16th-End)' : ''} Summary` : 
                    'All Time Summary'
                  }</h4>
                  <div className="month-stats">
                    {(() => {
                      let totalMinutes = 0;
                      let totalSessions = 0;
                      let lastClockIn = null;
                      const daysWithSessions = new Set();
                      
                      // Sort entries by timestamp ascending (oldest first) for proper calculation
                      const sortedEntries = [...allTimeEntries].sort((a, b) => {
                        const timeA = a.timestamp.toDate();
                        const timeB = b.timestamp.toDate();
                        return timeA - timeB;
                      });
                      
                      sortedEntries.forEach(entry => {
                        if (entry.type === 'clock-in') {
                          lastClockIn = entry.timestamp.toDate();
                        } else if (entry.type === 'clock-out' && lastClockIn) {
                          const diff = entry.timestamp.toDate() - lastClockIn;
                          totalMinutes += Math.floor(diff / (1000 * 60));
                          totalSessions++;
                          
                          // Track which days have sessions for break calculation
                          const clockOutTime = entry.timestamp.toDate();
                          const dayKey = `${clockOutTime.getFullYear()}-${clockOutTime.getMonth()}-${clockOutTime.getDate()}`;
                          daysWithSessions.add(dayKey);
                          
                          lastClockIn = null;
                        }
                      });
                      
                      // Subtract 1 hour break per day worked
                      if (daysWithSessions.size > 0) {
                        const breakMinutes = daysWithSessions.size * 60;
                        totalMinutes = Math.max(0, totalMinutes - breakMinutes);
                      }
                      
                      const totalHours = Math.floor(totalMinutes / 60);
                      const remainingMinutes = totalMinutes % 60;
                      const summaryWorkTime = totalHours > 0 ? `${totalHours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
                      
                      return (
                        <>
                          <div className="stat-item">
                            <span>Total Sessions:</span>
                            <span>{totalSessions}</span>
                          </div>
                          <div className="stat-item">
                            <span>Total Time:</span>
                            <span className="total-time">{summaryWorkTime}</span>
                          </div>
                          <div className="stat-item">
                            <span>Working Days:</span>
                            <span>{daysWithSessions.size}</span>
                          </div>
                        </>
                      );
                    })()}
                    </div>
                  </div>
                
                {hasMoreEntries && (
                  <div className="load-more-section">
                    <button 
                      className="load-more-btn"
                      onClick={() => loadAllTimeEntries(true)}
                      disabled={loadingAllTime}
                    >
                      {loadingAllTime ? (
                        <>
                          <div className="loading-spinner small"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="no-activity">
                <p>
                  {selectedMonth === 'all' 
                    ? '📝 No time entries found. Start tracking your time to see history!'
                    : `📅 No activity in ${formatMonth(selectedMonth)}. Try selecting a different month.`
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Notes and Project Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={cancelTimeAction}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{isClocked ? '🔴 Clocking Out' : '🟢 Clocking In'}</h3>
            
            <div className="form-group">
              <label htmlFor="project-select">Project (Optional):</label>
              <select 
                id="project-select"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="project-select"
              >
                <option value="">-- Select Project --</option>
                {projects.map((proj, index) => (
                  <option key={index} value={proj}>{proj}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="notes-input">Notes (Optional):</label>
              <textarea
                id="notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What are you working on?"
                className="notes-input"
                rows="3"
              />
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={cancelTimeAction}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm"
                onClick={confirmTimeAction}
                disabled={loading}
              >
                {loading ? 'Processing...' : isClocked ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeTracker;