import { MaterialIcons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Linking,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { CreditBalance, CreditRechargeModal } from '../../components/ui';
import CreditLoadingState from '../../components/ui/CreditLoadingState';
import { BookingCardSkeleton } from '../../components/ui/SkeletonLoader';
import { bookingStateService } from '../../services/bookingStateService';
import { creditNotificationService } from '../../services/creditNotificationService';
import { CreditRechargeResult } from '../../services/creditRechargeService';
import { creditService } from '../../services/creditService';
import HapticService from '../../services/hapticService';
import { BookingRequest } from '../../types';

interface DashboardProps {
  onBookingSelect: (booking: BookingRequest) => void;
  onShowNotification: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onBookingSelect, onShowToast, onNavigate }: DashboardProps) {
  const { user, toggleOnlineStatus } = useAuth();
  const posthog = usePostHog();
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [processedBookings, setProcessedBookings] = useState<string[]>([]);

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  
  const [bookings] = useState<BookingRequest[]>([
    {
      id: '1',
      scrapType: 'Mixed Scrap',
      distance: '2.5 km',
      customerName: 'Rajesh Kumar',
      customerPhone: '+91 9876543210',
      address: '123 MG Road, Bangalore',
      paymentMode: 'Cash',
      estimatedAmount: 450,
      createdAt: new Date(),
      priority: 'high',
      estimatedTime: '15 mins'
    },
    {
      id: '2',
      scrapType: 'Paper & Cardboard',
      distance: '1.8 km',
      customerName: 'Priya Sharma',
      customerPhone: '+91 9876543211',
      address: '456 Brigade Road, Bangalore',
      paymentMode: 'UPI',
      estimatedAmount: 320,
      createdAt: new Date(),
      priority: 'medium',
      estimatedTime: '12 mins'
    },
    {
      id: '3',
      scrapType: 'Electronic Waste',
      distance: '3.2 km',
      customerName: 'Amit Patel',
      customerPhone: '+91 9876543212',
      address: '789 Koramangala, Bangalore',
      paymentMode: 'Digital',
      estimatedAmount: 680,
      createdAt: new Date(),
      priority: 'high',
      estimatedTime: '18 mins'
    }
  ]);

  // Sync with user online status from auth
  useEffect(() => {
    if (user) {
      setIsOnline(user.isOnline);
    }
  }, [user]);

  // Initialize credit service and load balance when user is available
  useEffect(() => {
    const initializeCreditService = async () => {
      if (!user) return;
      
      try {
        // Set vendor ID in credit service
        creditService.setVendorId(user.id);
        
        // Set toast handler for notifications
        creditService.setToastHandler(onShowToast);
        
        // Load credit balance
        setLoadingBalance(true);
        const balance = await creditService.getCurrentBalance();
        setCreditBalance(balance);
        
        // Optimize performance by preloading data
        await creditService.optimizePerformance();
      } catch (error) {
        console.error('Failed to initialize credit service:', error);
        onShowToast('Failed to load credit balance', 'error');
      } finally {
        setLoadingBalance(false);
      }
    };

    initializeCreditService();
  }, [user, onShowToast]);

  // Enhanced animations for cards
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleToggleOnline = async () => {
    try {
      await HapticService.medium();
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      toggleOnlineStatus(); // Sync with auth context
      posthog.capture('vendor_online_status_toggled', {
        new_status: newStatus ? 'online' : 'offline',
        vendor_id: user?.id ?? null,
      });

      if (newStatus) {
        await HapticService.success();
      }

      onShowToast(
        newStatus ? 'You are now online and ready to receive bookings!' : 'You are now offline',
        'success'
      );
    } catch (error) {
      console.error('Error toggling online status:', error);
      await HapticService.error();
      onShowToast('Failed to update status. Please try again.', 'error');
    }
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      await new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          if (Math.random() < 0.05) {
            reject(new Error('Network error'));
          } else {
            resolve(true);
          }
        }, 1500);
      });
      
      onShowToast('Bookings refreshed!', 'success');
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onShowToast(`Failed to refresh: ${errorMessage}`, 'error');
    } finally {
      setIsRefreshing(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, [isRefreshing, onShowToast]);

  const handleBookingAction = async (bookingId: string, action: 'accept' | 'decline' | 'view' | 'call') => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Add haptic feedback for better UX
    await HapticService.light();

    switch (action) {
      case 'accept':
        try {
          // Calculate required credits for this booking
          const requiredCredits = creditService.calculateRequiredCredits(booking.estimatedAmount);
          const currentBalance = await creditService.getCurrentBalance();
          
          // Validate credit requirements before booking acceptance
          if (currentBalance < requiredCredits) {
            // Show insufficient credit prompt with recharge option
            const shortfall = requiredCredits - currentBalance;
            
            Alert.alert(
              '💳 Insufficient Credits',
              `You need ${requiredCredits} credits for this ₹${booking.estimatedAmount} booking but only have ${currentBalance}.\n\nShortfall: ${shortfall} credits`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: '⚡ Recharge Now', 
                  onPress: () => setShowRechargeModal(true)
                }
              ]
            );
            return;
          }

          // Confirm acceptance with user
          Alert.alert(
            '✅ Accept Booking',
            `Confirm acceptance?\n\n• Customer: ${booking.customerName}\n• Amount: ₹${booking.estimatedAmount}\n• Credits: ${requiredCredits} will be deducted`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: '✅ Accept', 
                onPress: async () => {
                  // Deduct credits for booking acceptance
                  const success = await creditService.deductCredits(
                    requiredCredits,
                    booking.id,
                    booking.estimatedAmount
                  );

                  if (success) {
                    // Add booking to accepted state
                    bookingStateService.acceptBooking(booking, user?.id || 'vendor');
                    
                    // Update processed bookings list
                    setProcessedBookings(prev => [...prev, booking.id]);
                    
                    // Update local balance immediately
                    const newBalance = await creditService.getCurrentBalance();
                    setCreditBalance(newBalance);
                    
                    // Show booking acceptance success notification
                    creditNotificationService.showBookingAcceptanceSuccess(
                      booking.customerName,
                      requiredCredits,
                      newBalance
                    );

                    onShowToast(`✅ Booking accepted! Will appear in Manage tab.`, 'success');
                    
                    // Auto-call customer after acceptance
                    setTimeout(() => {
                      handleBookingAction(bookingId, 'call');
                    }, 1000);
                    
                  } else {
                    onShowToast('Failed to accept booking. Please try again.', 'error');
                  }
                }
              }
            ]
          );
        } catch (error) {
          console.error('Error accepting booking:', error);
          onShowToast('Failed to accept booking. Please try again.', 'error');
        }
        break;
      case 'decline':
        Alert.alert(
          '❌ Decline Booking',
          `Are you sure you want to decline this booking from ${booking.customerName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: '❌ Decline', 
              style: 'destructive',
              onPress: () => {
                // Add booking to declined state
                bookingStateService.declineBooking(booking, user?.id || 'vendor', 'Declined by vendor');
                
                // Update processed bookings list
                setProcessedBookings(prev => [...prev, booking.id]);
                
                onShowToast('Booking declined', 'info');
              }
            }
          ]
        );
        break;
      case 'call':
        try {
          const phoneNumber = booking.customerPhone.replace(/\s+/g, '');
          await Linking.openURL(`tel:${phoneNumber}`);
        } catch (error) {
          onShowToast('Unable to make call', 'error');
        }
        break;
      case 'view':
        onBookingSelect(booking);
        break;
    }
  };

  const handleCreditPress = () => {
    onNavigate('credit');
  };

  const handleRechargeSuccess = async (result: CreditRechargeResult) => {
    posthog.capture('credit_recharge_completed', {
      credits_added: result.creditsAdded ?? null,
      new_balance: result.newBalance ?? null,
      transaction_id: result.transactionId ?? null,
      vendor_id: user?.id ?? null,
    });
    if (result.newBalance !== undefined) {
      setCreditBalance(result.newBalance);
    } else {
      // Refresh balance from service
      try {
        const newBalance = await creditService.getCurrentBalance();
        setCreditBalance(newBalance);
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    }
    onShowToast(
      `Successfully added ${result.creditsAdded} credits! New balance: ${result.newBalance}`,
      'success'
    );
  };

  const handleRechargeError = (error: string) => {
    onShowToast(error, 'error');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#1B7332';
      default: return '#6c757d';
    }
  };

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1B7332" barStyle="light-content" />
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1B7332']}
            tintColor="#1B7332"
            progressBackgroundColor="#f8f9fa"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>
                  {getGreeting()}!
                </Text>
                <Text style={styles.userName}>
                  {user?.name || 'Vendor'}
                </Text>
              </View>
              <Text style={styles.readyText}>Ready to collect scrap today?</Text>
            </View>
            <View style={styles.headerRight}>
              {loadingBalance ? (
                <CreditLoadingState type="balance" />
              ) : (
                <CreditBalance 
                  balance={creditBalance}
                  onPress={handleCreditPress}
                  showWarning={creditBalance < 5}
                />
              )}
            </View>
          </View>

          {/* Online/Offline Toggle */}
          <View style={styles.statusContainer}>
            <View style={styles.statusLeft}>
              <View 
                style={[
                  styles.statusIconContainer, 
                  { backgroundColor: isOnline ? '#E8F5E8' : '#f8f9fa' }
                ]}
              >
                <MaterialIcons 
                  name={isOnline ? 'wifi' : 'wifi-off'} 
                  size={18} 
                  color={isOnline ? '#1B7332' : '#6c757d'} 
                />
                {isOnline && (
                  <View style={styles.onlineIndicator} />
                )}
              </View>
              <View style={styles.statusTextContainer}>
                <View style={styles.statusTitleRow}>
                  <Text style={styles.statusTitle}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                  {isOnline && <View style={styles.liveDot} />}
                </View>
                <Text style={styles.statusSubtitle}>
                  {isOnline ? 'Receiving new bookings' : 'Not receiving bookings'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleButton, 
                isOnline ? styles.toggleButtonOffline : styles.toggleButtonOnline
              ]}
              onPress={handleToggleOnline}
            >
              <MaterialIcons 
                name={isOnline ? 'pause' : 'play-arrow'} 
                size={14} 
                color="white" 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.toggleButtonText, isOnline ? styles.toggleTextOffline : styles.toggleTextOnline]}>
                {isOnline ? 'Go Offline' : 'Go Online'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sentry Test Button */}
          <TouchableOpacity
            style={styles.sentryTestButton}
            onPress={() => {
              Sentry.captureException(new Error('First error'));
              onShowToast('Test error sent to Sentry!', 'success');
            }}
          >
            <MaterialIcons name="bug-report" size={16} color="#FF6B35" />
            <Text style={styles.sentryTestButtonText}>Test Sentry</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Enhanced Booking Requests */}
          <Animated.View style={[styles.bookingsContainer, styles.enhancedBookingsContainer, { opacity: fadeAnim }]}>
            <View style={styles.bookingsHeader}>
              <View style={styles.bookingsHeaderLeft}>
                <View style={styles.bookingsIconContainer}>
                  <MaterialIcons name="flash-on" size={20} color="#1B7332" />
                </View>
                <View>
                  <Text style={styles.bookingsTitle}>New Booking Requests</Text>
                  <Text style={styles.bookingsSubtitle}>
                    {bookings.filter(booking => !processedBookings.includes(booking.id)).length} requests available
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bookingsList}>
              {isRefreshing ? (
                <View style={styles.loadingContainer}>
                  {[1, 2, 3].map((i) => (
                    <BookingCardSkeleton key={i} />
                  ))}
                </View>
              ) : bookings.filter(booking => !processedBookings.includes(booking.id)).length > 0 ? (
                bookings.filter(booking => !processedBookings.includes(booking.id)).map((booking) => (
                  <Animated.View 
                    key={booking.id} 
                    style={[
                      styles.bookingCard, 
                      styles.enhancedBookingCard,
                      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                    ]}
                  >
                    {/* Simplified card header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.leftSection}>
                        <View style={styles.titleRow}>
                          <Text style={styles.scrapType}>{booking.scrapType}</Text>
                          <View style={[
                            styles.priorityBadge,
                            { backgroundColor: getPriorityColor(booking.priority || 'medium') }
                          ]}>
                            <MaterialIcons 
                              name="priority-high" 
                              size={10} 
                              color="white" 
                            />
                            <Text style={styles.priorityText}>
                              {booking.priority?.toUpperCase() || 'MED'}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.customerName}>{booking.customerName}</Text>
                        
                        <View style={styles.quickInfo}>
                          <View style={styles.infoItem}>
                            <MaterialIcons name="location-on" size={12} color="#1B7332" />
                            <Text style={styles.infoText}>{booking.distance}</Text>
                          </View>
                          <View style={styles.infoItem}>
                            <MaterialIcons name="schedule" size={12} color="#1B7332" />
                            <Text style={styles.infoText}>{booking.estimatedTime || '15 mins'}</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.rightSection}>
                        <Text style={styles.amount}>₹{booking.estimatedAmount}</Text>
                        <View style={styles.creditBadge}>
                          <MaterialIcons name="stars" size={12} color="#FF9800" />
                          <Text style={styles.creditValue}>
                            {creditService.calculateRequiredCredits(booking.estimatedAmount)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Time indicator at bottom */}
                    <View style={styles.timeSection}>
                      <View style={styles.timeInfo}>
                        <View style={styles.urgencyDot} />
                        <Text style={styles.timeText}>Just now</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.viewDetailsBtn}
                        onPress={() => handleBookingAction(booking.id, 'view')}
                      >
                        <Text style={styles.viewDetailsText}>View Details</Text>
                        <MaterialIcons name="arrow-forward-ios" size={12} color="#1B7332" />
                      </TouchableOpacity>
                    </View>

                    {/* Enhanced action bar - Call button removed */}
                    <View style={styles.actionBar}>
                      <View style={styles.mainActionsFullWidth}>
                        <TouchableOpacity
                          style={styles.declineBtnWider}
                          onPress={() => handleBookingAction(booking.id, 'decline')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => handleBookingAction(booking.id, 'accept')}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="check-circle" size={16} color="white" />
                          <Text style={styles.acceptText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    

                  </Animated.View>
                ))
              ) : (
                <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
                  <Animated.View style={[
                    styles.emptyAnimation,
                    { transform: [{ scale: fadeAnim }] }
                  ]}>
                    <View style={styles.emptyIconContainer}>
                      <MaterialIcons name="schedule" size={48} color="#1B7332" />
                      <View style={styles.pulsingDot} />
                    </View>
                  </Animated.View>
                  
                  <Text style={styles.emptyTitle}>Ready for new pickups!</Text>
                  <Text style={styles.emptySubtitle}>
                    We'll notify you as soon as requests come in
                  </Text>
                  
                  <View style={styles.emptyActions}>
                    <TouchableOpacity
                      style={[styles.refreshButton, isRefreshing && styles.refreshButtonLoading]}
                      onPress={handleRefresh}
                      disabled={isRefreshing}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons 
                        name={isRefreshing ? "hourglass-empty" : "refresh"} 
                        size={18} 
                        color="white" 
                      />
                      <Text style={styles.refreshButtonText}>
                        {isRefreshing ? 'Checking...' : 'Check for updates'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.quickActions}>
                    <TouchableOpacity 
                      style={styles.quickAction}
                      onPress={() => onNavigate('JobHistoryScreen')}
                    >
                      <MaterialIcons name="history" size={20} color="#1B7332" />
                      <Text style={styles.quickActionText}>History</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.quickAction}
                      onPress={() => onNavigate('ProfileScreen')}
                    >
                      <MaterialIcons name="person" size={20} color="#1B7332" />
                      <Text style={styles.quickActionText}>Profile</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.quickAction}
                      onPress={() => onNavigate('credit')}
                    >
                      <MaterialIcons name="account-balance-wallet" size={20} color="#1B7332" />
                      <Text style={styles.quickActionText}>Credits</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Credit Recharge Modal */}
      <CreditRechargeModal
        visible={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onRechargeSuccess={handleRechargeSuccess}
        onRechargeError={handleRechargeError}
        currentBalance={creditBalance}
        onNavigateToCredit={() => onNavigate('credit')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B7332', // Match header color to avoid gaps
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F7F9FC', // Content background
  },
  scrollContent: {
    paddingBottom: 160, // Increased for proper scrolling clearance with bottom navigation and safe area
  },
  header: {
    backgroundColor: '#1B7332',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginTop: -6, // Ensure no gap at top
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  greetingContainer: {
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  readyText: {
    fontSize: 14,
    color: '#E8F5E8',
    fontWeight: '500',
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B7332',
    borderWidth: 1,
    borderColor: 'white',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ff00',
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#E8F5E8',
    marginTop: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 90,
    justifyContent: 'center',
  },
  toggleButtonOnline: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  toggleButtonOffline: {
    backgroundColor: '#dc3545',
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.3)',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  toggleTextOnline: {
    color: '#1B7332',
  },
  toggleTextOffline: {
    color: 'white',
  },
  content: {
    padding: 16,
  },
  bookingsContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  enhancedBookingsContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    transform: [{ translateY: -2 }],
  },
  bookingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  bookingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookingsIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  bookingsSubtitle: {
    fontSize: 11,
    color: '#6c757d',
    fontWeight: '600',
  },
  bookingsList: {
    padding: 16,
  },
  loadingContainer: {
    gap: 16,
  },
  
  // Enhanced booking card styles
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 16, // Reduced from 20
    padding: 0,
    marginBottom: 12, // Reduced from 16
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140, // Reduced from 160
  },
  enhancedBookingCard: {
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(27, 115, 50, 0.08)',
  },

  
  // Simplified card structure
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12, // Reduced from 16
    paddingBottom: 8, // Reduced from 12
  },
  
  leftSection: {
    flex: 1,
    paddingRight: 12,
  },
  
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  
  scrapType: {
    fontSize: 15, // Reduced from 16
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
  },
  
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
    flexShrink: 0,
  },
  
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  
  customerName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
  },
  
  quickInfo: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  infoText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  
  rightSection: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 80,
  },
  
  amount: {
    fontSize: 18, // Reduced from 20
    fontWeight: 'bold',
    color: '#1B7332',
  },
  
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  
  creditValue: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  
  // Enhanced action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    gap: 10,
  },
  
  quickCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27, 115, 50, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(27, 115, 50, 0.2)',
  },
  
  mainActions: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  
  // New full-width main actions (without call button)
  mainActionsFullWidth: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  
  declineBtn: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#dc3545',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Wider decline button (increased width)
  declineBtnWider: {
    flex: 1.5,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#dc3545',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  declineText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc3545',
  },
  
  acceptBtn: {
    flex: 2,
    backgroundColor: '#1B7332',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  acceptText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  
  // Time section at bottom
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4757',
  },
  
  timeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  
  viewDetailsText: {
    fontSize: 11,
    color: '#1B7332',
    fontWeight: '600',
  },

  
  // Enhanced empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  
  emptyAnimation: {
    alignItems: 'center',
    marginBottom: 20, // Reduced from 24
  },
  
  emptyIconContainer: {
    width: 64, // Reduced from 80
    height: 64,
    backgroundColor: 'rgba(27, 115, 50, 0.1)',
    borderRadius: 32, // Reduced from 40
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2, // Reduced from 3
    borderColor: 'rgba(27, 115, 50, 0.2)',
  },
  
  pulsingDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff00',
  },
  
  emptyTitle: {
    fontSize: 18, // Reduced from 20
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6, // Reduced from 8
    textAlign: 'center',
  },
  
  emptySubtitle: {
    fontSize: 14, // Reduced from 16
    color: '#666',
    textAlign: 'center',
    marginBottom: 20, // Reduced from 24
    lineHeight: 20, // Reduced from 22
  },
  
  emptyActions: {
    marginBottom: 32,
  },
  
  refreshButton: {
    backgroundColor: '#1B7332',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1B7332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  refreshButtonLoading: {
    backgroundColor: '#666',
  },
  
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  
  quickAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(27, 115, 50, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(27, 115, 50, 0.1)',
  },
  
  quickActionText: {
    fontSize: 12,
    color: '#1B7332',
    fontWeight: '600',
  },

  // Sentry Test Button
  sentryTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },

  sentryTestButtonText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
  },
});