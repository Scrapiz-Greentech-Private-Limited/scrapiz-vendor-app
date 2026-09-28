import { NavigationContainer } from '@react-navigation/native';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, AppState, Dimensions, Easing, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { posthog } from './src/config/posthog';
import { trackVendorNavigation } from './src/services/telemetry';
import { LanguageProvider } from './src/utils/i18n';

// Auth Screens
import { OTPVerify, Signup, SimpleLogin } from './src/screens/auth';
// Main Screens
import { BillsScreen, Dashboard, EarningsScreen, ManageScreen, PurchaseBillDetailScreen } from './src/screens/main';
import { LearningHubScreen, ReelPlayerScreen } from './src/screens/learning';
import PartnerLeaderboardScreen from './src/screens/leaderboard/PartnerLeaderboardScreen';

// Message Screens
import { MessageScreen, SupportChatScreen } from './src/screens/messages';

// Profile Screens
import { CustomerReviewFlowScreen, EditProfileScreen, PersonalInfoScreen, ProfileScreen, RatingsHubScreen } from './src/screens/profile';

// Settings Screens
import {
    AboutScreen,
    AppSettingsScreen,
    HelpSupportScreen,
    LanguageScreen,
    MaterialsScreen,
    NotificationsScreen,
    PaymentSettingsScreen,
    SelectMaterialScreen,
    SupportFeedbackScreen,
    LegalPolicyScreen
  } from './src/screens/settings';

// Job Screens
import {
    ActiveJob,
    BookingRequestScreen,
    DutySessionDetailsScreen,
    FutureRequestsScreen,
    HandledRequestsScreen,
    JobCompletedScreen,
    JobHistoryScreen,
    PickupAssessmentScreen,
    PriceCalculatorScreen,
    QuoteSettlementScreen,
    RequestDetailsScreen,
    RequestsScreen
} from './src/screens/jobs';
import JobManagementScreen from './src/screens/jobs/JobManagementScreen';
import VendorPaymentScreen from './src/screens/jobs/VendorPaymentScreen';

// Credit Screens
import { AddMoneyScreen, CreditScreen, PaymentMethodScreen, PaymentSuccessScreen, WalletPaymentReceipt } from './src/screens/credit';
// Subscription Screens
import { SubscriptionScreen } from './src/screens/subscription';
// Onboarding Screens
import {
  AddVehicleScreen,
  FaceCaptureScreen,
  KYCDocumentsScreen,
  LocationPermissionGateScreen,
  OnboardingStatusScreen,
  PersonalDetailsScreen,
  VerificationHoldScreen,
} from './src/screens/onboarding';
import FaceReverificationScreen from './src/screens/verification/FaceReverificationScreen';

// Navigation & Common Components
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from './src/components/common';
import TestingModeBanner, { TESTING_MODE_BANNER_HEIGHT } from './src/components/common/TestingModeBanner';
import { BottomNavigation } from './src/components/navigation';
import { getReviewerSeedData, isVendorReviewMode } from './src/config/reviewMode';
import { ApiHttpError, ApiService, VendorFaceReuploadRequestPayload, VendorPendingReviewBooking, VerifyOtpResponse } from './src/services/api';
import {
    registerVendorPushToken,
    setupVendorNotificationChannels,
    setupVendorNotificationListeners,
} from './src/services/notifications';
import { vendorLocationStreamer } from './src/services/vendorLocationStreamer';
import { vendorProfileSocketService } from './src/services/vendorProfileSocket';
import { ActiveJob as ActiveJobType, BookingRequest, DutySession, LeadOrderItem, SelectedPickupItem } from './src/types';

// Font loading imports
import {
    NotoSans_400Regular,
    NotoSans_700Bold,
    useFonts
} from '@expo-google-fonts/noto-sans';
import {
    RobotoSlab_400Regular,
    RobotoSlab_700Bold
} from '@expo-google-fonts/roboto-slab';
import * as SplashScreen from 'expo-splash-screen';

// Import global styles for NativeWind
import "./global.css";
import { ThemeProvider } from './src/theme/appTheme';
import { BookingProvider } from './src/context/BookingContext';

// Prevent splash screen from hiding automatically while fonts are loading
SplashScreen.preventAutoHideAsync();

type CurrentBookingSnapshot = {
  id: string | number;
  booking_id?: string | number;
  order_number?: string;
  status?: string;
  created_at?: string;
  pickup_address?: string;
  pickup_lat?: number | string;
  pickup_lng?: number | string;
  estimated_order_value?: number | string | null;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  items?: Array<{
    product_id?: string | number;
    product?: string;
    product_name?: string;
    quantity?: number | string;
    unit?: string;
    min_rate?: number;
    max_rate?: number;
    image_url?: string | null;
    category?: string | null;
  }>;
};

type PendingFaceReuploadPrompt = {
  title: string;
  message: string;
  requestedBy?: string | null;
};

type BookingStateSnapshot = {
  id: string;
  status: string;
};

const TERMINAL_BOOKING_STATUSES = new Set(['completed', 'cancelled', 'rejected']);
const ACTIVE_JOB_STATUSES = new Set<ActiveJobType['status']>(['on-the-way', 'arrived', 'in-progress']);

const isRenderableActiveJob = (job: ActiveJobType | null | undefined): job is ActiveJobType => {
  return Boolean(job && ACTIVE_JOB_STATUSES.has(job.status));
};

const mapCurrentBookingStatusToActiveStatus = (status?: string): ActiveJobType['status'] => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'arrived') {
    return 'arrived';
  }
  if (normalized === 'in_progress' || normalized === 'ready') {
    return 'in-progress';
  }
  if (normalized === 'completed') {
    return 'completed';
  }
  return 'on-the-way';
};

const summarizeScrapType = (items?: CurrentBookingSnapshot['items']): string => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Mixed Scrap';
  }

  const firstName = items[0]?.product_name || items[0]?.product || 'Mixed Scrap';
  if (items.length === 1) {
    return firstName;
  }

  return `${firstName} +${items.length - 1} more`;
};

const toNumberOr = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const QUOTE_SETTLEMENT_STATUSES = new Set(['submitted', 'awaiting_payment', 'paid']);

const getBookingStateService = () => {
  try {
    return require('./src/services/bookingStateService').bookingStateService as {
      getAcceptedBookings?: () => BookingStateSnapshot[];
      subscribe?: (listener: () => void) => (() => void) | void;
    } | undefined;
  } catch (error) {
    console.warn('Booking state service unavailable at runtime', error);
    return undefined;
  }
};

const mapCurrentBookingToActiveJob = (booking: CurrentBookingSnapshot): ActiveJobType => {
  const bookingId = String(booking.booking_id || booking.id);
  const fallbackLat = 19.076;
  const fallbackLng = 72.8777;

  return {
    id: String(booking.order_number || bookingId),
    bookingId,
    scrapType: summarizeScrapType(booking.items),
    distance: '-',
    customerName: booking.customer?.name || 'Customer',
    customerPhone: booking.customer?.phone || '',
    address: booking.customer?.address || booking.pickup_address || 'Address available in active booking',
    paymentMode: 'Pending',
    estimatedAmount: toNumberOr(booking.estimated_order_value, 0),
    createdAt: booking.created_at ? new Date(booking.created_at) : new Date(),
    status: mapCurrentBookingStatusToActiveStatus(booking.status),
    customerLocation: {
      lat: toNumberOr(booking.pickup_lat, fallbackLat),
      lng: toNumberOr(booking.pickup_lng, fallbackLng),
    },
    selectedItems: (booking.items || []).map((item, index) => ({
      product_id: item.product_id ?? `${bookingId}-${index}`,
      product_name: item.product_name || item.product || 'Material',
      quantity: toNumberOr(item.quantity, 0),
      unit: item.unit || 'kg',
      min_rate: toNumberOr(item.min_rate, 0),
      max_rate: toNumberOr(item.max_rate, 0),
      image_url: item.image_url || undefined,
      category: item.category || undefined,
    })),
  };
};


Sentry.init({
  dsn: 'https://676c8c0600d53ccec2da3d4a97fe54a9@o4510990813888512.ingest.us.sentry.io/4510990817951744',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  // Set to 1.0 for testing to capture every session
  // Lower this value in production (e.g., 0.1 for 10% of sessions)
  replaysSessionSampleRate: 1.0,
  
  // Keep at 1.0 to capture all sessions with errors
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    // Mobile Replay Integration with privacy settings
    Sentry.mobileReplayIntegration({
      // Mask all text by default for privacy
      maskAllText: true,
      // Mask all images by default for privacy
      maskAllImages: true,
      // Mask all vector graphics by default for privacy
      maskAllVectors: true,
    }),
    // Feedback integration for user feedback
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const AppContent = () => {
  const reviewModeEnabled = isVendorReviewMode();
  const reviewerSeed = getReviewerSeedData();
  const {
    user,
    login,
    completePhoneProfile,
    completeVendorOnboarding,
    refreshVendorProfile,
    logout,
    isInitialLoading,
  } = useAuth();
  const [authStep, setAuthStep] = useState<'login' | 'signup' | 'otp'>('login');
  const [onboardingStep, setOnboardingStep] = useState<'none' | 'personal' | 'vehicle' | 'face' | 'status' | 'documents'>('none');
  const [tempPhone, setTempPhone] = useState('');
  const [phoneNeedsProfileCompletion, setPhoneNeedsProfileCompletion] = useState(false);
  const [pendingSignupDraft, setPendingSignupDraft] = useState<{ name?: string; email?: string }>({});
  const [pendingPersonalDetails, setPendingPersonalDetails] = useState<{
    fullName: string;
    email: string;
    age: string;
    serviceCity: string;
    serviceArea: string;
    gender: string;
    hasVehicle: boolean;
  } | null>(null);
  const posthogClient = usePostHog();
  const [activeTab, setActiveTab] = useState('home');
  const reelReturnTab = useRef('home');
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [selectedRequestItem, setSelectedRequestItem] = useState<any>(null);
  const [selectedDutySession, setSelectedDutySession] = useState<DutySession | null>(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<VendorPendingReviewBooking | null>(null);
  const [showJobCompletion, setShowJobCompletion] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveJobType | null>(null);
  const [priceCalculatorPayload, setPriceCalculatorPayload] = useState<{
    bookingId: string;
    selectedItems: SelectedPickupItem[];
  } | null>(null);
  const [quoteSettlementPayload, setQuoteSettlementPayload] = useState<{
    bookingId: string;
    totalQuoted: number;
    orderNumber?: string;
  } | null>(null);
  const [vendorPaymentPayload, setVendorPaymentPayload] = useState<{
    bookingId: string;
    orderNumber?: string;
    preferredPaymentMethod: 'upi' | 'cash';
    cashFallbackAllowed: boolean;
  } | null>(null);
  const [jobCompletedPayload, setJobCompletedPayload] = useState<{
    bookingId: string;
    totalPayout: number;
  } | null>(null);
  const [pickupAssessmentPayload, setPickupAssessmentPayload] = useState<{
    leadId: string;
    items: LeadOrderItem[];
    orderNumber: string;
    estimatedValueMin: number;
    estimatedValueMax: number;
  } | null>(null);
  const [isRefreshingVendorGate, setIsRefreshingVendorGate] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState<number>(0);
  const [walletReceipt, setWalletReceipt] = useState<WalletPaymentReceipt | null>(null);
  const [showLocationPermissionGate, setShowLocationPermissionGate] = useState(false);
  const [isLocationGateChecking, setIsLocationGateChecking] = useState(false);
  const [pendingFaceReuploadPrompt, setPendingFaceReuploadPrompt] = useState<PendingFaceReuploadPrompt | null>(null);
  const [showFaceReverification, setShowFaceReverification] = useState(false);
  const dismissedFacePromptMessageRef = useRef<string | null>(null);
  const facePromptSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [acceptedBookingsSnapshot, setAcceptedBookingsSnapshot] = useState<BookingStateSnapshot[]>([]);
  const hasShownProfileImagePromptRef = React.useRef(false);
  // Push token dedup: track the user ID for which registration was last
  // attempted so we never re-register for the same session.
  const lastPushRegistrationUserIdRef = useRef<string | null>(null);
  // AppState foreground refresh: track the timestamp of the last refresh so
  // rapid foreground transitions don't hammer the backend.
  const lastAppStatRefreshRef = useRef<number>(0);
  const APP_STATE_REFRESH_COOLDOWN_MS = 30_000; // 30 seconds minimum between foreground refreshes
  // In-flight guard for hydrateCurrentBooking so the interval and any
  // immediate call can never execute concurrently.
  const bookingHydrateInFlightRef = useRef(false);
  // Stable user-id ref so the booking-hydration interval does NOT restart
  // just because the user object reference changed after a profile refresh.
  const userIdRef = useRef<string | null>(null);
  const hasInFlightActiveJob = Boolean(
    isRenderableActiveJob(activeJob) || priceCalculatorPayload || quoteSettlementPayload || vendorPaymentPayload
  );

  useEffect(() => {
    const syncAcceptedBookings = () => {
      const service = getBookingStateService();
      const nextSnapshot = service?.getAcceptedBookings?.() || [];
      setAcceptedBookingsSnapshot(nextSnapshot);
    };

    syncAcceptedBookings();
    const unsubscribe = getBookingStateService()?.subscribe?.(syncAcceptedBookings);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const jobCounts = useMemo(() => {
    let active = isRenderableActiveJob(activeJob) ? 1 : 0;
    let upcoming = 0;

    for (const booking of acceptedBookingsSnapshot) {
      if (booking.status === 'completed' || booking.status === 'cancelled') {
        continue;
      }
      if (activeJob && booking.id === String(activeJob.bookingId || activeJob.id)) {
        continue;
      }
      if (booking.status === 'in-progress') {
        active += 1;
        continue;
      }
      upcoming += 1;
    }

    return {
      active,
      pending: 0,
      upcoming,
    };
  }, [acceptedBookingsSnapshot, activeJob]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    Alert.alert(
      type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info',
      message
    );
  };

  const handleBookingSelect = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setActiveTab('booking-details');
    posthogClient.capture('booking_viewed', {
      booking_id: booking.id,
      scrap_type: booking.scrapType,
      distance: booking.distance,
      estimated_amount: booking.estimatedAmount,
      payment_mode: booking.paymentMode,
      priority: booking.priority ?? null,
    });
  };

  const handleShowNotification = () => {
    Alert.alert('Notifications', 'You have 3 new notifications!');
  };

  const handleOpenActiveBooking = (fallbackBookingId?: string) => {
    if (user?.requiresFaceReverification) {
      setShowFaceReverification(true);
      return;
    }

    if (quoteSettlementPayload) {
      setActiveTab('quote-settlement');
      return;
    }

    if (priceCalculatorPayload?.bookingId) {
      void ApiService.getBookingActive(priceCalculatorPayload.bookingId)
        .then((active) => {
          const quoteStatus = String(active?.quote?.status || '').toLowerCase();
          if (QUOTE_SETTLEMENT_STATUSES.has(quoteStatus)) {
            setQuoteSettlementPayload({
              bookingId: priceCalculatorPayload.bookingId,
              totalQuoted: Number(active?.quote?.total_amount || 0),
            });
            setPriceCalculatorPayload(null);
            setActiveTab('quote-settlement');
            return;
          }
          setActiveTab('job-completion');
        })
        .catch(() => {
          setActiveTab('job-completion');
        });
      return;
    }

    const targetBookingId = activeJob ? String(activeJob.bookingId || activeJob.id) : fallbackBookingId;

    if (targetBookingId) {
      void ApiService.getBookingActive(targetBookingId)
        .then((active) => {
          const quoteStatus = String(active?.quote?.status || '').toLowerCase();
          if (QUOTE_SETTLEMENT_STATUSES.has(quoteStatus)) {
            setQuoteSettlementPayload({
              bookingId: targetBookingId,
              totalQuoted: Number(active?.quote?.total_amount || 0),
            });
            setPriceCalculatorPayload(null);
            setActiveTab('quote-settlement');
            return;
          }
          if (!activeJob) {
            setActiveJob({
              id: active.order_number || targetBookingId,
              bookingId: targetBookingId,
              customerName: active.customer?.name || 'Customer',
              customerPhone: active.customer?.phone || '',
              address: active.pickup_address || '',
              scrapType: active.material_summary || 'Mixed Scrap',
              distance: `${active.distance_km || 0} km`,
              paymentMode: 'Cash',
              estimatedAmount: Number(active.estimated_order_value || 0),
              createdAt: active.started_at ? new Date(active.started_at) : new Date(),
              status: mapCurrentBookingStatusToActiveStatus(active.status),
              customerLocation: {
                lat: Number(active.pickup_lat || 19.076),
                lng: Number(active.pickup_lng || 72.8777),
              },
              selectedItems: (active.order_items || []).map((item, idx) => ({
                product_id: item.product_id ?? `${targetBookingId}-${idx}`,
                product_name: item.product_name,
                quantity: Number(item.quantity || 0),
                unit: item.unit || 'kg',
                min_rate: Number(item.min_rate || item.rate_per_unit || 0),
                max_rate: Number(item.max_rate || item.rate_per_unit || 0),
                image_url: item.image_url,
                category: item.category,
              })),
            });
          }
          setActiveTab('active-job');
        })
        .catch(() => {
          if (activeJob) {
            setActiveTab('active-job');
          } else {
            setActiveTab('manage');
          }
        });
      return;
    }

    if (isRenderableActiveJob(activeJob)) {
      setActiveTab('active-job');
      return;
    }

    setActiveTab('manage');
  };

  const handleBackToHome = () => {
    setActiveTab('home');
    setSelectedBooking(null);
    setSelectedDutySession(null);
    setSelectedReviewBooking(null);
    setShowJobCompletion(false);
    setPickupAssessmentPayload(null);
    // Keep activeJob, priceCalculatorPayload, and quoteSettlementPayload intact so ongoing pickup can be resumed
  };

  const handleBackToManage = () => {
    setActiveTab('manage');
  };

  const handleBackToOngoing = () => {
    setActiveTab('manage');
  };

  const handleBackToMore = () => {
    setActiveTab('profile');
  };

  const handleBackToProfile = () => {
    setSelectedReviewBooking(null);
    setActiveTab('profile');
  };

  const handleNavigate = (screen: string, params?: any) => {
    const nextScreen = screen === 'more-menu' || screen === 'settings' ? 'profile' : screen;
    if (nextScreen === 'learning-reel') {
      reelReturnTab.current = activeTab === 'learning' ? 'learning' : 'home';
    }
    trackVendorNavigation(screen, {
      has_request: Boolean(params?.request),
      has_session: Boolean(params?.session),
      source_screen: activeTab,
    });
    setActiveTab(nextScreen);
    if (params?.request) {
      setSelectedRequestItem(params.request);
    }
    if (params?.session) {
      setSelectedDutySession(params.session);
    }
    if (params?.booking) {
      setSelectedReviewBooking(params.booking);
    }
  };

  useEffect(() => {
    void vendorLocationStreamer.setOnlineStatus(Boolean(user?.isOnline));

    if (!user) {
      vendorLocationStreamer.setOnlineStatus(false);
    }
  }, [user]);

  useEffect(() => {
    if (reviewModeEnabled) {
      return;
    }

    void setupVendorNotificationChannels().catch((error) => {
      console.error('Failed to set up vendor notification channels:', error);
    });

    const cleanup = setupVendorNotificationListeners((target, extraData) => {
      if (target === 'face_reverification') {
        setActiveTab('home');
        dismissedFacePromptMessageRef.current = null;
        if (extraData?.message) {
          setPendingFaceReuploadPrompt({
            title: extraData.title || 'Identity Verification Required',
            message: extraData.message,
            requestedBy: 'Platform Administration',
          });
        }
        void refreshVendorProfile().catch(() => undefined);
        return;
      }
      setActiveTab(target);
    });

    return cleanup;
  }, []);

  // Keep a stable ref to the current user so the AppState handler below
  // does not need to be torn down and rebuilt on every profile refresh.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  });

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState !== 'active') return;
      if (!userRef.current) return;
      const now = Date.now();
      if (now - lastAppStatRefreshRef.current < APP_STATE_REFRESH_COOLDOWN_MS) {
        // Too soon since last foreground refresh — skip to avoid request storm.
        return;
      }
      lastAppStatRefreshRef.current = now;
      void refreshVendorProfile().catch(() => undefined);
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
    // Empty dep array: register once, read user from ref. This prevents the
    // effect from re-running (and re-registering the listener) every time the
    // user object identity changes after a profile refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || reviewModeEnabled) {
      return;
    }

    // Only register when we see a new user ID (first login / re-login).
    // This prevents re-registration on every profile refresh, which would
    // spam the backend with identical token registrations on every 503.
    if (lastPushRegistrationUserIdRef.current === user.id) {
      return;
    }
    lastPushRegistrationUserIdRef.current = user.id;

    void registerVendorPushToken().catch((error) => {
      // Registration failed — clear the sentinel so the next app restart
      // can try again, but do NOT retry in this session to avoid hammering
      // an unavailable backend.
      lastPushRegistrationUserIdRef.current = null;
      console.warn('Failed to register vendor push token:', error);
    });
  }, [user?.id, reviewModeEnabled]);

  useEffect(() => {
    if (reviewModeEnabled || !user?.hasVendorProfile) {
      vendorProfileSocketService.stop();
      hasShownProfileImagePromptRef.current = false;
      setPendingFaceReuploadPrompt(null);
      return;
    }

    const unsubscribe = vendorProfileSocketService.subscribe((payload) => {
      // Immediate profile refresh for sub-second notification delivery
      void refreshVendorProfile().catch(() => undefined);

      if (payload.type === 'face_reupload_request') {
        const requestPayload = payload as VendorFaceReuploadRequestPayload;
        dismissedFacePromptMessageRef.current = null;
        
        // Show notification immediately (no delay)
        const newPrompt = {
          title: requestPayload.title || 'Identity Verification Required',
          message:
            requestPayload.message ||
            'We apologize for the inconvenience. Please upload a fresh face photo to complete identity verification.',
          requestedBy: requestPayload.requested_by || 'Platform Administration',
        };
        
        setPendingFaceReuploadPrompt(newPrompt);
        
        // Animate in immediately for instant visual feedback
        Animated.spring(facePromptSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 6,
        }).start();
        
        return;
      }

      if (!payload.requires_profile_image_upload) {
        hasShownProfileImagePromptRef.current = false;
        return;
      }

      if (onboardingStep !== 'none' || hasShownProfileImagePromptRef.current) {
        return;
      }

      hasShownProfileImagePromptRef.current = true;
      Alert.alert(
        'Face photo required',
        'A current face photo is required to keep your vendor profile active. Please capture it now.',
        [
          {
            text: 'Later',
            style: 'cancel',
          },
          {
            text: 'Capture now',
            onPress: () => setOnboardingStep('face'),
          },
        ],
      );
    });

    void vendorProfileSocketService.start();

    return () => {
      unsubscribe();
      vendorProfileSocketService.stop();
    };
  }, [onboardingStep, user?.hasVendorProfile]);

  useEffect(() => {
    if (user?.requiresFaceReverification && onboardingStep === 'none') {
      const msg =
        user.faceReverificationMessage ||
        'We apologize for the inconvenience. Please upload a fresh face photo to complete identity verification.';
      if (dismissedFacePromptMessageRef.current === msg) {
        return;
      }
      setPendingFaceReuploadPrompt({
        title: 'Identity Verification Required',
        message: msg,
        requestedBy: 'Platform Administration',
      });
    } else if (!user?.requiresFaceReverification) {
      dismissedFacePromptMessageRef.current = null;
      if (pendingFaceReuploadPrompt) {
        setPendingFaceReuploadPrompt(null);
      }
    }
  }, [user?.requiresFaceReverification, user?.faceReverificationMessage, onboardingStep]);

  useEffect(() => {
    let isMounted = true;

    const evaluateLocationGate = async () => {
      if (!user || onboardingStep !== 'none' || reviewModeEnabled) {
        if (isMounted) {
          setShowLocationPermissionGate(false);
          setIsLocationGateChecking(false);
        }
        return;
      }

      setIsLocationGateChecking(true);

      try {
        const [foreground, background] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          Location.getBackgroundPermissionsAsync(),
        ]);

        if (isMounted) {
          const needsGate = foreground.status !== 'granted' || background.status !== 'granted';
          setShowLocationPermissionGate(needsGate);
        }
      } catch {
        if (isMounted) {
          setShowLocationPermissionGate(true);
        }
      } finally {
        if (isMounted) {
          setIsLocationGateChecking(false);
        }
      }
    };

    void evaluateLocationGate();

    return () => {
      isMounted = false;
    };
  }, [onboardingStep, user]);

  useEffect(() => {
    if (activeTab !== 'job-completion' || !priceCalculatorPayload?.bookingId) {
      return;
    }

    let isMounted = true;

    const checkQuoteProgress = async () => {
      try {
        const active = await ApiService.getBookingActive(priceCalculatorPayload.bookingId);
        if (!isMounted) {
          return;
        }

        const quoteStatus = String(active?.quote?.status || '').toLowerCase();
        if (QUOTE_SETTLEMENT_STATUSES.has(quoteStatus)) {
          setQuoteSettlementPayload({
            bookingId: priceCalculatorPayload.bookingId,
            totalQuoted: Number(active?.quote?.total_amount || 0),
          });
          setPriceCalculatorPayload(null);
          setActiveTab('quote-settlement');
        }
      } catch {
        // Keep the current screen if quote fetch fails.
      }
    };

    void checkQuoteProgress();

    return () => {
      isMounted = false;
    };
  }, [activeTab, priceCalculatorPayload]);

  // Keep a ref that tracks whether the user id has genuinely changed (new
  // login) vs just a reference identity change from persistUser. The interval
  // effect only re-runs when the actual user ID or onboarding step changes,
  // preventing the teardown/restart storm that caused duplicate booking calls.
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  });

  useEffect(() => {
    let isMounted = true;

    const hydrateCurrentBooking = async () => {
      if (!userIdRef.current || onboardingStep !== 'none') {
        return;
      }

      // Skip if a previous invocation is still running (interval overlap guard).
      if (bookingHydrateInFlightRef.current) {
        return;
      }
      bookingHydrateInFlightRef.current = true;

      try {
        const response = await ApiService.getCurrentBooking();
        const booking = response?.booking as CurrentBookingSnapshot | undefined;

        if (!isMounted) {
          return;
        }

        if (!booking?.id) {
          setActiveJob(null);
          setPriceCalculatorPayload(null);
          setQuoteSettlementPayload(null);
          return;
        }

        const normalizedStatus = String(booking.status || '').toLowerCase();
        if (TERMINAL_BOOKING_STATUSES.has(normalizedStatus)) {
          setActiveJob(null);
          return;
        }

        const hydratedJob = mapCurrentBookingToActiveJob(booking);
        setActiveJob((current) => {
          const currentBookingId = current?.bookingId || current?.id;
          if (currentBookingId === hydratedJob.bookingId) {
            return current;
          }
          return hydratedJob;
        });

        try {
          const bookingId = hydratedJob.bookingId || hydratedJob.id;
          const active = await ApiService.getBookingActive(bookingId);
          const quoteStatus = String(active?.quote?.status || '').toLowerCase();
          if (QUOTE_SETTLEMENT_STATUSES.has(quoteStatus)) {
            setQuoteSettlementPayload({
              bookingId,
              totalQuoted: Number(active?.quote?.total_amount || 0),
            });
            setPriceCalculatorPayload(null);
          }
        } catch {
          // Best-effort hydration only.
        }
      } catch (error) {
        if (error instanceof ApiHttpError && (error.status === 401 || /token expired/i.test(error.message || ''))) {
          logout().catch(() => undefined);
          return;
        }
        // 403 from a suspended/rejected vendor: refresh profile so the
        // VerificationHoldScreen renders naturally, then clear the active job
        // so the interval has nothing to poll for.
        if (isMounted && error instanceof ApiHttpError && error.status === 403) {
          setActiveJob(null);
          setPriceCalculatorPayload(null);
          setQuoteSettlementPayload(null);
          void refreshVendorProfile().catch(() => undefined);
          return;
        }
        // Only wipe activeJob if it is a confirmed 404 (no active booking), not on temporary 502/503/504 gateway errors
        if (isMounted && error instanceof ApiHttpError && error.status === 404) {
          setActiveJob(null);
        }
        console.warn('Unable to hydrate current booking state', error);
      } finally {
        bookingHydrateInFlightRef.current = false;
      }
    };

    void hydrateCurrentBooking();
    const interval = setInterval(() => {
      void hydrateCurrentBooking();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // Depend on the stable scalar user ID (not the user object) and
    // onboardingStep. This prevents the interval from restarting every time
    // persistUser creates a new user object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingStep, user?.id]);

  if (isInitialLoading) {
    return null; // Or a splash screen component
  }

  if (!user && !phoneNeedsProfileCompletion) {
    if (authStep === 'login') {
      return (
        <SimpleLogin 
          onNavigateSignup={() => {
            setAuthStep('signup');
          }} 
          onNavigateOTP={(phone: string) => {
            setTempPhone(phone);
            setPendingSignupDraft({});
            setAuthStep('otp');
          }}
        />
      );
    }
    if (authStep === 'signup') {
      return (
        <Signup 
          onNavigateLogin={() => setAuthStep('login')} 
          onNavigateOTP={(phone: string, details) => {
            setTempPhone(phone);
            setPendingSignupDraft(details || {});
            setAuthStep('otp');
          }} 
          onBack={() => setAuthStep('login')}
        />
      );
    }
    if (authStep === 'otp') {
      return (
        <OTPVerify 
          phone={tempPhone}
          onBack={() => setAuthStep(pendingSignupDraft.name ? 'signup' : 'login')} 
          onSuccess={async (response: VerifyOtpResponse & { phone_number?: string }) => {
            try {
              if (response.profile_required) {
                setPhoneNeedsProfileCompletion(true);
                setOnboardingStep('personal');
                setAuthStep('login');
                return;
              }

              const loggedInUser = await login(response);
              setPhoneNeedsProfileCompletion(false);
              
              // Check if vendor profile exists but is in draft status
              if (loggedInUser.hasVendorProfile && loggedInUser.vendorStatus === 'draft') {
                setOnboardingStep('face');
              } else if (!loggedInUser.hasVendorProfile) {
                setOnboardingStep('personal');
              } else {
                setOnboardingStep('none');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to verify OTP');
            }
          }}
        />
      );
    }
  }

  // Handle Onboarding Flow
  if (onboardingStep === 'personal') {
    return (
      <PersonalDetailsScreen 
        initialValues={{
          fullName: pendingPersonalDetails?.fullName || pendingSignupDraft.name || user?.name || (reviewModeEnabled ? reviewerSeed.name : ''),
          email: pendingPersonalDetails?.email || pendingSignupDraft.email || user?.email || (reviewModeEnabled ? reviewerSeed.email : ''),
          age: pendingPersonalDetails?.age || (user?.age ? String(user.age) : '') || (reviewModeEnabled ? reviewerSeed.age : ''),
          serviceCity: pendingPersonalDetails?.serviceCity || user?.serviceCity || (reviewModeEnabled ? reviewerSeed.serviceCity : ''),
          serviceArea: pendingPersonalDetails?.serviceArea || user?.serviceArea || (reviewModeEnabled ? reviewerSeed.serviceArea : ''),
        }}
        onNext={(data) => {
            setPendingPersonalDetails(data);
            setOnboardingStep('vehicle');
        }} 
      />
    );
  }

  if (onboardingStep === 'vehicle') {
    return (
      <AddVehicleScreen 
        onBack={() => setOnboardingStep('personal')}
        onComplete={async (data) => {
            if (!pendingPersonalDetails) {
              Alert.alert('Missing details', 'Please complete your personal details first.');
              setOnboardingStep('personal');
              return;
            }

            try {
              if (phoneNeedsProfileCompletion && !user?.phone) {
                await completePhoneProfile({
                  name: pendingPersonalDetails.fullName,
                  email: pendingPersonalDetails.email,
                  phone_number: `+91${tempPhone}`,
                });
              } else if (phoneNeedsProfileCompletion) {
                setPhoneNeedsProfileCompletion(false);
              }

              const vehicleTypeMap: Record<string, string> = {
                cycle: 'cycle',
                bike: 'bike',
                thela: 'thela',
                car: 'car',
                riksha: 'riksha',
                'mini-truck': 'mini_truck',
                truck: 'truck',
              };
              const scaleTypeMap: Record<string, string> = {
                'Digital Machine': 'digital',
                Tarazu: 'tarazu',
              };

              const onboardedUser = await completeVendorOnboarding({
                full_name: pendingPersonalDetails.fullName,
                age: pendingPersonalDetails.age ? Number(pendingPersonalDetails.age) : null,
                service_city: pendingPersonalDetails.serviceCity,
                service_area: pendingPersonalDetails.serviceArea,
                vehicle_type: vehicleTypeMap[data.type] || 'thela',
                vehicle_number: data.number,
                vehicle_name: data.name,
                vehicle_model_name: data.modelName,
                weighing_scale_type: scaleTypeMap[data.equipment] || 'none',
              });

              setPhoneNeedsProfileCompletion(false);
              setOnboardingStep('face');
            } catch (error: any) {
              if (error instanceof ApiHttpError) {
                Alert.alert('Onboarding failed', error.message);
              } else {
                Alert.alert('Onboarding failed', error?.message || 'Unable to complete onboarding right now.');
              }
            }
        }}
      />
    );
  }

  if (onboardingStep === 'face') {
    return (
      <FaceCaptureScreen
        onBack={() => {
          if (user?.hasVendorProfile) {
            setOnboardingStep('none');
          } else {
            setOnboardingStep('vehicle');
          }
        }}
        onNext={async () => {
          if (user?.hasVendorProfile && user.vendorStatus !== 'draft') {
            try {
              await refreshVendorProfile();
            } catch {
              // Keep the app usable even if refresh is temporarily unavailable.
            }
            setOnboardingStep('none');
            showToast('Face photo updated successfully.', 'success');
            return;
          }

          setOnboardingStep('status');
        }}
      />
    );
  }

  if (onboardingStep === 'status') {
    return (
      <OnboardingStatusScreen
        onBack={() => setOnboardingStep('face')}
        onContinue={() => setOnboardingStep('documents')}
        onRetakeFace={() => setOnboardingStep('face')}
      />
    );
  }

  if (onboardingStep === 'documents') {
    return (
        <KYCDocumentsScreen
        onBack={() => setOnboardingStep('status')}
        onComplete={async (documents) => {
          try {
            await ApiService.uploadVendorDocumentFile({
              document_type: 'aadhaar',
              document_number: documents.aadhaarNumber,
              document_front: documents.aadhaarFrontFile,
              document_back: documents.aadhaarBackFile,
            });
            await ApiService.uploadVendorDocumentFile({
              document_type: documents.secondaryType,
              document_number: documents.secondaryNumber,
              document_front: documents.secondaryFrontFile,
              document_back: documents.secondaryBackFile,
            });
            await ApiService.submitVendorVerification();
            await refreshVendorProfile();
            setPendingPersonalDetails(null);
            setPendingSignupDraft({});
            setOnboardingStep('none');
            showToast('Documents uploaded and sent for review.', 'success');
          } catch (error: any) {
            Alert.alert('Document submission failed', error?.message || 'Unable to upload documents right now.');
          }
        }}
      />
    );
  }

  // Guard: If user has vendor profile but status is 'draft', redirect to face capture
  if (user?.hasVendorProfile && user.vendorStatus === 'draft' && onboardingStep === 'none') {
    setOnboardingStep('face');
    return null;
  }

  if (
    user?.hasVendorProfile &&
    user.requiresProfileImageUpload &&
    user.vendorStatus !== 'suspended' &&
    onboardingStep === 'none'
  ) {
    setOnboardingStep('face');
    return null;
  }

  if (
    user?.hasVendorProfile &&
    (user.vendorStatus === 'pending_verification' || user.vendorStatus === 'rejected' || user.vendorStatus === 'suspended') &&
    !(user.vendorStatus === 'pending_verification' && user.allowPendingAccessWhilePending)
  ) {
    return (
      <VerificationHoldScreen
        vendorName={user.name}
        status={user.vendorStatus}
        rejectionReason={user.rejectionReason}
        isRefreshing={isRefreshingVendorGate}
        onRefresh={async () => {
          setIsRefreshingVendorGate(true);
          try {
            await refreshVendorProfile();
          } catch (error: any) {
            Alert.alert('Refresh failed', error?.message || 'Unable to refresh your verification status right now.');
          } finally {
            setIsRefreshingVendorGate(false);
          }
        }}
        onLogout={() => {
          logout().catch(() => undefined);
        }}
      />
    );
  }

  if (user && onboardingStep === 'none' && isLocationGateChecking) {
    // Location permission check is in-progress. Render nothing visible but do
    // NOT return null — this is a very brief async check and returning null
    // here would flash a blank screen. Render an empty view instead so React
    // can still commit to the tree.
    return <View style={styles.container} />;
  }

  if (user && onboardingStep === 'none' && showLocationPermissionGate) {
    return (
      <LocationPermissionGateScreen
        onContinue={() => {
          setShowLocationPermissionGate(false);
        }}
        onLogout={() => {
          logout().catch(() => undefined);
        }}
      />
    );
  }

  if (showFaceReverification) {
    return (
      <FaceReverificationScreen
        adminMessage={pendingFaceReuploadPrompt?.message || user?.faceReverificationMessage}
        onVerified={async () => {
          try {
            await refreshVendorProfile();
          } catch {
            // ignore
          }
          setShowFaceReverification(false);
          setPendingFaceReuploadPrompt(null);
          showToast('Identity verified successfully! You may now resume jobs.', 'success');
        }}
        onBack={() => setShowFaceReverification(false)}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Dashboard
            onBookingSelect={handleBookingSelect}
            onShowNotification={handleShowNotification}
            onShowToast={showToast}
            onNavigate={handleNavigate}
            hasActiveBooking={hasInFlightActiveJob}
            onOpenActiveBooking={handleOpenActiveBooking}
            onCompleteOnboarding={() => setOnboardingStep('face')}
            onStartFaceVerification={() => setShowFaceReverification(true)}
          />
        );
      case 'learning':
        return (
          <LearningHubScreen
            onBack={handleBackToHome}
            onOpenReel={() => {
              reelReturnTab.current = 'learning';
              setActiveTab('learning-reel');
            }}
          />
        );
      case 'learning-reel':
        return <ReelPlayerScreen onBack={() => setActiveTab(reelReturnTab.current)} />;
      case 'leaderboard':
        return <PartnerLeaderboardScreen onBack={handleBackToHome} />;
      case 'earnings':
        return <EarningsScreen onBack={handleBackToHome} />;
      case 'manage':
        return (
          <ManageScreen
            onBack={handleBackToHome}
            onNavigate={handleNavigate}
            onBookingSelect={handleBookingSelect}
            activeBooking={activeJob}
            onActiveJobUpdate={setActiveJob}
            onOpenActiveJob={handleOpenActiveBooking}
            onStartFaceVerification={() => setShowFaceReverification(true)}
          />
        );
      case 'profile':
        return <ProfileScreen onBack={handleBackToHome} onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'message':
        return <MessageScreen onBack={handleBackToHome} onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'support-chat':
        return <SupportChatScreen onBack={() => setActiveTab('message')} onShowToast={showToast} />;
      case 'edit-profile':
        return <EditProfileScreen onBack={handleBackToProfile} onShowToast={showToast} />;
      case 'personal-info':
        return <PersonalInfoScreen onBack={handleBackToProfile} onShowToast={showToast} />;
      case 'ratings-hub':
        return (
          <RatingsHubScreen
            onBack={handleBackToProfile}
            onShowToast={showToast}
            onStartCustomerReview={(booking) => handleNavigate('customer-review-flow', { booking })}
          />
        );
      case 'customer-review-flow':
        return selectedReviewBooking ? (
          <CustomerReviewFlowScreen
            booking={selectedReviewBooking}
            onBack={() => setActiveTab('ratings-hub')}
            onComplete={() => {
              setSelectedReviewBooking(null);
              setActiveTab('ratings-hub');
            }}
            onShowToast={showToast}
          />
        ) : (
          <RatingsHubScreen
            onBack={handleBackToProfile}
            onShowToast={showToast}
            onStartCustomerReview={(booking) => handleNavigate('customer-review-flow', { booking })}
          />
        );

      case 'payment-settings':
        return <PaymentSettingsScreen onBack={handleBackToProfile} />;
      case 'notifications':
        return <NotificationsScreen onBack={handleBackToProfile} />;
      case 'help-support':
        return <HelpSupportScreen onBack={handleBackToProfile} />;
      case 'support-feedback':
        return <SupportFeedbackScreen onBack={handleBackToProfile} onShowToast={showToast} />;
      case 'privacy':
        return <LegalPolicyScreen kind="privacy" onBack={handleBackToProfile} />;
      case 'terms':
        return <LegalPolicyScreen kind="terms" onBack={handleBackToProfile} />;
      case 'content-policy':
        return <LegalPolicyScreen kind="content" onBack={handleBackToProfile} />;
      case 'about':
        return <AboutScreen onBack={handleBackToProfile} />;
      case 'bills':
        return <BillsScreen onBack={handleBackToMore} onNavigate={handleNavigate} />;
      case 'purchase-bill-detail':
        return <PurchaseBillDetailScreen onBack={() => setActiveTab('bills')} />;
      // Manage tab sub-screens
      case 'history':
        return <JobHistoryScreen onBack={handleBackToOngoing} onNavigate={handleNavigate} />;
      case 'duty-session-details':
        return <DutySessionDetailsScreen onBack={() => setActiveTab('history')} session={selectedDutySession} vendorName={user?.name} />;
      case 'handled-requests':
        return <HandledRequestsScreen onBack={() => setActiveTab('duty-session-details')} />;
      case 'requests':
        return <RequestsScreen onBack={() => setActiveTab('more-menu')} onNavigate={handleNavigate} />;
      case 'request-details':
        return (
          <RequestDetailsScreen 
            onBack={() => setActiveTab('requests')} 
            request={selectedRequestItem} 
          />
        );
      case 'future-requests':
        return <FutureRequestsScreen onBack={handleBackToManage} />;
      case 'ongoing':
        return (
          <JobManagementScreen
            onBack={handleBackToHome}
            onNavigate={handleNavigate}
            activeBooking={activeJob}
            onOpenActiveJob={handleOpenActiveBooking}
          />
        );

      case 'booking-details':
        return selectedBooking ? (
          <BookingRequestScreen
            leadId={selectedBooking.id}
            fallbackBooking={selectedBooking}
            onBack={handleBackToHome}
            onProceedToAssessment={(payload) => {
              setPickupAssessmentPayload(payload);
              setActiveTab('pickup-assessment');
            }}
            onDeclined={(message) => {
              posthogClient.capture('booking_rejected', {
                booking_id: selectedBooking.id,
                scrap_type: selectedBooking.scrapType,
                distance: selectedBooking.distance,
                estimated_amount: selectedBooking.estimatedAmount,
                payment_mode: selectedBooking.paymentMode,
                priority: selectedBooking.priority ?? null,
              });
              showToast(message || 'Booking declined', 'info');
              handleBackToHome();
            }}
          />
        ) : null;
      case 'pickup-assessment':
        return selectedBooking && pickupAssessmentPayload ? (
          <PickupAssessmentScreen
            leadId={pickupAssessmentPayload.leadId}
            items={pickupAssessmentPayload.items}
            orderNumber={pickupAssessmentPayload.orderNumber}
            estimatedValueMin={pickupAssessmentPayload.estimatedValueMin}
            estimatedValueMax={pickupAssessmentPayload.estimatedValueMax}
            onBack={() => setActiveTab('booking-details')}
            onLeadUnavailable={(message) => {
              showToast(message, 'error');
              setActiveTab('booking-details');
            }}
            onAccepted={(bookingId, selectedItems) => {
              posthogClient.capture('booking_accepted', {
                booking_id: selectedBooking.id,
                resolved_booking_id: bookingId,
                selected_items_count: selectedItems.length,
                scrap_type: selectedBooking.scrapType,
                distance: selectedBooking.distance,
                estimated_amount: selectedBooking.estimatedAmount,
                payment_mode: selectedBooking.paymentMode,
                priority: selectedBooking.priority ?? null,
              });

              const newActiveJob: ActiveJobType = {
                ...selectedBooking,
                id: bookingId,
                bookingId,
                selectedItems,
                status: 'on-the-way',
                customerLocation: {
                  lat: 19.076,
                  lng: 72.8777,
                },
              };

              setActiveJob(newActiveJob);
              setActiveTab('active-job');
              showToast('Booking accepted successfully!', 'success');
            }}
          />
        ) : null;
      case 'active-job':
        if (user?.requiresFaceReverification) {
          return (
            <FaceReverificationScreen
              adminMessage={pendingFaceReuploadPrompt?.message || user?.faceReverificationMessage}
              onVerified={async () => {
                try {
                  await refreshVendorProfile();
                } catch {
                  // ignore
                }
                setShowFaceReverification(false);
                setPendingFaceReuploadPrompt(null);
                showToast('Identity verified successfully! You may now resume jobs.', 'success');
              }}
              onBack={handleBackToHome}
            />
          );
        }
        return activeJob ? (
          <ActiveJob
            bookingId={activeJob.bookingId || activeJob.id}
            selectedItems={activeJob.selectedItems || []}
            customerPhone={activeJob.customerPhone}
            onProceedToCalculator={(bookingId, selectedItems) => {
              setPriceCalculatorPayload({ bookingId, selectedItems });
              setActiveTab('job-completion');
            }}
            onBack={handleBackToHome}
            onShowToast={showToast}
          />
        ) : null;
      case 'job-completion':
        return priceCalculatorPayload ? (
          <PriceCalculatorScreen
            bookingId={priceCalculatorPayload.bookingId}
            selectedItems={priceCalculatorPayload.selectedItems}
            onBack={() => setActiveTab('active-job')}
            onQuoteSubmitted={(totalPayout, bookingId, paymentMethod, fallbackAllowed) => {
              posthogClient.capture('quote_submitted', {
                job_id: bookingId,
                total_amount: totalPayout,
                selected_items_count: priceCalculatorPayload.selectedItems.length,
                scrap_type: activeJob?.scrapType ?? null,
                payment_mode: paymentMethod,
              });
              setPriceCalculatorPayload(null);

              // Route to new VendorPaymentScreen if preferred_payment_method is set
              if (paymentMethod) {
                setVendorPaymentPayload({
                  bookingId,
                  orderNumber: activeJob?.orderNumber || (activeJob as any)?.order_number || (activeJob as any)?.id,
                  preferredPaymentMethod: paymentMethod,
                  cashFallbackAllowed: fallbackAllowed,
                });
                setActiveTab('vendor-payment');
              } else {
                // Legacy: fall through to quote-settlement
                setQuoteSettlementPayload({
                  bookingId,
                  totalQuoted: totalPayout,
                  orderNumber: activeJob?.orderNumber || (activeJob as any)?.order_number || (activeJob as any)?.id,
                });
                setActiveTab('quote-settlement');
              }
            }}
            onShowToast={showToast}
          />
        ) : null;
      case 'vendor-payment':
        return vendorPaymentPayload ? (
          <VendorPaymentScreen
            bookingId={vendorPaymentPayload.bookingId}
            orderNumber={vendorPaymentPayload.orderNumber}
            preferredPaymentMethod={vendorPaymentPayload.preferredPaymentMethod}
            cashFallbackAllowed={vendorPaymentPayload.cashFallbackAllowed}
            onBack={() => setActiveTab(activeJob ? 'active-job' : 'manage')}
            onDone={({ bookingId, totalPayout }) => {
              posthogClient.capture('job_completed', {
                job_id: bookingId,
                total_amount: totalPayout,
                scrap_type: activeJob?.scrapType ?? null,
              });
              setJobCompletedPayload({ bookingId, totalPayout });
              setVendorPaymentPayload(null);
              setActiveTab('job-completed');
            }}
            onShowToast={showToast}
          />
        ) : null;
      case 'quote-settlement':
        return quoteSettlementPayload ? (
          <QuoteSettlementScreen
            bookingId={quoteSettlementPayload.bookingId}
            orderNumber={quoteSettlementPayload.orderNumber || activeJob?.orderNumber || (activeJob as any)?.order_number}
            initialAmount={quoteSettlementPayload.totalQuoted}
            onBack={() => setActiveTab(activeJob ? 'active-job' : 'manage')}
            onDone={({ bookingId, totalPayout }) => {
              posthogClient.capture('job_completed', {
                job_id: bookingId,
                total_amount: totalPayout,
                scrap_type: activeJob?.scrapType ?? null,
                payment_mode: activeJob?.paymentMode ?? null,
              });
              setJobCompletedPayload({ bookingId, totalPayout });
              setActiveTab('job-completed');
            }}
            onShowToast={showToast}
          />
        ) : null;
      case 'job-completed':
        return jobCompletedPayload ? (
          <JobCompletedScreen
            bookingId={jobCompletedPayload.bookingId}
            totalPayout={jobCompletedPayload.totalPayout}
            onDone={() => {
              showToast(`Job completed! ₹${jobCompletedPayload.totalPayout.toFixed(2)} earned`, 'success');
              setActiveJob(null);
              setPriceCalculatorPayload(null);
              setQuoteSettlementPayload(null);
              setVendorPaymentPayload(null);
              setJobCompletedPayload(null);
              handleBackToHome();
            }}
          />
        ) : null;
      case 'app-settings':
        return (
          <AppSettingsScreen
            onBack={handleBackToProfile}
            onShowToast={showToast}
          />
        );
      case 'language':
        return (
          <LanguageScreen
            onBack={handleBackToProfile}
            onShowToast={showToast}
          />
        );
      case 'settings':
      case 'more-menu':
        return <ProfileScreen onBack={handleBackToHome} onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'materials':
        return (
          <MaterialsScreen
            onBack={() => handleNavigate('more-menu')}
            onNavigate={handleNavigate}
            onSelectProduct={() => handleNavigate('select-material')}
          />
        );
      case 'select-material':
        return (
          <SelectMaterialScreen
            onBack={() => handleNavigate('materials')}
            onNavigate={handleNavigate}
          />
        );
      case 'credit':
        return (
          <CreditScreen
            onBack={handleBackToMore}
            onShowToast={showToast}
            onNavigate={handleNavigate}
          />
        );
      case 'add-money':
        return (
          <AddMoneyScreen
            onBack={() => handleNavigate('credit')}
            onShowToast={showToast}
          />
        );
      case 'payment-method':
        return (
          <PaymentMethodScreen
            amount={addMoneyAmount}
            onBack={() => setActiveTab('add-money')}
            onPaymentSuccess={(receipt) => {
              setWalletReceipt(receipt);
              setActiveTab('payment-success');
            }}
            onPaymentError={(message) => {
              showToast(message, 'error');
            }}
          />
        );
      case 'payment-success':
        return walletReceipt ? (
          <PaymentSuccessScreen
            receipt={walletReceipt}
            onDone={() => {
              showToast(`Rs ${walletReceipt.amount} added successfully!`, 'success');
              setWalletReceipt(null);
              setActiveTab('credit');
            }}
          />
        ) : null;
      case 'subscription':
        return (
          <SubscriptionScreen
            onBack={handleBackToMore}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        );
      default:
        return (
          <Dashboard
            onBookingSelect={handleBookingSelect}
            onShowNotification={handleShowNotification}
            onShowToast={showToast}
            onNavigate={handleNavigate}
            hasActiveBooking={hasInFlightActiveJob}
            onOpenActiveBooking={handleOpenActiveBooking}
            onCompleteOnboarding={() => setOnboardingStep('face')}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor="#F4F7F5" 
        barStyle="dark-content" 
        translucent={false}
      />
      {renderContent()}
      
      {/* Show bottom navigation except on active job, completion, wallet payment flow, subscription, and materials screens */}
      {activeTab !== 'active-job' && activeTab !== 'job-completion' && activeTab !== 'quote-settlement' && activeTab !== 'vendor-payment' && activeTab !== 'job-completed' && activeTab !== 'add-money' && activeTab !== 'payment-method' && activeTab !== 'payment-success' && activeTab !== 'subscription' && activeTab !== 'materials' && activeTab !== 'select-material' && activeTab !== 'booking-details' && activeTab !== 'pickup-assessment' && activeTab !== 'edit-profile' && activeTab !== 'personal-info' && activeTab !== 'ratings-hub' && activeTab !== 'customer-review-flow' && activeTab !== 'support-chat' && activeTab !== 'learning-reel' && activeTab !== 'leaderboard' && !showJobCompletion && (
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          jobCounts={jobCounts}
        />
      )}

      <FaceReuploadBottomSheet
        prompt={pendingFaceReuploadPrompt && onboardingStep === 'none' ? pendingFaceReuploadPrompt : null}
        slideAnim={facePromptSlideAnim}
        onDismiss={() => {
          if (!pendingFaceReuploadPrompt) return;
          dismissedFacePromptMessageRef.current = pendingFaceReuploadPrompt.message;
          Animated.timing(facePromptSlideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 300,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start(() => setPendingFaceReuploadPrompt(null));
        }}
        onVerify={() => {
          Animated.timing(facePromptSlideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 280,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            setPendingFaceReuploadPrompt(null);
            setShowFaceReverification(true);
          });
        }}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// FaceReuploadBottomSheet — self-contained animated bottom-sheet component
// ---------------------------------------------------------------------------
type FaceReuploadBottomSheetProps = {
  prompt: PendingFaceReuploadPrompt | null;
  slideAnim: Animated.Value;
  onDismiss: () => void;
  onVerify: () => void;
};

const FaceReuploadBottomSheet: React.FC<FaceReuploadBottomSheetProps> = ({
  prompt,
  slideAnim,
  onDismiss,
  onVerify,
}) => {
  const isVisible = Boolean(prompt);

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  if (!prompt) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <TouchableOpacity
          style={sheetStyles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        />

        <Animated.View
          style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={sheetStyles.dragHandle} />

          <View style={sheetStyles.badgeRow}>
            <View style={sheetStyles.securityBadge}>
              <MaterialIcons name="security" size={13} color="#047857" />
              <Text style={sheetStyles.securityBadgeText}>Security & Compliance</Text>
            </View>
            <View style={sheetStyles.auditBadge}>
              <MaterialIcons name="warning" size={11} color="#b91c1c" />
              <Text style={sheetStyles.auditBadgeText}>AUDIT REQUIRED</Text>
            </View>
          </View>

          <Text style={sheetStyles.title}>{prompt.title}</Text>

          <Text style={sheetStyles.message}>{prompt.message}</Text>

          <View style={sheetStyles.authorityCard}>
            <View style={sheetStyles.authorityIcon}>
              <MaterialIcons name="verified-user" size={18} color="#047857" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sheetStyles.authorityLabel}>REGULATORY AUTHORITY</Text>
              <Text style={sheetStyles.authorityValue}>
                {'Requested by ' + (prompt.requestedBy || 'Platform Administration')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={sheetStyles.primaryButton}
            activeOpacity={0.86}
            onPress={onVerify}
          >
            <MaterialIcons name="camera-alt" size={19} color="#fff" />
            <Text style={sheetStyles.primaryButtonText}>Verify Identity Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={sheetStyles.secondaryButton}
            activeOpacity={0.7}
            onPress={onDismiss}
          >
            <Text style={sheetStyles.secondaryButtonText}>Review Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 35, 0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 18,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  securityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  auditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  auditBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    fontFamily: 'RobotoSlab_700Bold',
    color: '#0f172a',
    lineHeight: 38,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    marginBottom: 18,
  },
  authorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  authorityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  authorityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 10,
    shadowColor: '#059669',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default Sentry.wrap(function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_700Bold,
    RobotoSlab_400Regular,
    RobotoSlab_700Bold,
  });
  const reviewModeEnabled = isVendorReviewMode();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <PostHogProvider
              client={posthog}
              options={{
                host: "https://us.i.posthog.com",
                enableSessionReplay: true,
                sessionReplayConfig: {
                  maskAllTextInputs: false,
                  maskAllImages: false,
                  captureLog: true,
                  captureNetworkTelemetry: true,
                  sampleRate: undefined,
                  throttleDelayMs: 1000,
                }
              }}
              autocapture={{
                captureScreens: false,
                captureTouches: true,
                propsToCapture: ['testID'],
              }}
            >
              <AuthProvider>
                <BookingProvider>
                  <NavigationContainer>
                    <View className="flex-1" style={reviewModeEnabled ? { paddingTop: TESTING_MODE_BANNER_HEIGHT } : undefined}>
                      <AppContent />
                      {reviewModeEnabled ? <TestingModeBanner /> : null}
                    </View>
                  </NavigationContainer>
                </BookingProvider>
              </AuthProvider>
            </PostHogProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
});
