import { MaterialIcons } from '@expo/vector-icons';
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
import { BookingCardSkeleton } from '../../components/ui/SkeletonLoader';
import { bookingStateService } from '../../services/bookingStateService';
import { creditService } from '../../services/creditService';
import HapticService from '../../services/hapticService';
import { BookingRequest } from '../../types';

import { useLanguage } from '../../utils/i18n';

interface DashboardProps {
  onBookingSelect: (booking: BookingRequest) => void;
  onShowNotification: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigate: (screen: string) => void;
}

export default function Dashboard({ onBookingSelect, onShowToast, onNavigate }: DashboardProps) {
  const { user, toggleOnlineStatus } = useAuth();
  const { t } = useLanguage();
  const posthog = usePostHog();
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  useEffect(() => {
    if (!user) return;
    creditService.setVendorId(user.id);
  }, [user]);

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
                  onPress: () => onNavigate('credit')
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#1B7332';
      default: return '#6c757d';
    }
  };

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const banners = [
    {
      title: t('wallet_balance_low'),
      subtitle: t('add_funds_warning'),
      value: '-₹20',
      type: 'wallet',
      bgColor: '#6b0f1a'
    },
    {
      title: 'Plan validity low',
      subtitle: 'Please purchase a plan to avoid suspension of your unit.',
      value: '6 Days',
      type: 'plan',
      bgColor: '#7C162E'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View className="flex-1 bg-[#f8f9fa] pb-40">
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
        <View className="bg-[#1B7332] px-4 pt-14 pb-6 rounded-b-[32px] shadow-lg">
          <View className="flex-row justify-between items-center mb-6">
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-[22px] text-white font-bold mr-1">Pickup unit</Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleToggleOnline}
              className={`flex-row items-center px-4 py-2 rounded-full ${isOnline ? 'bg-[#4CAF50]' : 'bg-gray-500'}`}
            >
              <Text className="text-[14px] font-bold text-white mr-2">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
              <View className="w-6 h-6 rounded-full bg-white shadow-sm" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-xl bg-white/10 justify-center items-center mr-4">
              <MaterialIcons name="moped" size={32} color="white" />
            </View>
            <View>
              <Text className="text-[20px] text-white font-bold">Access</Text>
              <Text className="text-[14px] text-white/60 font-medium">MH01DM8286</Text>
            </View>
          </View>
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
                    <Text className="text-[16px] font-bold text-gray-800">{t('new_booking_requests')}</Text>
                    <Text className="text-[12px] text-gray-500">
                      {bookings.filter(booking => !processedBookings.includes(booking.id)).length} {t('requests_available')}
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
                          <Text className="text-[12px] text-gray-500">{t('just_now')}</Text>
                        </View>
                        <TouchableOpacity className="flex-row items-center" onPress={() => handleBookingAction(booking.id, 'view')}>
                          <Text className="text-[12px] text-[#1B7332] font-bold mr-1">{t('view_details')}</Text>
                          <MaterialIcons name="arrow-forward-ios" size={12} color="#1B7332" />
                        </TouchableOpacity>
                      </View>
                      <View className="flex-row gap-x-2.5">
                        <TouchableOpacity 
                          className="flex-1 py-3 px-4 rounded-xl bg-gray-50 justify-center items-center border border-gray-100"
                          onPress={() => handleBookingAction(booking.id, 'decline')}
                        >
                          <Text className="text-[15px] font-bold text-gray-500">{t('reject')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          className="flex-[2] flex-row py-3 px-4 rounded-xl bg-[#1B7332] justify-center items-center"
                          onPress={() => handleBookingAction(booking.id, 'accept')}
                        >
                          <MaterialIcons name="check-circle" size={16} color="white" />
                          <Text className="text-[15px] font-bold text-white ml-1.5">{t('accept')}</Text>
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
                    <Text className="text-[18px] font-bold text-gray-800 mb-2">{t('ready_for_pickups')}</Text>
                    <Text className="text-[14px] text-gray-500 text-center px-10 mb-6 leading-5">
                      {t('notify_requests')}
                    </Text>
                    <TouchableOpacity 
                      className="flex-row items-center bg-[#1B7332] px-5 py-3 rounded-xl"
                      onPress={handleRefresh}
                    >
                      <MaterialIcons name="refresh" size={18} color="white" />
                      <Text className="text-white font-bold ml-2">{t('check_updates')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : (
            <View className="flex-1 pt-2">
              {/* Warnings Carousel Banner */}
              <View 
                style={{ backgroundColor: banners[currentBannerIndex].bgColor }}
                className="rounded-[32px] p-5 mb-6 relative overflow-hidden shadow-lg min-h-[140px]"
              >
                <View className="flex-row items-start pr-8">
                  <View className="w-12 h-12 rounded-full bg-white/10 justify-center items-center mr-4">
                    <MaterialIcons 
                      name={banners[currentBannerIndex].type === 'wallet' ? "warning" : "error-outline"} 
                      size={32} 
                      color="#FFD700" 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[22px] font-bold text-white mb-1.5">
                      {banners[currentBannerIndex].title}
                    </Text>
                    <Text className="text-[14px] text-white/80 leading-[20px] mb-4">
                      {banners[currentBannerIndex].subtitle}
                    </Text>
                    
                    {/* Carousel Dots */}
                    <View className="flex-row gap-x-2">
                       <View className={`w-6 h-1 rounded-full ${currentBannerIndex === 0 ? 'bg-white' : 'bg-white/30'}`} />
                       <View className={`w-6 h-1 rounded-full ${currentBannerIndex === 1 ? 'bg-white' : 'bg-white/30'}`} />
                    </View>
                  </View>

                  <View className="bg-white/10 border border-[#FFC107] rounded-xl px-3 py-4 justify-center items-center min-w-[70px]">
                    <Text className="text-white text-[18px] font-bold">
                      {banners[currentBannerIndex].value}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  className="absolute top-3 right-3 w-8 h-8 items-center justify-center rounded-full bg-black/10"
                >
                  <MaterialIcons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <View>
                <Text className="text-[18px] font-bold text-gray-800 mb-4">{t('todays_overview')}</Text>
                
                <View className="gap-y-3">
                  <View className="flex-row gap-x-3">
                    <View className="flex-1 rounded-xl p-4 justify-center items-center min-h-[100px] border border-[#1B73321A] bg-[#F1F9F1]">
                      <Text className="text-[32px] font-bold text-[#1B7332] mb-1">0</Text>
                      <Text className="text-[14px] font-semibold text-[#1B7332]/70">{t('handled')}</Text>
                    </View>
                    <View className="flex-1 rounded-xl p-4 justify-center items-center min-h-[100px] border border-[#dc35451A] bg-[#FFF5F5]">
                      <Text className="text-[32px] font-bold text-[#dc3545] mb-1">0</Text>
                      <Text className="text-[14px] font-semibold text-[#dc3545]/70">{t('cancelled')}</Text>
                    </View>
                  </View>
 
                  <View className="rounded-xl p-4 flex-row justify-between items-center min-h-[70px] border border-blue-100 bg-blue-50">
                    <Text className="text-[15px] font-bold text-slate-600">{t('quantity_purchased')}</Text>
                    <Text className="text-[18px] font-bold text-gray-800">
                      0 <Text className="text-[14px] text-gray-600 font-normal">kg,</Text> 0 <Text className="text-[14px] text-gray-600 font-normal">pcs</Text>
                    </Text>
                  </View>
 
                  <View className="rounded-xl p-4 flex-row justify-between items-center min-h-[70px] border border-blue-100 bg-blue-50">
                    <Text className="text-[15px] font-bold text-slate-600">{t('purchase_amount')}</Text>
                    <Text className="text-[18px] font-bold text-gray-800">₹ 0</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({});