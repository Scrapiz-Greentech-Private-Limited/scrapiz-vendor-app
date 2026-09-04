import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';
import { trackVendorClick } from '../../services/telemetry';
import { DutySession, DutySessionBooking, DutySessionMaterial } from '../../types';

interface DutySessionDetailsScreenProps {
  onBack: () => void;
  session?: DutySession | null;
  vendorName?: string;
}

const formatSessionDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatExactSessionDate = (value?: string | null) => {
  if (!value) {
    return 'Not recorded';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not recorded';
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }
  return `Rs ${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
    maximumFractionDigits: 2,
  })}`;
};

const formatQuantity = (value?: number) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
    maximumFractionDigits: 2,
  });
};

const toTitle = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const getProductRows = (booking: DutySessionBooking): DutySessionMaterial[] => {
  if (booking.quote?.items?.length) {
    return booking.quote.items.map((item) => {
      const collectedMatch = booking.collected_materials?.find((material) => material.product_id === item.product_id);
      const requestedMatch = booking.requested_materials?.find((material) => material.product_id === item.product_id);
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        image_url: requestedMatch?.image_url,
        quantity: collectedMatch?.actual_weight_kg ?? item.actual_weight_kg ?? requestedMatch?.quantity,
        unit: requestedMatch?.unit ?? 'kg',
        category: requestedMatch?.category,
        actual_weight_kg: collectedMatch?.actual_weight_kg ?? item.actual_weight_kg,
        rate_per_kg: item.quoted_rate_per_kg,
        subtotal: item.subtotal,
      };
    });
  }

  if (booking.collected_materials?.length) {
    return booking.collected_materials.map((material) => {
      const requestedMatch = booking.requested_materials?.find((item) => item.product_id === material.product_id);
      return {
        ...material,
        image_url: requestedMatch?.image_url,
        unit: requestedMatch?.unit ?? material.unit ?? 'kg',
        category: requestedMatch?.category ?? material.category,
      };
    });
  }

  return booking.requested_materials || [];
};

const ProductRow = ({
  item,
  onOpenImage,
}: {
  item: DutySessionMaterial;
  onOpenImage: (url: string) => void;
}) => (
  <View style={styles.productRow}>
    <Pressable
      disabled={!item.image_url}
      onPress={() => {
        if (item.image_url) {
          onOpenImage(item.image_url);
        }
      }}
      style={[styles.productImageWrap, !item.image_url && styles.productImageWrapMuted]}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.productImage} contentFit="cover" />
      ) : (
        <MaterialIcons name="inventory-2" size={22} color="#8DA09A" />
      )}
      {item.image_url ? (
        <View style={styles.zoomBadge}>
          <Ionicons name="expand-outline" size={12} color="#F8FAFC" />
        </View>
      ) : null}
    </Pressable>

    <View style={styles.productContent}>
      <View style={styles.productTitleRow}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_name}
        </Text>
        <Text style={styles.productPrice}>{formatMoney(item.rate_per_kg)}</Text>
      </View>
      <Text style={styles.productMeta}>
        Qty {formatQuantity(item.actual_weight_kg ?? item.quantity)} {item.unit || 'kg'}
      </Text>
      <Text style={styles.productMetaSecondary}>
        {item.category || 'Scrap material'} • Final {formatMoney(item.subtotal)}
      </Text>
    </View>
  </View>
);

const BookingDetailSheet = ({
  booking,
  visible,
  onClose,
  onOpenPhoto,
}: {
  booking: DutySessionBooking | null;
  visible: boolean;
  onClose: () => void;
  onOpenPhoto: (url: string) => void;
}) => {
  if (!booking) {
    return null;
  }

  const productRows = getProductRows(booking);
  const payout = booking.bill?.total_payout ?? booking.total_payout;
  const paymentMethod = booking.quote?.payment_method ? toTitle(booking.quote.payment_method) : 'Not recorded';
  const customerPhoto = booking.customer_photo_urls?.[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>{booking.customer?.name || 'Customer order'}</Text>
              <Text style={styles.sheetSubtitle}>{booking.order_number || booking.booking_id}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <View style={styles.sheetStatsRow}>
              <View style={styles.sheetStatCard}>
                <Text style={styles.sheetStatLabel}>Payout</Text>
                <Text style={styles.sheetStatValue}>{formatMoney(payout)}</Text>
              </View>
              <View style={styles.sheetStatCard}>
                <Text style={styles.sheetStatLabel}>Payment</Text>
                <Text style={styles.sheetStatValueSmall}>{paymentMethod}</Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockTitle}>Settlement Summary</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Final quoted amount</Text>
                <Text style={styles.infoValue}>{formatMoney(booking.quote?.total_amount)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment method</Text>
                <Text style={styles.infoValue}>{paymentMethod}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Completed at</Text>
                <Text style={styles.infoValue}>{formatSessionDate(booking.completed_at || booking.updated_at)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Quote status</Text>
                <Text style={styles.infoValue}>{toTitle(booking.quote?.status || booking.status)}</Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockTitle}>Products Purchased</Text>
              {productRows.length ? (
                productRows.map((item, index) => (
                  <ProductRow
                    key={`${item.product_id ?? item.product_name}-${index}`}
                    item={item}
                    onOpenImage={onOpenPhoto}
                  />
                ))
              ) : (
                <Text style={styles.emptyBodyText}>No product line items were captured for this booking.</Text>
              )}
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockTitle}>Customer Photo</Text>
              {customerPhoto ? (
                <Pressable
                  style={styles.photoPreviewCard}
                  onPress={() => onOpenPhoto(customerPhoto)}
                >
                  <Image source={{ uri: customerPhoto }} style={styles.photoPreview} contentFit="cover" />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoOverlayText}>Tap to view full image</Text>
                  </View>
                </Pressable>
              ) : (
                <Text style={styles.emptyBodyText}>Customer did not upload a reference photo for this booking.</Text>
              )}
            </View>

            <View style={styles.infoBlock}>
              <Text style={styles.infoBlockTitle}>Payout Breakdown</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Subtotal</Text>
                <Text style={styles.infoValue}>{formatMoney(booking.bill?.subtotal ?? booking.quote?.total_amount)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platform fee</Text>
                <Text style={styles.infoValue}>{formatMoney(booking.bill?.platform_fee ?? 0)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Handling fee</Text>
                <Text style={styles.infoValue}>{formatMoney(booking.bill?.handling_fee ?? 0)}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowStrong]}>
                <Text style={styles.infoLabelStrong}>Total payout</Text>
                <Text style={styles.infoValueStrong}>{formatMoney(payout)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const PhotoViewer = ({
  visible,
  imageUrl,
  onClose,
}: {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.photoModalOverlay}>
      <Pressable style={styles.photoModalBackdrop} onPress={onClose} />
      <View style={styles.photoModalCard}>
        <TouchableOpacity onPress={onClose} style={styles.photoCloseButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.photoModalImage} contentFit="contain" /> : null}
      </View>
    </View>
  </Modal>
);

export default function DutySessionDetailsScreen({
  onBack,
  session,
  vendorName = 'Vendor',
}: DutySessionDetailsScreenProps) {
  const [selectedBooking, setSelectedBooking] = useState<DutySessionBooking | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F1EA" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              trackVendorClick('duty_session_details_back_empty');
              onBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#17212B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Duty session details</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No duty session selected</Text>
          <Text style={styles.emptySubtitle}>Open a session from history to review its complete booking story.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeSession = session;
  const vehicle = activeSession.vehicle;
  const bookingRecords = activeSession.bookings || [];
  const latitude = Number(activeSession.start_lat);
  const longitude = Number(activeSession.start_lng);
  const hasSessionLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const sessionStatus = activeSession.status === 'live' ? 'Live duty in progress' : 'Duty completed';
  const vehicleTitle =
    vehicle?.vehicle_type_display ||
    (vehicle?.vehicle_type ? toTitle(vehicle.vehicle_type) : '') ||
    (activeSession.vehicle_type ? toTitle(activeSession.vehicle_type) : '') ||
    'Vehicle';
  const vehicleLabel =
    vehicle?.vehicle_label ||
    vehicle?.vehicle_number ||
    vehicle?.vehicle_name ||
    vehicle?.vehicle_model_name ||
    'Profile vehicle attached';

  const sessionMetrics = useMemo(
    () => [
      {
        label: 'Bookings',
        value: String(activeSession.booking_summary?.total_bookings ?? bookingRecords.length),
      },
      {
        label: 'Successful',
        value: String(activeSession.booking_summary?.completed_bookings ?? bookingRecords.filter((booking) => booking.successful).length),
      },
      {
        label: 'Duration',
        value: activeSession.duration_display,
      },
    ],
    [activeSession.booking_summary, activeSession.duration_display, bookingRecords],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F1EA" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            trackVendorClick('duty_session_details_back', { session_id: activeSession.session_id });
            onBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#17212B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duty session details</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroMapWrap}>
            {hasSessionLocation ? (
              <LiveSessionMap
                location={{ latitude, longitude }}
                height={230}
                label={activeSession.status === 'live' ? 'LIVE SESSION TRACKING' : 'SESSION LOCATION'}
              />
            ) : (
              <View style={styles.noLocationMap}>
                <MaterialIcons name="location-off" size={34} color="#6B7280" />
                <Text style={styles.noLocationTitle}>Session location not recorded</Text>
                <Text style={styles.noLocationText}>No GPS snapshot was saved when this duty session started.</Text>
              </View>
            )}
            {hasSessionLocation ? <View style={styles.heroScrim} /> : null}
            <View style={styles.heroPill}>
              <View style={[styles.heroDot, activeSession.status === 'live' && styles.heroDotLive]} />
              <Text style={styles.heroPillText}>{sessionStatus}</Text>
            </View>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroTitleRow}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>{vendorName}</Text>
                <Text style={styles.heroSubtitle}>
                  {formatSessionDate(activeSession.started_at)} - {formatSessionDate(activeSession.ended_at)}
                </Text>
              </View>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={15} color="#29443B" />
                <Text style={styles.durationBadgeText}>{activeSession.duration_display}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              {sessionMetrics.map((metric) => (
                <View key={metric.label} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Session Details</Text>
        <View style={styles.sessionDetailsCard}>
          <View style={styles.sessionDetailRow}>
            <Text style={styles.sessionDetailLabel}>Session ID</Text>
            <Text style={styles.sessionDetailValue}>{activeSession.session_id}</Text>
          </View>
          <View style={styles.sessionDetailRow}>
            <Text style={styles.sessionDetailLabel}>Started at</Text>
            <Text style={styles.sessionDetailValue}>{formatExactSessionDate(activeSession.started_at)}</Text>
          </View>
          <View style={styles.sessionDetailRow}>
            <Text style={styles.sessionDetailLabel}>Ended at</Text>
            <Text style={styles.sessionDetailValue}>{formatExactSessionDate(activeSession.ended_at)}</Text>
          </View>
          <View style={styles.sessionDetailRow}>
            <Text style={styles.sessionDetailLabel}>Session status</Text>
            <Text style={styles.sessionDetailValue}>{sessionStatus}</Text>
          </View>
          <View style={styles.sessionDetailRow}>
            <Text style={styles.sessionDetailLabel}>Booking records</Text>
            <Text style={styles.sessionDetailValue}>
              {activeSession.booking_summary?.total_bookings ?? bookingRecords.length} total, {activeSession.booking_summary?.completed_bookings ?? bookingRecords.filter((booking) => booking.successful).length} successful, {activeSession.booking_summary?.unsuccessful_bookings ?? bookingRecords.filter((booking) => !booking.successful).length} unsuccessful
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Vehicle Info</Text>
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleIconWrap}>
            <MaterialIcons name="local-shipping" size={24} color="#194B3B" />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleType}>{vehicleTitle}</Text>
            <Text style={styles.vehiclePrimary}>{vehicleLabel}</Text>
            <Text style={styles.vehicleSecondary}>
              {vehicle?.weighing_scale_type_display ? `Scale • ${vehicle.weighing_scale_type_display}` : 'Scale information not added'}
            </Text>
          </View>
          <View style={[styles.statusChip, vehicle?.is_active === false ? styles.statusChipMuted : styles.statusChipActive]}>
            <Text style={[styles.statusChipText, vehicle?.is_active === false ? styles.statusChipTextMuted : styles.statusChipTextActive]}>
              {vehicle?.is_active === false ? 'Inactive' : 'Active'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Booking Records</Text>
        {bookingRecords.length ? (
          bookingRecords.map((booking) => {
            const productRows = getProductRows(booking);
            const heroProduct = productRows[0];
            const payout = booking.bill?.total_payout ?? booking.total_payout;
            return (
              <TouchableOpacity
                key={booking.booking_id}
                activeOpacity={0.92}
                style={styles.recordCard}
                onPress={() => {
                  trackVendorClick('duty_session_booking_open', {
                    session_id: activeSession.session_id,
                    booking_id: booking.booking_id,
                  });
                  setSelectedBooking(booking);
                }}
              >
                <View style={styles.recordHeader}>
                  <View style={styles.recordAvatar}>
                    <Text style={styles.recordAvatarText}>{getInitials(booking.customer?.name || vendorName)}</Text>
                  </View>
                  <View style={styles.recordIdentity}>
                    <Text style={styles.recordName}>{booking.customer?.name || 'Customer'}</Text>
                    <Text style={styles.recordOrder}>{booking.order_number || booking.booking_id}</Text>
                  </View>
                  <View style={[styles.resultBadge, booking.successful ? styles.resultBadgeSuccess : styles.resultBadgeSoft]}>
                    <Text style={[styles.resultBadgeText, booking.successful ? styles.resultBadgeTextSuccess : styles.resultBadgeTextSoft]}>
                      {booking.successful ? 'Successful' : toTitle(booking.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordBody}>
                  <View style={styles.recordMediaWrap}>
                    {heroProduct?.image_url ? (
                      <Image source={{ uri: heroProduct.image_url }} style={styles.recordMedia} contentFit="cover" />
                    ) : (
                      <View style={[styles.recordMedia, styles.recordMediaFallback]}>
                        <MaterialIcons name="inventory" size={22} color="#8DA09A" />
                      </View>
                    )}
                  </View>

                  <View style={styles.recordDetails}>
                    <Text style={styles.recordSummary} numberOfLines={2}>
                      {productRows.map((item) => item.product_name).join(', ') || booking.material_summary || 'No product details'}
                    </Text>
                    <Text style={styles.recordMeta}>
                      {productRows.length} product{productRows.length === 1 ? '' : 's'} • {booking.quote?.payment_method ? toTitle(booking.quote.payment_method) : 'Payment not recorded'}
                    </Text>
                    {booking.status === 'cancelled' && booking.cancellation_reason ? (
                      <Text style={styles.recordCancelReason} numberOfLines={2}>
                        {booking.cancellation_reason}
                      </Text>
                    ) : null}
                    <View style={styles.recordFooter}>
                      <Text style={styles.recordPayout}>{formatMoney(payout)}</Text>
                      <Text style={styles.recordCta}>Tap to view details</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No booking records in this session</Text>
            <Text style={styles.emptySubtitle}>This duty window does not yet have any linked booking activity.</Text>
          </View>
        )}
      </ScrollView>

      <BookingDetailSheet
        booking={selectedBooking}
        visible={Boolean(selectedBooking)}
        onClose={() => {
          trackVendorClick('duty_session_booking_close');
          setSelectedBooking(null);
        }}
        onOpenPhoto={(url) => {
          trackVendorClick('duty_session_photo_open');
          setPreviewImage(url);
        }}
      />

      <PhotoViewer
        visible={Boolean(previewImage)}
        imageUrl={previewImage}
        onClose={() => {
          trackVendorClick('duty_session_photo_close');
          setPreviewImage(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDD0',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17212B',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 44,
  },
  heroCard: {
    backgroundColor: '#F8F4EC',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6DDD0',
    shadowColor: '#1F2937',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroMapWrap: {
    position: 'relative',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 15, 0.18)',
  },
  heroPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9CA3AF',
    marginRight: 8,
  },
  heroDotLive: {
    backgroundColor: '#22C55E',
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  noLocationMap: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ECE6DB',
  },
  noLocationTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#28323A',
    textAlign: 'center',
  },
  noLocationText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#69737D',
    textAlign: 'center',
  },
  heroContent: {
    padding: 18,
    backgroundColor: '#F8F4EC',
  },
  heroTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#18222C',
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#667085',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#E2ECE5',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  durationBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#29443B',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E7DDD0',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17212B',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#7A838B',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#17212B',
  },
  sessionDetailsCard: {
    backgroundColor: '#FFFCF8',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DAC9',
  },
  sessionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E7DA',
  },
  sessionDetailLabel: {
    width: 112,
    fontSize: 13,
    color: '#69737D',
  },
  sessionDetailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#17212B',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFCF8',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DAC9',
  },
  vehicleIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EEF4EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleType: {
    fontSize: 21,
    fontWeight: '800',
    color: '#17212B',
  },
  vehiclePrimary: {
    marginTop: 2,
    fontSize: 15,
    color: '#48525B',
  },
  vehicleSecondary: {
    marginTop: 6,
    fontSize: 13,
    color: '#7A838B',
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  statusChipActive: {
    backgroundColor: '#ECFDF3',
    borderColor: '#9FE4B5',
  },
  statusChipMuted: {
    backgroundColor: '#F6F4EE',
    borderColor: '#DAD4C7',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusChipTextActive: {
    color: '#17663A',
  },
  statusChipTextMuted: {
    color: '#6B7280',
  },
  recordCard: {
    backgroundColor: '#FFFCF8',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5DAC9',
    marginBottom: 14,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8E4DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3F4851',
  },
  recordIdentity: {
    flex: 1,
  },
  recordName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17212B',
  },
  recordOrder: {
    marginTop: 3,
    fontSize: 12,
    color: '#7A838B',
  },
  resultBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  resultBadgeSuccess: {
    backgroundColor: '#ECFDF3',
    borderColor: '#A7EAC1',
  },
  resultBadgeSoft: {
    backgroundColor: '#F4EFE6',
    borderColor: '#DCCFB8',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  resultBadgeTextSuccess: {
    color: '#17663A',
  },
  resultBadgeTextSoft: {
    color: '#7A5F23',
  },
  recordBody: {
    flexDirection: 'row',
    marginTop: 16,
  },
  recordMediaWrap: {
    marginRight: 12,
  },
  recordMedia: {
    width: 74,
    height: 74,
    borderRadius: 18,
    backgroundColor: '#EEF2EE',
  },
  recordMediaFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recordSummary: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#28323A',
  },
  recordMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#69737D',
  },
  recordCancelReason: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: '#B42318',
    fontWeight: '700',
  },
  recordFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordPayout: {
    fontSize: 18,
    fontWeight: '800',
    color: '#194B3B',
  },
  recordCta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A838B',
  },
  emptyCard: {
    backgroundColor: '#FFFCF8',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5DAC9',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#17212B',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.22)',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetCard: {
    maxHeight: '88%',
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D3C8B7',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17212B',
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#7A838B',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    paddingTop: 18,
    paddingBottom: 24,
  },
  sheetStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  sheetStatCard: {
    flex: 1,
    backgroundColor: '#F6F1E7',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  sheetStatLabel: {
    fontSize: 12,
    color: '#7A838B',
  },
  sheetStatValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: '#194B3B',
  },
  sheetStatValueSmall: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '800',
    color: '#17212B',
  },
  infoBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DDCD',
    marginBottom: 14,
  },
  infoBlockTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17212B',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoRowStrong: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#EFE6D8',
    paddingTop: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#17212B',
  },
  infoLabelStrong: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#17212B',
  },
  infoValueStrong: {
    marginLeft: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#194B3B',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2EBDF',
  },
  productImageWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#EEF2EE',
    marginRight: 12,
  },
  productImageWrapMuted: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(20, 28, 36, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productContent: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#17212B',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#194B3B',
  },
  productMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  productMetaSecondary: {
    marginTop: 2,
    fontSize: 12,
    color: '#8A9199',
  },
  photoPreviewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EEF2EE',
  },
  photoPreview: {
    width: '100%',
    height: 190,
  },
  photoOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  photoOverlayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#7A838B',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  photoModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  photoModalCard: {
    width: '100%',
    height: '76%',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  photoCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.58)',
  },
});
