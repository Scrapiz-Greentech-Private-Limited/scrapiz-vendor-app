import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';
import { ApiService } from '../../services/api';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';
import { ActiveJob as ActiveJobType, BookingActiveResponse, BookingRequest, VendorCoordinates } from '../../types';
import { HOME } from './home/homeTheme';

const PERSON_1 = require('../../../assets/images/avatars/person1.png');
const PERSON_2 = require('../../../assets/images/avatars/person2.png');
const MASCOT = require('../../../assets/images/avatars/mascot.png');

const POLL_INTERVAL_MS = 10000;
const CONTACT_UNLOCK_RADIUS_METERS = 200;

type ManageTab = 'active' | 'current' | 'future' | 'cancelled';

interface ManageScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  activeBooking?: ActiveJobType | null;
}

type ActiveBookingDisplay = {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  materials: string;
  estimatedAmount: number | null;
  weight: string;
  customerLocation: {
    latitude: number;
    longitude: number;
  };
};

const tabs: { key: ManageTab; label: string }[] = [
  { key: 'active', label: 'Active Jobs' },
  { key: 'current', label: 'Current Bookings' },
  { key: 'future', label: 'Future Requests' },
  { key: 'cancelled', label: 'Cancelled Bookings' },
];

const fallbackVendorLocation = {
  latitude: 19.076,
  longitude: 72.8777,
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

const formatInr = (value: number | null) =>
  typeof value === 'number' ? `\u20B9${Math.round(value).toLocaleString('en-IN')}` : 'To estimate';

const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return 'Hidden until arrival';
  }
  return `+91 ••••• ••${digits.slice(-2)}`;
};

const getDistanceMeters = (
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number; longitude: number },
) => {
  if (!from) {
    return Number.POSITIVE_INFINITY;
  }

  const radiusMeters = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return radiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const selectedItemsSummary = (items: ActiveJobType['selectedItems']) => {
  if (!items?.length) {
    return '';
  }
  return items.map((item) => item.product_name).join(', ');
};

const selectedItemsWeight = (items: ActiveJobType['selectedItems']) => {
  if (!items?.length) {
    return '';
  }
  const total = items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  return total > 0 ? `${total} kg` : '';
};

const activeResponseToDisplay = (booking: BookingActiveResponse): ActiveBookingDisplay => {
  const estimatedFromQuote = booking.quote?.total_amount;
  const orderValue = typeof estimatedFromQuote === 'number' ? estimatedFromQuote : null;
  const weight = booking.order_items?.length
    ? `${booking.order_items.reduce((sum, item) => sum + toNumber(item.quantity), 0)} kg`
    : 'To verify';

  return {
    id: booking.booking_id,
    customerName: booking.customer?.name || 'Customer',
    customerPhone: booking.customer?.phone || '',
    address: booking.pickup_address || 'Pickup address unavailable',
    materials: booking.material_summary || booking.order_items?.map((item) => item.product_name).join(', ') || 'Materials unavailable',
    estimatedAmount: orderValue,
    weight,
    customerLocation: {
      latitude: toNumber(booking.pickup_lat, fallbackVendorLocation.latitude),
      longitude: toNumber(booking.pickup_lng, fallbackVendorLocation.longitude),
    },
  };
};

const appActiveToDisplay = (booking: ActiveJobType): ActiveBookingDisplay => ({
  id: booking.bookingId || booking.id,
  customerName: booking.customerName,
  customerPhone: booking.customerPhone,
  address: booking.address,
  materials: selectedItemsSummary(booking.selectedItems) || booking.scrapType,
  estimatedAmount: booking.estimatedAmount,
  weight: booking.estimatedWeight || selectedItemsWeight(booking.selectedItems) || 'To verify',
  customerLocation: {
    latitude: booking.customerLocation?.lat ?? fallbackVendorLocation.latitude,
    longitude: booking.customerLocation?.lng ?? fallbackVendorLocation.longitude,
  },
});

const currentBookingToDisplay = (raw: any): ActiveBookingDisplay | null => {
  const booking = raw?.booking || raw;
  if (!booking?.id) {
    return null;
  }

  const itemNames = Array.isArray(booking.items)
    ? booking.items.map((item: any) => item.product_name || item.product).filter(Boolean)
    : [];

  return {
    id: String(booking.id),
    customerName: booking.customer?.name || booking.customerName || 'Customer',
    customerPhone: booking.customer?.phone || booking.customerPhone || '',
    address: booking.pickup_address || booking.address || booking.customer?.address || 'Pickup address unavailable',
    materials: booking.material_summary || itemNames.join(', ') || booking.scrapType || 'Materials unavailable',
    estimatedAmount: typeof booking.estimated_amount === 'number' ? booking.estimated_amount : null,
    weight: booking.estimated_weight || 'To verify',
    customerLocation: {
      latitude: toNumber(booking.pickup_lat, fallbackVendorLocation.latitude),
      longitude: toNumber(booking.pickup_lng, fallbackVendorLocation.longitude),
    },
  };
};

export default function ManageScreen({ onBack, onNavigate, activeBooking }: ManageScreenProps) {
  const [selectedTab, setSelectedTab] = useState<ManageTab>('active');
  const [activeDisplay, setActiveDisplay] = useState<ActiveBookingDisplay | null>(null);
  const [currentBookings, setCurrentBookings] = useState<BookingRequest[]>([]);
  const [vendorCoords, setVendorCoords] = useState<VendorCoordinates | null>(vendorLocationStreamer.getLatestCoords());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadBookings = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsRefreshing(true);
    }

    try {
      const [currentResponse, queueResponse] = await Promise.all([
        ApiService.getCurrentBooking().catch(() => null),
        ApiService.getVendorLeadBookings().catch(() => []),
      ]);

      const currentShell = currentBookingToDisplay(currentResponse);
      let nextActive = currentShell;

      if (currentShell?.id) {
        try {
          const detailed = await ApiService.getBookingActive(currentShell.id);
          nextActive = activeResponseToDisplay(detailed);
        } catch {
          nextActive = currentShell;
        }
      }

      setActiveDisplay(nextActive || (activeBooking ? appActiveToDisplay(activeBooking) : null));
      setCurrentBookings(queueResponse);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeBooking]);

  useEffect(() => {
    void loadBookings();
    const interval = setInterval(() => {
      void loadBookings();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadBookings]);

  useEffect(() => vendorLocationStreamer.subscribe(setVendorCoords), []);

  const vendorLocation = useMemo(
    () => (vendorCoords ? { latitude: vendorCoords.latitude, longitude: vendorCoords.longitude } : null),
    [vendorCoords],
  );

  const canOpenActiveRoute = Boolean(activeBooking);
  const hasActive = Boolean(activeDisplay);
  const hasCurrentBookings = currentBookings.length > 0;

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadBookings(true)} tintColor={HOME.green} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.75}>
              <MaterialIcons name="arrow-back" size={24} color={HOME.green} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.75} onPress={() => loadBookings(true)}>
              <MaterialIcons name="refresh" size={25} color={HOME.green} />
            </TouchableOpacity>
          </View>
          <Image source={PERSON_1} style={styles.personOne} contentFit="contain" />
          <Image source={PERSON_2} style={styles.personTwo} contentFit="contain" />
          <View style={styles.dateTile}>
            <Text style={styles.dateMonth}>Sep</Text>
            <Text style={styles.dateDay}>05</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Manage Bookings</Text>
            <Text style={styles.heroSubtitle}>Review and organize your collection schedule</Text>
          </View>
        
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => {
            const active = selectedTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setSelectedTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {lastUpdated ? (
          <Text style={styles.updatedText}>Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator size="large" color={HOME.green} />
          </View>
        ) : null}

        {!isLoading && selectedTab === 'active' ? (
          hasActive && activeDisplay ? (
            <ActiveJobPanel
              booking={activeDisplay}
              vendorLocation={vendorLocation}
              onOpen={() => canOpenActiveRoute && onNavigate('active-job')}
              canOpen={canOpenActiveRoute}
            />
          ) : (
            <NoBookingsState onRefresh={() => loadBookings(true)} isRefreshing={isRefreshing} />
          )
        ) : null}

        {!isLoading && selectedTab === 'current' ? (
          hasCurrentBookings ? (
            <CurrentBookingsPanel bookings={currentBookings} />
          ) : (
            <NoBookingsState onRefresh={() => loadBookings(true)} isRefreshing={isRefreshing} />
          )
        ) : null}

        {!isLoading && selectedTab === 'future' ? (
          <NoBookingsState onRefresh={() => loadBookings(true)} isRefreshing={isRefreshing} />
        ) : null}

        {!isLoading && selectedTab === 'cancelled' ? (
          <NoBookingsState onRefresh={() => loadBookings(true)} isRefreshing={isRefreshing} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function ActiveJobPanel({
  booking,
  vendorLocation,
  onOpen,
  canOpen,
}: {
  booking: ActiveBookingDisplay;
  vendorLocation: { latitude: number; longitude: number } | null;
  onOpen: () => void;
  canOpen: boolean;
}) {
  const distanceMeters = getDistanceMeters(vendorLocation, booking.customerLocation);
  const canRevealPhone = distanceMeters <= CONTACT_UNLOCK_RADIUS_METERS;
  const phoneLabel = canRevealPhone && booking.customerPhone ? booking.customerPhone : maskPhone(booking.customerPhone);

  return (
    <View style={styles.activePanel}>
      <LiveSessionMap
        vendorLocation={vendorLocation || fallbackVendorLocation}
        customerLocation={booking.customerLocation}
        height={238}
        label="Vendor and customer pickup route"
      />

      <View style={styles.activeCard}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingCode}>{booking.id}</Text>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.customerLine}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerInitial}>{booking.customerName.charAt(0)}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.customerName}>{booking.customerName}</Text>
            <Text style={styles.customerPhone}>{phoneLabel}</Text>
            {!canRevealPhone ? (
              <Text style={styles.lockedHint}>Phone unlocks within 200 m of the customer.</Text>
            ) : null}
          </View>
          <TouchableOpacity style={[styles.roundAction, !canRevealPhone && styles.disabledAction]} activeOpacity={0.78} disabled={!canRevealPhone}>
            <MaterialIcons name={canRevealPhone ? 'call' : 'lock'} size={20} color={HOME.green} />
          </TouchableOpacity>
        </View>

        <DetailRow icon="recycling" label="Materials" value={booking.materials} />
        <DetailRow icon="location-on" label="Address" value={booking.address} />

        <View style={styles.metricGrid}>
          <MetricTile label="Estimated order value" value={formatInr(booking.estimatedAmount)} icon="payments" />
          <MetricTile label="Weight" value={booking.weight} icon="scale" />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, !canOpen && styles.primaryButtonDisabled]}
          onPress={onOpen}
          activeOpacity={0.9}
          disabled={!canOpen}
        >
          <Text style={styles.primaryButtonText}>{canOpen ? 'Open active job' : 'Live job synced'}</Text>
          <MaterialIcons name={canOpen ? 'arrow-forward' : 'cloud-done'} size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CurrentBookingsPanel({ bookings }: { bookings: BookingRequest[] }) {
  return (
    <View style={styles.bookingList}>
      {bookings.map((booking) => (
        <View key={booking.id} style={styles.queueCard}>
          <View style={styles.queueTop}>
            <Text style={styles.bookingCode}>{booking.id}</Text>
            <Text style={styles.queueDate}>{formatDate(new Date(booking.createdAt))}</Text>
          </View>
          <Text style={styles.queueCustomer}>{booking.customerName}</Text>
          <DetailRow icon="recycling" label="Materials" value={booking.scrapType} compact />
          <DetailRow icon="location-on" label="Address" value={booking.address} compact />
          <View style={styles.queueMeta}>
            <MetricTile label="Est. value" value={formatInr(booking.estimatedAmount)} icon="payments" compact />
            <MetricTile label="Weight" value={booking.estimatedWeight || 'To verify'} icon="scale" compact />
          </View>
        </View>
      ))}
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  compact,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.detailRow, compact && styles.detailRowCompact]}>
      <View style={styles.detailIcon}>
        <MaterialIcons name={icon} size={17} color={HOME.green} />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={compact ? 1 : 2}>{value}</Text>
      </View>
    </View>
  );
}

function MetricTile({
  icon,
  label,
  value,
  compact,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.metricTile, compact && styles.metricTileCompact]}>
      <MaterialIcons name={icon} size={compact ? 18 : 20} color={HOME.green} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function NoBookingsState({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  return (
    <View style={styles.emptyPanel}>
      <View style={styles.emptyArt}>
        <Image source={MASCOT} style={styles.mascot} contentFit="contain" />
      </View>
      <Text style={styles.emptyTitle}>No Bookings{'\n'}Right Now</Text>
      <Text style={styles.emptySubtitle}>There are no available bookings at this moment. Refresh to grab some!</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} activeOpacity={0.9} disabled={isRefreshing}>
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <MaterialIcons name="refresh" size={26} color="#FFFFFF" />
        )}
        <Text style={styles.refreshButtonText}>{isRefreshing ? 'Refreshing' : 'Refresh Now'}</Text>
      </TouchableOpacity>
      <View style={styles.tipCard}>
        <MaterialIcons name="tips-and-updates" size={34} color={HOME.greenMid} />
        <View style={styles.flex1}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipText}>Keep the app online to get notified as soon as a new booking arrives.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F8F5' },
  scroll: { flex: 1 },
  content: { paddingBottom: 132 },
  hero: {
    height: 306,
    overflow: 'hidden',
    backgroundColor: '#ECF7F1',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  heroTop: {
    marginTop: 42,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  personOne: { position: 'absolute', left: 8, bottom: 0, width: 164, height: 198, zIndex: 2 },
  personTwo: { position: 'absolute', left: 98, bottom: 12, width: 86, height: 82, zIndex: 1, opacity: 0.98 },
  dateTile: {
    position: 'absolute',
    top: 136,
    left: 160,
    width: 54,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    zIndex: 3,
  },
  dateMonth: {
    height: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: HOME.green,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  dateDay: { textAlign: 'center', fontSize: 24, fontWeight: '900', color: HOME.ink },
  heroCopy: { position: 'absolute', top: 138, left: 226, right: 18, zIndex: 3 },
  heroTitle: { fontSize: 26, lineHeight: 31, fontWeight: '900', color: HOME.green },
  heroSubtitle: { marginTop: 7, fontSize: 14, lineHeight: 18, fontWeight: '600', color: '#20352A' },
  heroTagline: {
    position: 'absolute',
    right: 22,
    bottom: 24,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#406855',
    textAlign: 'right',
  },
  tabRow: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8, gap: 10 },
  tabPill: {
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDF3E2',
  },
  tabPillActive: { backgroundColor: HOME.green },
  tabText: { fontSize: 14, fontWeight: '800', color: '#0F2E20' },
  tabTextActive: { color: '#FFFFFF' },
  updatedText: {
    marginHorizontal: 20,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '800',
    color: HOME.muted,
    textAlign: 'right',
  },
  loadingPanel: { minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  activePanel: { paddingHorizontal: 18, gap: 14 },
  activeCard: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE7E1',
    overflow: 'hidden',
    shadowColor: '#102018',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  bookingHeader: {
    height: 50,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E7ECE8',
    backgroundColor: '#F7FBF8',
  },
  bookingCode: { fontSize: 16, fontWeight: '900', color: HOME.ink },
  activeBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#DCFCE7' },
  activeBadgeText: { fontSize: 11, fontWeight: '900', color: '#166534' },
  customerLine: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME.greenWash,
  },
  customerInitial: { fontSize: 20, fontWeight: '900', color: HOME.green },
  customerName: { fontSize: 18, fontWeight: '900', color: HOME.ink },
  customerPhone: { marginTop: 2, fontSize: 13, fontWeight: '800', color: HOME.muted },
  lockedHint: { marginTop: 3, fontSize: 11, lineHeight: 14, fontWeight: '700', color: '#9A6B18' },
  roundAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME.greenWash,
  },
  disabledAction: { opacity: 0.55 },
  detailRow: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  detailRowCompact: { paddingHorizontal: 0, paddingVertical: 8, borderBottomWidth: 0 },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HOME.greenWash,
  },
  detailLabel: { fontSize: 11, fontWeight: '900', color: HOME.greenMid, textTransform: 'uppercase' },
  detailValue: { marginTop: 3, fontSize: 15, lineHeight: 20, fontWeight: '800', color: HOME.ink },
  metricGrid: { padding: 14, flexDirection: 'row', gap: 10 },
  metricTile: {
    flex: 1,
    minHeight: 86,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#F5FAF7',
    borderWidth: 1,
    borderColor: '#E0EAE4',
  },
  metricTileCompact: { minHeight: 78 },
  metricLabel: { marginTop: 7, fontSize: 11, lineHeight: 14, fontWeight: '800', color: HOME.muted },
  metricValue: { marginTop: 4, fontSize: 17, fontWeight: '900', color: HOME.ink },
  primaryButton: {
    marginHorizontal: 14,
    marginBottom: 14,
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: HOME.green,
  },
  primaryButtonDisabled: { backgroundColor: '#6F8D7D' },
  primaryButtonText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  bookingList: { paddingHorizontal: 18, gap: 14 },
  queueCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE7E1',
    shadowColor: '#102018',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  queueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  queueDate: { fontSize: 13, fontWeight: '900', color: HOME.greenMid },
  queueCustomer: { marginTop: 10, fontSize: 19, fontWeight: '900', color: HOME.ink },
  queueMeta: { marginTop: 4, flexDirection: 'row', gap: 10 },
  emptyPanel: {
    marginHorizontal: 18,
    marginTop: 8,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    backgroundColor: '#FBFFFC',
    borderWidth: 1,
    borderColor: '#DDEFE4',
  },
  emptyArt: {
    width: '100%',
    height: 286,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mascot: { width: 260, height: 276 },
  emptyTitle: {
    marginTop: 12,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
    textAlign: 'center',
    color: HOME.ink,
  },
  emptySubtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    fontWeight: '600',
    color: HOME.muted,
  },
  refreshButton: {
    marginTop: 24,
    width: '100%',
    height: 58,
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1F9A4C',
  },
  refreshButtonText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  tipCard: {
    marginTop: 24,
    width: '100%',
    minHeight: 96,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F1FAF5',
  },
  tipTitle: { fontSize: 17, fontWeight: '900', color: HOME.greenMid },
  tipText: { marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: '600', color: HOME.muted },
  flex1: { flex: 1 },
});
