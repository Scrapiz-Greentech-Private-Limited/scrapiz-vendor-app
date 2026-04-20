import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import LiveSessionMap from '../../components/jobs/LiveSessionMap';
import { ApiService } from '../../services/api';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';
import { MAP_CONFIG } from '../../config/mapConfig';
import { BookingActiveResponse, SelectedPickupItem, VendorCoordinates } from '../../types';

interface ActiveJobProps {
  bookingId: string;
  selectedItems: SelectedPickupItem[];
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onProceedToCalculator: (bookingId: string, selectedItems: SelectedPickupItem[]) => void;
}

type StepKey = 'en_route' | 'arrived' | 'in_progress' | 'ready';

const STEP_META: Record<
  StepKey,
  { idx: number; icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle: string; cta: string; ctaColor: string }
> = {
  en_route: {
    idx: 1,
    icon: 'directions-car',
    title: 'Go to Pickup',
    subtitle: 'Reach customer location',
    cta: '📍 Verify Arrival (OTP)',
    ctaColor: '#14532D',
  },
  arrived: {
    idx: 2,
    icon: 'location-pin',
    title: 'Reached Customer',
    subtitle: 'Start scrap checking',
    cta: '📋 Start Weighing Items',
    ctaColor: '#14532D',
  },
  in_progress: {
    idx: 3,
    icon: 'inventory-2',
    title: 'Weighing Items',
    subtitle: 'Measure and confirm quantity',
    cta: '✓ Finish Weighing',
    ctaColor: '#14532D',
  },
  ready: {
    idx: 4,
    icon: 'check-circle',
    title: 'Ready for Price',
    subtitle: 'Collection done, send final quote',
    cta: '🧮 Open Price Calculator',
    ctaColor: '#FF9800',
  },
};

const normalizeStep = (step: BookingActiveResponse['step']): StepKey => {
  if (typeof step === 'string') {
    if (step === 'en_route' || step === 'arrived' || step === 'in_progress' || step === 'ready') {
      return step;
    }
    return 'en_route';
  }

  if (step <= 1) {
    return 'en_route';
  }
  if (step === 2) {
    return 'arrived';
  }
  if (step === 3) {
    return 'in_progress';
  }
  return 'ready';
};

const ActiveJob: React.FC<ActiveJobProps> = ({
  bookingId,
  selectedItems,
  onBack,
  onShowToast,
  onProceedToCalculator,
}) => {
  const [activeData, setActiveData] = useState<BookingActiveResponse | null>(null);
  const [vendorCoords, setVendorCoords] = useState<VendorCoordinates | null>(
    vendorLocationStreamer.getLatestCoords(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [arrivalModalVisible, setArrivalModalVisible] = useState(false);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [selfieRemoteUrl, setSelfieRemoteUrl] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const loadActive = useCallback(async () => {
    try {
      const response = await ApiService.getBookingActive(bookingId);
      setActiveData(response);
    } catch {
      onShowToast('Failed to refresh active booking', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, onShowToast]);

  useEffect(() => {
    loadActive();
  }, [loadActive]);

  useEffect(() => {
    const unsubscribe = vendorLocationStreamer.subscribe((coords) => {
      setVendorCoords(coords);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadActive();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadActive]);

  const stepKey = useMemo<StepKey>(() => normalizeStep(activeData?.step ?? 1), [activeData?.step]);
  const stepMeta = STEP_META[stepKey];

  const customerName = useMemo(() => {
    const rawName = activeData?.customer?.name;
    if (typeof rawName === 'string' && rawName.trim().length > 0) {
      return rawName.trim();
    }
    return 'Customer';
  }, [activeData?.customer?.name]);

  const customerInitial = useMemo(() => customerName.charAt(0).toUpperCase(), [customerName]);

  const customerRatingLabel = useMemo(() => {
    const numericRating = Number(activeData?.customer?.rating);
    if (!Number.isFinite(numericRating)) {
      return '0.0';
    }
    return numericRating.toFixed(1);
  }, [activeData?.customer?.rating]);

  const mergedSelectedItems = useMemo(() => {
    const sourceItems = activeData?.order_items || [];

    if (!selectedItems.length) {
      return sourceItems.map((activeItem) => {
        const rate = Number(activeItem.rate_per_unit || 0);
        return {
          product_id: activeItem.product_id,
          product_name: activeItem.product_name,
          quantity: Number(activeItem.quantity || 0),
          unit: activeItem.unit || 'kg',
          min_rate: rate,
          max_rate: rate,
          rate_per_unit: rate,
        };
      });
    }

    return selectedItems.map((item) => {
      const fromActive = sourceItems.find((activeItem) => String(activeItem.product_id) === String(item.product_id));
      return {
        ...item,
        rate_per_unit:
          fromActive?.rate_per_unit ??
          item.rate_per_unit ??
          (Number(item.min_rate || 0) + Number(item.max_rate || 0)) / 2,
      };
    });
  }, [activeData?.order_items, selectedItems]);

  const pickupCoordinates = useMemo(() => {
    const defaultCoordinates = {
      latitude: MAP_CONFIG.DEFAULT_CENTER[1],
      longitude: MAP_CONFIG.DEFAULT_CENTER[0],
    };

    if (!activeData) {
      return {
        ...defaultCoordinates,
        hasValidPickupCoordinates: false,
      };
    }

    const parsedLatitude = Number(activeData.pickup_lat);
    const parsedLongitude = Number(activeData.pickup_lng);
    const hasValidPickupCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

    return {
      latitude: hasValidPickupCoordinates ? parsedLatitude : defaultCoordinates.latitude,
      longitude: hasValidPickupCoordinates ? parsedLongitude : defaultCoordinates.longitude,
      hasValidPickupCoordinates,
    };
  }, [activeData]);

  const handleCall = () => {
    if (!activeData?.customer?.phone || activeData.customer.phone_masked) {
      onShowToast('Customer phone is locked until arrival OTP verification.', 'info');
      return;
    }
    Linking.openURL(`tel:${activeData.customer.phone}`);
  };

  const resetArrivalModal = () => {
    setArrivalModalVisible(false);
    setSelfieUploading(false);
    setSelfieRemoteUrl('');
    setOtpSent(false);
    setOtpCode('');
  };

  const captureAndUploadSelfie = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onShowToast('Camera permission is required for arrival verification.', 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.front,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setSelfieUploading(true);

      await ApiService.uploadVendorFaceImageFile({
        face_image: {
          uri: asset.uri,
          name: 'arrival-selfie.jpg',
          type: asset.mimeType || 'image/jpeg',
        },
      });

      const profile = await ApiService.getVendorProfile();
      const uploadedUrl = profile?.biometric?.source_image_url;

      if (!uploadedUrl) {
        onShowToast('Selfie uploaded but URL not returned. Please try again.', 'error');
        return;
      }

      setSelfieRemoteUrl(uploadedUrl);
      onShowToast('Selfie uploaded. Send OTP to customer now.', 'success');
    } catch (error: any) {
      onShowToast(error?.message || 'Failed to upload selfie for arrival verification.', 'error');
    } finally {
      setSelfieUploading(false);
    }
  };

  const sendArrivalOtp = async () => {
    if (!activeData || !selfieRemoteUrl) {
      onShowToast('Capture selfie before sending OTP.', 'error');
      return;
    }

    const latitude = vendorCoords?.latitude ?? pickupCoordinates.latitude;
    const longitude = vendorCoords?.longitude ?? pickupCoordinates.longitude;

    setIsActionLoading(true);
    try {
      await ApiService.initiateArrivalVerification(activeData.booking_id, {
        selfie_url: selfieRemoteUrl,
        vendor_latitude: latitude,
        vendor_longitude: longitude,
      });

      setOtpSent(true);
      onShowToast('OTP sent to customer email/push. Ask customer for OTP.', 'success');
    } catch (error: any) {
      onShowToast(error?.message || 'Failed to send arrival OTP.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const verifyArrivalOtp = async () => {
    if (!activeData) {
      return;
    }

    if (otpCode.trim().length !== 6) {
      onShowToast('Enter a valid 6-digit OTP.', 'error');
      return;
    }

    setIsActionLoading(true);
    try {
      await ApiService.verifyArrivalOtp(activeData.booking_id, otpCode.trim());
      onShowToast('Arrival verified successfully.', 'success');
      resetArrivalModal();
      await loadActive();
    } catch (error: any) {
      onShowToast(error?.message || 'OTP verification failed.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenNavigation = () => {
    if (!activeData) {
      return;
    }

    if (!pickupCoordinates.hasValidPickupCoordinates) {
      onShowToast('Pickup coordinates are unavailable for this order.', 'error');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${pickupCoordinates.latitude},${pickupCoordinates.longitude}`;
    Linking.openURL(url);
  };

  const runStepAction = async () => {
    if (!activeData || isActionLoading) {
      return;
    }

    if (stepKey === 'en_route') {
      setArrivalModalVisible(true);
      return;
    }

    if (stepKey === 'ready') {
      onProceedToCalculator(activeData.booking_id, mergedSelectedItems);
      return;
    }

    setIsActionLoading(true);
    try {
      if (stepKey === 'arrived') {
        await ApiService.startBookingCollection(activeData.booking_id);
      }
      if (stepKey === 'in_progress') {
        await ApiService.markBookingReady(activeData.booking_id);
      }
      await loadActive();
      onShowToast('Status updated', 'success');
    } catch {
      onShowToast('Unable to update booking step', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading || !activeData) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#14532D" />
        <Text style={styles.loaderText}>Loading active booking...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Active Job</Text>
          <Text style={styles.headerSub}>#{activeData.booking_id}</Text>
        </View>
        <View style={styles.headerIconBadge}>
          <MaterialIcons name={stepMeta.icon} size={16} color="#fff" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusIconWrap}>
              <MaterialIcons name={stepMeta.icon} size={30} color="#14532D" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.statusTitle}>{stepMeta.title}</Text>
              <Text style={styles.statusSubtitle}>{stepMeta.subtitle}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(stepMeta.idx / 4) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{stepMeta.idx} of 4</Text>
        </View>

        <LiveSessionMap
          customerLocation={{ latitude: pickupCoordinates.latitude, longitude: pickupCoordinates.longitude }}
          vendorLocation={
            vendorCoords
              ? { latitude: vendorCoords.latitude, longitude: vendorCoords.longitude }
              : null
          }
          height={250}
        />

        <View style={styles.customerCard}>
          <View style={styles.customerTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{customerInitial}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.customerRating}>⭐ {customerRatingLabel}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <MaterialIcons name="call" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color="#14532D" />
            <Text style={styles.addressText}>{activeData.pickup_address}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="recycling" size={16} color="#14532D" />
            <Text style={styles.metaText}>{activeData.material_summary}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="navigation" size={16} color="#14532D" />
            <Text style={styles.metaText}>{activeData.distance_km} km away</Text>
          </View>

          {activeData.quote ? (
            <View style={styles.quoteSummaryBox}>
              <Text style={styles.quoteSummaryTitle}>Quote Status: {(activeData.quote.status || '').toUpperCase()}</Text>
              <Text style={styles.quoteSummaryMeta}>Amount: ₹{Number(activeData.quote.total_amount || 0).toFixed(2)}</Text>
              {activeData.quote.payment_method ? (
                <Text style={styles.quoteSummaryMeta}>Payment: {activeData.quote.payment_method.toUpperCase()}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={handleOpenNavigation}>
          <Text style={styles.navBtnText}>▲ Open Navigation</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomSticky}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: stepMeta.ctaColor }, isActionLoading && styles.disabled]}
          onPress={runStepAction}
          disabled={isActionLoading}
        >
          {isActionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{stepMeta.cta}</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={arrivalModalVisible} transparent animationType="slide" onRequestClose={resetArrivalModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Arrival Verification</Text>
            <Text style={styles.modalSub}>Capture a selfie, send OTP, then verify customer OTP to unlock phone.</Text>

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, selfieUploading && styles.disabled]}
              onPress={() => void captureAndUploadSelfie()}
              disabled={selfieUploading}
            >
              {selfieUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Capture & Upload Selfie</Text>}
            </TouchableOpacity>

            {selfieRemoteUrl ? (
              <Text style={styles.modalStatusText}>Selfie uploaded. Ready to send OTP.</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.modalSecondaryBtn, (!selfieRemoteUrl || isActionLoading) && styles.disabled]}
              onPress={() => void sendArrivalOtp()}
              disabled={!selfieRemoteUrl || isActionLoading}
            >
              <Text style={styles.modalSecondaryText}>Send Arrival OTP</Text>
            </TouchableOpacity>

            {otpSent ? (
              <>
                <TextInput
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  style={styles.otpInput}
                />
                <TouchableOpacity
                  style={[styles.modalPrimaryBtn, isActionLoading && styles.disabled]}
                  onPress={() => void verifyArrivalOtp()}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Verify OTP & Arrive</Text>}
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={resetArrivalModal}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7F5' },
  loaderText: { marginTop: 10, color: '#475569' },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#14532D',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.85)', marginTop: 2, fontSize: 12 },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  content: { padding: 16, paddingBottom: 140, gap: 16 },
  statusCard: { backgroundColor: '#fff', borderRadius: 24, padding: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  statusSubtitle: { color: '#64748B', marginTop: 4 },
  progressBar: { height: 10, borderRadius: 999, backgroundColor: '#E2E8F0', marginTop: 18, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#16A34A' },
  progressText: { textAlign: 'center', marginTop: 10, color: '#475569', fontWeight: '700' },
  customerCard: { backgroundColor: '#fff', borderRadius: 24, padding: 18 },
  customerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  customerName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  customerRating: { color: '#64748B', marginTop: 4 },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  addressText: { flex: 1, color: '#334155', lineHeight: 20 },
  metaText: { color: '#475569', fontWeight: '600', flex: 1 },
  navBtn: {
    backgroundColor: '#14532D',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  navBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  bottomSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 16,
  },
  ctaBtn: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  flex1: { flex: 1 },
  disabled: { opacity: 0.7 },
  quoteSummaryBox: {
    marginTop: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  quoteSummaryTitle: {
    color: '#9A3412',
    fontWeight: '800',
    fontSize: 13,
  },
  quoteSummaryMeta: {
    color: '#9A3412',
    marginTop: 4,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    color: '#64748B',
    lineHeight: 20,
  },
  modalPrimaryBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#14532D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalSecondaryBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#14532D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: {
    color: '#14532D',
    fontWeight: '800',
  },
  modalStatusText: {
    color: '#166534',
    fontWeight: '600',
    fontSize: 12,
  },
  otpInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 16,
    letterSpacing: 2,
    color: '#0F172A',
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseText: {
    color: '#64748B',
    fontWeight: '700',
  },
});

export default ActiveJob;
