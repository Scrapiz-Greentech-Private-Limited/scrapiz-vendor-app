import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LEARNING_REELS } from '../../../data/learningReels';
import { HOME } from './homeTheme';

const BANNER_ASSETS = [
  require('../../../../assets/images/banner/vendor_app_banner_1.webp'),
  require('../../../../assets/images/banner/vendor_app_banner_2.webp'),
];
const LEAF = require('../../../../assets/images/leaf_iamge.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_GUTTER = 20;
const BANNER_WIDTH = SCREEN_WIDTH - PAGE_GUTTER * 2;
const BANNER_HEIGHT = Math.round(BANNER_WIDTH * 0.52);
const CAROUSEL_INTERVAL_MS = 7500;

export type HomePeriod = 'this_month' | 'this_week' | 'all_time';

export type PartnerHomeMetrics = {
  leadsHandled: number;
  revenueGenerated: number;
  partnerRating: number;
};

type PartnerHomeContentProps = {
  vendorName: string;
  vendorImage?: string | null;
  locationLabel: string;
  isOnline: boolean;
  isToggling?: boolean;
  metrics: PartnerHomeMetrics;
  period: HomePeriod;
  onPeriodChange: (period: HomePeriod) => void;
  onToggleOnline: () => void;
  onOpenLearning: () => void;
  onOpenReel: () => void;
  onOpenLeads?: () => void;
  onOpenRevenue?: () => void;
  onOpenRating?: () => void;
  onOpenMenu?: () => void;
  liveBookings?: ReactNode;
};

const PERIODS: { key: HomePeriod; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'this_week', label: 'This week' },
  { key: 'all_time', label: 'All time' },
];

const LEADERBOARD = [
  {
    place: '1st',
    medal: 'Gold',
    name: 'Rohan S.',
    color: HOME.gold,
    ink: HOME.goldInk,
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    icon: 'emoji-events' as const,
  },
  {
    place: '2nd',
    medal: 'Silver',
    name: 'Priya M.',
    color: HOME.silver,
    ink: HOME.silverInk,
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    icon: 'emoji-events' as const,
  },
  {
    place: '3rd',
    medal: 'Bronze',
    name: 'Amit K.',
    color: HOME.bronze,
    ink: HOME.bronzeInk,
    avatar: 'https://randomuser.me/api/portraits/men/76.jpg',
    icon: 'emoji-events' as const,
  },
];

const greetingForNow = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const firstName = (name: string) => name.trim().split(' ')[0] || 'Partner';

const formatInr = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN')}`;

export default function PartnerHomeContent({
  vendorName,
  vendorImage,
  locationLabel,
  isOnline,
  isToggling,
  metrics,
  period,
  onPeriodChange,
  onToggleOnline,
  onOpenLearning,
  onOpenReel,
  onOpenLeads,
  onOpenRevenue,
  onOpenRating,
  onOpenMenu,
  liveBookings,
}: PartnerHomeContentProps) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [statusOpen, setStatusOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const bannerRef = useRef<FlatList<(typeof BANNER_ASSETS)[number]>>(null);
  const featured = LEARNING_REELS[0];
  const greeting = useMemo(() => greetingForNow(), []);
  const periodLabel = PERIODS.find((item) => item.key === period)?.label ?? 'This month';

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((current) => {
        const next = (current + 1) % BANNER_ASSETS.length;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const onBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
    if (next !== bannerIndex && next >= 0 && next < BANNER_ASSETS.length) {
      setBannerIndex(next);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Welcome to Scrapiz Partner</Text>
          <Text style={styles.greeting}>
            {greeting}, {firstName(vendorName)}!
          </Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color={HOME.greenMid} />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.avatarRing} onPress={onOpenMenu} activeOpacity={0.85}>
            {vendorImage ? (
              <Image source={{ uri: vendorImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <MaterialIcons name="person" size={26} color={HOME.green} />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statusPill}
            onPress={() => setStatusOpen(true)}
            activeOpacity={0.86}
            disabled={isToggling}
          >
            <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
            <Text style={styles.statusLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color={HOME.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bannerWrap}>
        <FlatList
          ref={bannerRef}
          data={BANNER_ASSETS}
          keyExtractor={(_, index) => `banner-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onBannerScroll}
          getItemLayout={(_, index) => ({
            length: BANNER_WIDTH,
            offset: BANNER_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <View style={styles.bannerSlide}>
              <Image source={item} style={styles.bannerImage} contentFit="cover" />
            </View>
          )}
        />
        <View style={styles.dots}>
          {BANNER_ASSETS.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[styles.dot, index === bannerIndex && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Booking Overview</Text>
        <TouchableOpacity style={styles.periodChip} onPress={() => setPeriodOpen(true)}>
          <Text style={styles.periodText}>{periodLabel}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={HOME.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.bentoRow}>
        <OverviewCard
          bg={HOME.greenSoft}
          icon="inventory-2"
          iconColor={HOME.green}
          value={String(metrics.leadsHandled)}
          label="Leads Handled"
          onPress={onOpenLeads}
        />
        <OverviewCard
          bg={HOME.orangeSoft}
          icon="account-balance-wallet"
          iconColor={HOME.orange}
          value={formatInr(metrics.revenueGenerated)}
          label="Revenue Generated"
          onPress={onOpenRevenue}
        />
        <OverviewCard
          bg={HOME.blueSoft}
          icon="star"
          iconColor={HOME.blue}
          value={metrics.partnerRating.toFixed(1)}
          label="Partner Rating"
          onPress={onOpenRating}
        />
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Top Partner Leaderboard</Text>
        <TouchableOpacity onPress={onOpenLearning} hitSlop={8}>
          <Text style={styles.viewAll}>View all →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.leaderRow}>
        {LEADERBOARD.map((item) => (
          <View key={item.place} style={[styles.leaderCard, { backgroundColor: item.color }]}>
            <Image source={{ uri: item.avatar }} style={styles.leaderAvatar} />
            <MaterialIcons name={item.icon} size={18} color={item.ink} />
            <Text style={[styles.leaderMedal, { color: item.ink }]}>{item.medal}</Text>
            <Text style={styles.leaderName}>{item.name}</Text>
            <Text style={[styles.leaderPlace, { color: item.ink }]}>{item.place}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Partner Learning Corner</Text>
        <TouchableOpacity onPress={onOpenLearning} hitSlop={8}>
          <Text style={styles.viewAll}>View all →</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.learnCard} onPress={onOpenReel} activeOpacity={0.92}>
        <View style={styles.thumbWrap}>
          <Image source={featured.thumbnail} style={styles.thumb} contentFit="cover" />
          <View style={styles.playBadge}>
            <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.learnCopy}>
          <Text style={styles.featured}>{featured.featuredLabel}</Text>
          <Text style={styles.learnTitle}>{featured.title}</Text>
          <Text style={styles.learnSub}>{featured.subtitle}</Text>
        </View>
        <View style={styles.learnCta}>
          <View style={styles.learnArrow}>
            <MaterialIcons name="chevron-right" size={22} color={HOME.green} />
          </View>
          <Text style={styles.duration}>{featured.duration}</Text>
        </View>
      </TouchableOpacity>

      {isOnline ? (
        liveBookings
      ) : (
        <View style={styles.goOnlineCard}>
          <Image source={LEAF} style={styles.leaf} contentFit="contain" />
          <View style={styles.goOnlineCopy}>
            <Text style={styles.goOnlineTitle}>Go online to start{'\n'}receiving pickups</Text>
            <Text style={styles.goOnlineSub}>Be a part of a cleaner, greener city.</Text>
          </View>
          <TouchableOpacity
            style={styles.goOnlineBtn}
            onPress={onToggleOnline}
            disabled={isToggling}
            activeOpacity={0.9}
          >
            <Text style={styles.goOnlineBtnText}>Go Online →</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setStatusOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Availability</Text>
            {(['Online', 'Offline'] as const).map((option) => {
              const onlineChoice = option === 'Online';
              const selected = onlineChoice === isOnline;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.sheetRow, selected && styles.sheetRowActive]}
                  onPress={() => {
                    setStatusOpen(false);
                    if (onlineChoice !== isOnline) {
                      onToggleOnline();
                    }
                  }}
                >
                  <View style={[styles.statusDot, onlineChoice && styles.statusDotOnline]} />
                  <Text style={styles.sheetRowText}>{option}</Text>
                  {selected ? <MaterialIcons name="check" size={18} color={HOME.green} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={periodOpen} transparent animationType="fade" onRequestClose={() => setPeriodOpen(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setPeriodOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Booking period</Text>
            {PERIODS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.sheetRow, item.key === period && styles.sheetRowActive]}
                onPress={() => {
                  onPeriodChange(item.key);
                  setPeriodOpen(false);
                }}
              >
                <Text style={styles.sheetRowText}>{item.label}</Text>
                {item.key === period ? <MaterialIcons name="check" size={18} color={HOME.green} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function OverviewCard({
  bg,
  icon,
  iconColor,
  value,
  label,
  onPress,
}: {
  bg: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.bentoCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.88}>
      <MaterialIcons name={icon} size={22} color={iconColor} />
      <Text style={styles.bentoValue} numberOfLines={1}>
        {value}
      </Text>
      <View style={styles.bentoLabelRow}>
        <Text style={styles.bentoLabel}>{label}</Text>
        <MaterialIcons name="chevron-right" size={16} color={HOME.muted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  kicker: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: HOME.ink,
    letterSpacing: -0.4,
  },
  greeting: {
    marginTop: 4,
    fontSize: 14,
    color: HOME.muted,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  locationText: {
    fontSize: 12,
    color: HOME.muted,
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: HOME.greenSoft,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1EF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#111827',
  },
  statusDotOnline: {
    backgroundColor: '#16A34A',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: HOME.ink,
  },
  bannerWrap: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 22,
    backgroundColor: HOME.card,
    shadowColor: HOME.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  bannerSlide: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    width: 18,
    borderRadius: 4,
    backgroundColor: HOME.greenMid,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: HOME.ink,
  },
  viewAll: {
    fontSize: 13,
    color: HOME.muted,
    fontWeight: '600',
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  periodText: {
    fontSize: 13,
    color: HOME.muted,
    fontWeight: '600',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 14,
    minHeight: 118,
    justifyContent: 'space-between',
  },
  bentoValue: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: HOME.ink,
  },
  bentoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  bentoLabel: {
    flex: 1,
    fontSize: 10,
    lineHeight: 13,
    color: HOME.muted,
    fontWeight: '600',
  },
  leaderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  leaderCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  leaderMedal: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
  },
  leaderName: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '800',
    color: HOME.ink,
  },
  leaderPlace: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  learnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HOME.card,
    borderRadius: 20,
    padding: 12,
    marginBottom: 18,
    shadowColor: HOME.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  thumbWrap: {
    width: 86,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#D7DDD8',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: 18,
    left: 29,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnCopy: {
    flex: 1,
    paddingHorizontal: 12,
  },
  featured: {
    fontSize: 10,
    fontWeight: '800',
    color: HOME.greenMid,
    letterSpacing: 0.8,
  },
  learnTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    color: HOME.ink,
  },
  learnSub: {
    marginTop: 2,
    fontSize: 12,
    color: HOME.muted,
  },
  learnCta: {
    alignItems: 'center',
  },
  learnArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: HOME.greenWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    marginTop: 4,
    fontSize: 11,
    color: HOME.muted,
    fontWeight: '600',
  },
  goOnlineCard: {
    minHeight: 92,
    borderRadius: 22,
    backgroundColor: HOME.greenWash,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    marginTop: 4,
  },
  leaf: {
    width: 78,
    height: 92,
    marginLeft: -4,
  },
  goOnlineCopy: {
    flex: 1,
    paddingHorizontal: 6,
  },
  goOnlineTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: HOME.green,
  },
  goOnlineSub: {
    marginTop: 4,
    fontSize: 11,
    color: HOME.muted,
  },
  goOnlineBtn: {
    backgroundColor: HOME.green,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  goOnlineBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.28)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: HOME.ink,
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sheetRowActive: {
    backgroundColor: HOME.greenWash,
  },
  sheetRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: HOME.ink,
  },
});
