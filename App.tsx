import { NavigationContainer } from '@react-navigation/native';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { posthog } from './src/config/posthog';
import { LanguageProvider } from './src/utils/i18n';

// Auth Screens
import { OTPVerify, Signup, SimpleLogin } from './src/screens/auth';
// Main Screens
import { BillsScreen, Dashboard, EarningsScreen, ManageScreen, PurchaseBillDetailScreen } from './src/screens/main';

// Profile Screens
import { EditProfileScreen, PersonalInfoScreen, ProfileScreen } from './src/screens/profile';

// Settings Screens
import {
    AboutScreen,
    AppSettingsScreen,
    ContactsScreen,
    HelpSupportScreen,
    LanguageScreen,
    MaterialsScreen,
    MoreMenuScreen,
    NotificationsScreen,
    PaymentSettingsScreen,
    PrivacyScreen,
    SelectMaterialScreen
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

// Navigation & Common Components
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from './src/components/common';
import { BottomNavigation } from './src/components/navigation';
import { ApiHttpError, ApiService, VerifyOtpResponse } from './src/services/api';
import {
    registerVendorPushToken,
    setupVendorNotificationChannels,
    setupVendorNotificationListeners,
} from './src/services/notifications';
import { vendorLocationStreamer } from './src/services/vendorLocationStreamer';
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

// Prevent splash screen from hiding automatically while fonts are loading
SplashScreen.preventAutoHideAsync();

type CurrentBookingSnapshot = {
  id: string | number;
  status?: string;
  created_at?: string;
  pickup_address?: string;
  pickup_lat?: number | string;
  pickup_lng?: number | string;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  items?: Array<{
    product?: string;
    product_name?: string;
  }>;
};

const TERMINAL_BOOKING_STATUSES = new Set(['completed', 'cancelled', 'rejected']);

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

const mapCurrentBookingToActiveJob = (booking: CurrentBookingSnapshot): ActiveJobType => {
  const bookingId = String(booking.id);
  const fallbackLat = 19.076;
  const fallbackLng = 72.8777;

  return {
    id: bookingId,
    bookingId,
    scrapType: summarizeScrapType(booking.items),
    distance: '-',
    customerName: booking.customer?.name || 'Customer',
    customerPhone: booking.customer?.phone || '',
    address: booking.customer?.address || booking.pickup_address || 'Address available in active booking',
    paymentMode: 'Pending',
    estimatedAmount: 0,
    createdAt: booking.created_at ? new Date(booking.created_at) : new Date(),
    status: mapCurrentBookingStatusToActiveStatus(booking.status),
    customerLocation: {
      lat: toNumberOr(booking.pickup_lat, fallbackLat),
      lng: toNumberOr(booking.pickup_lng, fallbackLng),
    },
    selectedItems: [],
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
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [selectedRequestItem, setSelectedRequestItem] = useState<any>(null);
  const [selectedDutySession, setSelectedDutySession] = useState<DutySession | null>(null);
  const [showJobCompletion, setShowJobCompletion] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveJobType | null>(null);
  const [priceCalculatorPayload, setPriceCalculatorPayload] = useState<{
    bookingId: string;
    selectedItems: SelectedPickupItem[];
  } | null>(null);
  const [quoteSettlementPayload, setQuoteSettlementPayload] = useState<{
    bookingId: string;
    totalQuoted: number;
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
  const hasInFlightActiveJob = Boolean(activeJob || priceCalculatorPayload || quoteSettlementPayload);
  
  // Job counts for navigation badges
  const [jobCounts] = useState({
    active: 2,
    pending: 1,
    upcoming: 3,
  });

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

  const handleOpenActiveBooking = () => {
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

    if (activeJob) {
      const activeBookingId = String(activeJob.bookingId || activeJob.id);
      void ApiService.getBookingActive(activeBookingId)
        .then((active) => {
          const quoteStatus = String(active?.quote?.status || '').toLowerCase();
          if (QUOTE_SETTLEMENT_STATUSES.has(quoteStatus)) {
            setQuoteSettlementPayload({
              bookingId: activeBookingId,
              totalQuoted: Number(active?.quote?.total_amount || 0),
            });
            setPriceCalculatorPayload(null);
            setActiveTab('quote-settlement');
            return;
          }
          setActiveTab('active-job');
        })
        .catch(() => {
          setActiveTab('active-job');
        });
      return;
    }

    setActiveTab('ongoing');
  };

  const handleBackToHome = () => {
    setActiveTab('home');
    setSelectedBooking(null);
    setSelectedDutySession(null);
    setShowJobCompletion(false);
    setPickupAssessmentPayload(null);
    setPriceCalculatorPayload(null);
    setQuoteSettlementPayload(null);
    setJobCompletedPayload(null);
    setActiveJob(null);
  };

  const handleBackToManage = () => {
    setActiveTab('manage');
  };

  const handleBackToOngoing = () => {
    setActiveTab('ongoing');
  };

  const handleBackToMore = () => {
    setActiveTab('more-menu');
  };

  const handleBackToProfile = () => {
    setActiveTab('profile');
  };

  const handleNavigate = (screen: string, params?: any) => {
    setActiveTab(screen);
    if (params?.request) {
      setSelectedRequestItem(params.request);
    }
    if (params?.session) {
      setSelectedDutySession(params.session);
    }
  };

  useEffect(() => {
    void vendorLocationStreamer.setOnlineStatus(Boolean(user?.isOnline));

    if (!user) {
      vendorLocationStreamer.setOnlineStatus(false);
    }
  }, [user]);

  useEffect(() => {
    void setupVendorNotificationChannels().catch((error) => {
      console.error('Failed to set up vendor notification channels:', error);
    });

    const cleanup = setupVendorNotificationListeners((target) => {
      setActiveTab(target);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    void registerVendorPushToken().catch((error) => {
      console.error('Failed to register vendor push token:', error);
    });
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const evaluateLocationGate = async () => {
      if (!user || onboardingStep !== 'none') {
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

  useEffect(() => {
    let isMounted = true;

    const hydrateCurrentBooking = async () => {
      if (!user || onboardingStep !== 'none') {
        return;
      }

      try {
        const response = await ApiService.getCurrentBooking();
        const booking = response?.booking as CurrentBookingSnapshot | undefined;

        if (!isMounted || !booking?.id) {
          return;
        }

        const normalizedStatus = String(booking.status || '').toLowerCase();
        if (TERMINAL_BOOKING_STATUSES.has(normalizedStatus)) {
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
          const active = await ApiService.getBookingActive(hydratedJob.bookingId);
          const quoteStatus = String(active?.quote?.status || '').toLowerCase();
          if (QUOTE_SETTLEMENT_STATUSES.has(quoteStatus)) {
            setQuoteSettlementPayload({
              bookingId: hydratedJob.bookingId,
              totalQuoted: Number(active?.quote?.total_amount || 0),
            });
            setPriceCalculatorPayload(null);
          }
        } catch {
          // Best-effort hydration only.
        }
      } catch (error) {
        console.warn('Unable to hydrate current booking state', error);
      }
    };

    void hydrateCurrentBooking();

    return () => {
      isMounted = false;
    };
  }, [onboardingStep, user]);

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
          fullName: pendingPersonalDetails?.fullName || pendingSignupDraft.name || user?.name || '',
          email: pendingPersonalDetails?.email || pendingSignupDraft.email || user?.email || '',
          age: pendingPersonalDetails?.age || (user?.age ? String(user.age) : ''),
          serviceCity: pendingPersonalDetails?.serviceCity || user?.serviceCity || '',
          serviceArea: pendingPersonalDetails?.serviceArea || user?.serviceArea || '',
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
        onNext={() => {
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
    return null;
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
          />
        );
      case 'earnings':
        return <EarningsScreen onBack={handleBackToHome} />;
      case 'manage':
        return <ManageScreen onBack={handleBackToHome} onNavigate={handleNavigate} />;
      case 'profile':
        return <ProfileScreen onBack={handleBackToHome} onNavigate={handleNavigate} />;
      case 'personal-info':
        return <PersonalInfoScreen onBack={handleBackToProfile} />;

      case 'payment-settings':
        return <PaymentSettingsScreen onBack={handleBackToProfile} />;
      case 'notifications':
        return <NotificationsScreen onBack={handleBackToProfile} />;
      case 'help-support':
        return <HelpSupportScreen onBack={handleBackToProfile} />;
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
      case 'active-jobs-list':
        return <ActiveJob 
          bookingId={'active-1'}
          selectedItems={[]}
          onProceedToCalculator={(bookingId, selectedItems) => {
            setPriceCalculatorPayload({ bookingId, selectedItems });
            setActiveTab('job-completion');
          }}
          onBack={handleBackToManage}
          onShowToast={showToast}
        />;
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
        return activeJob ? (
          <ActiveJob
            bookingId={activeJob.bookingId || activeJob.id}
            selectedItems={activeJob.selectedItems || []}
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
            onQuoteSubmitted={(totalPayout, bookingId) => {
              posthogClient.capture('quote_submitted', {
                job_id: bookingId,
                total_amount: totalPayout,
                selected_items_count: priceCalculatorPayload.selectedItems.length,
                scrap_type: activeJob?.scrapType ?? null,
                payment_mode: activeJob?.paymentMode ?? null,
              });
              setPriceCalculatorPayload(null);
              setQuoteSettlementPayload({ bookingId, totalQuoted: totalPayout });
              setActiveTab('quote-settlement');
            }}
            onShowToast={showToast}
          />
        ) : null;
      case 'quote-settlement':
        return quoteSettlementPayload ? (
          <QuoteSettlementScreen
            bookingId={quoteSettlementPayload.bookingId}
            initialAmount={quoteSettlementPayload.totalQuoted}
            onBack={() => setActiveTab(activeJob ? 'active-job' : 'ongoing')}
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
              handleBackToHome();
            }}
          />
        ) : null;
      case 'edit-profile':
        return (
          <EditProfileScreen
            onBack={handleBackToProfile}
            onShowToast={showToast}
          />
        );
      case 'app-settings':
        return (
          <AppSettingsScreen
            onBack={handleBackToProfile}
            onShowToast={showToast}
          />
        );
      case 'contacts':
        return (
          <ContactsScreen
            onBack={handleBackToMore}
          />
        );
      case 'language':
        return (
          <LanguageScreen
            onBack={handleBackToProfile}
            onShowToast={showToast}
          />
        );
      case 'privacy':
        return (
          <PrivacyScreen
            onBack={handleBackToProfile}
          />
        );
      case 'more-menu':
        return (
          <MoreMenuScreen
            onBack={handleBackToProfile}
            onNavigate={handleNavigate}
          />
        );
      case 'materials':
        return (
          <MaterialsScreen
            onBack={() => handleNavigate('more-menu')}
            onNavigate={handleNavigate}
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
        backgroundColor="#1B7332" 
        barStyle="light-content" 
        translucent={false}
      />
      {renderContent()}
      
      {/* Show bottom navigation except on active job, completion, wallet payment flow, subscription, and materials screens */}
      {activeTab !== 'active-job' && activeTab !== 'job-completion' && activeTab !== 'job-completed' && activeTab !== 'add-money' && activeTab !== 'payment-method' && activeTab !== 'payment-success' && activeTab !== 'subscription' && activeTab !== 'materials' && activeTab !== 'select-material' && activeTab !== 'booking-details' && activeTab !== 'pickup-assessment' && !showJobCompletion && (
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          jobCounts={jobCounts}
        />
      )}
    </View>
  );
};

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
              <NavigationContainer>
                <View className="flex-1 font-sans">
                  <AppContent />
                </View>
              </NavigationContainer>
            </AuthProvider>
          </PostHogProvider>
        </ErrorBoundary>
      </LanguageProvider>
    </SafeAreaProvider>
  );
});
