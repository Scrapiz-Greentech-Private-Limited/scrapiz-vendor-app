import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensureMapboxConfigured, MAPBOX_PUBLIC_TOKEN } from '../../config/mapbox';
import { VendorCoordinates } from '../../types';
import SlideToConfirmButton from '../ui/SlideToConfirmButton';

ensureMapboxConfigured();

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_READY_DISTANCE_METERS = 300;
const ROUTE_REFETCH_INTERVAL_MS = 45_000;
const MAX_TRUSTED_VENDOR_ACCURACY_METERS = 500;
const MAX_VENDOR_LOCATION_AGE_MS = 2 * 60 * 1000;
const NAV_MAP_STYLE = 'mapbox://styles/mapbox/navigation-day-v1';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

export interface LiveTrackingGateProps {
  visible: boolean;
  vendorCoords: VendorCoordinates | null;
  pickupLocation: CoordinatePoint;
  expectedDistanceKm?: number | null;
  customerName: string;
  pickupAddress: string;
  onContinue: () => void;
  onBack?: () => void;
}

interface MapboxStep {
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    instruction: string;
  };
  name: string;
}

interface RouteData {
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  duration: number;
  distance: number;
  steps: MapboxStep[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const haversineDistanceMeters = (from: CoordinatePoint, to: CoordinatePoint): number => {
  const R = 6_371_000;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isCoordinateUsable = (lat: number, lng: number): boolean => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return '<1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const getManeuverIcon = (type: string, modifier?: string): keyof typeof MaterialIcons.glyphMap => {
  if (type === 'arrive') return 'flag';
  if (type === 'depart') return 'near-me';
  if (!modifier || modifier === 'straight') return 'arrow-upward';
  if (modifier === 'right') return 'turn-right';
  if (modifier === 'left') return 'turn-left';
  if (modifier === 'slight right') return 'turn-slight-right';
  if (modifier === 'slight left') return 'turn-slight-left';
  if (modifier === 'sharp right') return 'turn-sharp-right';
  if (modifier === 'sharp left') return 'turn-sharp-left';
  if (modifier === 'uturn') return 'u-turn-right';
  return 'arrow-upward';
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiveTrackingGate({
  visible,
  vendorCoords,
  pickupLocation,
  expectedDistanceKm,
  customerName,
  pickupAddress,
  onContinue,
  onBack,
}: LiveTrackingGateProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);

  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [lastFetchedCoords, setLastFetchedCoords] = useState<CoordinatePoint | null>(null);

  // ── Live distance computation ───────────────────────────────────────────────
  const liveDistanceMeters = useMemo<number | null>(() => {
    if (!vendorCoords) return null;

    const vLat = Number(vendorCoords.latitude);
    const vLng = Number(vendorCoords.longitude);

    if (!Number.isFinite(vLat) || !Number.isFinite(vLng)) return null;
    if (!isCoordinateUsable(vLat, vLng)) return null;
    if (!isCoordinateUsable(pickupLocation.latitude, pickupLocation.longitude)) return null;

    const accuracy = Number(vendorCoords.accuracy);
    if (Number.isFinite(accuracy) && accuracy > MAX_TRUSTED_VENDOR_ACCURACY_METERS) return null;

    const ts = Number(vendorCoords.timestamp);
    if (Number.isFinite(ts) && Date.now() - ts > MAX_VENDOR_LOCATION_AGE_MS) return null;

    const dist = haversineDistanceMeters({ latitude: vLat, longitude: vLng }, pickupLocation);

    // Sanity-check against expected distance
    const expectedMeters = Number(expectedDistanceKm) * 1000;
    if (
      Number.isFinite(expectedMeters) &&
      expectedMeters >= 0 &&
      expectedMeters <= 5000 &&
      dist > Math.max(5000, expectedMeters * 20)
    ) {
      return null;
    }

    return dist;
  }, [vendorCoords, pickupLocation, expectedDistanceKm]);

  const isSliderEnabled =
    liveDistanceMeters !== null && liveDistanceMeters <= MAX_READY_DISTANCE_METERS;

  // ── Fetch route from Mapbox Directions v5 ──────────────────────────────────
  const fetchRoute = useCallback(async () => {
    if (!vendorCoords) return;

    const vLat = Number(vendorCoords.latitude);
    const vLng = Number(vendorCoords.longitude);
    if (!isCoordinateUsable(vLat, vLng)) return;

    setRouteLoading(true);
    try {
      const url =
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
        `${vLng},${vLat};${pickupLocation.longitude},${pickupLocation.latitude}` +
        `?steps=true&geometries=geojson&overview=full&language=en&access_token=${MAPBOX_PUBLIC_TOKEN}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.routes?.length > 0) {
        const r = json.routes[0];
        setRouteData({
          geometry: r.geometry,
          duration: r.duration,
          distance: r.distance,
          steps: r.legs?.[0]?.steps ?? [],
        });
        setLastFetchedCoords({ latitude: vLat, longitude: vLng });
      }
    } catch {
      // Silently fall back to straight-line display
    } finally {
      setRouteLoading(false);
    }
  }, [vendorCoords, pickupLocation]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!visible) return;

    fetchRoute();
    const interval = setInterval(fetchRoute, ROUTE_REFETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible, fetchRoute]);

  // Reset on hide
  useEffect(() => {
    if (!visible) {
      setRouteData(null);
      setLastFetchedCoords(null);
    }
  }, [visible]);

  // ── Camera follows vendor ─────────────────────────────────────────────────
  useEffect(() => {
    if (!vendorCoords || !cameraRef.current) return;
    const vLat = Number(vendorCoords.latitude);
    const vLng = Number(vendorCoords.longitude);
    if (!Number.isFinite(vLat) || !Number.isFinite(vLng)) return;

    cameraRef.current.setCamera({
      centerCoordinate: [vLng, vLat],
      zoomLevel: 16,
      animationDuration: 800,
      animationMode: 'flyTo',
    });
  }, [vendorCoords?.latitude, vendorCoords?.longitude]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const initialCoord = useMemo<[number, number]>(() => {
    if (
      vendorCoords &&
      isCoordinateUsable(Number(vendorCoords.latitude), Number(vendorCoords.longitude))
    ) {
      return [Number(vendorCoords.longitude), Number(vendorCoords.latitude)];
    }
    return [pickupLocation.longitude, pickupLocation.latitude];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally stable

  const destinationCoord = useMemo<[number, number]>(
    () => [pickupLocation.longitude, pickupLocation.latitude],
    [pickupLocation],
  );

  const routeGeoJson = useMemo(() => {
    if (!routeData) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: routeData.geometry,
          properties: {},
        },
      ],
    };
  }, [routeData]);

  // Fallback straight-line when route not yet loaded
  const fallbackGeoJson = useMemo(() => {
    if (routeGeoJson) return null;
    if (!vendorCoords) return null;
    const vLat = Number(vendorCoords.latitude);
    const vLng = Number(vendorCoords.longitude);
    if (!isCoordinateUsable(vLat, vLng)) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              [vLng, vLat],
              [pickupLocation.longitude, pickupLocation.latitude],
            ] as [number, number][],
          },
          properties: {},
        },
      ],
    };
  }, [routeGeoJson, vendorCoords, pickupLocation]);

  const currentStep = useMemo(
    () => (routeData?.steps?.length ? routeData.steps[0] : null),
    [routeData],
  );

  if (!visible) return null;

  const activeLineGeoJson = routeGeoJson ?? fallbackGeoJson;

  return (
    <View style={styles.root}>
      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <Mapbox.MapView
        style={styles.map}
        styleURL={NAV_MAP_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={initialCoord}
          zoomLevel={15.5}
        />

        <Mapbox.UserLocation visible animated />

        {/* Route casing (white border for readability) */}
        {activeLineGeoJson ? (
          <Mapbox.ShapeSource id="route-casing-src" shape={activeLineGeoJson as any}>
            <Mapbox.LineLayer
              id="route-casing"
              style={{
                lineColor: '#FFFFFF',
                lineWidth: 10,
                lineOpacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {/* Route line */}
        {activeLineGeoJson ? (
          <Mapbox.ShapeSource id="route-line-src" shape={activeLineGeoJson as any}>
            <Mapbox.LineLayer
              id="route-line"
              style={{
                lineColor: routeGeoJson ? '#16A34A' : '#94A3B8',
                lineWidth: 6,
                lineOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {/* Destination pin */}
        <Mapbox.PointAnnotation id="destination-pin" coordinate={destinationCoord}>
          <View style={styles.destinationPin}>
            <MaterialIcons name="location-pin" size={36} color="#EF4444" />
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>

      {/* ── Navigation Banner (top) ───────────────────────────────────────── */}
      <View
        style={[
          styles.navBannerContainer,
          { paddingTop: insets.top > 0 ? insets.top + 6 : 46 },
        ]}
        pointerEvents="box-none"
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        {/* Instruction card */}
        <View style={styles.instructionCard}>
          {routeLoading && !currentStep ? (
            <>
              <ActivityIndicator color="#16A34A" size="small" style={styles.stepIcon} />
              <View style={styles.instructionTextWrap}>
                <Text style={styles.instructionDistance}>Calculating…</Text>
                <Text style={styles.instructionStreet} numberOfLines={1}>
                  {pickupAddress}
                </Text>
              </View>
            </>
          ) : currentStep ? (
            <>
              <View style={styles.stepIconWrap}>
                <MaterialIcons
                  name={getManeuverIcon(
                    currentStep.maneuver.type,
                    currentStep.maneuver.modifier,
                  )}
                  size={26}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.instructionTextWrap}>
                <Text style={styles.instructionDistance}>
                  {formatDistance(currentStep.distance)}
                </Text>
                <Text style={styles.instructionStreet} numberOfLines={2}>
                  {currentStep.maneuver.instruction || currentStep.name || 'Continue ahead'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.stepIconWrap}>
                <MaterialIcons name="navigation" size={26} color="#FFFFFF" />
              </View>
              <View style={styles.instructionTextWrap}>
                <Text style={styles.instructionDistance}>En Route</Text>
                <Text style={styles.instructionStreet} numberOfLines={1}>
                  {customerName} — {pickupAddress}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Bottom Panel ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.bottomPanel,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24 },
        ]}
      >
        {/* Slide to continue OR locked hint */}
        {isSliderEnabled ? (
          <View style={styles.sliderSection}>
            <View style={styles.arrivedBadge}>
              <View style={styles.arrivedDot} />
              <Text style={styles.arrivedBadgeText}>
                You've arrived •{' '}
                {liveDistanceMeters !== null ? formatDistance(liveDistanceMeters) : ''} away
              </Text>
            </View>
            <SlideToConfirmButton
              label="Slide to Continue"
              onConfirm={onContinue}
            />
          </View>
        ) : (
          <View style={styles.lockedRow}>
            <View style={styles.lockedIconWrap}>
              <MaterialIcons name="lock" size={16} color="#64748B" />
            </View>
            <Text style={styles.lockedText}>
              {liveDistanceMeters !== null
                ? `${formatDistance(liveDistanceMeters)} away — move closer to unlock`
                : 'Waiting for GPS lock…'}
            </Text>
          </View>
        )}

        {/* ETA / Distance row */}
        <View style={styles.etaRow}>
          <View style={styles.etaItem}>
            <MaterialIcons name="access-time" size={18} color="#16A34A" />
            <Text style={styles.etaValue}>
              {routeData ? formatDuration(routeData.duration) : '--'}
            </Text>
            <Text style={styles.etaLabel}>ETA</Text>
          </View>

          <View style={styles.etaDivider} />

          <View style={styles.etaItem}>
            <MaterialIcons name="straighten" size={18} color="#16A34A" />
            <Text style={styles.etaValue}>
              {routeData ? formatDistance(routeData.distance) : '--'}
            </Text>
            <Text style={styles.etaLabel}>Distance</Text>
          </View>

          <View style={styles.etaDivider} />

          <View style={styles.etaItem}>
            <MaterialIcons
              name="gps-fixed"
              size={18}
              color={liveDistanceMeters !== null ? '#16A34A' : '#94A3B8'}
            />
            <Text style={styles.etaValue}>
              {liveDistanceMeters !== null ? formatDistance(liveDistanceMeters) : '--'}
            </Text>
            <Text style={styles.etaLabel}>Live GPS</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  map: {
    flex: 1,
  },

  // Navigation banner
  navBannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    gap: 10,
    pointerEvents: 'box-none',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 6 },
    }),
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 8 },
    }),
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepIcon: {
    width: 48,
    height: 48,
    alignSelf: 'center',
  },
  instructionTextWrap: {
    flex: 1,
    gap: 2,
  },
  instructionDistance: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  instructionStreet: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // Destination pin
  destinationPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 12 },
    }),
  },

  // Arrived badge
  sliderSection: {
    gap: 10,
  },
  arrivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  arrivedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  arrivedBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },

  // Locked row
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockedIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    flex: 1,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  // ETA row
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  etaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  etaValue: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  etaLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
});
