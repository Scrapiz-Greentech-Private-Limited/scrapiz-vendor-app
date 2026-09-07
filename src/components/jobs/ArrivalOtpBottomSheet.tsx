import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import LiveSessionMap from './LiveSessionMap';
import { BookingActiveResponse, SelectedPickupItem, VendorCoordinates } from '../../types';

interface ArrivalOtpBottomSheetProps {
  visible: boolean;
  booking: BookingActiveResponse;
  selectedItems: SelectedPickupItem[];
  vendorCoordinates?: VendorCoordinates | null;
  pickupCoordinates: { latitude: number; longitude: number };
  otpSent: boolean;
  otpCode: string;
  isActionLoading: boolean;
  onClose: () => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onChangeOtp: (value: string) => void;
}

const ArrivalOtpBottomSheet = ({
  visible,
  booking,
  selectedItems,
  vendorCoordinates,
  pickupCoordinates,
  otpSent,
  otpCode,
  isActionLoading,
  onClose,
  onSendOtp,
  onVerifyOtp,
  onChangeOtp,
}: ArrivalOtpBottomSheetProps) => {
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, screenHeight, translateY, visible]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 110 || gestureState.vy > 0.8) {
            closeSheet();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 180,
          }).start();
        },
      }),
    [translateY],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeSheet} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.dragHandleWrap} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScrollContent}>
          <View style={styles.sheetHeader}>
            <View style={styles.headerBadge}>
              <MaterialIcons name="verified-user" size={16} color="#DCFCE7" />
              <Text style={styles.headerBadgeText}>Face verified</Text>
            </View>
            <Text style={styles.sheetTitle}>Confirm customer arrival</Text>
            <Text style={styles.sheetSubtitle}>
              Review the pickup details, send the one-time password, and enter the customer&apos;s code to unlock arrival.
            </Text>
          </View>

          <View style={styles.bentoGrid}>
            <View style={[styles.bentoCard, styles.bentoWide]}>
              <Text style={styles.bentoLabel}>CUSTOMER</Text>
              <Text style={styles.bentoValue}>{booking.customer?.name || 'Customer'}</Text>
              <Text style={styles.bentoMeta}>★ {Number(booking.customer?.rating || 0).toFixed(1)} rating</Text>
            </View>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoLabel}>ORDER</Text>
              <Text style={styles.bentoValueSmall}>#{booking.order_number || booking.booking_id}</Text>
            </View>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoLabel}>ESTIMATED</Text>
              <Text style={styles.bentoValueSmall}>₹{Number(booking.estimated_order_value || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={[styles.bentoCard, styles.bentoWide]}>
              <Text style={styles.bentoLabel}>PICKUP ADDRESS</Text>
              <Text style={styles.bentoValueSmall}>{booking.pickup_address || 'Address unavailable'}</Text>
            </View>
          </View>

          <View style={styles.actionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Materials in this pickup</Text>
              <Text style={styles.sectionMeta}>{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.materialColumn]}>MATERIAL</Text>
              <Text style={styles.tableHeaderText}>QTY</Text>
              <Text style={styles.tableHeaderText}>RATE</Text>
            </View>
            {selectedItems.map((item) => (
              <View key={String(item.product_id)} style={styles.tableRow}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.materialImage} />
                ) : (
                  <View style={[styles.materialImage, styles.materialImageFallback]}>
                    <MaterialIcons name="recycling" size={18} color="#15803D" />
                  </View>
                )}
                <View style={styles.materialColumn}>
                  <Text style={styles.materialName}>{item.product_name}</Text>
                  <Text style={styles.materialUnit}>{item.unit || 'kg'}</Text>
                </View>
                <Text style={styles.tableCell}>{Number(item.quantity || 0).toFixed(2)}</Text>
                <Text style={styles.tableCell}>₹{Number(item.rate_per_unit || item.max_rate || item.min_rate || 0).toFixed(0)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionCard}>
            <TouchableOpacity
              style={[styles.primaryButton, (isActionLoading || otpSent) && styles.buttonDisabled]}
              onPress={onSendOtp}
              disabled={isActionLoading || otpSent}
            >
              {isActionLoading ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="send" size={19} color="#fff" />}
              <Text style={styles.primaryButtonText}>{otpSent ? 'OTP sent to customer' : 'Send Arrival OTP'}</Text>
            </TouchableOpacity>
          </View>

          {otpSent ? (
            <View style={styles.otpCard}>
              <Text style={styles.otpLabel}>Enter 6-digit OTP</Text>
              <TextInput
                value={otpCode}
                onChangeText={onChangeOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor="#64748B"
                style={styles.otpInput}
              />

              <TouchableOpacity
                style={[styles.primaryButton, isActionLoading && styles.buttonDisabled]}
                onPress={onVerifyOtp}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="verified" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Verify & unlock arrival</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.actionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pickup location</Text>
              <Text style={styles.sectionMeta}>{Number(booking.distance_km || 0).toFixed(1)} km</Text>
            </View>
            <LiveSessionMap
              customerLocation={pickupCoordinates}
              vendorLocation={vendorCoordinates}
              height={380}
              showOverlay={false}
            />
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={closeSheet}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  sheet: {
    backgroundColor: '#F4F7F5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: '#DDE8DF',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    maxHeight: '96%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.42,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: -8 },
      },
      android: { elevation: 18 },
    }),
  },
  dragHandleWrap: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#334155',
  },
  sheetHeader: {
    marginTop: 6,
    marginBottom: 14,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#14532D',
    marginBottom: 12,
  },
  headerBadgeText: {
    color: '#DCFCE7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sheetTitle: {
    color: '#0F172A',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: '#64748B',
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  actionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E1EAE3',
    backgroundColor: '#fff',
    padding: 14,
    gap: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  sheetScrollContent: { paddingBottom: 24, gap: 12 },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bentoCard: { width: '48.2%', minHeight: 78, borderRadius: 18, backgroundColor: '#fff', padding: 13, borderWidth: 1, borderColor: '#E1EAE3' },
  bentoWide: { width: '100%' },
  bentoLabel: { color: '#73907D', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  bentoValue: { color: '#0F172A', fontSize: 18, fontWeight: '900', marginTop: 6 },
  bentoValueSmall: { color: '#0F172A', fontSize: 14, fontWeight: '800', marginTop: 6, lineHeight: 19 },
  bentoMeta: { color: '#64748B', fontSize: 12, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  sectionMeta: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 10 },
  tableHeaderText: { width: 48, color: '#94A3B8', fontSize: 10, fontWeight: '900' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  materialImage: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#E8F5E8' },
  materialImageFallback: { alignItems: 'center', justifyContent: 'center' },
  materialColumn: { flex: 1 },
  materialName: { color: '#1E293B', fontSize: 13, fontWeight: '800' },
  materialUnit: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  tableCell: { width: 48, color: '#334155', fontSize: 12, fontWeight: '800' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  statusText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  statusTextActive: {
    color: '#D1FAE5',
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#14532D',
    backgroundColor: '#08250F',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#DCFCE7',
    fontWeight: '800',
    fontSize: 15,
  },
  otpCard: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
    gap: 12,
  },
  otpLabel: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },
  otpInput: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    color: '#0F172A',
    paddingHorizontal: 16,
    letterSpacing: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#94A3B8',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});

export default ArrivalOtpBottomSheet;
