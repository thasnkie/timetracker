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
        timeout: 10000,
        maximumAge: 60000 // Cache for 1 minute
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
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
    
    if (address && address !== 'Address unavailable') {
      return address;
    }
    
    // Fallback to coordinates
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
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