import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { MAP_CONFIG } from '../../config/mapConfig';
import { ensureMapboxConfigured } from '../../config/mapbox';

ensureMapboxConfigured();

interface LocationResult {
  latitude: number;
  longitude: number;
  address: string;
}

interface MapLocationPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (location: LocationResult) => void;
  initialLocation?: { latitude: number; longitude: number };
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  isVisible,
  onClose,
  onConfirm,
  initialLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('Loading address...');
  const [markerCoords, setMarkerCoords] = useState(initialLocation || { 
    latitude: MAP_CONFIG.DEFAULT_CENTER[1], 
    longitude: MAP_CONFIG.DEFAULT_CENTER[0] 
  });

  const mapCameraRef = useRef<Mapbox.Camera>(null);
  const isSelectingFromSearch = useRef(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize Map and Permissions
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }
      
      if (!initialLocation) {
        handleUseCurrentLocation();
      }
    })();
  }, []);

  // Handle Reverse Geocoding (Coordinates -> Address)
  const performReverseGeocode = async (lat: number, lng: number) => {
    try {
      // 1. Primary: Google Geocoding API
      const googleUrl = MAP_CONFIG.getGoogleReverseGeocodeUrl(
        lat,
        lng,
        process.env.EXPO_PUBLIC_GOOGLE_API_KEY || ''
      );
      const googleRes = await fetch(googleUrl);
      const googleData = await googleRes.json();

      if (googleData.status === 'OK' && googleData.results.length > 0) {
        return googleData.results[0].formatted_address;
      }

      // 2. Fallback 1: Ola Maps (Krutrim API)
      const krutrimUrl = MAP_CONFIG.getKrutrimReverseGeocodeUrl(
        lat,
        lng,
        process.env.EXPO_PUBLIC_KRUTRIM_API_KEY || ''
      );
      const krutrimRes = await fetch(krutrimUrl);
      const krutrimData = await krutrimRes.json();

      if (krutrimData.status === 'ok' && krutrimData.results.length > 0) {
        return krutrimData.results[0].formatted_address;
      }

      // 3. Fallback 2: Expo Location
      const expoRes = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (expoRes.length > 0) {
        const item = expoRes[0];
        return `${item.name || ''} ${item.street || ''}, ${item.city || ''}, ${item.region || ''}`;
      }

      return 'Pinned Location';
    } catch (error) {
      console.error('Reverse Geocode Error:', error);
      return 'Selected Location';
    }
  };

  // Handle Map Idle (when user stops moving map)
  const handleMapIdle = useCallback(async (e: any) => {
    if (isSelectingFromSearch.current) {
        isSelectingFromSearch.current = false;
        return;
    }

    const { geometry } = e;
    const [lng, lat] = geometry.coordinates;
    
    setMarkerCoords({ latitude: lat, longitude: lng });
    setCurrentAddress('Locating...');
    
    const address = await performReverseGeocode(lat, lng);
    setCurrentAddress(address);
  }, []);

  // Handle Search Input Change (Debounced)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = MAP_CONFIG.getKrutrimAutocompleteUrl(
          searchQuery,
          process.env.EXPO_PUBLIC_KRUTRIM_API_KEY || ''
        );
        const res = await fetch(url);
        const data = await res.json();
        setSearchResults(data.predictions || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, MAP_CONFIG.SETTINGS.SEARCH_DEBOUNCE);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Handle Selecting a Search Result
  const handleSelectResult = (item: any) => {
    Keyboard.dismiss();
    setSearchResults([]);
    setSearchQuery(item.description);
    isSelectingFromSearch.current = true;

    // In a real implementation, you'd fetch place details for lat/lng here
    // For Krutrim, the autocomplete might include location or require a separate details call
    // We'll simulate getting coords (assuming Krutrim provides them or we'd call getPlaceDetails)
    // If Krutrim results don't have lat/lng, we'd need another API call here
    
    // For this example, let's assume we have lat/lng from the result or details
    if (item.geometry?.location) {
        const { lat, lng } = item.geometry.location;
        moveToLocation(lat, lng);
    }
  };

  const moveToLocation = (lat: number, lng: number) => {
    setMarkerCoords({ latitude: lat, longitude: lng });
    mapCameraRef.current?.setCamera({
      centerCoordinate: [lng, lat],
      zoomLevel: MAP_CONFIG.SETTINGS.DEFAULT_ZOOM,
      animationDuration: MAP_CONFIG.SETTINGS.ANIMATION_DURATION,
    });
    
    performReverseGeocode(lat, lng).then(setCurrentAddress);
  };

  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      moveToLocation(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      console.error('GPS error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmLocation = () => {
    onConfirm({
      latitude: markerCoords.latitude,
      longitude: markerCoords.longitude,
      address: currentAddress,
    });
    onClose();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <TextInput
            placeholder="Search location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
          />
          {isSearching && <ActivityIndicator size="small" color="#4CAF50" style={{marginRight: 10}} />}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsList}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.place_id || item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(item)}
                >
                  <Ionicons name="location-outline" size={20} color="#666" style={{marginRight: 10}} />
                  <Text style={styles.resultText} numberOfLines={1}>{item.description || item.structured_formatting?.main_text}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Map View */}
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_CONFIG.DEFAULT_MAP_STYLE}
        onMapIdle={handleMapIdle}
      >
        <Mapbox.Camera
          ref={mapCameraRef}
          defaultSettings={{
            centerCoordinate: [markerCoords.longitude, markerCoords.latitude],
            zoomLevel: MAP_CONFIG.SETTINGS.DEFAULT_ZOOM,
          }}
        />
        <Mapbox.PointAnnotation
          id="marker"
          coordinate={[markerCoords.longitude, markerCoords.latitude]}
        >
          <View style={styles.markerContainer}>
            <MaterialIcons name="location-on" size={40} color="#FF5252" />
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>

      {/* Bottom Actions */}
      <View style={styles.bottomCard}>
        <View style={styles.addressRow}>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>SELECT LOCATION</Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {currentAddress}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.gpsButton} 
            onPress={handleUseCurrentLocation}
          >
            <MaterialIcons name="my-location" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirmLocation}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    height: 50,
  },
  backButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingLeft: 5,
  },
  resultsList: {
    backgroundColor: '#fff',
    marginTop: 5,
    borderRadius: 12,
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 4,
    letterSpacing: 1,
  },
  addressText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    lineHeight: 20,
  },
  gpsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 15,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MapLocationPicker;
