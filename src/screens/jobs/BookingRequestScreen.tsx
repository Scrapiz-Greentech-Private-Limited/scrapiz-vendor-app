import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ApiService } from '../../services/api';
import { BookingRequest, LeadDetailsResponse, LeadOrderItem } from '../../types';
import { buildFallbackLead, isFallbackAppTestingEnabled } from './fallbackPickupData';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';

interface PickupAssessmentPayload {
  leadId: string;
  items: LeadOrderItem[];
  orderNumber: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
}

interface BookingRequestScreenProps {
  leadId: string;
  fallbackBooking?: BookingRequest | null;
  onBack: () => void;
  onProceedToAssessment: (payload: PickupAssessmentPayload) => void;
  onDeclined: (message?: string) => void;
}

const categoryColor: Record<string, string> = {
  metal: '#14532D',
  plastic: '#0369A1',
  paper: '#854D0E',
  glass: '#6D28D9',
};

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

const haversineDistanceKm = (
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number },
) => {
  const earthRadiusKm = 6371;
  const dLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const dLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;
  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const BookingRequestScreen: React.FC<BookingRequestScreenProps> = ({
  leadId,
  fallbackBooking,
  onBack,
  onProceedToAssessment,
  onDeclined,
}) => {
  const [lead, setLead] = useState<LeadDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [vendorLocation, setVendorLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const isExpired = remaining <= 0;

  useEffect(() => {
    const loadLead = async () => {
      setIsLoading(true);
      try {
        const response = await ApiService.getLeadDetails(leadId);
        setLead(response);
        setRemaining(Math.max(response.seconds_remaining || 0, 0));
      } catch {
        if (fallbackBooking?.isFallback && isFallbackAppTestingEnabled()) {
          const fallback = await buildFallbackLead(fallbackBooking, leadId);
          setLead(fallback);
          setRemaining(fallback.seconds_remaining);
        } else {
          Alert.alert('Error', 'Unable to load booking request.');
          onBack();
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLead();
  }, [fallbackBooking, leadId, onBack]);

  useEffect(() => {
    if (!lead || isExpired) {
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isExpired, lead]);

  const requestPreciseLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationPermission('denied');
        setVendorLocation(null);
        return;
      }

      setLocationPermission('granted');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });

      setVendorLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationAccuracy(position.coords.accuracy ?? null);
    } catch {
      setLocationPermission('denied');
      setVendorLocation(null);
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    void requestPreciseLocation();
  }, [requestPreciseLocation]);

  const countdown = useMemo(() => {
    const minutes = Math.floor(remaining / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(remaining % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remaining]);

  const visibleItems = useMemo(() => {
    if (!lead) {
      return [];
    }
    return isExpanded ? lead.order.items : lead.order.items.slice(0, 3);
  }, [isExpanded, lead]);

  const totalQty = useMemo(() => {
    if (!lead) {
      return 0;
    }
    return lead.order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [lead]);

  const scheduledLabel = useMemo(() => {
    const iso = lead?.order.scheduled_at;
    if (!iso) {
      return 'Today';
    }

    const scheduled = new Date(iso);
    const today = new Date();
    if (scheduled.toDateString() === today.toDateString()) {
      return 'Today';
    }

    return scheduled.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [lead]);

  const isPreciseLocation = useMemo(() => {
    if (locationPermission !== 'granted') {
      return false;
    }
    if (locationAccuracy === null) {
      return false;
    }
    return locationAccuracy <= 100;
  }, [locationAccuracy, locationPermission]);

  const hasValidPickupCoordinates = useMemo(() => {
    if (!lead) {
      return false;
    }

    return Number.isFinite(Number(lead.pickup_lat)) && Number.isFinite(Number(lead.pickup_lng));
  }, [lead]);

  const normalizedPickupLocation = useMemo(() => {
    if (!lead || !hasValidPickupCoordinates) {
      return null;
    }

    return {
      latitude: Number(lead.pickup_lat),
      longitude: Number(lead.pickup_lng),
    };
  }, [lead, hasValidPickupCoordinates]);

  const approxDistanceKm = useMemo(() => {
    if (!lead) {
      return 0;
    }

    if (!normalizedPickupLocation) {
      return Number(lead.distance_km || 0);
    }

    if (!vendorLocation) {
      return lead.distance_km;
    }

    return haversineDistanceKm(vendorLocation, normalizedPickupLocation);
  }, [lead, normalizedPickupLocation, vendorLocation]);

  if (isLoading || !lead) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#14532D" />
        <Text style={styles.loaderText}>Loading booking request...</Text>
      </View>
    );
  }

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await ApiService.rejectLead(lead.lead_id);
      setShowDeclineModal(false);
      onDeclined('Booking declined');
    } catch {
      Alert.alert('Error', 'Failed to decline booking. Please try again.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.headerIconButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Booking Request</Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusBadgeText}>New request</Text>
              </View>
              <View style={[styles.timerBadge, isExpired && styles.timerBadgeExpired]}>
                <MaterialIcons name="schedule" size={14} color={isExpired ? '#7F1D1D' : '#FDE68A'} />
                <Text style={[styles.timerBadgeText, isExpired && styles.timerBadgeTextExpired]}>
                  {isExpired ? 'Expired' : countdown}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.headerIconButtonSecondary}>
            <Ionicons name="ellipsis-vertical" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSummary}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{lead.distance_km.toFixed(1)} km</Text>
            <Text style={styles.summarySubtext}>{lead.estimated_minutes} mins away</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Estimate</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(lead.order.estimated_value_min)} - {formatCurrency(lead.order.estimated_value_max)}
            </Text>
            <Text style={styles.summarySubtext}>{lead.order.items.length} material lines</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.locationCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialIcons name="place" size={18} color="#14532D" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Pickup map match</Text>
              <Text style={styles.sectionSubtitle}>Customer + your live precise location</Text>
            </View>
            {lead.is_urgent ? (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityBadgeText}>⏱ Urgent</Text>
              </View>
            ) : null}
          </View>

          {locationPermission === 'denied' ? (
            <View style={styles.permissionCard}>
              <MaterialIcons name="gps-off" size={20} color="#B45309" />
              <View style={styles.permissionCopy}>
                <Text style={styles.permissionTitle}>Precise location required</Text>
                <Text style={styles.permissionText}>
                  Enable precise GPS to compare your live position with the pickup pin.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => {
                  Linking.openSettings();
                }}
              >
                <Text style={styles.permissionButtonText}>Open settings</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {locationPermission === 'granted' && !isPreciseLocation ? (
            <View style={styles.permissionCard}>
              <MaterialIcons name="my-location" size={20} color="#B45309" />
              <View style={styles.permissionCopy}>
                <Text style={styles.permissionTitle}>Use precise location</Text>
                <Text style={styles.permissionText}>
                  Current accuracy is {(locationAccuracy || 0).toFixed(0)}m. Retry with precise GPS enabled.
                </Text>
              </View>
              <TouchableOpacity style={styles.permissionButton} onPress={() => void requestPreciseLocation()}>
                <Text style={styles.permissionButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {locationPermission === 'granted' && !normalizedPickupLocation ? (
            <View style={styles.permissionCard}>
              <MaterialIcons name="location-off" size={20} color="#B45309" />
              <View style={styles.permissionCopy}>
                <Text style={styles.permissionTitle}>Pickup location unavailable</Text>
                <Text style={styles.permissionText}>
                  This order does not have valid pickup coordinates yet. Please ask admin to update the order location.
                </Text>
              </View>
            </View>
          ) : null}

          {locationPermission === 'granted' && isPreciseLocation && normalizedPickupLocation ? (
            <>
              <View style={styles.mapWrap}>
                <LiveSessionMap
                  customerLocation={normalizedPickupLocation}
                  vendorLocation={vendorLocation || undefined}
                  height={250}
                  label={`Approx ${approxDistanceKm.toFixed(1)} km • accuracy ${Math.round(locationAccuracy || 0)}m`}
                />
              </View>

              <View style={styles.mapMetaRow}>
                <View style={styles.mapMetaPill}>
                  <View style={[styles.markerDot, { backgroundColor: '#16A34A' }]} />
                  <Text style={styles.mapMetaText}>Customer pin</Text>
                </View>
                <View style={styles.mapMetaPill}>
                  <View style={[styles.markerDot, { backgroundColor: '#2563EB' }]} />
                  <Text style={styles.mapMetaText}>Your marker</Text>
                </View>
                <View style={styles.mapMetaPill}>
                  <MaterialIcons name="route" size={14} color="#0EA5E9" />
                  <Text style={styles.mapMetaText}>~ {approxDistanceKm.toFixed(1)} km</Text>
                </View>
              </View>
            </>
          ) : null}

          {isLocating ? (
            <View style={styles.locatingRow}>
              <ActivityIndicator size="small" color="#166534" />
              <Text style={styles.locatingText}>Getting your precise location...</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="verified-user" size={18} color="#166534" />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Customer privacy protected</Text>
            <Text style={styles.infoText}>
              Contact details stay masked until you accept. This keeps request handling committed and secure.
            </Text>
          </View>
        </View>

        <View style={styles.surfaceCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrapMuted}>
              <MaterialIcons name="person" size={18} color="#166534" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Customer card</Text>
              <Text style={styles.sectionSubtitle}>Limited information before acceptance</Text>
            </View>
            <View style={styles.lockCircle}>
              <MaterialIcons name="lock" size={14} color="#64748B" />
            </View>
          </View>

          <View style={styles.customerCard}>
            <View style={styles.customerTopRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>{lead.customer.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.customerMeta}>
                <Text style={styles.customerName}>{lead.customer.name}</Text>
                <Text style={styles.customerSubtext}>Phone number will unlock after acceptance</Text>
              </View>
              <View style={styles.customerRating}>
                <MaterialIcons name="star" size={14} color="#F59E0B" />
                <Text style={styles.customerRatingText}>{lead.customer.rating.toFixed(1)}</Text>
              </View>
            </View>

            <View style={styles.lockedPanel}>
              <MaterialIcons name="lock" size={18} color="#64748B" />
              <View style={styles.lockedCopy}>
                <Text style={styles.lockedTitle}>{lead.customer.masked_phone}</Text>
                <Text style={styles.lockedText}>Accept the booking to reveal the contact number</Text>
              </View>
            </View>

            <View style={styles.customerMetaRow}>
              <View style={styles.customerMetaPill}>
                <MaterialIcons name="history" size={14} color="#64748B" />
                <Text style={styles.customerMetaPillText}>{lead.customer.total_orders} previous orders</Text>
              </View>
              {lead.customer.is_verified ? (
                <View style={styles.customerMetaPill}>
                  <MaterialIcons name="verified" size={14} color="#16A34A" />
                  <Text style={styles.customerMetaPillText}>Verified</Text>
                </View>
              ) : null}
            </View>

          </View>
        </View>

        <View style={styles.surfaceCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialIcons name="recycling" size={18} color="#14532D" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Order summary</Text>
              <Text style={styles.sectionSubtitle}>Review the material mix before committing</Text>
            </View>
          </View>

          <View style={styles.materialHero}>
            <View style={styles.materialHeroTop}>
              <Text style={styles.materialHeroTitle}>{lead.order.items[0]?.product_name || 'Material mix'}</Text>
              {lead.is_urgent ? (
                <View style={styles.priorityBadgeSoft}>
                  <Text style={styles.priorityBadgeSoftText}>High priority</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.materialHeroSubtext}>Estimated weight {totalQty} kg across requested material lines</Text>
          </View>

          <View style={styles.summaryList}>
            <View style={styles.summaryListRow}>
              <MaterialIcons name="schedule" size={18} color="#64748B" />
              <Text style={styles.summaryListLabel}>Pickup date</Text>
              <Text style={styles.summaryListValue}>{scheduledLabel}</Text>
            </View>
            <View style={styles.summaryListRow}>
              <MaterialIcons name="payments" size={18} color="#64748B" />
              <Text style={styles.summaryListLabel}>Payment method</Text>
              <View style={styles.cashBadge}>
                <Text style={styles.cashBadgeText}>Cash</Text>
              </View>
            </View>
          </View>

          <View style={styles.estimatePanel}>
            <Text style={styles.estimateLabel}>Estimated value</Text>
            <Text style={styles.estimateValue}>
              {formatCurrency(lead.order.estimated_value_min)} - {formatCurrency(lead.order.estimated_value_max)}
            </Text>
          </View>
        </View>

        <View style={styles.surfaceCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialIcons name="inventory-2" size={18} color="#14532D" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Pickup Items</Text>
              <Text style={styles.sectionSubtitle}>Material list and current rate band</Text>
            </View>
          </View>

          {visibleItems.map((item) => {
            const cat = (item.category || '').toLowerCase();
            const fallbackColor = categoryColor[cat] || '#475569';

            return (
              <View key={String(item.product_id)} style={styles.itemRow}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, { backgroundColor: `${fallbackColor}16` }]}>
                    <MaterialIcons name="category" size={20} color={fallbackColor} />
                  </View>
                )}

                <View style={styles.itemMeta}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemSubtext}>
                    Est. {item.quantity} {item.unit}
                  </Text>
                </View>

                <Text style={styles.itemRate}>
                  ₹{item.min_rate} - ₹{item.max_rate}/{item.unit}
                </Text>
              </View>
            );
          })}

          {lead.order.items.length > 3 && !isExpanded ? (
            <TouchableOpacity style={styles.moreButton} onPress={() => setIsExpanded(true)}>
              <Text style={styles.moreButtonText}>+ {lead.order.items.length - 3} more</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.bottomSheet}>
        <Text style={styles.bottomSheetTitle}>Review and respond</Text>
        <Text style={styles.bottomSheetText}>
          Accept to move into assessment, or decline to release this request back to the queue.
        </Text>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.declineButton, isExpired && styles.disabledButton]}
            disabled={isExpired}
            onPress={() => setShowDeclineModal(true)}
          >
            <MaterialIcons name="close" size={18} color="#B91C1C" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, isExpired && styles.disabledButton]}
            disabled={isExpired}
            onPress={() =>
              onProceedToAssessment({
                leadId: lead.lead_id,
                items: lead.order.items,
                orderNumber: lead.order.order_number,
                estimatedValueMin: lead.order.estimated_value_min,
                estimatedValueMax: lead.order.estimated_value_max,
              })
            }
          >
            <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accept booking</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showDeclineModal} transparent animationType="fade" onRequestClose={() => setShowDeclineModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline this request?</Text>
            <Text style={styles.modalText}>The request will be released so another vendor can take it.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setShowDeclineModal(false)}>
                <Text style={styles.modalSecondaryText}>Keep request</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleReject} disabled={isRejecting}>
                <Text style={styles.modalPrimaryText}>{isRejecting ? 'Declining...' : 'Decline'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isExpired ? (
        <View pointerEvents="none" style={styles.expiredOverlay}>
          <View style={styles.expiredOverlayCard}>
            <Text style={styles.expiredOverlayTitle}>Request Expired</Text>
            <Text style={styles.expiredOverlayText}>This booking is no longer available to accept.</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7F5' },
  loaderText: { marginTop: 12, color: '#475569' },
  header: {
    backgroundColor: '#166534',
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonSecondary: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  headerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FACC15', marginRight: 8 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: '700' },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  timerBadgeExpired: { backgroundColor: '#FEE2E2' },
  timerBadgeText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 },
  timerBadgeTextExpired: { color: '#7F1D1D' },
  heroSummary: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryBlock: { flex: 1 },
  summaryLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 6 },
  summarySubtext: { color: 'rgba(255,255,255,0.72)', marginTop: 4, lineHeight: 18 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 16 },
  content: { padding: 18, paddingBottom: 180, gap: 16 },
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18 },
  surfaceCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F3EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionIconWrapMuted: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EDF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sectionSubtitle: { color: '#64748B', marginTop: 2 },
  priorityBadge: {
    backgroundColor: '#FFF1E7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  priorityBadgeText: { color: '#C2410C', fontWeight: '700' },
  permissionCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD9B6',
    backgroundColor: '#FFF7ED',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permissionCopy: { flex: 1 },
  permissionTitle: { color: '#9A3412', fontWeight: '800', fontSize: 13 },
  permissionText: { color: '#7C2D12', marginTop: 3, fontSize: 12, lineHeight: 16 },
  permissionButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F59E0B',
  },
  permissionButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  mapWrap: { marginTop: 14 },
  mapMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  mapMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF5EE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  markerDot: { width: 10, height: 10, borderRadius: 5 },
  mapMetaText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  locatingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locatingText: { color: '#166534', fontWeight: '600' },
  infoCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#EAF3EF',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoCopy: { flex: 1 },
  infoTitle: { color: '#166534', fontWeight: '800' },
  infoText: { color: '#475569', marginTop: 4, lineHeight: 20 },
  lockCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerCard: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E6ECE8',
    padding: 16,
    backgroundColor: '#FBFCFB',
  },
  customerTopRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  customerMeta: { flex: 1, marginLeft: 12 },
  customerName: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  customerSubtext: { color: '#64748B', marginTop: 3 },
  customerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  customerRatingText: { color: '#92400E', fontWeight: '800', marginLeft: 4 },
  lockedPanel: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  lockedCopy: { flex: 1, marginLeft: 12 },
  lockedTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
  lockedText: { color: '#64748B', marginTop: 4, lineHeight: 18 },
  customerMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  customerMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6F4',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customerMetaPillText: { color: '#475569', fontWeight: '700', marginLeft: 6 },
  materialHero: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E6ECE8',
    padding: 18,
    backgroundColor: '#FBFCFB',
  },
  materialHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materialHeroTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 12 },
  priorityBadgeSoft: {
    backgroundColor: '#FFF1E7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityBadgeSoftText: { color: '#C2410C', fontWeight: '700', fontSize: 12 },
  materialHeroSubtext: { color: '#64748B', marginTop: 10 },
  summaryList: { marginTop: 16, gap: 14 },
  summaryListRow: { flexDirection: 'row', alignItems: 'center' },
  summaryListLabel: { flex: 1, color: '#64748B', marginLeft: 10, fontWeight: '600' },
  summaryListValue: { color: '#0F172A', fontWeight: '800' },
  cashBadge: {
    backgroundColor: '#E8F3EB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cashBadgeText: { color: '#166534', fontWeight: '800' },
  estimatePanel: {
    marginTop: 18,
    backgroundColor: '#166534',
    borderRadius: 20,
    padding: 18,
  },
  estimateLabel: { color: '#D1FAE5', fontWeight: '700' },
  estimateValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  itemImage: {
    width: 54,
    height: 54,
    borderRadius: 16,
    resizeMode: 'cover',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: { flex: 1, marginLeft: 12, marginRight: 10 },
  itemName: { color: '#0F172A', fontWeight: '800', fontSize: 15 },
  itemSubtext: { color: '#64748B', marginTop: 4 },
  itemRate: { color: '#14532D', fontWeight: '800', textAlign: 'right', maxWidth: 130 },
  moreButton: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EDF5EE',
  },
  moreButtonText: { color: '#166534', fontWeight: '800' },
  bottomSheet: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5ECE7',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bottomSheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  bottomSheetText: { color: '#64748B', marginTop: 6, lineHeight: 20 },
  bottomActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  declineButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F0B8B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  declineButtonText: { color: '#B91C1C', fontWeight: '800', fontSize: 15 },
  acceptButton: {
    flex: 1.2,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  acceptButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  disabledButton: { opacity: 0.55 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalText: { color: '#64748B', marginTop: 8, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E1DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: { color: '#0F172A', fontWeight: '700' },
  modalPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: { color: '#FFFFFF', fontWeight: '800' },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148,163,184,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  expiredOverlayCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  expiredOverlayTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#334155',
  },
  expiredOverlayText: {
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default BookingRequestScreen;
