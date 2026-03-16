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
    <View className="flex-1 bg-[#f8f9fa]">
      <StatusBar backgroundColor="#1B7332" barStyle="light-content" />
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
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
        <View className="bg-[#1B7332] px-4 pt-14 pb-6 rounded-b-[24px] shadow-lg">
          <View className="flex-row justify-between items-start mb-5">
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-[14px] text-white/90 font-medium">
                  {getGreeting()}!
                </Text>
                <Text className="text-[16px] text-white font-bold ml-1">
                  {user?.name || 'Vendor'}
                </Text>
              </View>
              <Text className="text-[20px] text-white font-bold tracking-tight">
                {isOnline ? 'Ready to collect scrap today?' : 'Currently offline'}
              </Text>
            </View>
            <View className="items-end">
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

          <View className="bg-white flex-row justify-between items-center p-3.5 rounded-2xl shadow-sm border border-gray-100">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-full bg-[#E8F5E8] justify-center items-center mr-2.5 relative">
                <MaterialIcons 
                  name={isOnline ? "wifi" : "wifi-off"} 
                  size={18} 
                  color={isOnline ? "#1B7332" : "#666"} 
                />
                {isOnline && <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4CAF50] border-2 border-white" />}
              </View>
              <View className="justify-center">
                <View className="flex-row items-center">
                  <Text className="text-[15px] font-bold text-gray-800">{isOnline ? 'Online' : 'Offline'}</Text>
                  {isOnline && <View className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] ml-1.5" />}
                </View>
                <Text className="text-[11px] text-gray-500">
                  {isOnline ? 'Receiving new bookings' : 'Currently not receiving bookings'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className={`flex-row items-center px-3 py-2 rounded-xl ${isOnline ? 'bg-[#333]' : 'bg-[#1B7332]'}`}
              onPress={handleToggleOnline}
            >
              <MaterialIcons 
                name={isOnline ? "pause" : "play-arrow"} 
                size={14} 
                color="white" 
                style={{ marginRight: 4 }} 
              />
              <Text className="text-[12px] font-bold text-white">
                {isOnline ? 'Go Offline' : 'Go Online'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {isOnline && (
            <TouchableOpacity
              className="mt-4 py-2.5 px-4 bg-orange-500/10 rounded-xl flex-row items-center justify-center border border-orange-500/20"
              onPress={() => {
                Sentry.captureException(new Error('First error'));
                onShowToast('Test error sent to Sentry!', 'success');
              }}
            >
              <MaterialIcons name="bug-report" size={16} color="#FF6B35" />
              <Text className="text-[#FF6B35] font-bold text-[13px] ml-1.5">Test Sentry</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-1 px-4 pt-4">
          {isOnline ? (
            <Animated.View style={{ opacity: fadeAnim }} className="flex-1 mb-6">
              <View className="flex-row justify-between items-center mb-4 px-1">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-[#E8F5E8] justify-center items-center mr-3">
                    <MaterialIcons name="flash-on" size={20} color="#1B7332" />
                  </View>
                  <View>
                    <Text className="text-[16px] font-bold text-gray-800">New Booking Requests</Text>
                    <Text className="text-[12px] text-gray-500">
                      {bookings.filter(booking => !processedBookings.includes(booking.id)).length} requests available
                    </Text>
                  </View>
                </View>
              </View>

              <View className="gap-y-4">
                {isRefreshing ? (
                  <View className="gap-y-3">
                    {[1, 2, 3].map((i) => (
                      <BookingCardSkeleton key={i} />
                    ))}
                  </View>
                ) : bookings.filter(booking => !processedBookings.includes(booking.id)).length > 0 ? (
                  bookings.filter(booking => !processedBookings.includes(booking.id)).map((booking) => (
                    <Animated.View 
                      key={booking.id} 
                      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                    >
                      <View className="flex-row justify-between mb-3">
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <Text className="text-[14px] text-[#1B7332] font-bold mr-2">{booking.scrapType}</Text>
                            <View 
                              style={{ backgroundColor: getPriorityColor(booking.priority || 'medium') }}
                              className="flex-row items-center px-1.5 py-0.5 rounded"
                            >
                              <MaterialIcons name="priority-high" size={10} color="white" />
                              <Text className="text-[9px] font-black text-white ml-0.5">
                                {booking.priority?.toUpperCase() || 'MED'}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-[18px] font-bold text-gray-800 mb-2">{booking.customerName}</Text>
                          <View className="flex-row gap-x-3">
                            <View className="flex-row items-center">
                              <MaterialIcons name="location-on" size={12} color="#1B7332" />
                              <Text className="text-[12px] text-gray-500 ml-1">{booking.distance}</Text>
                            </View>
                            <View className="flex-row items-center">
                              <MaterialIcons name="schedule" size={12} color="#1B7332" />
                              <Text className="text-[12px] text-gray-500 ml-1">{booking.estimatedTime || '15 mins'}</Text>
                            </View>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className="text-[20px] font-extrabold text-gray-800 mb-1">₹{booking.estimatedAmount}</Text>
                          <View className="flex-row items-center bg-[#FFF8E1] px-1.5 py-1 rounded-md">
                            <MaterialIcons name="stars" size={12} color="#FF9800" />
                            <Text className="text-[12px] font-bold text-[#FF9800] ml-1">
                              {creditService.calculateRequiredCredits(booking.estimatedAmount)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="flex-row justify-between items-center py-2.5 border-t border-b border-gray-50 mb-3">
                        <View className="flex-row items-center">
                          <View className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] mr-1.5" />
                          <Text className="text-[12px] text-gray-500">Just now</Text>
                        </View>
                        <TouchableOpacity className="flex-row items-center" onPress={() => handleBookingAction(booking.id, 'view')}>
                          <Text className="text-[12px] text-[#1B7332] font-bold mr-1">View Details</Text>
                          <MaterialIcons name="arrow-forward-ios" size={12} color="#1B7332" />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row gap-x-2.5">
                        <TouchableOpacity 
                          className="flex-1 py-3 px-4 rounded-xl bg-gray-50 justify-center items-center border border-gray-100"
                          onPress={() => handleBookingAction(booking.id, 'decline')}
                        >
                          <Text className="text-[15px] font-bold text-gray-500">Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          className="flex-[2] flex-row py-3 px-4 rounded-xl bg-[#1B7332] justify-center items-center"
                          onPress={() => handleBookingAction(booking.id, 'accept')}
                        >
                          <MaterialIcons name="check-circle" size={16} color="white" />
                          <Text className="text-[15px] font-bold text-white ml-1.5">Accept</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  ))
                ) : (
                  <View className="items-center justify-center py-10 bg-white rounded-3xl border border-gray-50">
                    <View className="w-20 h-20 rounded-full bg-[#F1F9F1] justify-center items-center mb-4 relative">
                      <MaterialIcons name="schedule" size={48} color="#1B7332" />
                      <View className="absolute top-5 right-5 w-3 h-3 rounded-full bg-[#1B7332] border-2 border-white" />
                    </View>
                    <Text className="text-[18px] font-bold text-gray-800 mb-2">Ready for new pickups!</Text>
                    <Text className="text-[14px] text-gray-500 text-center px-10 mb-6 leading-5">
                      We'll notify you as soon as requests come in
                    </Text>
                    <TouchableOpacity 
                      className="flex-row items-center bg-[#1B7332] px-5 py-3 rounded-xl"
                      onPress={handleRefresh}
                    >
                      <MaterialIcons name="refresh" size={18} color="white" />
                      <Text className="text-white font-bold ml-2">Check for updates</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : (
            <View className="flex-1 pt-2">
              {/* Wallet Warning Banner */}
              <View className="bg-[#6b0f1a] rounded-3xl p-4 mb-6 relative overflow-hidden shadow-lg">
                <View className="flex-row items-start pr-6">
                  <View className="w-11 h-11 rounded-full bg-white/10 justify-center items-center mr-3.5">
                    <MaterialIcons name="warning" size={28} color="#FFD700" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[20px] font-bold text-white mb-1">Wallet balance low</Text>
                    <Text className="text-[13px] text-white/80 leading-[18px] mb-3">
                      Please add funds to your wallet to avoid suspension of your account.
                    </Text>
                    <View className="flex-row gap-x-1.5">
                      <View className="w-5 h-1 rounded-full bg-white" />
                      <View className="w-5 h-1 rounded-full bg-white/30" />
                    </View>
                  </View>
                  <View className="bg-white/10 border border-[#FFC107] rounded-lg px-2 py-3 justify-center items-center min-w-[60px]">
                    <Text className="text-white text-[16px] font-bold">-₹20</Text>
                  </View>
                </View>
                <TouchableOpacity className="absolute top-2 right-2">
                  <MaterialIcons name="cancel" size={24} color="rgba(255, 255, 255, 0.8)" />
                </TouchableOpacity>
              </View>

              {/* Today's Overview */}
              <View>
                <Text className="text-[18px] font-bold text-gray-800 mb-4">Today's Overview</Text>
                
                <View className="gap-y-3">
                  <View className="flex-row gap-x-3">
                    <View className="flex-1 rounded-xl p-4 justify-center items-center min-h-[100px] border border-[#1B73321A] bg-[#F1F9F1]">
                      <Text className="text-[32px] font-bold text-[#1B7332] mb-1">2</Text>
                      <Text className="text-[14px] font-semibold text-[#1B7332]/70">Handled</Text>
                    </View>
                    <View className="flex-1 rounded-xl p-4 justify-center items-center min-h-[100px] border border-[#dc35451A] bg-[#FFF5F5]">
                      <Text className="text-[32px] font-bold text-[#dc3545] mb-1">1</Text>
                      <Text className="text-[14px] font-semibold text-[#dc3545]/70">Cancelled</Text>
                    </View>
                  </View>

                  <View className="rounded-xl p-4 flex-row justify-between items-center min-h-[70px] border border-blue-100 bg-blue-50">
                    <Text className="text-[15px] font-bold text-slate-600">Quantity Purchased</Text>
                    <Text className="text-[18px] font-bold text-gray-800">
                      12 <Text className="text-[14px] text-gray-600 font-normal">kg,</Text> 5 <Text className="text-[14px] text-gray-600 font-normal">pcs</Text>
                    </Text>
                  </View>

                  <View className="rounded-xl p-4 flex-row justify-between items-center min-h-[70px] border border-blue-100 bg-blue-50">
                    <Text className="text-[15px] font-bold text-slate-600">Purchase Amount</Text>
                    <Text className="text-[18px] font-bold text-gray-800">₹ 850</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
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

const styles = StyleSheet.create({});