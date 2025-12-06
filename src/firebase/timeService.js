import { collection, addDoc, query, orderBy, limit, getDocs, where, Timestamp, startAfter } from 'firebase/firestore';
import { db } from './config';
import { getCurrentUserId, getCurrentUserName, getCurrentUserEmail } from './authService';

// Collection name for time entries
const TIME_ENTRIES_COLLECTION = 'timeEntries';

// Add a new time entry (clock in or clock out)
export const addTimeEntry = async (type, timestamp = null, locationData = null) => {
  try {
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
    const userEmail = getCurrentUserEmail();
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const entry = {
      type: type, // 'clock-in' or 'clock-out'
      timestamp: timestamp || Timestamp.now(),
      userId: userId,
      userName: userName || 'Unknown User',
      userEmail: userEmail || 'no-email@example.com',
      location: locationData || null, // Store location data if available
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, TIME_ENTRIES_COLLECTION), entry);
    return { id: docRef.id, ...entry };
  } catch (error) {
    throw error;
  }
};

// Get the last time entry for a user
export const getLastTimeEntry = async (userId = null) => {
  try {
    const currentUserId = userId || getCurrentUserId();
    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    // First try the complex query with index
    try {
      const q = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', currentUserId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (indexError) {
      // Fallback: Get all user entries and sort in memory
      const simpleQ = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', currentUserId)
      );

      const querySnapshot = await getDocs(simpleQ);
      const entries = [];
      
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() });
      });

      if (entries.length === 0) return null;

      // Sort by timestamp descending in memory
      entries.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime();
      });

      return entries[0];
    }
  } catch (error) {
    throw error;
  }
};

// Get time entries for today
export const getTodayEntries = async (userId = null) => {
  try {
    const currentUserId = userId || getCurrentUserId();
    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // First try the complex query with index
    try {
      const q = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', currentUserId),
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const entries = [];
      
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() });
      });

      return entries;
    } catch (indexError) {
      // Fallback: Get all user entries and filter in memory
      const simpleQ = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', currentUserId)
      );

      const querySnapshot = await getDocs(simpleQ);
      const allEntries = [];
      
      querySnapshot.forEach((doc) => {
        allEntries.push({ id: doc.id, ...doc.data() });
      });

      // Filter for today's entries in memory
      const todayEntries = allEntries.filter(entry => {
        const entryDate = entry.timestamp?.toDate?.() || new Date(entry.timestamp);
        return entryDate >= startOfDay && entryDate < endOfDay;
      });

      // Sort by timestamp ascending in memory
      todayEntries.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return aTime.getTime() - bTime.getTime();
      });

      return todayEntries;
    }
  } catch (error) {
    throw error;
  }
};

// Get all time entries for current user (with pagination and optional month filtering)
export const getAllUserEntries = async (userId = null, limitCount = 50, startAfterDoc = null, monthFilter = null) => {
  try {
    const currentUserId = userId || getCurrentUserId();
    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    // If month filter is specified, get start and end dates for that month
    let startOfMonth = null;
    let endOfMonth = null;
    
    if (monthFilter) {
      const { year, month } = monthFilter;
      startOfMonth = new Date(year, month, 1);
      endOfMonth = new Date(year, month + 1, 1);
    }

    // First try the complex query with index
    try {
      let q;
      
      if (monthFilter) {
        // Query for specific month
        q = query(
          collection(db, TIME_ENTRIES_COLLECTION),
          where('userId', '==', currentUserId),
          where('timestamp', '>=', Timestamp.fromDate(startOfMonth)),
          where('timestamp', '<', Timestamp.fromDate(endOfMonth)),
          orderBy('timestamp', 'desc')
        );
      } else {
        // Query for all entries with pagination
        q = query(
          collection(db, TIME_ENTRIES_COLLECTION),
          where('userId', '==', currentUserId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );

        // If pagination, start after the last document
        if (startAfterDoc) {
          q = query(
            collection(db, TIME_ENTRIES_COLLECTION),
            where('userId', '==', currentUserId),
            orderBy('timestamp', 'desc'),
            startAfter(startAfterDoc),
            limit(limitCount)
          );
        }
      }

      const querySnapshot = await getDocs(q);
      const entries = [];
      let lastDoc = null;
      
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() });
        lastDoc = doc;
      });

      return { 
        entries, 
        lastDoc: monthFilter ? null : lastDoc, // No pagination for month filter
        hasMore: monthFilter ? false : entries.length === limitCount
      };
    } catch (indexError) {
      // Fallback: Get all user entries and filter/sort/paginate in memory
      const simpleQ = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', currentUserId)
      );

      const querySnapshot = await getDocs(simpleQ);
      const allEntries = [];
      
      querySnapshot.forEach((doc) => {
        allEntries.push({ id: doc.id, ...doc.data() });
      });

      // Apply month filter in memory
      let filteredEntries = allEntries;
      if (monthFilter) {
        filteredEntries = allEntries.filter(entry => {
          const entryDate = entry.timestamp?.toDate?.() || new Date(entry.timestamp);
          const entryYear = entryDate.getFullYear();
          const entryMonth = entryDate.getMonth();
          return entryYear === monthFilter.year && entryMonth === monthFilter.month;
        });
      }

      // Sort by timestamp descending in memory
      filteredEntries.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime();
      });

      if (monthFilter) {
        // Return all entries for the month
        return { 
          entries: filteredEntries, 
          lastDoc: null,
          hasMore: false
        };
      } else {
        // Simple pagination in memory
        const startIndex = startAfterDoc ? parseInt(startAfterDoc) || 0 : 0;
        const endIndex = startIndex + limitCount;
        const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

        return { 
          entries: paginatedEntries, 
          lastDoc: endIndex < filteredEntries.length ? endIndex.toString() : null,
          hasMore: endIndex < filteredEntries.length
        };
      }
    }
  } catch (error) {
    throw error;
  }
};

// Get available months from user's time entries
export const getAvailableMonths = async (userId = null) => {
  try {
    const currentUserId = userId || getCurrentUserId();
    if (!currentUserId) {
      throw new Error('User not authenticated');
    }

    // Get all entries for the user
    const simpleQ = query(
      collection(db, TIME_ENTRIES_COLLECTION),
      where('userId', '==', currentUserId)
    );

    const querySnapshot = await getDocs(simpleQ);
    const months = new Set();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.timestamp?.toDate?.() || new Date(data.timestamp);
      const year = date.getFullYear();
      const month = date.getMonth();
      months.add(`${year}-${month}`);
    });

    // Convert to array and sort (most recent first)
    const monthsArray = Array.from(months).map(monthStr => {
      const [year, month] = monthStr.split('-').map(Number);
      return { year, month };
    });

    monthsArray.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return monthsArray;
  } catch (error) {
    return [];
  }
};

// ADMIN FUNCTIONS - Get all users' time entries
export const getAllTimeEntries = async (date = null) => {
  try {
    let q;
    
    if (date) {
      // Get entries for specific date
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      
      q = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<', Timestamp.fromDate(endOfDay)),
        orderBy('timestamp', 'desc')
      );
    } else {
      // Get all entries (be careful with this in production)
      q = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(100) // Limit to prevent huge data loads
      );
    }

    const querySnapshot = await getDocs(q);
    const entries = [];
    
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() });
    });

    return entries;
  } catch (error) {
    throw error;
  }
};

// Get unique users list for admin
export const getAllUsers = async () => {
  try {
    const q = query(
      collection(db, TIME_ENTRIES_COLLECTION),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const users = new Map();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!users.has(data.userId)) {
        users.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          lastSeen: data.timestamp
        });
      }
    });

    return Array.from(users.values());
  } catch (error) {
    throw error;
  }
};

// Calculate total work time from entries
export const calculateWorkTime = (entries, excludeBreak = false) => {
  let totalMinutes = 0;
  let clockInTime = null;
  const daysWorked = new Set();

  // Sort entries by timestamp to ensure proper order
  const sortedEntries = [...entries].sort((a, b) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return timeA - timeB;
  });

  for (const entry of sortedEntries) {
    const entryTime = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
    
    if (entry.type === 'clock-in') {
      clockInTime = entryTime;
    } else if (entry.type === 'clock-out' && clockInTime) {
      const diffInMs = entryTime - clockInTime;
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      totalMinutes += diffInMinutes;
      
      // Track which days have complete sessions
      const dayKey = `${entryTime.getFullYear()}-${entryTime.getMonth()}-${entryTime.getDate()}`;
      daysWorked.add(dayKey);
      
      clockInTime = null; // Reset after successful pair
    }
  }

  // Subtract 1 hour break time per day worked if excludeBreak is true
  if (excludeBreak && daysWorked.size > 0) {
    const breakMinutes = daysWorked.size * 60; // 1 hour per day
    totalMinutes = Math.max(0, totalMinutes - breakMinutes);
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    totalMinutes,
    hours,
    minutes,
    formattedTime: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    daysWorked: daysWorked.size
  };
};