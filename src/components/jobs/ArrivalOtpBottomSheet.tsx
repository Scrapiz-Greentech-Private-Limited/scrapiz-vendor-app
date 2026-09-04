import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

interface ArrivalOtpBottomSheetProps {
  visible: boolean;
  selfieUploading: boolean;
  selfieRemoteUrl: string;
  otpSent: boolean;
  otpCode: string;
  isActionLoading: boolean;
  onClose: () => void;
  onCaptureSelfie: () => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onChangeOtp: (value: string) => void;
}

const ArrivalOtpBottomSheet = ({
  visible,
  selfieUploading,
  selfieRemoteUrl,
  otpSent,
  otpCode,
  isActionLoading,
  onClose,
  onCaptureSelfie,
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

          <View style={styles.sheetHeader}>
            <View style={styles.headerBadge}>
              <MaterialIcons name="lock-open" size={16} color="#DCFCE7" />
              <Text style={styles.headerBadgeText}>Arrival OTP</Text>
            </View>
            <Text style={styles.sheetTitle}>Verify customer arrival</Text>
            <Text style={styles.sheetSubtitle}>
              Capture the selfie, send the OTP, then let the customer confirm from the same order view.
            </Text>
          </View>

          <View style={styles.actionCard}>
            <TouchableOpacity
              style={[styles.primaryButton, selfieUploading && styles.buttonDisabled]}
              onPress={onCaptureSelfie}
              disabled={selfieUploading}
            >
              {selfieUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="photo-camera" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>Capture & upload selfie</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.statusRow}>
              <MaterialIcons
                name={selfieRemoteUrl ? 'check-circle' : 'radio-button-unchecked'}
                size={18}
                color={selfieRemoteUrl ? '#22C55E' : '#94A3B8'}
              />
              <Text style={[styles.statusText, selfieRemoteUrl ? styles.statusTextActive : null]}>
                {selfieRemoteUrl ? 'Selfie uploaded and ready for OTP.' : 'Selfie upload required before OTP.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, (!selfieRemoteUrl || isActionLoading) && styles.buttonDisabled]}
              onPress={onSendOtp}
              disabled={!selfieRemoteUrl || isActionLoading}
            >
              <MaterialIcons name="send" size={18} color="#DCFCE7" />
              <Text style={styles.secondaryButtonText}>Send arrival OTP</Text>
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

          <TouchableOpacity style={styles.closeButton} onPress={closeSheet}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    backgroundColor: '#050505',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    minHeight: '72%',
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
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.26)',
    marginBottom: 12,
  },
  headerBadgeText: {
    color: '#DCFCE7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  actionCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0F172A',
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
    borderColor: '#1F2937',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    gap: 12,
  },
  otpLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '800',
  },
  otpInput: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0B1120',
    color: '#fff',
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