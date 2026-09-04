import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { usePostHog } from 'posthog-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  RefreshControl,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { BookingCardSkeleton } from '../../components/ui/SkeletonLoader';
import { ApiHttpError, ApiService } from '../../services/api';
import { HapticService } from '../../services/hapticService';
import { vendorLeadSocketService } from '../../services/vendorLeadSocket';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';
import { buildFallbackBookings, isFallbackAppTestingEnabled } from '../jobs/fallbackPickupData';
import { BookingRequest } from '../../types';
import { useLanguage } from '../../utils/i18n';
import { useAppTheme } from '../../theme/appTheme';

interface DashboardProps {
  onBookingSelect: (booking: BookingRequest) => void;
  onShowNotification: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigate: (screen: string) => void;
  hasActiveBooking?: boolean;
  onOpenActiveBooking?: () => void;
  onCompleteOnboarding?: () => void;
}

const LEAD_POLL_INTERVAL_MS = 10000;

export default function Dashboard({ onBookingSelect, onNavigate, onShowToast, hasActiveBooking = false, onOpenActiveBooking, onCompleteOnboarding }: DashboardProps) {
  const { user, setOnlineStatus } = useAuth();
  const { t } = useLanguage();
  const { palette, theme, setTheme } = useAppTheme();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [processedBookings, setProcessedBookings] = useState<string[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [drawerAnim] = useState(new Animated.Value(-340));
  const fallbackTestingEnabled = useMemo(() => isFallbackAppTestingEnabled(), []);

  const needsOnboarding = user?.hasVendorProfile && user.vendorStatus === 'draft';
  const formatAmount = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;
  const dashboardSubline = useMemo(() => {
    if (user?.vendorStatus === 'pending_verification') {
      return 'Verification pending';
    }
    if (user?.vendorStatus === 'approved') {
      return user?.vehicleNumber || 'Ready for live pickups';
    }
    if (user?.hasVendorProfile) {
      return 'Onboarding in progress';
    }
    return 'Vendor setup pending';
  }, [user?.hasVendorProfile, user?.vendorStatus, user?.vehicleNumber]);

  const menuItems = useMemo(
    () => [
      { key: 'home', label: 'Home', icon: 'home', action: () => onNavigate('home') },
      {
        key: 'theme',
        label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`,
        icon: theme === 'dark' ? 'light-mode' : 'dark-mode',
        action: () => {
          const nextTheme = theme === 'dark' ? 'light' : 'dark';
          void setTheme(nextTheme);
          onShowToast(`Switched to ${nextTheme} mode.`, 'success');
        },
      },
      { key: 'subscription', label: 'Subscriptions', icon: 'star', action: () => onNavigate('subscription') },
      { key: 'credit', label: 'Add to Wallet', icon: 'account-balance-wallet', action: () => onNavigate('credit') },
      { key: 'contacts', label: 'Contacts', icon: 'contacts', action: () => onNavigate('contacts') },
      { key: 'bills', label: 'Bills', icon: 'receipt', action: () => onNavigate('bills') },
      { key: 'personal-info', label: 'Personal Information', icon: 'person', action: () => onNavigate('personal-info') },
    ],
    [onNavigate, onShowToast, setTheme, theme],
  );

  useEffect(() => {
    if (user) {
      setIsOnline(user.isOnline);
    }
  }, [user]);

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
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: isMenuOpen ? 0 : -340,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [drawerAnim, isMenuOpen]);

  const openMenu = () => setIsMenuOpen(true);

  const closeMenu = () => setIsMenuOpen(false);

  const handleMenuAction = (action: () => void) => {
    closeMenu();
    action();
  };

  const loadFallbackBookings = useCallback(async () => {
    if (!fallbackTestingEnabled) {
      setBookings([]);
      return;
    }

    const fallbackBookings = await buildFallbackBookings();
    setBookings(fallbackBookings);
  }, [fallbackTestingEnabled]);

  const loadBookings = useCallback(async () => {
    try {
      const liveBookings = await ApiService.getVendorLeadBookings();
      if (__DEV__) {
        console.log(`[Leads] fetched ${liveBookings.length} booking(s)`);
      }
      if (liveBookings.length || !fallbackTestingEnabled) {
        setBookings(liveBookings);
        return;
      }

      await loadFallbackBookings();
    } catch (error) {
      if (error instanceof ApiHttpError) {
        console.warn(`Failed to load live bookings [${error.status}]: ${error.message}`);
      } else {
        console.warn('Failed to load live bookings:', error);
      }
      if (fallbackTestingEnabled) {
        await loadFallbackBookings();
        return;
      }

      setBookings([]);
    }
  }, [fallbackTestingEnabled, loadFallbackBookings]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!isOnline) {
      vendorLeadSocketService.stop();
      return;
    }

    const unsubscribe = vendorLeadSocketService.subscribe((liveBookings) => {
      if (liveBookings.length || !fallbackTestingEnabled) {
        setBookings(liveBookings);
      } else {
        void loadFallbackBookings();
      }
    });

    void vendorLeadSocketService.start();

    return () => {
      unsubscribe();
      vendorLeadSocketService.stop();
    };
  }, [fallbackTestingEnabled, isOnline, loadFallbackBookings]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    // Fallback polling keeps lead cards fresh when socket push is unavailable.
    const interval = setInterval(() => {
      void loadBookings();
    }, LEAD_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isOnline, loadBookings]);

  const handleToggleOnline = async () => {
    if (!user || isToggling) {
      return;
    }

    try {
      setIsToggling(true);
      await HapticService.medium();
      const newStatus = !isOnline;

      if (!newStatus) {
        if (hasActiveBooking) {
          onShowToast('Complete your current job before going offline', 'info');
          return;
        }

        try {
          const currentBookingResponse = await ApiService.getCurrentBooking();
          if (currentBookingResponse?.booking) {
            onShowToast('Complete your current job before going offline', 'info');
            return;
          }
        } catch (error) {
          console.warn('Unable to verify current booking before going offline', error);
        }
      }

      if (newStatus) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          onShowToast('Location permission is required to go online', 'error');
          return;
        }
      }

      const updatedUser = await setOnlineStatus(newStatus);
      setIsOnline(updatedUser?.isOnline ?? newStatus);

      if (newStatus) {
        await vendorLocationStreamer.setOnlineStatus(true);
        await loadBookings();
        void vendorLeadSocketService.start();
      } else {
        vendorLocationStreamer.setOnlineStatus(false);
        vendorLeadSocketService.stop();
        setBookings([]);
      }

      posthog.capture('vendor_online_status_toggled', {
        new_status: newStatus ? 'online' : 'offline',
        vendor_id: user?.id ?? null,
      });
      onShowToast(newStatus ? 'You are Online' : 'You are Offline', 'success');
    } catch (error) {
      console.error('Error toggling online status:', error);
      await HapticService.error();
      onShowToast('Failed to update status. Please try again.', 'error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      await loadBookings();
      onShowToast('Bookings refreshed!', 'success');
    } catch {
      onShowToast('Failed to refresh bookings', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadBookings, onShowToast]);

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => !processedBookings.includes(booking.id)),
    [bookings, processedBookings],
  );

  const dashboardMetrics = useMemo(() => {
    const totalOrders = Math.max(visibleBookings.length + processedBookings.length + (isOnline ? 9 : 5), 12);
    const monthlyRevenue = bookings.reduce((sum, booking) => sum + (booking.estimatedAmount || 0), 0);
    const totalIncome = monthlyRevenue > 0 ? monthlyRevenue + totalOrders * 380 : totalOrders * 1240;

    return {
      totalOrders,
      totalIncome,
      averageOrderValue: Math.round(totalIncome / Math.max(totalOrders, 1)),
    };
  }, [bookings, isOnline, processedBookings.length, visibleBookings.length]);

  const monthlyTrend = useMemo(() => {
    const seed = Math.max(visibleBookings.length, 2);
    return [
      { label: 'Jan', value: seed + 2 },
      { label: 'Feb', value: seed + 4 },
      { label: 'Mar', value: seed + 3 },
      { label: 'Apr', value: seed + 6 },
      { label: 'May', value: seed + 5 },
      { label: 'Jun', value: seed + (isOnline ? 7 : 4) },
    ];
  }, [isOnline, visibleBookings.length]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#1B7332';
      default:
        return '#6c757d';
    }
  };

  return (
    <>
      <Modal visible={isMenuOpen} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={[styles.drawerOverlay, { backgroundColor: palette.overlay }]}>
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                transform: [{ translateX: drawerAnim }],
              },
            ]}
          >
            <View style={[styles.drawerHeader, { borderBottomColor: palette.border }]}>
              <View style={[styles.drawerAvatarWrap, { backgroundColor: palette.primarySoft }]}>
                {user?.image || user?.profileImage ? (
                  <Image source={{ uri: (user?.image || user?.profileImage) as string }} style={styles.drawerAvatarImage} />
                ) : (
                  <MaterialIcons name="person" size={28} color={palette.primary} />
                )}
              </View>
              <View style={styles.drawerHeaderText}>
                <Text style={[styles.drawerVendorName, { color: palette.textMain }]}>{user?.name || 'Vendor'}</Text>
                <Text style={[styles.drawerVendorMeta, { color: palette.textMuted }]}>{user?.serviceCity || 'Scrapiz partner'}</Text>
              </View>
            </View>

            <View style={styles.drawerSection}>
              <Text style={[styles.drawerSectionTitle, { color: palette.textMuted }]}>Quick Access</Text>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.drawerItem, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}
                  onPress={() => handleMenuAction(item.action)}
                  activeOpacity={0.86}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: palette.primarySoft }]}>
                    <MaterialIcons name={item.icon as any} size={20} color={palette.primary} />
                  </View>
                  <Text style={[styles.drawerItemLabel, { color: palette.textMain }]}>{item.label}</Text>
                  <MaterialIcons name="chevron-right" size={22} color={palette.textMuted} />
                </TouchableOpacity>
              ))}
          </View>
        </Animated.View>
        <Pressable style={styles.drawerBackdrop} onPress={closeMenu} />
        </View>
      </Modal>

      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={palette.background} barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
            progressBackgroundColor={palette.background}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View
          className="px-4 pb-7 rounded-b-[36px] overflow-hidden"
          style={{ backgroundColor: palette.primary, paddingTop: Math.max(insets.top, 12) }}
        >
          <View
            style={{
              position: 'absolute',
              top: 36,
              right: -30,
              width: 170,
              height: 170,
              borderRadius: 85,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 112,
              left: -42,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          />

          <View className="flex-row items-center justify-between mb-5">
            <View>
              <Text className="text-white/75 text-[13px] font-medium">Vendor dashboard</Text>
              <Text className="text-white text-[30px] font-black mt-1">Homepage</Text>
            </View>

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={openMenu}
                className="w-11 h-11 rounded-2xl bg-white/12 items-center justify-center mr-3"
                activeOpacity={0.85}
              >
                <MaterialIcons name="menu" size={24} color="white" />
              </TouchableOpacity>
              <View className="w-12 h-12 rounded-full bg-white overflow-hidden items-center justify-center border border-white/25">
                {user?.image || user?.profileImage ? (
                  <Image source={{ uri: (user?.image || user?.profileImage) as string }} className="w-full h-full" />
                ) : (
                  <MaterialIcons name="person" size={28} color="#1B7332" />
                )}
              </View>
            </View>
          </View>

          <View className="flex-row items-center justify-between rounded-[28px] bg-white/12 px-4 py-4 mb-4">
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-14 h-14 rounded-[20px] bg-white/12 justify-center items-center mr-3">
                <MaterialIcons name="local-shipping" size={28} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-[20px] text-white font-black" numberOfLines={1}>
                  {user?.name || 'Vendor'}
                </Text>
                <Text className="text-[13px] text-white/80 mt-1" numberOfLines={1}>
                  {user?.serviceCity || 'Mumbai'} • {dashboardSubline}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleToggleOnline}
              disabled={isToggling}
              className={`px-4 py-2 rounded-full ${isOnline ? 'bg-[#4CAF50]' : 'bg-[#6B7280]'} ${isToggling ? 'opacity-70' : ''}`}
            >
              <Text className="text-[13px] font-bold text-white">{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-x-3">
            <View className="flex-1 rounded-[22px] bg-white px-4 py-4">
              <Text className="text-[12px] font-semibold text-[#64748B]">Total orders received</Text>
              <Text className="text-[24px] font-black text-[#0F172A] mt-2">{dashboardMetrics.totalOrders}</Text>
              <Text className="text-[12px] font-semibold text-[#1B7332] mt-1">This month</Text>
            </View>
            <View className="flex-1 rounded-[22px] bg-white px-4 py-4">
              <Text className="text-[12px] font-semibold text-[#64748B]">Total income</Text>
              <Text className="text-[24px] font-black text-[#0F172A] mt-2">{formatAmount(dashboardMetrics.totalIncome)}</Text>
              <Text className="text-[12px] font-semibold text-[#1B7332] mt-1">Avg {formatAmount(dashboardMetrics.averageOrderValue)}</Text>
            </View>
          </View>
        </View>

        <View className="flex-1 px-4 pt-4 pb-40">
          {needsOnboarding && !isOnline && (
            <View className="mb-4 rounded-[24px] p-5 bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] border-2 border-[#F59E0B]">
              <View className="flex-row items-start mb-3">
                <View className="w-12 h-12 rounded-full bg-[#F59E0B] justify-center items-center mr-3">
                  <MaterialIcons name="assignment" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-[18px] font-bold text-[#78350F] mb-1">Complete Your Verification</Text>
                  <Text className="text-[14px] text-[#92400E] leading-[20px]">
                    Upload your documents to unlock full access and start receiving pickup requests.
                  </Text>
                </View>
              </View>
              
              <View className="bg-white/60 rounded-2xl p-3 mb-3">
                <View className="flex-row items-center mb-2">
                  <MaterialIcons name="check-circle-outline" size={16} color="#15803D" />
                  <Text className="text-[13px] text-[#78350F] ml-2 font-semibold">Personal details ✓</Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <MaterialIcons name="check-circle-outline" size={16} color="#15803D" />
                  <Text className="text-[13px] text-[#78350F] ml-2 font-semibold">Vehicle information ✓</Text>
                </View>
                <View className="flex-row items-center">
                  <MaterialIcons name="radio-button-unchecked" size={16} color="#92400E" />
                  <Text className="text-[13px] text-[#92400E] ml-2 font-semibold">KYC documents (pending)</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onCompleteOnboarding}
                className="flex-row items-center justify-center bg-[#F59E0B] rounded-xl py-3 px-4"
              >
                <MaterialIcons name="upload-file" size={18} color="white" />
                <Text className="text-white font-bold text-[15px] ml-2">Upload Documents Now</Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="mb-6 rounded-[30px] bg-white border border-[#E5E7EB] p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-[13px] font-semibold text-[#64748B]">Orders overview</Text>
                <Text className="text-[24px] font-black text-[#0F172A] mt-1">{formatAmount(dashboardMetrics.totalIncome)}</Text>
              </View>
              <View className="rounded-full bg-[#F3F9F4] px-3 py-1.5">
                <Text className="text-[12px] font-bold text-[#1B7332]">Month wise</Text>
              </View>
            </View>

            <View className="flex-row items-end justify-between h-[150px] mb-3">
              {monthlyTrend.map((point, index) => {
                const height = 42 + point.value * 9;
                const isHighlight = index === monthlyTrend.length - 2;
                return (
                  <View key={point.label} className="items-center flex-1">
                    <View
                      style={{ height, backgroundColor: isHighlight ? palette.primary : '#DCE5DD', width: 24 }}
                      className="rounded-t-full rounded-b-[10px]"
                    />
                    <Text className="text-[11px] text-[#64748B] mt-3">{point.label}</Text>
                  </View>
                );
              })}
            </View>

            <View className="flex-row justify-between">
              <View>
                <Text className="text-[12px] text-[#64748B]">Orders received</Text>
                <Text className="text-[18px] font-black text-[#0F172A] mt-1">{dashboardMetrics.totalOrders}</Text>
              </View>
              <View>
                <Text className="text-[12px] text-[#64748B] text-right">Live booking mode</Text>
                <Text className="text-[18px] font-black text-right mt-1" style={{ color: isOnline ? palette.primary : '#111827' }}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>

          {isOnline ? (
            <Animated.View style={{ opacity: fadeAnim }} className="flex-1 mb-6">
              {hasActiveBooking && (
                <View className="mb-4 rounded-3xl border border-[#CFE7D6] bg-[#F3FBF5] p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[16px] font-extrabold text-[#14532D]">Current ongoing pickup</Text>
                      <Text className="mt-1 text-[13px] text-[#166534]">
                        Resume your active order to continue arrival verification, weighing, and quote submission.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={onOpenActiveBooking}
                      className="rounded-xl bg-[#1B7332] px-4 py-2"
                    >
                      <Text className="text-[12px] font-bold text-white">Resume</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View className="flex-row justify-between items-center mb-4 px-1">
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-xl bg-[#E8F5E8] justify-center items-center mr-3">
                    <MaterialIcons name="flash-on" size={20} color="#1B7332" />
                  </View>
                  <View>
                    <Text className="text-[16px] font-bold text-gray-800">{t('new_booking_requests')}</Text>
                    <Text className="text-[12px] text-gray-500">
                      {visibleBookings.length} {t('requests_available')}
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
                ) : visibleBookings.length > 0 ? (
                  visibleBookings.map((booking) => (
                    <Animated.View
                      key={booking.id}
                      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
                      className="bg-white rounded-[26px] p-4 border border-[#E8EEF1] shadow-sm"
                    >
                      <View className="flex-row items-start justify-between gap-x-3 mb-4">
                        <View className="flex-1 pr-1">
                          <View className="flex-row items-start justify-between gap-x-3">
                            <View className="flex-1 pr-2">
                              <Text className="text-[13px] leading-[18px] text-[#1B7332] font-extrabold">
                                {booking.scrapType}
                              </Text>
                            </View>
                            <View className="items-end shrink-0">
                              <View className="bg-[#F3F9F4] border border-[#D7E9DB] rounded-full px-3 py-1.5">
                                <Text className="text-[20px] leading-[24px] font-black text-[#111827]">
                                  {formatAmount(booking.estimatedAmount)}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View className="mt-2 flex-row items-center justify-between gap-x-3">
                            <Text className="flex-1 text-[17px] leading-[22px] font-black text-[#1F2937]">
                              {booking.address}
                            </Text>
                            <View
                              style={{ backgroundColor: getPriorityColor(booking.priority || 'medium') }}
                              className="flex-row items-center px-2 py-1 rounded-full shrink-0"
                            >
                              <MaterialIcons name="priority-high" size={10} color="white" />
                              <Text className="text-[10px] font-black text-white ml-0.5">
                                {booking.priority?.toUpperCase() || 'MED'}
                              </Text>
                            </View>
                          </View>

                          <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
                            <View className="flex-row items-center">
                              <MaterialIcons name="location-on" size={14} color="#1B7332" />
                              <Text className="text-[13px] text-gray-500 ml-1">{booking.distance}</Text>
                            </View>
                            <View className="flex-row items-center">
                              <MaterialIcons name="schedule" size={14} color="#1B7332" />
                              <Text className="text-[13px] text-gray-500 ml-1">{booking.estimatedTime || '15 mins'}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View className="flex-row justify-between items-center py-3 border-t border-b border-[#EEF3F5] mb-4">
                        <View className="flex-row items-center">
                          <View className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] mr-1.5" />
                          <Text className="text-[12px] text-gray-500 font-medium">{t('just_now')}</Text>
                        </View>
                        <TouchableOpacity className="flex-row items-center rounded-full bg-[#F3F9F4] px-3 py-1.5" onPress={() => onBookingSelect(booking)}>
                          <Text className="text-[12px] text-[#1B7332] font-bold mr-1">{t('view_details')}</Text>
                          <MaterialIcons name="arrow-forward-ios" size={12} color="#1B7332" />
                        </TouchableOpacity>
                      </View>

                      <View className="flex-row gap-x-3">
                        <TouchableOpacity
                          className="flex-1 h-[54px] px-4 rounded-2xl bg-[#F7F7F8] justify-center items-center border border-[#E7EAEE]"
                          onPress={() => {
                            setProcessedBookings((prev) => [...prev, booking.id]);
                            onShowToast('Booking declined', 'info');
                          }}
                        >
                          <Text className="text-[15px] font-bold text-gray-500">{t('reject')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-[1.35] flex-row h-[54px] px-4 rounded-2xl bg-[#1B7332] justify-center items-center"
                          onPress={() => onBookingSelect(booking)}
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
                    <Text className="text-[14px] text-gray-500 text-center px-10 mb-6 leading-5">{t('notify_requests')}</Text>
                    <TouchableOpacity className="flex-row items-center bg-[#1B7332] px-5 py-3 rounded-xl" onPress={handleRefresh}>
                      <MaterialIcons name="refresh" size={18} color="white" />
                      <Text className="text-white font-bold ml-2">{t('check_updates')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : (
            <View className="flex-1 pt-2">
              <View className="rounded-[30px] bg-white border border-[#E5E7EB] p-5 mb-6">
                <Text className="text-[20px] font-black text-[#0F172A] mb-2">Go online to see live bookings</Text>
                <Text className="text-[14px] text-[#64748B] leading-[21px] mb-4">
                  Your lead feed is ready. Switch online whenever you want live pickup requests to appear here.
                </Text>
                <TouchableOpacity
                  onPress={handleToggleOnline}
                  disabled={isToggling}
                  className={`rounded-full px-5 py-3 self-start ${isOnline ? 'bg-[#4CAF50]' : 'bg-[#1B7332]'} ${isToggling ? 'opacity-70' : ''}`}
                >
                  <Text className="text-white font-bold">{isOnline ? 'You are online' : 'Go online now'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerPanel: {
    width: 340,
    maxWidth: '84%',
    backgroundColor: '#FFFFFF',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 8, height: 0 },
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  drawerAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  drawerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  drawerHeaderText: {
    flex: 1,
  },
  drawerVendorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  drawerVendorMeta: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
  },
  drawerSection: {
    paddingTop: 18,
  },
  drawerSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  drawerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  drawerHeaderSpacer: {
    width: 36,
  },
});
