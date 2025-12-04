import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { initializeAuth, signInWithGoogle, signOutUser, onAuthChange, getCurrentUserName } from './firebase/authService';
import TimeTracker from './components/TimeTracker';
import Admin from './components/Admin';

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        await initializeAuth();
        
        // Listen for auth state changes
        const unsubscribe = onAuthChange(async (user) => {
          if (user) {
            setUser(user);
          } else {
            setUser(null);
          }
          setAuthLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      alert('Failed to sign in. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (error) {
      // Silently handle error
    }
  };

  // Show loading screen while authentication is initializing
  if (authLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="auth-loading">
            <div className="loading-spinner"></div>
            <p>Initializing TimeTracker...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-in screen if not authenticated
  if (!user) {
    return (
      <div className="app">
        <div className="container">
          <div className="auth-screen">
            <div className="auth-header">
              <h1 className="title">⏰ TimeTracker</h1>
              <p className="auth-subtitle">Sign in to track your work hours</p>
            </div>
            <button className="google-signin-button" onClick={handleSignIn}>
              <span className="google-icon">🔐</span>
              <span>Sign in with Google</span>
            </button>
            <div className="auth-note">
              <small>Your data will be securely stored and synced across devices</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={<TimeTracker user={user} onSignOut={handleSignOut} />} 
          />
          <Route 
            path="/admin" 
            element={<Admin />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
