import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ApiService } from '../../services/api';
import { BookingRequest, LeadDetailsResponse, LeadOrderItem } from '../../types';
import { buildFallbackLead, isFallbackAppTestingEnabled } from './fallbackPickupData';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';
import SlideToConfirmButton from '../../components/ui/SlideToConfirmButton';

const SATELLITE_HYBRID_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

const EXPIRY_FEEDBACK_OPTIONS = [
  {
    value: 'system_cancelled_while_en_route',
    label: 'I was on the way when it expired',
  },
  {
    value: 'no_warning_notifications',
    label: 'I did not get warning alerts',
  },
  {
    value: 'could_not_take_job',
    label: 'I could not take this job',
  },
  {
    value: 'other_reason',
    label: 'Other reason',
  },
] as const;

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

type Coordinate = { latitude: number; longitude: number };

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: number) => `Rs ${Math.round(value).toLocaleString('en-IN')}`;

const formatDistance = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 km';
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`;
};

const formatMinutes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 'Nearby';
  return `${Math.max(1, Math.round(value))} mins away`;
};

const haversineDistanceKm = (pointA: Coordinate, pointB: Coordinate) => {
  const radius = 6371;
  const dLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const dLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;
  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const buildAStarRouteCoordinates = (start: Coordinate | null, end: Coordinate | null): [number, number][] => {
  if (!start || !end) return [];

  const gridSize = 16;
  const startNode = { x: 0, y: 0 };
  const endNode = { x: gridSize, y: gridSize };
  const nodeKey = (x: number, y: number) => `${x}:${y}`;
  const heuristic = (x: number, y: number) => Math.hypot(endNode.x - x, endNode.y - y);
  const open = [{ ...startNode, g: 0, f: heuristic(0, 0), parent: '' }];
  const cameFrom = new Map<string, string>();
  const bestCost = new Map<string, number>([[nodeKey(0, 0), 0]]);
  const closed = new Set<string>();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = nodeKey(current.x, current.y);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);
    if (current.x === endNode.x && current.y === endNode.y) break;

    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1], [0, -1], [-1, 1]]) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx > gridSize || ny > gridSize) continue;
      const nextKey = nodeKey(nx, ny);
      const moveCost = dx !== 0 && dy !== 0 ? 1.414 : 1;
      const nextCost = current.g + moveCost;
      if (nextCost >= (bestCost.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      bestCost.set(nextKey, nextCost);
      cameFrom.set(nextKey, currentKey);
      open.push({ x: nx, y: ny, g: nextCost, f: nextCost + heuristic(nx, ny), parent: currentKey });
    }
  }

  const nodes: { x: number; y: number }[] = [];
  let cursor = nodeKey(endNode.x, endNode.y);
  while (cursor) {
    const [x, y] = cursor.split(':').map(Number);
    nodes.unshift({ x, y });
    if (cursor === nodeKey(startNode.x, startNode.y)) break;
    cursor = cameFrom.get(cursor) || '';
  }

  const resolvedNodes = nodes.length >= 2 ? nodes : [startNode, endNode];
  return resolvedNodes.map((node) => {
    const tLng = node.x / gridSize;
    const tLat = node.y / gridSize;
    return [
      start.longitude + (end.longitude - start.longitude) * tLng,
      start.latitude + (end.latitude - start.latitude) * tLat,
    ];
  });
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
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [vendorLocation, setVendorLocation] = useState<Coordinate | null>(null);
  const [locationPermission, setLocationPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [showExpiredFeedbackModal, setShowExpiredFeedbackModal] = useState(false);
  const [selectedExpiredReason, setSelectedExpiredReason] =
    useState<(typeof EXPIRY_FEEDBACK_OPTIONS)[number]['value'] | null>(null);
  const [otherExpiredReason, setOtherExpiredReason] = useState('');
  const [supportFeedbackQuestionId, setSupportFeedbackQuestionId] = useState<number | null>(null);
  const [isSubmittingExpiredFeedback, setIsSubmittingExpiredFeedback] = useState(false);

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
    void loadLead();
  }, [fallbackBooking, leadId, onBack]);

  useEffect(() => {
    if (!lead || isExpired) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isExpired, lead]);

  const requestPreciseLocation = useCallback(async () => {
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
      setVendorLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setLocationPermission('denied');
      setVendorLocation(null);
    }
  }, []);

  useEffect(() => {
    void requestPreciseLocation();
  }, [requestPreciseLocation]);

  useEffect(() => {
    const loadSupportFeedbackQuestion = async () => {
      try {
        const questions = await ApiService.getFeedbackQuestions('support');
        setSupportFeedbackQuestionId(questions[0]?.id ?? null);
      } catch {
        setSupportFeedbackQuestionId(null);
      }
    };
    void loadSupportFeedbackQuestion();
  }, []);

  const countdown = useMemo(() => {
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = Math.floor(remaining % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, [remaining]);

  const customerLocation = useMemo<Coordinate | null>(() => {
    if (!lead) return null;
    const latitude = toFiniteNumber(lead.pickup_lat, Number.NaN);
    const longitude = toFiniteNumber(lead.pickup_lng, Number.NaN);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }, [lead]);

  const totalWeight = useMemo(() => {
    const serverWeight = toFiniteNumber(lead?.order.total_weight, 0);
    const itemWeight = lead?.order.items.reduce((sum, item) => sum + toFiniteNumber(item.quantity, 0), 0) || 0;
    return serverWeight > 0 ? serverWeight : itemWeight;
  }, [lead]);

  const totalWeightLabel = useMemo(
    () => `${Number(totalWeight.toFixed(2)).toLocaleString('en-IN')} kg`,
    [totalWeight],
  );

  const distanceKm = useMemo(() => {
    if (!lead) return 0;
    if (vendorLocation && customerLocation) return haversineDistanceKm(vendorLocation, customerLocation);
    return toFiniteNumber(lead.distance_km, 0);
  }, [customerLocation, lead, vendorLocation]);

  const routeCoordinates = useMemo(
    () => buildAStarRouteCoordinates(vendorLocation, customerLocation),
    [customerLocation, vendorLocation],
  );

  const estimatedMinutes = useMemo(() => {
    if (lead?.estimated_minutes) return lead.estimated_minutes;
    return distanceKm ? (distanceKm / 25) * 60 : 0;
  }, [distanceKm, lead?.estimated_minutes]);

  const customerAvatarUrl = useMemo(() => {
    const customer = lead?.customer as any;
    return customer?.image || customer?.avatar_url || customer?.profile_image || customer?.profileImage || '';
  }, [lead?.customer]);

  const customerNote = (lead?.customer_note || '').trim();

  const openRouteInMaps = useCallback(async () => {
    if (!customerLocation) {
      Alert.alert('Pickup location unavailable', 'This booking does not have map coordinates yet.');
      return;
    }

    const destination = `${customerLocation.latitude},${customerLocation.longitude}`;
    const origin = vendorLocation ? `${vendorLocation.latitude},${vendorLocation.longitude}` : '';
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open maps', 'Please try again from your maps app.');
    }
  }, [customerLocation, vendorLocation]);

  const handleReject = async () => {
    if (!lead) return;
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

  const handleExpiredSlideContinue = () => {
    setSelectedExpiredReason(null);
    setOtherExpiredReason('');
    setShowExpiredFeedbackModal(true);
  };

  const handleSubmitExpiredFeedback = async () => {
    if (!lead || !supportFeedbackQuestionId) {
      Alert.alert('Support unavailable', 'Please try again in a moment.');
      return;
    }
    if (!selectedExpiredReason) {
      Alert.alert('Select a reason', 'Please choose one reason before continuing.');
      return;
    }
    if (selectedExpiredReason === 'other_reason' && !otherExpiredReason.trim()) {
      Alert.alert('Add details', 'Please share a short note for support.');
      return;
    }

    setIsSubmittingExpiredFeedback(true);
    try {
      await ApiService.submitFeedback({
        context: 'support',
        responses: [
          {
            question_id: supportFeedbackQuestionId,
            choice_value: selectedExpiredReason,
            text_value: selectedExpiredReason === 'other_reason' ? otherExpiredReason.trim() : null,
          },
        ],
      });
      setShowExpiredFeedbackModal(false);
      onDeclined('Expired request feedback submitted.');
    } catch {
      Alert.alert('Unable to submit', 'Please try again in a moment.');
    } finally {
      setIsSubmittingExpiredFeedback(false);
    }
  };

  const handleAccept = () => {
    if (!lead) return;
    onProceedToAssessment({
      leadId: lead.lead_id,
      items: lead.order.items,
      orderNumber: lead.order.order_number,
      estimatedValueMin: lead.order.estimated_value_min,
      estimatedValueMax: lead.order.estimated_value_max,
    });
  };

  if (isLoading || !lead) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#14532D" />
        <Text style={styles.loaderText}>Loading booking request...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button">
            <Ionicons name="arrow-back" size={25} color="#06351F" />
          </TouchableOpacity>

          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              Booking Request
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>New pickup request</Text>
            </View>
          </View>

          <View style={[styles.timerPill, isExpired && styles.timerPillExpired]}>
            <MaterialIcons name="schedule" size={27} color={isExpired ? '#B91C1C' : '#06351F'} />
            <View>
              <Text style={[styles.timerValue, isExpired && styles.timerValueExpired]}>
                {isExpired ? 'Expired' : countdown}
              </Text>
              <Text style={styles.timerLabel}>Time left</Text>
            </View>
          </View>
        </View>

        <View style={styles.requestCard}>
          <View style={styles.customerRow}>
            {customerAvatarUrl ? (
              <Image source={{ uri: customerAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {(lead.customer.name || 'C').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.customerCopy}>
              <Text style={styles.customerName} numberOfLines={1}>
                {lead.customer.name || 'Customer'}
              </Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={19} color="#FBBF24" />
                <Text style={styles.ratingText}>{toFiniteNumber(lead.customer.rating, 4.8).toFixed(1)}</Text>
                <Text style={styles.reviewText}>({lead.customer.total_orders} bookings)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
              <MaterialIcons name="call" size={20} color="#067A3D" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
              <MaterialIcons name="chat" size={20} color="#067A3D" />
            </TouchableOpacity>
          </View>

          <View style={styles.addressBlock}>
            <View style={styles.addressTopRow}>
              <View style={styles.addressMarkerOuter}>
                <View style={styles.addressMarkerInner} />
              </View>
              <Text style={styles.addressLabel}>Pickup address</Text>
            </View>
            <Text style={styles.addressText} numberOfLines={5}>
              {lead.pickup_address || 'Pickup location will be shared soon'}
            </Text>
            <TouchableOpacity
              style={styles.mapsButton}
              onPress={() => void openRouteInMaps()}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <MaterialIcons name="navigation" size={19} color="#067A3D" />
              <Text style={styles.mapsButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricsGrid}>
            <MetricTile
              wide
              icon="currency-rupee"
              label="Estimated Earnings"
              value={`${formatCurrency(lead.order.estimated_value_min)} - ${formatCurrency(lead.order.estimated_value_max)}`}
              detail={`${lead.order.items.length} material lines`}
            />
            <View style={styles.metricPair}>
              <MetricTile
                icon="place"
                label="Distance"
                value={formatDistance(distanceKm)}
                detail={formatMinutes(estimatedMinutes)}
              />
              <MetricTile
                icon="fork-right"
                label="Trip Type"
                value="Pickup Only"
                detail="Customer pickup"
              />
            </View>
          </View>
        </View>

        <View style={styles.mapCard}>
          {customerLocation ? (
            <LiveSessionMap
              customerLocation={customerLocation}
              vendorLocation={vendorLocation || undefined}
              height={255}
              mapStyleURL={SATELLITE_HYBRID_STYLE}
              routeCoordinates={routeCoordinates}
              routeColor="#078842"
              routeDashed={false}
              showOverlay={false}
            />
          ) : (
            <View style={styles.mapFallback}>
              <MaterialIcons name="location-off" size={26} color="#64748B" />
              <Text style={styles.mapFallbackText}>Pickup map unavailable</Text>
            </View>
          )}
          <View style={styles.routeDistanceBadge}>
            <Text style={styles.routeDistanceText}>
              {formatDistance(distanceKm)} - {Math.max(1, Math.round(estimatedMinutes))} mins
            </Text>
          </View>
          {locationPermission === 'denied' ? (
            <TouchableOpacity style={styles.locationPrompt} onPress={() => Linking.openSettings()}>
              <MaterialIcons name="gps-off" size={16} color="#B45309" />
              <Text style={styles.locationPromptText}>Enable GPS</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.materialsCard}>
          <View style={styles.panelHeader}>
            <View style={styles.panelIcon}>
              <MaterialIcons name="inventory-2" size={23} color="#067A3D" />
            </View>
            <View style={styles.panelCopy}>
              <Text style={styles.panelTitle}>Expected Materials</Text>
              <Text style={styles.panelSubtitle}>Customer provided estimate</Text>
            </View>
          </View>

          <View style={styles.materialSummaryGrid}>
            <View style={styles.materialSummaryTile}>
              <Text style={styles.materialSummaryLabel}>Weight</Text>
              <Text style={styles.materialSummaryValue}>{totalWeightLabel}</Text>
            </View>
            <View style={styles.materialSummaryTile}>
              <Text style={styles.materialSummaryLabel}>Price</Text>
              <Text style={styles.materialSummaryValue}>
                {formatCurrency(lead.order.estimated_value_min)} - {formatCurrency(lead.order.estimated_value_max)}
              </Text>
            </View>
            <View style={styles.materialSummaryTile}>
              <Text style={styles.materialSummaryLabel}>Materials</Text>
              <Text style={styles.materialSummaryValue}>{lead.order.items.length}</Text>
            </View>
          </View>

          <View style={styles.materialList}>
            {lead.order.items.map((item) => (
              <MaterialRow key={String(item.product_id)} item={item} />
            ))}
          </View>
        </View>

        <View style={styles.noteCard}>
          <View style={styles.panelHeader}>
            <View style={styles.panelIcon}>
              <MaterialIcons name="description" size={22} color="#067A3D" />
            </View>
            <View style={styles.panelCopy}>
              <Text style={styles.panelTitle}>Customer Note</Text>
              <Text style={styles.panelSubtitle}>Message from customer</Text>
            </View>
          </View>
          <View style={styles.noteBody}>
            <Text style={styles.quoteMark}>{'"'}</Text>
            <Text style={styles.noteText}>{customerNote}</Text>
          </View>
        </View>

        <View style={styles.actionDock}>
          <View style={styles.slideWrap}>
            <SlideToConfirmButton
              label={isExpired ? 'Slide to Continue' : 'Slide to Accept Booking'}
              onConfirm={isExpired ? handleExpiredSlideContinue : handleAccept}
              disabled={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.declineButton, isExpired && styles.declineButtonDisabled]}
            onPress={() => setShowDeclineModal(true)}
            disabled={isExpired}
            activeOpacity={0.86}
          >
            <MaterialIcons name="close" size={25} color={isExpired ? '#CBD5E1' : '#DC2626'} />
            <Text style={[styles.declineText, isExpired && styles.declineTextDisabled]}>Decline</Text>
          </TouchableOpacity>
          <Text style={styles.actionHint}>Accept to start assessment and contact the customer.</Text>
        </View>
      </ScrollView>

      <ExpiredFeedbackModal
        visible={showExpiredFeedbackModal}
        selectedReason={selectedExpiredReason}
        otherReason={otherExpiredReason}
        isSubmitting={isSubmittingExpiredFeedback}
        onSelectReason={setSelectedExpiredReason}
        onChangeOtherReason={setOtherExpiredReason}
        onSubmit={handleSubmitExpiredFeedback}
        onClose={() => setShowExpiredFeedbackModal(false)}
      />

      <Modal
        visible={showDeclineModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline this request?</Text>
            <Text style={styles.modalText}>It will be released to another nearby partner.</Text>
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
            <Text style={styles.expiredOverlayText}>This booking is no longer available.</Text>
          </View>
        </View>
      ) : null}
    </View>
    </SafeAreaView>
  );
};

function MetricTile({
  icon,
  label,
  value,
  detail,
  wide,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  detail: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.metricTile, wide && styles.metricTileWide]}>
      <View style={styles.metricIcon}>
        <MaterialIcons name={icon} size={24} color="#067A3D" />
      </View>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricDetail} numberOfLines={1}>{detail}</Text>
    </View>
  );
}

function MaterialRow({ item }: { item: LeadOrderItem }) {
  const categoryColor = getCategoryColor(item.category || 'default');
  return (
    <View style={styles.materialRow}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.materialImage} />
      ) : (
        <View style={[styles.materialImageFallback, { backgroundColor: `${categoryColor}16` }]}>
          <MaterialIcons name={getCategoryIcon(item.category || 'default')} size={28} color={categoryColor} />
        </View>
      )}
      <View style={styles.materialCopy}>
        <Text style={styles.materialName} numberOfLines={1}>{item.product_name}</Text>
        <Text style={styles.materialQty} numberOfLines={1}>
          {Number(item.quantity || 0).toLocaleString('en-IN')} {item.unit || 'kg'} approx
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#64748B" />
    </View>
  );
}

function ExpiredFeedbackModal({
  visible,
  selectedReason,
  otherReason,
  isSubmitting,
  onSelectReason,
  onChangeOtherReason,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  selectedReason: (typeof EXPIRY_FEEDBACK_OPTIONS)[number]['value'] | null;
  otherReason: string;
  isSubmitting: boolean;
  onSelectReason: (value: (typeof EXPIRY_FEEDBACK_OPTIONS)[number]['value']) => void;
  onChangeOtherReason: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.feedbackBackdrop}>
        <View style={styles.feedbackSheet}>
          <View style={styles.feedbackHandle} />
          <Text style={styles.feedbackTitle}>Why did it expire?</Text>
          <Text style={styles.feedbackSubtitle}>A short answer helps dispatch improve.</Text>

          <View style={styles.feedbackOptions}>
            {EXPIRY_FEEDBACK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.feedbackOption,
                  selectedReason === option.value && styles.feedbackOptionSelected,
                ]}
                onPress={() => onSelectReason(option.value)}
                activeOpacity={0.9}
              >
                <View
                  style={[
                    styles.feedbackOptionDot,
                    selectedReason === option.value && styles.feedbackOptionDotSelected,
                  ]}
                />
                <Text style={styles.feedbackOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedReason === 'other_reason' ? (
            <TextInput
              style={styles.feedbackInput}
              value={otherReason}
              onChangeText={onChangeOtherReason}
              placeholder="Write a short note"
              placeholderTextColor="#94A3B8"
              multiline
            />
          ) : null}

          <TouchableOpacity
            style={[styles.feedbackSubmitButton, isSubmitting && styles.feedbackSubmitButtonDisabled]}
            onPress={onSubmit}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <Text style={styles.feedbackSubmitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Send feedback'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.feedbackCancelButton} onPress={onClose} activeOpacity={0.9}>
            <Text style={styles.feedbackCancelText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getCategoryColor = (cat: string): string => {
  const lc = cat.toLowerCase();
  if (lc.includes('metal') || lc.includes('iron') || lc.includes('steel')) return '#14532D';
  if (lc.includes('plastic')) return '#0369A1';
  if (lc.includes('paper') || lc.includes('cardboard') || lc.includes('book')) return '#854D0E';
  if (lc.includes('glass')) return '#6D28D9';
  if (lc.includes('electronic')) return '#7C3AED';
  return '#475569';
};

const getCategoryIcon = (cat: string): keyof typeof MaterialIcons.glyphMap => {
  const lc = cat.toLowerCase();
  if (lc.includes('metal') || lc.includes('iron') || lc.includes('steel')) return 'hardware';
  if (lc.includes('plastic')) return 'local-drink';
  if (lc.includes('paper') || lc.includes('cardboard') || lc.includes('book')) return 'description';
  if (lc.includes('glass')) return 'wine-bar';
  if (lc.includes('electronic')) return 'electrical-services';
  return 'inventory-2';
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FBF7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5FBF7',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FBF7',
  },
  loaderText: {
    marginTop: 12,
    color: '#475569',
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 34,
    gap: 16,
  },
  header: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E5F8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#07071A',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  statusRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#20D42B',
  },
  statusText: {
    color: '#052E1A',
    fontSize: 17,
    lineHeight: 21,
    flexShrink: 1,
  },
  timerPill: {
    minWidth: 122,
    height: 64,
    borderRadius: 34,
    backgroundColor: '#DFF6E7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  timerPillExpired: {
    backgroundColor: '#FEE2E2',
  },
  timerValue: {
    color: '#06351F',
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
  },
  timerValueExpired: {
    color: '#B91C1C',
    fontSize: 17,
  },
  timerLabel: {
    color: '#064226',
    fontSize: 10,
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5EEE8',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DFF6E7',
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DFF6E7',
    borderWidth: 1,
    borderColor: '#BDEFD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#067A3D',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  customerCopy: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    color: '#07071A',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  ratingRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingText: {
    color: '#07071A',
    fontSize: 17,
    fontWeight: '900',
  },
  reviewText: {
    color: '#475569',
    fontSize: 14,
    flexShrink: 1,
  },
  contactButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBlock: {
    marginTop: 26,
    borderRadius: 20,
    backgroundColor: '#FBFEFC',
    borderWidth: 1,
    borderColor: '#E3F0E8',
    padding: 15,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressMarkerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0D6B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  addressCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  addressLabel: {
    color: '#067A3D',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
  addressText: {
    marginTop: 12,
    color: '#334155',
    fontSize: 18,
    lineHeight: 26,
  },
  mapsButton: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.4,
    borderColor: '#079348',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 14,
    alignSelf: 'flex-start',
    gap: 8,
  },
  mapsButtonText: {
    color: '#067A3D',
    fontSize: 16,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  metricsGrid: {
    gap: 10,
  },
  metricPair: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    minHeight: 120,
    borderRadius: 18,
    backgroundColor: '#F8FCFA',
    borderWidth: 1,
    borderColor: '#E2EEE7',
    padding: 13,
  },
  metricTileWide: {
    minHeight: 124,
  },
  metricIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E5F8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  metricValue: {
    marginTop: 6,
    color: '#07071A',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  metricDetail: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 16,
  },
  mapCard: {
    height: 270,
    borderRadius: 22,
    backgroundColor: '#E7EFEA',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0ECE5',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapFallbackText: {
    color: '#475569',
    fontWeight: '800',
  },
  vendorMapLabel: {
    position: 'absolute',
    left: 24,
    top: 62,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  customerMapLabel: {
    position: 'absolute',
    right: 14,
    bottom: 78,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mapLabelText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
  routeDistanceBadge: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 16,
    backgroundColor: '#078842',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  routeDistanceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  locationPrompt: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  locationPromptText: {
    color: '#B45309',
    fontWeight: '900',
    fontSize: 12,
  },
  materialsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5EEE8',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5EEE8',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#E5F8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelCopy: {
    flex: 1,
    minWidth: 0,
  },
  panelTitle: {
    color: '#07071A',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  panelSubtitle: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
  },
  materialSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  materialSummaryTile: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 76,
    borderRadius: 17,
    backgroundColor: '#F2FAF5',
    borderWidth: 1,
    borderColor: '#DCEEE4',
    padding: 11,
    justifyContent: 'center',
  },
  materialSummaryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  materialSummaryValue: {
    marginTop: 5,
    color: '#06351F',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  materialList: {
    marginTop: 14,
    gap: 10,
  },
  materialRow: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  materialImage: {
    width: 64,
    height: 64,
    borderRadius: 15,
    resizeMode: 'cover',
  },
  materialImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialCopy: {
    flex: 1,
    minWidth: 0,
  },
  materialName: {
    color: '#07071A',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  materialQty: {
    marginTop: 4,
    color: '#475569',
    fontSize: 14,
    lineHeight: 18,
  },
  noteBody: {
    marginTop: 18,
    minHeight: 118,
    borderRadius: 18,
    backgroundColor: '#EAF8F0',
    padding: 16,
    justifyContent: 'flex-start',
  },
  quoteMark: {
    color: '#079348',
    fontSize: 34,
    lineHeight: 32,
    fontWeight: '900',
  },
  noteText: {
    color: '#1E293B',
    fontSize: 17,
    lineHeight: 25,
  },
  actionDock: {
    marginTop: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E5EEE8',
    padding: 16,
    paddingBottom: 20,
    gap: 14,
    alignItems: 'stretch',
  },
  slideWrap: {
    width: '100%',
  },
  declineButton: {
    width: '100%',
    height: 64,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  declineButtonDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  declineText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: '900',
  },
  declineTextDisabled: {
    color: '#CBD5E1',
  },
  actionHint: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalText: {
    color: '#64748B',
    marginTop: 8,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalSecondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E1DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  modalPrimaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148,163,184,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  expiredOverlayCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  expiredOverlayTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#334155',
  },
  expiredOverlayText: {
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  feedbackBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  feedbackSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  feedbackHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  feedbackTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },
  feedbackSubtitle: {
    color: '#475569',
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
  feedbackOptions: {
    marginTop: 18,
    gap: 10,
  },
  feedbackOption: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  feedbackOptionSelected: {
    borderColor: '#166534',
    backgroundColor: '#ECFDF3',
  },
  feedbackOptionDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  feedbackOptionDotSelected: {
    borderColor: '#166534',
    backgroundColor: '#166534',
  },
  feedbackOptionText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  feedbackInput: {
    marginTop: 14,
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  feedbackSubmitButton: {
    marginTop: 16,
    backgroundColor: '#166534',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  feedbackSubmitButtonDisabled: {
    opacity: 0.65,
  },
  feedbackSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  feedbackCancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  feedbackCancelText: {
    color: '#475569',
    fontWeight: '800',
  },
});

export default BookingRequestScreen;
