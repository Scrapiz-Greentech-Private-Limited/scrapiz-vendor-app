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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { BookingCardSkeleton } from '../../components/ui/SkeletonLoader';
import { ApiHttpError, ApiService } from '../../services/api';
import { HapticService } from '../../services/hapticService';
import { vendorLeadSocketService } from '../../services/vendorLeadSocket';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';
import { HOME } from './home/homeTheme';
import PartnerHomeContent, { HomePeriod, PartnerHomeMetrics } from './home/PartnerHomeContent';
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
  const { palette } = useAppTheme();
  const posthog = usePostHog();
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [processedBookings, setProcessedBookings] = useState<string[]>([]);
  const [period, setPeriod] = useState<HomePeriod>('this_month');
  const [homeMetrics, setHomeMetrics] = useState<PartnerHomeMetrics>({
    leadsHandled: 0,
    revenueGenerated: 0,
    partnerRating: Number(user?.performanceRating || 0),
  });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [drawerAnim] = useState(new Animated.Value(-340));
  const fallbackTestingEnabled = useMemo(() => isFallbackAppTestingEnabled(), []);

  const needsOnboarding = user?.hasVendorProfile && user.vendorStatus === 'draft';
  const formatAmount = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

  const menuItems = useMemo(
    () => [
      { key: 'home', label: 'Home', icon: 'home', action: () => onNavigate('home') },
        {
          key: 'theme',
          label: 'Light mode',
          icon: 'light-mode',
          action: () => {
            onShowToast('Light mode is always on.', 'info');
          },
        },
      { key: 'subscription', label: 'Subscriptions', icon: 'star', action: () => onNavigate('subscription') },
      { key: 'credit', label: 'Add to Wallet', icon: 'account-balance-wallet', action: () => onNavigate('credit') },
      { key: 'contacts', label: 'Contacts', icon: 'contacts', action: () => onNavigate('contacts') },
      { key: 'bills', label: 'Bills', icon: 'receipt', action: () => onNavigate('bills') },
      { key: 'personal-info', label: 'Personal Information', icon: 'person', action: () => onNavigate('personal-info') },
    ],
    [onNavigate, onShowToast],
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

  const loadHomeMetrics = useCallback(async (selectedPeriod: HomePeriod) => {
    const dutyPeriod = selectedPeriod === 'this_week' ? 'this_week' : selectedPeriod === 'all_time' ? 'all_time' : 'last_month';
    try {
      const [sessionsRes, profile] = await Promise.all([
        ApiService.getDutySessions(dutyPeriod).catch(() => ({ sessions: [], total_sessions: 0 })),
        ApiService.getVendorProfile().catch(() => null),
      ]);
      const sessions = sessionsRes.sessions || [];
      const leadsHandled = sessions.reduce((sum, session) => {
        return sum + Number(session.booking_summary?.completed_bookings ?? session.orders_completed ?? 0);
      }, 0);
      const revenueGenerated = sessions.reduce((sum, session) => {
        const fromBookings = (session.bookings || []).reduce((inner, booking) => {
          const payout = Number(booking.bill?.total_payout ?? booking.quote?.total_amount ?? booking.total_payout ?? 0);
          return inner + (Number.isFinite(payout) ? payout : 0);
        }, 0);
        return sum + fromBookings;
      }, 0);
      setHomeMetrics({
        leadsHandled,
        revenueGenerated,
        partnerRating: Number(profile?.performance_rating ?? user?.performanceRating ?? 0),
      });
    } catch (error) {
      console.warn('Failed to load partner home metrics', error);
    }
  }, [user?.performanceRating]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    void loadHomeMetrics(period);
  }, [loadHomeMetrics, period]);

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
      await Promise.all([loadBookings(), loadHomeMetrics(period)]);
      onShowToast('Dashboard refreshed', 'success');
    } catch {
      onShowToast('Failed to refresh bookings', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadBookings, loadHomeMetrics, onShowToast, period]);

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => !processedBookings.includes(booking.id)),
    [bookings, processedBookings],
  );

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

      <SafeAreaView style={{ flex: 1, backgroundColor: HOME.bg }} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={HOME.bg} barStyle="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[HOME.green]}
            tintColor={HOME.green}
            progressBackgroundColor={HOME.bg}
          />
        }
        showsVerticalScrollIndicator={false}
      >
          {needsOnboarding && !isOnline && (
            <View className="mx-5 mb-4 rounded-[24px] p-5 bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] border-2 border-[#F59E0B]">
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

        <PartnerHomeContent
          vendorName={user?.name || 'Partner'}
          vendorImage={user?.image || user?.profileImage}
          locationLabel={[user?.serviceArea, user?.serviceCity].filter(Boolean).join(', ') || 'Location pending'}
          isOnline={isOnline}
          isToggling={isToggling}
          metrics={homeMetrics}
          period={period}
          onPeriodChange={setPeriod}
          onToggleOnline={handleToggleOnline}
          onOpenLearning={() => onNavigate('learning')}
          onOpenLeaderboard={() => onNavigate('leaderboard')}
          onOpenReel={() => onNavigate('learning-reel')}
          onOpenLeads={() => onNavigate('history')}
          onOpenRevenue={() => onNavigate('earnings')}
          onOpenRating={() => onNavigate('ratings-hub')}
          onOpenMenu={openMenu}
          liveBookings={isOnline ? (

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
                              <Text className="mb-1 text-[12px] leading-[16px] text-[#567165] font-black">
                                {booking.displayId || booking.orderNumber || booking.id}
                              </Text>
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
                            <View className="flex-row items-center">
                              <MaterialIcons name="scale" size={14} color="#1B7332" />
                              <Text className="text-[13px] text-gray-500 ml-1">{booking.estimatedWeight || 'Weight pending'}</Text>
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
          ) : undefined}
        />
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
