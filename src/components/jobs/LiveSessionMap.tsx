import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAP_CONFIG } from '../../config/mapConfig';
import { MaterialIcons } from '@expo/vector-icons';

interface LiveSessionMapProps {
  location?: { latitude: number; longitude: number };
  height?: number;
  label?: string;
}

const LiveSessionMap: React.FC<LiveSessionMapProps> = ({ 
  location = { latitude: MAP_CONFIG.DEFAULT_CENTER[1], longitude: MAP_CONFIG.DEFAULT_CENTER[0] },
  height = 220,
  label = "LIVE SESSION TRACKING"
}) => {
  return (
    <View style={[styles.wrapper, { height }]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_CONFIG.DEFAULT_MAP_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        <Mapbox.Camera
          centerCoordinate={[location.longitude, location.latitude]}
          zoomLevel={14}
        />
        
        {/* Pulse effect for live location */}
        <Mapbox.PointAnnotation
          id="live-location"
          coordinate={[location.longitude, location.latitude]}
        >
          <View style={styles.markerWrapper}>
            <View style={styles.pulse} />
            <View style={styles.markerCore}>
                <MaterialIcons name="navigation" size={14} color="#fff" />
            </View>
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>

      {/* Overlay status */}
      <View style={styles.overlay}>
        <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>{label}</Text>
        </View>
      </View>

      {/* Gradient Bottom Shadow */}
      <View style={styles.bottomShadow} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#333',
    letterSpacing: 0.5,
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.5)',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
  }
});

export default LiveSessionMap;
