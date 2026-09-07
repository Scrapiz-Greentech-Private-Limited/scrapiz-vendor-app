import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
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
  mapStyleURL?: string;
  routeCoordinates?: [number, number][];
  routeColor?: string;
  routeDashed?: boolean;
  showOverlay?: boolean;
}

const LiveSessionMap: React.FC<LiveSessionMapProps> = ({
  vendorLocation,
  customerLocation,
  height = 250,
  location,
  label,
  mapStyleURL,
  routeCoordinates,
  routeColor = '#0EA5E9',
  routeDashed = true,
  showOverlay = true,
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
  const fallbackVendorLocation = normalizeCoordinate(vendorLocation, {
    latitude: resolvedCustomerLocation.latitude + 0.012,
    longitude: resolvedCustomerLocation.longitude - 0.012,
  });

  const routeGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates && routeCoordinates.length >= 2 ? routeCoordinates : [
              [fallbackVendorLocation.longitude, fallbackVendorLocation.latitude],
              [resolvedCustomerLocation.longitude, resolvedCustomerLocation.latitude],
            ],
          },
          properties: {},
        },
      ],
    }),
    [fallbackVendorLocation, resolvedCustomerLocation, routeCoordinates],
  );

  const centerCoordinate: [number, number] = [
    (fallbackVendorLocation.longitude + resolvedCustomerLocation.longitude) / 2,
    (fallbackVendorLocation.latitude + resolvedCustomerLocation.latitude) / 2,
  ];

  return (
    <View style={[styles.wrapper, { height }]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={mapStyleURL || MAP_CONFIG.DEFAULT_MAP_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled={false}
      >
        <Mapbox.Camera centerCoordinate={centerCoordinate} zoomLevel={12.5} />

        <Mapbox.ShapeSource id="vendor-customer-route" shape={routeGeoJson as any}>
          <Mapbox.LineLayer
            id="vendor-customer-route-line"
            style={{
              lineColor: routeColor,
              lineWidth: 4,
              lineOpacity: 0.92,
              ...(routeDashed ? { lineDasharray: [2, 2] } : {}),
            }}
          />
        </Mapbox.ShapeSource>

        <Mapbox.PointAnnotation
          id="customer-pin"
          coordinate={[resolvedCustomerLocation.longitude, resolvedCustomerLocation.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[styles.nativePin, styles.customerPin]}>
            <View style={[styles.nativePinInner, styles.customerPinInner]} />
          </View>
        </Mapbox.PointAnnotation>

        <Mapbox.PointAnnotation
          id="vendor-pin"
          coordinate={[fallbackVendorLocation.longitude, fallbackVendorLocation.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[styles.nativePin, styles.vendorPin]}>
            <View style={[styles.nativePinInner, styles.vendorPinInner]} />
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>

      {showOverlay ? (
        <View style={styles.overlay}>
          <View style={styles.badge}>
            <Text style={styles.badgeTitle}>Live Pickup Map</Text>
            <Text style={styles.badgeSubtitle}>
              {label || (vendorLocation ? 'Your live position is updating' : 'Waiting for your GPS position')}
            </Text>
          </View>
        </View>
      ) : null}
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
  nativePin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  customerPin: {
    backgroundColor: 'rgba(22, 163, 74, 0.24)',
  },
  vendorPin: {
    backgroundColor: 'rgba(37, 99, 235, 0.24)',
  },
  nativePinInner: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  customerPinInner: {
    backgroundColor: '#16A34A',
  },
  vendorPinInner: {
    backgroundColor: '#2563EB',
  },
});

export default LiveSessionMap;
