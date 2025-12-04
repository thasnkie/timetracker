import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';
import { auth } from './config';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Set authentication persistence to LOCAL (never expires)
export const initializeAuth = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    // Silently handle error
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw error;
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Get current user info
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Get current user ID for database operations
export const getCurrentUserId = () => {
  return auth.currentUser ? auth.currentUser.uid : null;
};

// Get current user name
export const getCurrentUserName = () => {
  return auth.currentUser ? auth.currentUser.displayName : null;
};

// Get current user email
export const getCurrentUserEmail = () => {
  return auth.currentUser ? auth.currentUser.email : null;
};

// Listen for authentication state changes
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Check if current user is admin
export const isAdmin = () => {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const currentUser = auth.currentUser;
  return currentUser && currentUser.email === adminEmail;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return auth.currentUser !== null;
};