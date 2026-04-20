import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MaterialIcons } from '@expo/vector-icons';
import { MAP_CONFIG } from '../../config/mapConfig';
import { ensureMapboxConfigured } from '../../config/mapbox';

ensureMapboxConfigured();

interface CoordinatePoint {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
}

interface LiveSessionMapProps {
  vendorLocation?: CoordinatePoint | null;
  customerLocation?: CoordinatePoint;
  height?: number;
  location?: CoordinatePoint;
  label?: string;
}

const LiveSessionMap: React.FC<LiveSessionMapProps> = ({
  vendorLocation,
  customerLocation,
  height = 250,
  location,
  label,
}) => {
  const defaultLocation = {
    latitude: MAP_CONFIG.DEFAULT_CENTER[1],
    longitude: MAP_CONFIG.DEFAULT_CENTER[0],
  };

  const toFiniteCoordinate = (value: number | string | null | undefined, fallback: number) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeCoordinate = (point: CoordinatePoint | null | undefined, fallback: { latitude: number; longitude: number }) => ({
    latitude: toFiniteCoordinate(point?.latitude, fallback.latitude),
    longitude: toFiniteCoordinate(point?.longitude, fallback.longitude),
  });

  const resolvedCustomerLocation = normalizeCoordinate(customerLocation || location, defaultLocation);
  const fallbackVendorLocation = normalizeCoordinate(vendorLocation || location, resolvedCustomerLocation);

  const routeGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [fallbackVendorLocation.longitude, fallbackVendorLocation.latitude],
              [resolvedCustomerLocation.longitude, resolvedCustomerLocation.latitude],
            ],
          },
          properties: {},
        },
      ],
    }),
    [fallbackVendorLocation, resolvedCustomerLocation],
  );

  const centerCoordinate: [number, number] = [
    (fallbackVendorLocation.longitude + resolvedCustomerLocation.longitude) / 2,
    (fallbackVendorLocation.latitude + resolvedCustomerLocation.latitude) / 2,
  ];

  return (
    <View style={[styles.wrapper, { height }]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_CONFIG.DEFAULT_MAP_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled={false}
      >
        <Mapbox.Camera centerCoordinate={centerCoordinate} zoomLevel={12.5} />

        <Mapbox.ShapeSource id="vendor-customer-route" shape={routeGeoJson as any}>
          <Mapbox.LineLayer
            id="vendor-customer-route-line"
            style={{
              lineColor: '#0EA5E9',
              lineWidth: 3,
              lineDasharray: [2, 2],
              lineOpacity: 0.8,
            }}
          />
        </Mapbox.ShapeSource>

        <Mapbox.PointAnnotation
          id="customer-pin"
          coordinate={[resolvedCustomerLocation.longitude, resolvedCustomerLocation.latitude]}
        >
          <View style={[styles.pin, styles.customerPin]}>
            <MaterialIcons name="home" size={18} color="#FFFFFF" />
          </View>
        </Mapbox.PointAnnotation>

        <Mapbox.PointAnnotation
          id="vendor-pin"
          coordinate={[fallbackVendorLocation.longitude, fallbackVendorLocation.latitude]}
        >
          <View style={[styles.pin, styles.vendorPin]}>
            <MaterialIcons name="local-shipping" size={18} color="#FFFFFF" />
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>

      <View style={styles.overlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeTitle}>Live Pickup Map</Text>
          <Text style={styles.badgeSubtitle}>
            {label || (vendorLocation ? 'Your live position is updating' : 'Waiting for your GPS position')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#DCE7E1',
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  badgeTitle: {
    color: '#0F172A',
    fontWeight: '800',
  },
  badgeSubtitle: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  customerPin: {
    backgroundColor: '#16A34A',
  },
  vendorPin: {
    backgroundColor: '#2563EB',
  },
});

export default LiveSessionMap;
