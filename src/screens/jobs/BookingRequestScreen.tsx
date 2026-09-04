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

const EXPIRY_FEEDBACK_OPTIONS = [
  {
    value: 'system_cancelled_while_en_route',
    label: 'I was already on the way, but the system cancelled it automatically',
    priority: 'high',
  },
  {
    value: 'no_warning_notifications',
    label: 'I did not receive the warning notifications',
    priority: 'high',
  },
  {
    value: 'could_not_take_job',
    label: 'I was unable to take this job',
    priority: 'high',
  },
  {
    value: 'other_reason',
    label: 'Other reason',
    priority: 'normal',
  },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface MaterialCategory {
  name: string;
  items: LeadOrderItem[];
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  previewImage?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  metal: '#14532D',
  metals: '#14532D',
  plastic: '#0369A1',
  plastics: '#0369A1',
  paper: '#854D0E',
  papers: '#854D0E',
  glass: '#6D28D9',
  electronic: '#7C3AED',
  electronics: '#7C3AED',
  rubber: '#9A3412',
  textile: '#0F766E',
  default: '#475569',
};

const getCategoryColor = (cat: string): string =>
  CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS.default;

const getCategoryIcon = (cat: string): keyof typeof MaterialIcons.glyphMap => {
  const lc = cat.toLowerCase();
  if (lc === 'metal' || lc === 'metals') return 'hardware';
  if (lc === 'plastic' || lc === 'plastics') return 'local-drink';
  if (lc === 'paper' || lc === 'papers') return 'description';
  if (lc === 'glass') return 'wine-bar';
  if (lc === 'electronic' || lc === 'electronics') return 'electrical-services';
  if (lc === 'rubber') return 'settings';
  if (lc === 'textile') return 'dry-cleaning';
  return 'category';
};

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

const haversineDistanceKm = (
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number },
) => {
  const R = 6371;
  const dLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const dLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;
  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Component ────────────────────────────────────────────────────────────────
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [vendorLocation, setVendorLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showExpiredFeedbackModal, setShowExpiredFeedbackModal] = useState(false);
  const [selectedExpiredReason, setSelectedExpiredReason] = useState<(typeof EXPIRY_FEEDBACK_OPTIONS)[number]['value'] | null>(null);
  const [otherExpiredReason, setOtherExpiredReason] = useState('');
  const [supportFeedbackQuestionId, setSupportFeedbackQuestionId] = useState<number | null>(null);
  const [isSubmittingExpiredFeedback, setIsSubmittingExpiredFeedback] = useState(false);

  const isExpired = remaining <= 0;

  // ── Load lead ───────────────────────────────────────────────────────────────
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

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!lead || isExpired) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isExpired, lead]);

  // ── Location ────────────────────────────────────────────────────────────────
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
      setVendorLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
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

  // ── Derived values ─────────────────────────────────────────────────────────
  const countdown = useMemo(() => {
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = Math.floor(remaining % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }, [remaining]);

  const totalQty = useMemo(
    () => (lead ? lead.order.items.reduce((s, i) => s + Number(i.quantity || 0), 0) : 0),
    [lead],
  );

  const scheduledLabel = useMemo(() => {
    const iso = lead?.order.scheduled_at;
    if (!iso) return 'Today';
    const scheduled = new Date(iso);
    const today = new Date();
    if (scheduled.toDateString() === today.toDateString()) return 'Today';
    return scheduled.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [lead]);

  const isPreciseLocation = useMemo(
    () => locationPermission === 'granted' && locationAccuracy !== null && locationAccuracy <= 100,
    [locationPermission, locationAccuracy],
  );

  const hasValidPickupCoordinates = useMemo(
    () => lead ? Number.isFinite(Number(lead.pickup_lat)) && Number.isFinite(Number(lead.pickup_lng)) : false,
    [lead],
  );

  const normalizedPickupLocation = useMemo(
    () => lead && hasValidPickupCoordinates ? { latitude: Number(lead.pickup_lat), longitude: Number(lead.pickup_lng) } : null,
    [lead, hasValidPickupCoordinates],
  );

  const approxDistanceKm = useMemo(() => {
    if (!lead) return 0;
    if (!normalizedPickupLocation) return Number(lead.distance_km || 0);
    if (!vendorLocation) return lead.distance_km;
    return haversineDistanceKm(vendorLocation, normalizedPickupLocation);
  }, [lead, normalizedPickupLocation, vendorLocation]);

  // ── Material categories (grouped from lead items) ──────────────────────────
  const categories = useMemo<MaterialCategory[]>(() => {
    if (!lead) return [];
    const catMap = new Map<string, MaterialCategory>();
    lead.order.items.forEach((item) => {
      const displayName = item.category || 'Other';
      if (!catMap.has(displayName)) {
        catMap.set(displayName, {
          name: displayName,
          items: [],
          color: getCategoryColor(displayName),
          icon: getCategoryIcon(displayName),
          previewImage: undefined,
        });
      }
      const entry = catMap.get(displayName)!;
      entry.items.push(item);
      if (!entry.previewImage && item.image_url) {
        entry.previewImage = item.image_url;
      }
    });
    return Array.from(catMap.values());
  }, [lead]);

  // Auto-select the only category if there's just one
  useEffect(() => {
    if (categories.length === 1) {
      setSelectedCategory(categories[0].name);
    }
  }, [categories]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await ApiService.rejectLead(lead!.lead_id);
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
      Alert.alert('Add details', 'Please share a short note for the support team.');
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
      setSelectedExpiredReason(null);
      setOtherExpiredReason('');
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || !lead) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#14532D" />
        <Text style={styles.loaderText}>Loading booking request...</Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
              {formatCurrency(lead.order.estimated_value_min)} – {formatCurrency(lead.order.estimated_value_max)}
            </Text>
            <Text style={styles.summarySubtext}>{lead.order.items.length} material lines</Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Location / map card */}
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
                <Text style={styles.permissionText}>Enable precise GPS to compare your position with the pickup pin.</Text>
              </View>
              <TouchableOpacity style={styles.permissionButton} onPress={() => Linking.openSettings()}>
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
                <Text style={styles.permissionText}>This order does not have valid pickup coordinates yet.</Text>
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
                  <Text style={styles.mapMetaText}>~{approxDistanceKm.toFixed(1)} km</Text>
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

        {/* Privacy info */}
        <View style={styles.infoCard}>
          <MaterialIcons name="verified-user" size={18} color="#166534" />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Customer privacy protected</Text>
            <Text style={styles.infoText}>
              Contact details stay masked until you accept. This keeps request handling committed and secure.
            </Text>
          </View>
        </View>

        {/* Customer card */}
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

        {/* Order summary */}
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
            <Text style={styles.materialHeroSubtext}>
              Estimated weight {totalQty} kg across requested material lines
            </Text>
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
              {formatCurrency(lead.order.estimated_value_min)} – {formatCurrency(lead.order.estimated_value_max)}
            </Text>
          </View>
        </View>

        {/* ── Material Categories (new) ─────────────────────────────────── */}
        <View style={styles.surfaceCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialIcons name="inventory-2" size={18} color="#14532D" />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Available Materials</Text>
              <Text style={styles.sectionSubtitle}>
                {categories.length > 1 ? 'Tap a category to browse items' : 'Material list and current rate band'}
              </Text>
            </View>
          </View>

          {/* Category cards — horizontal scroll */}
          {categories.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.categoryCard, isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}10` }]}
                    onPress={() => setSelectedCategory(isSelected ? null : cat.name)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.name} category, ${cat.items.length} items`}
                  >
                    {cat.previewImage ? (
                      <Image source={{ uri: cat.previewImage }} style={styles.categoryCardImage} />
                    ) : (
                      <View style={[styles.categoryCardImagePlaceholder, { backgroundColor: `${cat.color}18` }]}>
                        <MaterialIcons name={cat.icon} size={30} color={cat.color} />
                      </View>
                    )}
                    <Text
                      style={[styles.categoryCardName, isSelected && { color: cat.color }]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    <View style={[styles.categoryCountBadge, isSelected && { backgroundColor: cat.color }]}>
                      <Text style={[styles.categoryCountText, isSelected && { color: '#FFFFFF' }]}>
                        {cat.items.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Products for selected category (or all items if single category) */}
          {selectedCategory ? (
            <View style={styles.productList}>
              {(categories.find((c) => c.name === selectedCategory)?.items ?? []).map((item) => {
                const catColor = getCategoryColor(item.category || selectedCategory);
                return (
                  <View key={String(item.product_id)} style={styles.productRow}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.productImage} />
                    ) : (
                      <View style={[styles.productImagePlaceholder, { backgroundColor: `${catColor}14` }]}>
                        <MaterialIcons name={getCategoryIcon(item.category || selectedCategory)} size={22} color={catColor} />
                      </View>
                    )}
                    <View style={styles.productMeta}>
                      <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
                      <Text style={styles.productQty}>Est. {item.quantity} {item.unit}</Text>
                    </View>
                    <View style={styles.productRateWrap}>
                      <Text style={styles.productRate}>₹{item.min_rate}–₹{item.max_rate}</Text>
                      <Text style={styles.productRateUnit}>per {item.unit}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : categories.length > 1 ? (
            <View style={styles.categoryTapHint}>
              <MaterialIcons name="touch-app" size={16} color="#94A3B8" />
              <Text style={styles.categoryTapHintText}>Select a category above to view items</Text>
            </View>
          ) : (
            /* Fallback: single category, show all items directly */
            <View style={styles.productList}>
              {lead.order.items.map((item) => {
                const catColor = getCategoryColor(item.category || 'Other');
                return (
                  <View key={String(item.product_id)} style={styles.productRow}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.productImage} />
                    ) : (
                      <View style={[styles.productImagePlaceholder, { backgroundColor: `${catColor}14` }]}>
                        <MaterialIcons name={getCategoryIcon(item.category || 'Other')} size={22} color={catColor} />
                      </View>
                    )}
                    <View style={styles.productMeta}>
                      <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
                      <Text style={styles.productQty}>Est. {item.quantity} {item.unit}</Text>
                    </View>
                    <View style={styles.productRateWrap}>
                      <Text style={styles.productRate}>₹{item.min_rate}–₹{item.max_rate}</Text>
                      <Text style={styles.productRateUnit}>per {item.unit}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom spacer so content isn't hidden behind the floating sheet */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Redesigned bottom action sheet ──────────────────────────────────── */}
      <View style={styles.bottomSheet}>
        {/* Top row: title + small Decline pill */}
        <View style={styles.bottomSheetTopRow}>
          <View style={styles.bottomSheetTitleWrap}>
            <Text style={styles.bottomSheetTitle}>Confirm this booking</Text>
            <Text style={styles.bottomSheetSubtext}>
              {isExpired ? 'This request has expired.' : 'Slide right to accept and start assessment.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.declinePill, isExpired && styles.declinePillDisabled]}
            onPress={() => setShowDeclineModal(true)}
            disabled={isExpired}
            accessibilityRole="button"
            accessibilityLabel="Decline this booking"
          >
            <MaterialIcons name="close" size={14} color={isExpired ? '#CBD5E1' : '#EF4444'} />
            <Text style={[styles.declinePillText, isExpired && styles.declinePillTextDisabled]}>
              Decline
            </Text>
          </TouchableOpacity>
        </View>

        {/* Slide to accept */}
        <SlideToConfirmButton
          label={isExpired ? 'Slide to Continue' : 'Slide to Accept Booking'}
          onConfirm={isExpired ? handleExpiredSlideContinue : handleAccept}
          disabled={false}
        />
      </View>

      <Modal
        visible={showExpiredFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExpiredFeedbackModal(false)}
      >
        <View style={styles.feedbackBackdrop}>
          <View style={styles.feedbackSheet}>
            <View style={styles.feedbackHandle} />
            <Text style={styles.feedbackTitle}>Why was this assignment cancelled?</Text>
            <Text style={styles.feedbackSubtitle}>Your response helps us improve dispatch quality and support.</Text>

            <View style={styles.feedbackOptions}>
              {EXPIRY_FEEDBACK_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.feedbackOption,
                    selectedExpiredReason === option.value && styles.feedbackOptionSelected,
                  ]}
                  onPress={() => setSelectedExpiredReason(option.value)}
                  activeOpacity={0.9}
                >
                  <View style={styles.feedbackOptionDotWrap}>
                    <View
                      style={[
                        styles.feedbackOptionDot,
                        selectedExpiredReason === option.value && styles.feedbackOptionDotSelected,
                      ]}
                    />
                  </View>
                  <Text style={styles.feedbackOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedExpiredReason === 'other_reason' ? (
              <TextInput
                style={styles.feedbackInput}
                value={otherExpiredReason}
                onChangeText={setOtherExpiredReason}
                placeholder="Write a short note for support"
                placeholderTextColor="#94A3B8"
                multiline
              />
            ) : null}

            <TouchableOpacity
              style={[styles.feedbackSubmitButton, isSubmittingExpiredFeedback && styles.feedbackSubmitButtonDisabled]}
              onPress={handleSubmitExpiredFeedback}
              disabled={isSubmittingExpiredFeedback}
              activeOpacity={0.9}
            >
              <Text style={styles.feedbackSubmitButtonText}>
                {isSubmittingExpiredFeedback ? 'Submitting...' : 'Send feedback and continue'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.feedbackCancelButton}
              onPress={() => setShowExpiredFeedbackModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.feedbackCancelText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Decline confirmation modal ────────────────────────────────────── */}
      <Modal
        visible={showDeclineModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeclineModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Decline this request?</Text>
            <Text style={styles.modalText}>The request will be released so another vendor can take it.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowDeclineModal(false)}
              >
                <Text style={styles.modalSecondaryText}>Keep request</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={handleReject}
                disabled={isRejecting}
              >
                <Text style={styles.modalPrimaryText}>{isRejecting ? 'Declining...' : 'Decline'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Expired overlay ───────────────────────────────────────────────── */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7F5' },
  loaderText: { marginTop: 12, color: '#475569' },

  // Header
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

  // Scroll content
  content: { padding: 18, paddingBottom: 200, gap: 16 },

  // Cards
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18 },
  surfaceCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#E8F3EB', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  sectionIconWrapMuted: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#EDF5EE', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sectionSubtitle: { color: '#64748B', marginTop: 2, fontSize: 13 },

  // Badges
  priorityBadge: { backgroundColor: '#FFF1E7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  priorityBadgeText: { color: '#C2410C', fontWeight: '700' },
  priorityBadgeSoft: { backgroundColor: '#FFF1E7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  priorityBadgeSoftText: { color: '#C2410C', fontWeight: '700', fontSize: 12 },

  // Location / map
  permissionCard: {
    marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#FCD9B6',
    backgroundColor: '#FFF7ED', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  permissionCopy: { flex: 1 },
  permissionTitle: { color: '#9A3412', fontWeight: '800', fontSize: 13 },
  permissionText: { color: '#7C2D12', marginTop: 3, fontSize: 12, lineHeight: 16 },
  permissionButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F59E0B' },
  permissionButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  mapWrap: { marginTop: 14 },
  mapMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  mapMetaPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EDF5EE', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, gap: 6,
  },
  markerDot: { width: 10, height: 10, borderRadius: 5 },
  mapMetaText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  locatingRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  locatingText: { color: '#166534', fontWeight: '600' },

  // Info card
  infoCard: { borderRadius: 22, padding: 16, backgroundColor: '#EAF3EF', flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoCopy: { flex: 1 },
  infoTitle: { color: '#166534', fontWeight: '800' },
  infoText: { color: '#475569', marginTop: 4, lineHeight: 20 },

  // Customer
  lockCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  customerCard: { marginTop: 16, borderRadius: 22, borderWidth: 1, borderColor: '#E6ECE8', padding: 16, backgroundColor: '#FBFCFB' },
  customerTopRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#166534', alignItems: 'center', justifyContent: 'center' },
  customerAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  customerMeta: { flex: 1, marginLeft: 12 },
  customerName: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  customerSubtext: { color: '#64748B', marginTop: 3 },
  customerRating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  customerRatingText: { color: '#92400E', fontWeight: '800', marginLeft: 4 },
  lockedPanel: { marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
  lockedCopy: { flex: 1, marginLeft: 12 },
  lockedTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700' },
  lockedText: { color: '#64748B', marginTop: 4, lineHeight: 18 },
  customerMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  customerMetaPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F6F4', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  customerMetaPillText: { color: '#475569', fontWeight: '700', marginLeft: 6 },

  // Order summary
  materialHero: { marginTop: 16, borderRadius: 22, borderWidth: 1, borderColor: '#E6ECE8', padding: 18, backgroundColor: '#FBFCFB' },
  materialHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materialHeroTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 12 },
  materialHeroSubtext: { color: '#64748B', marginTop: 10 },
  summaryList: { marginTop: 16, gap: 14 },
  summaryListRow: { flexDirection: 'row', alignItems: 'center' },
  summaryListLabel: { flex: 1, color: '#64748B', marginLeft: 10, fontWeight: '600' },
  summaryListValue: { color: '#0F172A', fontWeight: '800' },
  cashBadge: { backgroundColor: '#E8F3EB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  cashBadgeText: { color: '#166534', fontWeight: '800' },
  estimatePanel: { marginTop: 18, backgroundColor: '#166534', borderRadius: 20, padding: 18 },
  estimateLabel: { color: '#D1FAE5', fontWeight: '700' },
  estimateValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 8 },

  // ── Category cards ──────────────────────────────────────────────────────────
  categoryScroll: { marginTop: 18 },
  categoryScrollContent: { paddingHorizontal: 2, gap: 12, paddingBottom: 4 },
  categoryCard: {
    width: 96,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  categoryCardImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover',
  },
  categoryCardImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardName: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  categoryCountBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  categoryCountText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Product rows ────────────────────────────────────────────────────────────
  productList: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  productImage: { width: 58, height: 58, borderRadius: 16, resizeMode: 'cover' },
  productImagePlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMeta: { flex: 1 },
  productName: { color: '#0F172A', fontWeight: '800', fontSize: 15 },
  productQty: { color: '#64748B', marginTop: 4, fontSize: 13 },
  productRateWrap: { alignItems: 'flex-end' },
  productRate: { color: '#14532D', fontWeight: '800', fontSize: 14 },
  productRateUnit: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  categoryTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  categoryTapHintText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },

  // ── Bottom action sheet (redesigned) ────────────────────────────────────────
  bottomSheet: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: '#E5ECE7',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    gap: 14,
  },
  bottomSheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSheetTitleWrap: { flex: 1, marginRight: 12 },
  bottomSheetTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  bottomSheetSubtext: { color: '#64748B', marginTop: 3, fontSize: 13 },

  // Small decline pill
  declinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  declinePillDisabled: { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  declinePillText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  declinePillTextDisabled: { color: '#CBD5E1' },

  // Decline modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalText: { color: '#64748B', marginTop: 8, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalSecondaryButton: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#D7E1DA', alignItems: 'center', justifyContent: 'center' },
  modalSecondaryText: { color: '#0F172A', fontWeight: '700' },
  modalPrimaryButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center' },
  modalPrimaryText: { color: '#FFFFFF', fontWeight: '800' },

  // Expired overlay
  expiredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(148,163,184,0.28)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  expiredOverlayCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center' },
  expiredOverlayTitle: { fontSize: 22, fontWeight: '800', color: '#334155' },
  expiredOverlayText: { color: '#64748B', marginTop: 8, textAlign: 'center' },

  // Expired feedback sheet
  feedbackBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
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
  feedbackTitle: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  feedbackSubtitle: { color: '#475569', marginTop: 6, fontSize: 13, lineHeight: 19 },
  feedbackOptions: { marginTop: 18, gap: 10 },
  feedbackOption: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
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
  feedbackOptionDotWrap: { paddingTop: 3 },
  feedbackOptionDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  feedbackOptionDotSelected: { borderColor: '#166534', backgroundColor: '#166534' },
  feedbackOptionText: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '600', lineHeight: 20 },
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
  feedbackSubmitButtonDisabled: { opacity: 0.65 },
  feedbackSubmitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  feedbackCancelButton: { alignItems: 'center', paddingVertical: 14 },
  feedbackCancelText: { color: '#475569', fontWeight: '700' },
});

export default BookingRequestScreen;
