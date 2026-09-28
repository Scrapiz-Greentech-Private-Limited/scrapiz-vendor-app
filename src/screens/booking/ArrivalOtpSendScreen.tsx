import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DESIGN_TOKENS } from '../../theme/tokens';
import { BookingActiveResponse, VendorCoordinates } from '../../types';
import { ApiService } from '../../services/api';
import { arrivalVerificationState } from '../../services/arrivalVerificationState';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';
import { MaterialsTable } from '../../components/jobs/MaterialsTable';

export interface ArrivalOtpSendScreenProps {
  booking: BookingActiveResponse;
  vendorCoordinates?: VendorCoordinates | null;
  onSendOtpSuccess: () => void;
  onBack?: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ArrivalOtpSendScreen: React.FC<ArrivalOtpSendScreenProps> = ({
  booking,
  vendorCoordinates,
  onSendOtpSuccess,
  onBack,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const displayOrderId = booking.order_number || (booking.booking_id.length > 8 ? `ORD-${booking.booking_id.slice(0, 8).toUpperCase()}` : booking.booking_id);
  const customerName = booking.customer?.name || 'Customer';
  const customerInitial = customerName.charAt(0).toUpperCase() || 'C';
  const customerRating = Number(booking.customer?.rating || 4.8).toFixed(1);
  const customerPhone = booking.customer?.phone || '+91 98XXX XXXXX';
  const pickupAddress = booking.pickup_address || 'Pickup location not specified';

  // Derive button label and icon from server-side attempt status so the UI
  // always matches reality, even after an app restart.
  const otpAlreadySent = booking.arrival_attempt?.status === 'otp_sent';
  const ctaLabel = otpAlreadySent ? 'Continue to OTP Entry' : 'Send OTP to Customer';
  const ctaIcon: keyof typeof MaterialIcons.glyphMap = otpAlreadySent ? 'arrow-forward' : 'send';

  const handleSendOtp = async () => {
    if (loading) return;

    // ── Server-state short-circuit ──────────────────────────────────────────
    // The backend only allows calling initiate/ when no prior OTP is in flight.
    // Once the attempt status is 'otp_sent', re-calling initiate returns
    // SELFIE_REQUIRED (because status != 'pending'). We detect this server-side
    // truth here and skip the API call entirely.
    const attemptStatus = booking.arrival_attempt?.status;

    if (attemptStatus === 'otp_sent') {
      // OTP was already dispatched to the customer in a prior call.
      // Jump straight to the entry screen — no API call needed.
      onShowToast('OTP was already sent to the customer. Enter the code below.', 'info');
      onSendOtpSuccess();
      return;
    }

    if (attemptStatus === 'verified') {
      // Arrival was fully verified in a prior session — nothing left to do here.
      onSendOtpSuccess();
      return;
    }

    setLoading(true);
    try {
      const latitude = vendorCoordinates?.latitude ?? booking.pickup_lat ?? 19.076;
      const longitude = vendorCoordinates?.longitude ?? booking.pickup_lng ?? 72.8777;

      await ApiService.initiateArrivalVerification(booking.booking_id, {
        selfie_url: '',
        vendor_latitude: latitude,
        vendor_longitude: longitude,
      });

      // GENERAL RULE: reaching this point means the vendor has passed the full
      // arrival flow (LiveTrackingGate proximity check + face verification).
      // Write the verification record as a durable checkpoint so that if the
      // app is killed and the server attempt status has advanced past 'pending',
      // the LiveTrackingGate.onContinue check still short-circuits correctly.
      arrivalVerificationState
        .markVerified({ orderId: booking.booking_id, bookingId: booking.booking_id })
        .catch(() => {
          // Non-fatal — record may already exist from ArrivalVerifyScreen.
        });

      onShowToast('OTP sent to customer. Ask customer for the 6-digit code.', 'success');
      onSendOtpSuccess();
    } catch (error: any) {
      onShowToast(error?.message || 'Failed to send arrival OTP. Please retry.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Fixed Green Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 4, 16) }]}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            Arrival Verification
          </Text>
          <Text style={styles.headerSub} numberOfLines={1} ellipsizeMode="tail">
            Order #{displayOrderId}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.badgeWrap}>
            <MaterialIcons name="security" size={18} color={DESIGN_TOKENS.GREEN_LIGHT} />
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Card */}
        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{customerInitial}</Text>
            </View>
            <View style={styles.customerInfoCol}>
              <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
                {customerName}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText} numberOfLines={1}>
                  {customerRating} Rating
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Masked Phone Notice */}
          <View style={styles.metaRow}>
            <MaterialIcons name="lock-outline" size={18} color={DESIGN_TOKENS.TEXT_SECONDARY} />
            <Text style={styles.phoneText} numberOfLines={1} ellipsizeMode="tail">
              {customerPhone}
            </Text>
            <View style={styles.maskedBadge}>
              <Text style={styles.maskedBadgeText} numberOfLines={1}>
                Masked pre-OTP
              </Text>
            </View>
          </View>

          {/* Pickup Address */}
          <View style={styles.addressRow}>
            <MaterialIcons name="location-on" size={20} color={DESIGN_TOKENS.GREEN_MID} style={styles.addressIcon} />
            <Text style={styles.addressText}>
              {pickupAddress}
            </Text>
          </View>
        </View>

        {/* Materials Table (Reused Component) */}
        <MaterialsTable items={booking.order_items || []} />

        {/* Pickup Location Mini-Map (160px height) */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeaderRow}>
            <Text style={styles.mapTitle} numberOfLines={1} ellipsizeMode="tail">
              Pickup Location
            </Text>
            <Text style={styles.mapSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {booking.distance_km ? `${booking.distance_km} km away` : 'At location'}
            </Text>
          </View>

          <View style={styles.mapWrap}>
            <LiveSessionMap
              customerLocation={{
                latitude: booking.pickup_lat,
                longitude: booking.pickup_lng,
              }}
              vendorLocation={vendorCoordinates}
              height={160}
              label="Pickup Pin"
              showOverlay={false}
            />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.primaryCta, loading && styles.ctaDisabled]}
          onPress={() => void handleSendOtp()}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name={ctaIcon} size={20} color="#FFFFFF" />
              <Text style={styles.ctaText} numberOfLines={1} ellipsizeMode="tail">
                {ctaLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.BG,
  },
  header: {
    backgroundColor: DESIGN_TOKENS.GREEN_DARK,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  headerRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  badgeWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 140,
    gap: 14,
  },
  customerCard: {
    backgroundColor: DESIGN_TOKENS.CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    padding: 16,
    minHeight: 140,
    shadowColor: DESIGN_TOKENS.GREEN_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DESIGN_TOKENS.GREEN_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  customerInfoCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
  },
  divider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.BORDER,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  maskedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  maskedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  addressIcon: {
    marginTop: 1,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: DESIGN_TOKENS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  mapCard: {
    backgroundColor: DESIGN_TOKENS.CARD_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.BORDER,
    padding: 16,
    minHeight: 220,
    shadowColor: DESIGN_TOKENS.GREEN_DARK,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.TEXT_PRIMARY,
  },
  mapSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.TEXT_SECONDARY,
  },
  mapWrap: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  primaryCta: {
    height: 54,
    borderRadius: 18,
    backgroundColor: DESIGN_TOKENS.GREEN_MID,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: DESIGN_TOKENS.GREEN_MID,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default ArrivalOtpSendScreen;
