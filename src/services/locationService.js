// Geolocation service for tracking user location during clock in/out
export class LocationService {
  static async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for better accuracy
        maximumAge: 30000, // Shorter cache for more recent location
        desiredAccuracy: 10 // Desired accuracy in meters
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date().toISOString()
          };
          resolve(locationData);
        },
        (error) => {
          reject(this.handleLocationError(error));
        },
        options
      );
    });
  }

  static handleLocationError(error) {
    let message = 'Unable to get location';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
    }
    
    return new Error(message);
  }

  static async getLocationWithAddress() {
    try {
      const position = await this.getCurrentPosition();
      
      // Try to get address using reverse geocoding
      try {
        const address = await this.reverseGeocode(position.latitude, position.longitude);
        return {
          ...position,
          address: address
        };
      } catch (geocodeError) {
        // Return position without address if geocoding fails
        return {
          ...position,
          address: 'Address unavailable'
        };
      }
    } catch (error) {
      throw error;
    }
  }

  static async reverseGeocode(latitude, longitude) {
    // Using a simple reverse geocoding approach
    // Note: For production, consider using Google Maps API, OpenStreetMap, or similar
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      // Format address from response
      const parts = [];
      if (data.locality) parts.push(data.locality);
      if (data.principalSubdivision) parts.push(data.principalSubdivision);
      if (data.countryName) parts.push(data.countryName);
      
      return parts.length > 0 ? parts.join(', ') : 'Address not found';
    } catch (error) {
      throw new Error('Unable to get address');
    }
  }

  static formatLocationForDisplay(locationData) {
    if (!locationData) return 'Location not available';
    
    const { latitude, longitude, address, accuracy } = locationData;
    
    let displayText = '';
    
    if (address && address !== 'Address unavailable') {
      displayText = address;
    } else {
      // Fallback to coordinates
      displayText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
    
    // Add accuracy information
    if (accuracy) {
      const accuracyText = accuracy < 10 ? 'High' : accuracy < 50 ? 'Medium' : 'Low';
      displayText += ` (${accuracyText} accuracy: ±${Math.round(accuracy)}m)`;
    }
    
    return displayText;
  }

  static getLocationAccuracyLevel(accuracy) {
    if (!accuracy) return { level: 'unknown', color: '#9E9E9E', icon: '📍' };
    
    if (accuracy < 10) {
      return { level: 'high', color: '#4CAF50', icon: '🎯' };
    } else if (accuracy < 50) {
      return { level: 'medium', color: '#FF9800', icon: '📍' };
    } else {
      return { level: 'low', color: '#f44336', icon: '📍' };
    }
  }

  static async watchPosition(callback) {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000 // More frequent updates
    };

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            timestamp: new Date().toISOString()
          };

          // Get address
          try {
            const address = await this.reverseGeocode(locationData.latitude, locationData.longitude);
            locationData.address = address;
          } catch (error) {
            locationData.address = 'Address unavailable';
          }

          callback(locationData);
        } catch (error) {
          callback(null, error);
        }
      },
      (error) => {
        callback(null, this.handleLocationError(error));
      },
      options
    );

    return watchId;
  }

  static stopWatchingPosition(watchId) {
    if (navigator.geolocation && watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  static async requestLocationPermission() {
    try {
      // Try to get location to trigger permission prompt
      await this.getCurrentPosition();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default LocationService;