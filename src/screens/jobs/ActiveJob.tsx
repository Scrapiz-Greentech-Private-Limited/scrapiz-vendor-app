import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { BookingActiveResponse, SelectedPickupItem, VendorCoordinates } from '../../types';
import { ApiService } from '../../services/api';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';
import { arrivalVerificationState } from '../../services/arrivalVerificationState';
import { useBooking } from '../../context/BookingContext';
import { JobTimeline } from '../../components/jobs/JobTimeline';
import { MaterialsTable } from '../../components/jobs/MaterialsTable';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';
import ArrivalVerifyScreen from '../booking/ArrivalVerifyScreen';
import { ArrivalOtpSendScreen } from '../booking/ArrivalOtpSendScreen';
import { OtpVerifyScreen } from '../../components/common/OtpVerifyScreen';
import LiveTrackingGate from '../../components/jobs/LiveTrackingGate';

interface ActiveJobProps {
  bookingId: string;
  selectedItems: SelectedPickupItem[];
  customerPhone?: string;
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onProceedToCalculator: (bookingId: string, selectedItems: SelectedPickupItem[]) => void;
}

const STEP_META: Record<
  'en_route' | 'arrived' | 'in_progress' | 'ready',
  {
    stepNumber: number;
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle: string;
    cta: string;
    ctaColor: string;
  }
> = {
  en_route: {
    stepNumber: 1,
    icon: 'directions-car',
    title: 'Head to Pickup',
    subtitle: 'Navigate within 200 m of the customer to unlock arrival',
    cta: '🗺️ Navigate to Customer',
    ctaColor: DESIGN_TOKENS.GREEN_MID,
  },
  arrived: {
    stepNumber: 2,
    icon: 'location-pin',
    title: 'Reached Customer',
    subtitle: 'Confirm presence and verify customer OTP',
    cta: 'Send OTP to Customer',
    ctaColor: DESIGN_TOKENS.GREEN_MID,
  },
  in_progress: {
    stepNumber: 3,
    icon: 'inventory-2',
    title: 'Weighing Scrap Items',
    subtitle: 'Measure scrap materials and verify quantities',
    cta: 'Finish Weighing',
    ctaColor: DESIGN_TOKENS.GREEN_MID,
  },
  ready: {
    stepNumber: 4,
    icon: 'check-circle',
    title: 'Ready for Valuation',
    subtitle: 'Calculate scrap value and present final quote',
    cta: '🧮 Open Price Calculator',
    ctaColor: '#FF9800',
  },
};

const normalizeStep = (step: BookingActiveResponse['step']): 'en_route' | 'arrived' | 'in_progress' | 'ready' => {
  if (!step) return 'en_route';
  if (typeof step === 'number') {
    if (step <= 1) return 'en_route';
    if (step === 2) return 'arrived';
    if (step === 3) return 'in_progress';
    return 'ready';
  }
  const s = String(step).toLowerCase().trim();
  if (s === 'en_route' || s === 'heading_to_pickup' || s === 'started') return 'en_route';
  if (s === 'arrived' || s === 'at_location') return 'arrived';
  if (s === 'in_progress' || s === 'weighing' || s === 'collecting') return 'in_progress';
  if (s === 'ready' || s === 'weighed' || s === 'quote_ready') return 'ready';
  return 'en_route';
};

export const ActiveJob: React.FC<ActiveJobProps> = ({
  bookingId,
  selectedItems,
  customerPhone,
  onBack,
  onShowToast,
  onProceedToCalculator,
}) => {
  const insets = useSafeAreaInsets();
  const {
    activeBooking,
    setActiveBooking,
    setActiveBookingId,
    setOtpSent,
    setOtpVerified,
  } = useBooking();

  const [activeData, setActiveData] = useState<BookingActiveResponse | null>(activeBooking);
  const [isLoading, setIsLoading] = useState<boolean>(!activeBooking);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [vendorCoords, setVendorCoords] = useState<VendorCoordinates | null>(null);

  // Flow navigation states
  const [showLiveTrackingGate, setShowLiveTrackingGate] = useState<boolean>(false);
  const [showArrivalVerify, setShowArrivalVerify] = useState<boolean>(false);
  const [showOtpSendScreen, setShowOtpSendScreen] = useState<boolean>(false);
  const [showOtpVerifyScreen, setShowOtpVerifyScreen] = useState<boolean>(false);
  const [contactRevealed, setContactRevealed] = useState<boolean>(false);

  // Restore mid-flow state after the booking data has loaded.
  // If the vendor had passed face verification in a prior session but killed
  // the app before OTP was verified (so the server step is still 'en_route'),
  // we detect the persisted verification record and jump straight to
  // OtpSendScreen — no map gate, no face re-scan.
  useEffect(() => {
    // Only run once isLoading has cleared and we have real data, and only
    // when the step is still en_route (not already past that point).
    if (isLoading) return;
    if (stepKey !== 'en_route') return;
    // Don't restore if a sub-screen is already showing.
    if (showOtpSendScreen || showOtpVerifyScreen || showArrivalVerify || showLiveTrackingGate) return;

    const restoreFlowPosition = async () => {
      try {
        const alreadyVerified = await arrivalVerificationState.isVerified(bookingId, bookingId);
        if (alreadyVerified) {
          setShowOtpSendScreen(true);
        }
      } catch {
        // Non-fatal — vendor proceeds through the normal full flow.
      }
    };
    void restoreFlowPosition();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, stepKey, bookingId]);

  // Sync booking ID to context
  useEffect(() => {
    setActiveBookingId(bookingId);
  }, [bookingId, setActiveBookingId]);

  const loadActive = useCallback(async () => {
    try {
      const response = await ApiService.getBookingActive(bookingId);
      setActiveData(response);
      setActiveBooking(response);
      if (response.contact_unlocked || (response.customer && !response.customer.phone_masked)) {
        setContactRevealed(true);
      }
    } catch {
      onShowToast('Unable to refresh booking details', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, onShowToast, setActiveBooking]);

  useEffect(() => {
    void loadActive();
    const interval = setInterval(() => {
      void loadActive();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadActive]);

  // Vendor Location & Live Streamer
  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Do NOT call getCurrentPositionAsync here.  On Android it frequently
        // returns the last-known coarse (cell/wifi) fix, which can be tens of
        // kilometres away from the real location.  The watchPositionAsync call
        // below will emit the first genuine GPS reading within a few seconds.
        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          (loc) => {
            if (!isMounted) return;
            // Accept all readings here for the ActiveJob view (distance banner,
            // map overlay).  LiveTrackingGate applies its own stricter filter.
            setVendorCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              heading: loc.coords.heading ?? 0,
              accuracy: loc.coords.accuracy,
            });
          }
        );
      } catch {
        // Location watcher fallback
      }
    };

    void startTracking();
    void vendorLocationStreamer.start(bookingId);

    return () => {
      isMounted = false;
      if (watcher) watcher.remove();
      void vendorLocationStreamer.stop();
    };
  }, [bookingId]);

  const stepKey = useMemo<'en_route' | 'arrived' | 'in_progress' | 'ready'>(() => {
    return normalizeStep(activeData?.step);
  }, [activeData?.step]);

  const currentMeta = STEP_META[stepKey];

  // Merge items
  const mergedSelectedItems = useMemo(() => {
    if (selectedItems && selectedItems.length > 0) return selectedItems;
    if (activeData?.order_items && activeData.order_items.length > 0) {
      return activeData.order_items.map((item) => ({
        id: String(item.product_id),
        name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        pricePerUnit: item.rate_per_unit,
        approximateWeight: item.quantity,
        imageUrl: item.image_url,
      }));
    }
    return [];
  }, [selectedItems, activeData?.order_items]);

  // Live Distance
  const liveDistanceMeters = useMemo(() => {
    if (activeData?.coordinate_observability?.live_distance_meters != null) {
      return Math.round(Number(activeData.coordinate_observability.live_distance_meters));
    }
    if (activeData?.distance_km != null) {
      return Math.round(Number(activeData.distance_km) * 1000);
    }
    return null;
  }, [activeData?.coordinate_observability?.live_distance_meters, activeData?.distance_km]);

  // Customer Details & Phone Unmasking
  const customer = activeData?.customer;
  const isWithinProximity = liveDistanceMeters != null && liveDistanceMeters <= 200;
  const isAdvancedStep = stepKey === 'arrived' || stepKey === 'in_progress' || stepKey === 'ready';
  const hasQuoteOrWeight = Boolean(activeData?.quote || activeData?.total_weight);
  const isServerUnlocked = Boolean(activeData?.contact_unlocked) || Boolean(customer && !customer.phone_masked);
  const isPhoneUnmasked =
    contactRevealed ||
    isServerUnlocked ||
    isWithinProximity ||
    isAdvancedStep ||
    hasQuoteOrWeight;

  // Resolve unmasked phone: prefer clean unmasked phone from customer.phone or fallback customerPhone prop
  const rawCustomerPhone = (customer?.phone && customer.phone.trim()) || (customerPhone && customerPhone.trim()) || '';
  const isMaskedPattern = rawCustomerPhone.includes('*') || rawCustomerPhone.toLowerCase().includes('x');
  const cleanFallback = customerPhone && !customerPhone.includes('*') && !customerPhone.toLowerCase().includes('x') ? customerPhone.trim() : '';

  const displayPhone = isPhoneUnmasked
    ? (!isMaskedPattern && rawCustomerPhone ? rawCustomerPhone : (cleanFallback || rawCustomerPhone || 'Phone unavailable'))
    : (rawCustomerPhone
        ? (isMaskedPattern ? rawCustomerPhone : `${rawCustomerPhone.slice(0, 4)}XXXX${rawCustomerPhone.slice(-2)}`)
        : '+91 98XXX XXXXX');

  const customerInitial = customer?.name?.charAt(0).toUpperCase() || 'C';
  const customerName = customer?.name || 'Customer';
  const customerRating = Number(customer?.rating || 4.8).toFixed(1);
  const pickupAddress = activeData?.pickup_address || 'Address unavailable';
  const displayOrderId = activeData?.order_number || (bookingId.length > 8 ? `ORD-${bookingId.slice(0, 8).toUpperCase()}` : bookingId);

  // Call Button Handler
  const handleCallCustomer = () => {
    if (!isPhoneUnmasked) {
      onShowToast('Customer phone unlocks once within 200 m or arrival is verified.', 'info');
      return;
    }
    const target = cleanFallback || (!isMaskedPattern ? rawCustomerPhone : '') || customer?.phone || customerPhone;
    if (target) {
      const cleanDigits = target.replace(/[^0-9+]/g, '');
      if (cleanDigits) {
        void Linking.openURL(`tel:${cleanDigits}`);
        return;
      }
    }
    onShowToast('Customer phone number unavailable', 'error');
  };

  // Main CTA Action Handler per step
  const handleCtaPress = async () => {
    if (isActionLoading) return;

    if (stepKey === 'en_route') {
      // Step 1: Open the live navigation map (LiveTrackingGate).
      // The gate enforces 200 m proximity before unlocking the slide-to-continue
      // action, which then advances to face verification → OTP flow.
      setShowLiveTrackingGate(true);
      return;
    }

    if (stepKey === 'arrived') {
      // A verified arrival must never send the vendor back through OTP.
      // This also covers an app restart immediately after OTP verification.
      if (activeData?.arrival_attempt?.status === 'verified' || activeData?.contact_unlocked) {
        await openWeighingStep();
        return;
      }

      // Step arrived -> Show OTP Send Screen only when OTP is still pending.
      setShowOtpSendScreen(true);
      return;
    }

    if (stepKey === 'in_progress') {
      setIsActionLoading(true);
      try {
        await ApiService.markBookingReady(bookingId);
        await loadActive();
        onShowToast('Weighing finished. Ready for price quote.', 'success');
      } catch (err: any) {
        onShowToast(err?.message || 'Unable to update booking step', 'error');
      } finally {
        setIsActionLoading(false);
      }
      return;
    }

    if (stepKey === 'ready') {
      onProceedToCalculator(bookingId, mergedSelectedItems);
      return;
    }
  };

  const openWeighingStep = async () => {
    if (isActionLoading) return;

    setIsActionLoading(true);
    try {
      await ApiService.startBookingCollection(bookingId);
      const nextBooking = activeData
        ? {
            ...activeData,
            status: 'in_progress',
            step: 'in_progress' as const,
            contact_unlocked: true,
            arrival_attempt: activeData.arrival_attempt
              ? { ...activeData.arrival_attempt, status: 'verified' }
              : activeData.arrival_attempt,
          }
        : null;

      if (nextBooking) {
        setActiveData(nextBooking);
        setActiveBooking(nextBooking);
      }
      setShowOtpSendScreen(false);
      setShowOtpVerifyScreen(false);
      await loadActive();
    } catch (error: any) {
      onShowToast(error?.message || 'Unable to open the weighing screen.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Screen A (ArrivalOtpSendScreen) -> Screen B (OtpVerifyScreen) transition
  const handleSendOtpSuccess = () => {
    setOtpSent(true);
    setShowOtpSendScreen(false);
    setShowOtpVerifyScreen(true);
  };

  // Screen B OTP Verification Handler
  const handleVerifyOtp = async (otp: string) => {
    await ApiService.verifyArrivalOtp(bookingId, otp);
    setOtpVerified(true);
    setContactRevealed(true);

    // The OTP endpoint confirms arrival, but the weighing screen is entered
    // only after the booking transitions from arrived -> in_progress.
    // Perform that transition here and update local state immediately so a
    // stale polling response cannot reopen the OTP/send screen.
    const nextBooking = activeData
      ? {
          ...activeData,
          status: 'in_progress',
          step: 'in_progress' as const,
          contact_unlocked: true,
          arrival_attempt: activeData.arrival_attempt
            ? { ...activeData.arrival_attempt, status: 'verified' }
            : activeData.arrival_attempt,
        }
      : null;
    if (nextBooking) {
      setActiveData(nextBooking);
      setActiveBooking(nextBooking);
    }
    setShowOtpVerifyScreen(false);
    setShowOtpSendScreen(false);
    onShowToast('Arrival verified. Weighing screen opened.', 'success');

    try {
      await ApiService.startBookingCollection(bookingId);
    } catch (error: any) {
      // If another request already advanced the booking, the refresh below
      // still restores the server-authoritative weighing state.
      if (!String(error?.message || '').toLowerCase().includes('in progress')) {
        onShowToast(error?.message || 'Unable to start weighing.', 'error');
      }
    }
    await loadActive();
  };

  // Resend OTP in Screen B
  const handleResendOtp = async () => {
    const lat = vendorCoords?.latitude ?? activeData?.pickup_lat ?? 19.076;
    const lng = vendorCoords?.longitude ?? activeData?.pickup_lng ?? 72.8777;
    await ApiService.initiateArrivalVerification(bookingId, {
      selfie_url: '',
      vendor_latitude: lat,
      vendor_longitude: lng,
    });
    onShowToast('New OTP sent to customer.', 'success');
  };

  // ── Render Full-Screen Modals / Sub-Screens ───────────────────────────────

  // Step 1 – Live navigation map with 200 m proximity gate.
  if (showLiveTrackingGate) {
    return (
      <LiveTrackingGate
        visible={showLiveTrackingGate}
        vendorCoords={vendorCoords}
        pickupLocation={{
          latitude: activeData?.pickup_lat ?? 0,
          longitude: activeData?.pickup_lng ?? 0,
        }}
        expectedDistanceKm={activeData?.distance_km}
        customerName={customerName}
        pickupAddress={pickupAddress}
        customerRating={customer?.rating}
        materials={activeData?.order_items?.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          image_url: item.image_url,
        }))}
        onBack={() => setShowLiveTrackingGate(false)}
        onContinue={async () => {
          setShowLiveTrackingGate(false);
          // After proximity confirmed, proceed to face verification.
          // Skip face scan if already verified for this booking.
          try {
            const alreadyVerified = await arrivalVerificationState.isVerified(bookingId, bookingId);
            if (alreadyVerified) {
              setShowOtpSendScreen(true);
              return;
            }
          } catch {
            // Continue to face scan
          }
          setShowArrivalVerify(true);
        }}
      />
    );
  }

  // Step 2 – Face verification (arrival identity check).
  if (showArrivalVerify) {
    return (
      <ArrivalVerifyScreen
        orderId={bookingId}
        bookingContext={{ bookingId, selectedItems: mergedSelectedItems }}
        onBack={() => setShowArrivalVerify(false)}
        onVerified={() => {
          setShowArrivalVerify(false);
          onShowToast('Face verified. Send the arrival OTP to the customer.', 'success');
          setShowOtpSendScreen(true);
          void loadActive();
        }}
      />
    );
  }

  if (showOtpSendScreen && activeData) {
    return (
      <ArrivalOtpSendScreen
        booking={activeData}
        vendorCoordinates={vendorCoords}
        onBack={() => setShowOtpSendScreen(false)}
        onSendOtpSuccess={handleSendOtpSuccess}
        onShowToast={onShowToast}
      />
    );
  }

  if (showOtpVerifyScreen) {
    return (
      <OtpVerifyScreen
        title="Verify Customer OTP"
        subtitle={`Ask ${customerName} for the 6-digit code sent to their phone to unlock pickup.`}
        digitCount={6}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        resendCooldownSeconds={30}
        showBackButton={true}
        onBack={() => setShowOtpVerifyScreen(false)}
      />
    );
  }

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (isLoading && !activeData) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.GREEN_DARK} />
        <Text style={styles.loaderText} numberOfLines={1} ellipsizeMode="tail">
          Loading active job...
        </Text>
      </View>
    );
  }

  // ── Main Active Job Screen Architecture ───────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Fixed Header (GREEN_DARK) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 4, 16) }]}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            Active Job
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
            #{displayOrderId}
          </Text>
        </View>

        <View style={styles.stepBadge}>
          <MaterialIcons name={currentMeta.icon} size={20} color="#FFFFFF" />
        </View>
      </View>

      {/* Scrollable Content (paddingBottom: 140) */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Live Distance Banner */}
        <View style={styles.distanceBanner}>
          <MaterialIcons name="my-location" size={16} color={DESIGN_TOKENS.GREEN_LIGHT} />
          <Text style={styles.distanceText} numberOfLines={1} ellipsizeMode="tail">
            {liveDistanceMeters != null
              ? `Live distance: ${liveDistanceMeters} m from the customer pin`
              : 'Live distance: Connecting to GPS...'}
          </Text>
        </View>

        {/* 2. Step Status Card (white, radius 24) */}
        <View style={styles.stepCard}>
          <View style={styles.stepCardTop}>
            <View style={styles.stepIconWrap}>
              <MaterialIcons name={currentMeta.icon} size={28} color={DESIGN_TOKENS.GREEN_DARK} />
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle} numberOfLines={1} ellipsizeMode="tail">
                {currentMeta.title}
              </Text>
              <Text style={styles.stepSubtitle} numberOfLines={2} ellipsizeMode="tail">
                {currentMeta.subtitle}
              </Text>
            </View>
          </View>

          {/* Progress Bar (filled to step/4) */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${(currentMeta.stepNumber / 4) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.stepCounterText} numberOfLines={1} ellipsizeMode="tail">
              {currentMeta.stepNumber} of 4
            </Text>
          </View>
        </View>

        {/* 3. Job Timeline Component (white card, radius 24) */}
        <JobTimeline
          currentStep={stepKey}
          completedAt={
            activeData?.total_weight && activeData?.estimated_order_value
              ? {
                  weighing: `${activeData.total_weight} kg • ₹${Number(activeData.estimated_order_value).toLocaleString('en-IN')}`,
                }
              : undefined
          }
          onStepPress={(key) => {
            if (key === 'face_verify' && stepKey === 'en_route') setShowLiveTrackingGate(true);
            // OTP is an arrival gate only. Once the booking is weighing or
            // beyond, tapping the historical timeline step must not reopen it.
            if (
              key === 'otp_verify' &&
              stepKey === 'arrived' &&
              activeData?.arrival_attempt?.status !== 'verified'
            ) {
              setShowOtpSendScreen(true);
            }
            if (key === 'price_quote') onProceedToCalculator(bookingId, mergedSelectedItems);
          }}
        />

        {/* 4. Live Map (satellite, height 240, radius 20) */}
        <View style={styles.mapCard}>
          <View style={styles.mapTitleRow}>
            <Text style={styles.mapCardTitle} numberOfLines={1} ellipsizeMode="tail">
              Live Pickup Map
            </Text>
            <Text style={styles.mapCardSubtitle} numberOfLines={1} ellipsizeMode="tail">
              Satellite precision view
            </Text>
          </View>
          <View style={styles.mapWrapper}>
            <LiveSessionMap
              customerLocation={{
                latitude: activeData?.pickup_lat,
                longitude: activeData?.pickup_lng,
              }}
              vendorLocation={vendorCoords}
              height={240}
              label="Customer Pin"
              showOverlay={true}
            />
          </View>
        </View>

        {/* 5. Customer Card (white, radius 24) */}
        <View style={styles.customerCard}>
          <View style={styles.customerHeaderRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial} numberOfLines={1}>
                {customerInitial}
              </Text>
            </View>

            <View style={styles.customerNameCol}>
              <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
                {customerName}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText} numberOfLines={1}>
                  {customerRating}
                </Text>
              </View>
            </View>

            {/* Call Button */}
            <TouchableOpacity
              style={[styles.callBtn, !isPhoneUnmasked && styles.callBtnLocked]}
              onPress={handleCallCustomer}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPhoneUnmasked ? 'call' : 'lock-closed'}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.cardDivider} />

          {/* Phone Details */}
          <View style={styles.phoneRow}>
            <MaterialIcons
              name={isPhoneUnmasked ? 'phone' : 'phone-locked'}
              size={16}
              color={isPhoneUnmasked ? DESIGN_TOKENS.GREEN_MID : DESIGN_TOKENS.TEXT_SECONDARY}
            />
            <Text
              style={[styles.phoneLabel, isPhoneUnmasked && styles.phoneLabelUnlocked]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayPhone}
            </Text>
            {isPhoneUnmasked ? (
              <View style={styles.unlockedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={DESIGN_TOKENS.GREEN_MID} />
                <Text style={styles.unlockedBadgeText} numberOfLines={1}>
                  Contact Unlocked
                </Text>
              </View>
            ) : (
              <View style={styles.maskedBadge}>
                <Text style={styles.maskedBadgeText} numberOfLines={1}>
                  Unlocks within 200 m
                </Text>
              </View>
            )}
          </View>

          {/* Full Pickup Address */}
          <View style={styles.addressRow}>
            <MaterialIcons
              name="location-on"
              size={18}
              color={DESIGN_TOKENS.GREEN_MID}
              style={styles.addressIcon}
            />
            <Text style={styles.addressText}>
              {pickupAddress}
            </Text>
          </View>
        </View>

        {/* 6. Materials Table (white card, radius 24) */}
        <MaterialsTable items={activeData?.order_items || []} />
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={[styles.stickyBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            { backgroundColor: currentMeta.ctaColor },
            isActionLoading && styles.ctaDisabled,
          ]}
          onPress={() => void handleCtaPress()}
          disabled={isActionLoading}
          activeOpacity={0.85}
        >
          {isActionLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.ctaButtonText} numberOfLines={1} ellipsizeMode="tail">
              {currentMeta.cta}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.BG,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.BG,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    fontWeight: '600',
  },

  /* Fixed Header */
  header: {
    backgroundColor: DESIGN_TOKENS.GREEN_DARK,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll Content */
  content: {
    padding: 16,
    paddingBottom: 140,
    gap: 14,
  },

  /* 1. Live Distance Banner */
  distanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.GREEN_BG,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  distanceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.GREEN_DARK,
  },

  /* 2. Step Status Card */
  stepCard: {
    backgroundColor: DESIGN_TOKENS.CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    padding: 18,
    minHeight: 120,
    shadowColor: DESIGN_TOKENS.GREEN_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stepCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DESIGN_TOKENS.GREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  stepSubtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    marginTop: 3,
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 16,
    gap: 8,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DESIGN_TOKENS.GREEN_MID,
    borderRadius: 3,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    textAlign: 'right',
  },

  /* 4. Live Map Card */
  mapCard: {
    backgroundColor: DESIGN_TOKENS.CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    padding: 16,
    minHeight: 280,
    shadowColor: DESIGN_TOKENS.GREEN_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  mapCardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
  },
  mapWrapper: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
  },

  /* 5. Customer Card */
  customerCard: {
    backgroundColor: DESIGN_TOKENS.CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    padding: 18,
    minHeight: 160,
    shadowColor: DESIGN_TOKENS.GREEN_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DESIGN_TOKENS.GREEN_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  customerNameCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DESIGN_TOKENS.GREEN_MID,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DESIGN_TOKENS.GREEN_MID,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  callBtnLocked: {
    backgroundColor: DESIGN_TOKENS.TEXT_MUTED,
  },
  cardDivider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.BORDER,
    marginVertical: 14,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  phoneLabelUnlocked: {
    color: DESIGN_TOKENS.GREEN_DARK,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unlockedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.GREEN_DARK,
  },
  maskedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  maskedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  addressIcon: {
    marginTop: 1,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    lineHeight: 20,
  },

  /* Sticky Bottom CTA */
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ctaButton: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ActiveJob;
