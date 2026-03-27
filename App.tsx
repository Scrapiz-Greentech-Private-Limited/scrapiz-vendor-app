import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { NavigationContainer } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider } from './src/utils/i18n';
import { posthog } from './src/config/posthog';

// Auth Screens
import { OTPVerify, Signup, SimpleLogin } from './src/screens/auth';
// Main Screens
import { Dashboard, EarningsScreen, ManageScreen, BillsScreen, PurchaseBillDetailScreen } from './src/screens/main';

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
    BookingDetailsScreen,
    DutySessionDetailsScreen,
    FutureRequestsScreen,
    HandledRequestsScreen,
    JobCompletion,
    JobHistoryScreen,
    RequestDetailsScreen,
    RequestsScreen
} from './src/screens/jobs';
import JobManagementScreen from './src/screens/jobs/JobManagementScreen';

// Credit Screens
import { CreditScreen, AddMoneyScreen } from './src/screens/credit';
// Subscription Screens
import { SubscriptionScreen } from './src/screens/subscription';
// Onboarding Screens
import { AddVehicleScreen, PersonalDetailsScreen } from './src/screens/onboarding';

// Navigation & Common Components
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from './src/components/common';
import { BottomNavigation } from './src/components/navigation';
import { ActiveJob as ActiveJobType, BookingRequest } from './src/types';

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
import { useEffect } from 'react';

// Import global styles for NativeWind
import "./global.css";

// Prevent splash screen from hiding automatically while fonts are loading
SplashScreen.preventAutoHideAsync();


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
  const { user, login, isInitialLoading } = useAuth();
  const [authStep, setAuthStep] = useState('login'); 
  const [onboardingStep, setOnboardingStep] = useState<'none' | 'personal' | 'vehicle'>('none');
  const [tempPhone, setTempPhone] = useState('');
  const posthogClient = usePostHog();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [selectedRequestItem, setSelectedRequestItem] = useState<any>(null);
  const [showJobCompletion, setShowJobCompletion] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveJobType | null>(null);
  const [isBookingAccepted, setIsBookingAccepted] = useState(false);
  
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
    setIsBookingAccepted(false); // Reset acceptance state for new booking
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

  const handleBackToHome = () => {
    setActiveTab('home');
    setSelectedBooking(null);
    setShowJobCompletion(false);
    setIsBookingAccepted(false); // Reset acceptance state
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
  };

  if (isInitialLoading) {
    return null; // Or a splash screen component
  }

 if (!user) {
    if (authStep === 'login') {
      return (
        <SimpleLogin 
          onNavigateSignup={() => setAuthStep('signup')} 
          onNavigateOTP={(phone: string) => {
            setTempPhone(phone);
            setAuthStep('otp');
          }}
          onGoogleSuccess={async () => {
            try {
              // Dummy login for demo
              await login('9999999999');
              setOnboardingStep('personal');
            } catch (err) {
              Alert.alert('Error', 'Failed to sign in with Google');
            }
          }}
        />
      );
    }
    if (authStep === 'signup') {
      return (
        <Signup 
          onNavigateLogin={() => setAuthStep('login')} 
          onNavigateOTP={(phone: string) => {
            setTempPhone(phone);
            setAuthStep('otp');
          }} 
          onBack={() => setAuthStep('login')}
          onGoogleSuccess={async () => {
            try {
              await login('9999999999');
              setOnboardingStep('personal');
            } catch (err) {
              Alert.alert('Error', 'Failed to sign up with Google');
            }
          }}
        />
      );
    }
    if (authStep === 'otp') {
      return (
        <OTPVerify 
          phone={tempPhone}
          onBack={() => setAuthStep('login')} 
          onSuccess={async () => {
            try {
              // This triggers the useAuth hook to set the user state
              await login(tempPhone); 
              // After login, show onboarding instead of direct dashboard
              setOnboardingStep('personal');
            } catch (err) {
              Alert.alert('Error', 'Failed to verify OTP');
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
        onNext={(data) => {
            console.log('Personal Details:', data);
            if (data.hasVehicle) {
                setOnboardingStep('vehicle');
            } else {
                setOnboardingStep('none');
                setActiveTab('home');
            }
        }} 
      />
    );
  }

  if (onboardingStep === 'vehicle') {
    return (
      <AddVehicleScreen 
        onBack={() => setOnboardingStep('personal')}
        onComplete={(data) => {
            console.log('Vehicle Details:', data);
            setOnboardingStep('none');
            setActiveTab('home');
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
        return <DutySessionDetailsScreen onBack={() => setActiveTab('history')} onNavigate={handleNavigate} />;
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
          job={{
            id: 'active-1',
            scrapType: 'Mixed Scrap',
            distance: '2.5 km',
            customerName: 'Active Customer',
            customerPhone: '+91 98765 43210',
            address: 'Active Job Location',
            paymentMode: 'Cash',
            estimatedAmount: 500,
            createdAt: new Date(),
            status: 'on-the-way',
            customerLocation: { lat: 19.0760, lng: 72.8777 }
          }}
          onStatusUpdate={(status) => console.log('Status updated:', status)}
          onCompleteJob={() => {
            showToast('Job completed!', 'success');
            handleBackToManage();
          }}
          onBack={handleBackToManage}
          onShowToast={showToast}
        />;
      case 'future-requests':
        return <FutureRequestsScreen onBack={handleBackToManage} />;
      case 'ongoing':
        return <JobManagementScreen onBack={handleBackToHome} onNavigate={handleNavigate} />;

      case 'booking-details':
        return selectedBooking ? (
          <BookingDetailsScreen
            booking={selectedBooking}
            onBack={handleBackToHome}
            isAccepted={isBookingAccepted}
            onAccept={() => {
              setIsBookingAccepted(true); // Mark booking as accepted
              posthogClient.capture('booking_accepted', {
                booking_id: selectedBooking.id,
                scrap_type: selectedBooking.scrapType,
                distance: selectedBooking.distance,
                estimated_amount: selectedBooking.estimatedAmount,
                payment_mode: selectedBooking.paymentMode,
                priority: selectedBooking.priority ?? null,
              });
              // Convert booking to active job
              const newActiveJob: ActiveJobType = {
                ...selectedBooking,
                status: 'on-the-way',
                customerLocation: {
                  lat: 19.0760, // Default Mumbai coordinates
                  lng: 72.8777
                }
              };
              setActiveJob(newActiveJob);
              setActiveTab('active-job');
              showToast('Booking accepted successfully!', 'success');
            }}
            onReject={() => {
              posthogClient.capture('booking_rejected', {
                booking_id: selectedBooking.id,
                scrap_type: selectedBooking.scrapType,
                distance: selectedBooking.distance,
                estimated_amount: selectedBooking.estimatedAmount,
                payment_mode: selectedBooking.paymentMode,
                priority: selectedBooking.priority ?? null,
              });
              showToast('Booking rejected', 'info');
              handleBackToHome();
            }}
          />
        ) : null;
      case 'active-job':
        return activeJob ? (
          <ActiveJob
            job={activeJob}
            onStatusUpdate={(status) => {
              posthogClient.capture('job_status_updated', {
                job_id: activeJob.id,
                new_status: status,
                scrap_type: activeJob.scrapType,
              });
              setActiveJob(prev => prev ? { ...prev, status } : null);
            }}
            onCompleteJob={() => {
              setShowJobCompletion(true);
              setActiveTab('job-completion');
            }}
            onBack={handleBackToHome}
            onShowToast={showToast}
          />
        ) : null;
      case 'job-completion':
        return (
          <JobCompletion
            onJobComplete={(totalAmount) => {
              posthogClient.capture('job_completed', {
                job_id: activeJob?.id ?? null,
                total_amount: totalAmount,
                scrap_type: activeJob?.scrapType ?? null,
                payment_mode: activeJob?.paymentMode ?? null,
              });
              showToast(`Job completed! ₹${totalAmount} earned`, 'success');
              setActiveJob(null);
              setShowJobCompletion(false);
              handleBackToHome();
            }}
            onBack={() => {
              setActiveTab('active-job');
            }}
            onShowToast={showToast}
          />
        );
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
            onSuccess={(amount) => {
              showToast(`₹${amount} added successfully!`, 'success');
              handleNavigate('credit');
            }}
            currentBalance={-20}
          />
        );
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
      
      {/* Show bottom navigation except on active job, completion, add-money, subscription and materials screens */}
      {activeTab !== 'active-job' && activeTab !== 'job-completion' && activeTab !== 'add-money' && activeTab !== 'subscription' && activeTab !== 'materials' && activeTab !== 'select-material' && !showJobCompletion && (
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
              captureScreens: true,
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
