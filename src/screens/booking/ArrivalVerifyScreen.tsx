import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect, Ellipse, Circle } from 'react-native-svg';
import { API_BASE_URL, FRONTEND_KEY } from '../../services/api';
import { AuthStorageService } from '../../services/authStorage';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';
import { arrivalVerificationState } from '../../services/arrivalVerificationState';

const OVAL_W = 260;
const OVAL_H = 320;
const OVAL_CY_OFFSET = -30;
const DASH_COUNT = 48;

type ArrivalVerifyRouteParams = {
  order_id: string;
  bookingContext?: Record<string, unknown>;
};

type ArrivalVerifyResponse = {
  verified?: boolean;
  uncertain?: boolean;
  reason?: 'identity_mismatch' | 'not_at_location' | 'face_service_unavailable' | 'face_service_error' | 'no_stored_embedding' | string;
  message?: string;
  detail?: string;
};

type ArrivalVerifyScreenProps = {
  route?: { params: ArrivalVerifyRouteParams };
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack?: () => void;
  };
  orderId?: string;
  bookingContext?: Record<string, unknown>;
  onVerified?: (params?: Record<string, unknown>) => void;
  onError?: (message: string) => void;
  onBack?: () => void;
};

function ellipseDots(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  });
}

export default function ArrivalVerifyScreen({
  route,
  navigation,
  orderId,
  bookingContext,
  onVerified,
  onError,
  onBack,
}: ArrivalVerifyScreenProps) {
  const [phase, setPhase] = useState<
    'intro' | 'capturing' | 'uploading' | 'verified' | 'failed'
  >('intro');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [isCheckingStoredVerification, setIsCheckingStoredVerification] = useState(true);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  const [screenW, setScreenW] = useState(375);
  const [screenH, setScreenH] = useState(812);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasStartedRef = useRef(false);
  const captureStartedRef = useRef(false);
  const isMountedRef = useRef(true);
  const permissionRequestedRef = useRef(false);
  const cameraRef = useRef<{
    takePictureAsync: (opts?: {
      quality?: number;
      skipProcessing?: boolean;
    }) => Promise<{ uri: string }>;
  } | null>(null);

  const resolvedOrderId = route?.params.order_id ?? orderId ?? '';
  const resolvedBookingContext =
    route?.params.bookingContext ?? bookingContext ?? { order_id: resolvedOrderId };

  useEffect(() => {
    const checkStoredVerification = async () => {
      if (!resolvedOrderId) {
        setIsCheckingStoredVerification(false);
        return;
      }
      try {
        const bookingId = resolvedBookingContext?.bookingId as string | undefined;
        const alreadyVerified = await arrivalVerificationState.isVerified(resolvedOrderId, bookingId);
        if (alreadyVerified && isMountedRef.current) {
          // Already verified — transition immediately without re-writing the record.
          // We call handleVerified() but we must not re-run markVerified since
          // the record already exists.  Set phase/progress directly then call onVerified.
          setPhase('verified');
          setProgress(100);
          // Yield one tick so the UI update flushes before parent callback.
          setTimeout(() => {
            if (!isMountedRef.current) return;
            if (onVerified) onVerified(resolvedBookingContext);
          }, 600);
          return;
        }
      } catch (err) {
        console.warn('[ArrivalVerification] Failed to check stored verification:', err);
      } finally {
        if (isMountedRef.current) {
          setIsCheckingStoredVerification(false);
        }
      }
    };
    void checkStoredVerification();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedOrderId]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!permissionRequestedRef.current && !permission?.granted) {
      permissionRequestedRef.current = true;
      void requestPermission();
    }
    return () => {
      isMountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const cx = screenW / 2;
  const cy = screenH / 2 + OVAL_CY_OFFSET;
  const rx = OVAL_W / 2;
  const ry = OVAL_H / 2;
  const dots = ellipseDots(cx, cy, rx, ry, DASH_COUNT);

  const failVerification = (message: string, reason: string | null = null) => {
    if (!isMountedRef.current) return;
    setPhase('failed');
    setFailureReason(reason);
    setError(message);
    onError?.(message);
  };

  const handleVerified = async () => {
    const bookingId = resolvedBookingContext?.bookingId as string | undefined;

    // Persist BEFORE transitioning. markVerified is fire-and-forget elsewhere
    // which means a process kill between the navigate call and the AsyncStorage
    // write can lose the record. We await here so the write is durable before
    // we hand control back to the parent / navigation stack.
    try {
      await arrivalVerificationState.markVerified({ orderId: resolvedOrderId, bookingId });
    } catch (err) {
      // Non-fatal: log but don't block the flow — vendor already passed biometrics.
      console.warn('[ArrivalVerification] Failed to persist verification state:', err);
    }

    if (!isMountedRef.current) return;
    setPhase('verified');
    setProgress(100);

    // Small deliberate pause so the vendor sees the green checkmark before
    // the screen transitions — avoids a jarring instant swap.
    await new Promise<void>((resolve) => setTimeout(resolve, 600));

    if (!isMountedRef.current) return;

    if (navigation) {
      navigation.navigate('ActiveJobScreen', resolvedBookingContext);
      return;
    }
    if (onVerified) {
      onVerified(resolvedBookingContext);
    }
  };

  const runCapture = async () => {
    if (!resolvedOrderId) {
      failVerification('Pickup order could not be loaded.');
      return;
    }
    try {
      if (!cameraRef.current) {
        failVerification('Camera not ready. Please try again.');
        return;
      }
      const { uri: captured } = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });
      if (isMountedRef.current) {
        setPhase('uploading');
        setProgress(20);
        setError(null);
        setFailureReason(null);
      }
      const compressed = await ImageManipulator.manipulateAsync(
        captured,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (isMountedRef.current) setProgress(50);
      const token = await AuthStorageService.getToken();
      if (!token) {
        failVerification('Authentication expired. Please sign in again.');
        return;
      }
      const locPerm = await Location.requestForegroundPermissionsAsync();
      if (locPerm.status !== 'granted') {
        failVerification('Location access required for arrival verification.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const fallback = vendorLocationStreamer.getLatestCoords();
      const vendorLat = loc.coords.latitude ?? fallback?.latitude;
      const vendorLng = loc.coords.longitude ?? fallback?.longitude;
      if (typeof vendorLat !== 'number' || typeof vendorLng !== 'number') {
        failVerification('Current location could not be determined.');
        return;
      }
      if (isMountedRef.current) setProgress(75);
      const formData = new FormData();
      formData.append('arrival_photo', { uri: compressed.uri, name: 'arrival-photo.jpg', type: 'image/jpeg' } as unknown as Blob);
      formData.append('order_id', resolvedOrderId);
      formData.append('vendor_lat', String(vendorLat));
      formData.append('vendor_lng', String(vendorLng));
      const headers: Record<string, string> = {
        'x-auth-app': FRONTEND_KEY,
        Authorization: `Bearer ${token}`,
      };
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/booking/arrival-verify/`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as ArrivalVerifyResponse | null;
      if (body?.verified || body?.uncertain) {
        await handleVerified();
        return;
      }
      if (body?.reason === 'identity_mismatch') {
        failVerification('Identity could not be confirmed. Please try again.', 'identity_mismatch');
        return;
      }
      if (body?.reason === 'not_at_location') {
        failVerification('Please move closer to the pickup location.', 'not_at_location');
        return;
      }
      if (body?.reason === 'no_stored_embedding') {
        failVerification('No biometric profile found. Please register your face in settings first.', 'no_stored_embedding');
        return;
      }
      if (body?.reason === 'face_service_unavailable' || body?.reason === 'face_service_error') {
        failVerification(body?.detail || 'Biometric verification service is temporarily unavailable.', body?.reason);
        return;
      }
      failVerification(body?.detail || body?.message || 'Arrival verification failed.');
    } catch {
      failVerification('Arrival verification failed. Please check your network and try again.');
    }
  };

  const startVerification = async () => {
    if (hasStartedRef.current) return;
    if (!permission?.granted) {
      if (!permissionRequestedRef.current) permissionRequestedRef.current = true;
      const result = await requestPermission();
      if (!result.granted) {
        setError('Camera access is required for face verification.');
        Alert.alert('Camera required', 'Please allow camera access and tap Start Verification again.');
        return;
      }
    }
    hasStartedRef.current = true;
    captureStartedRef.current = false;
    setPhase('capturing');
    setError(null);
  };

  useEffect(() => {
    if (isCheckingStoredVerification) return;
    if (phase !== 'intro') return;
    if (hasStartedRef.current) return;
    if (!permission?.granted) return;
    hasStartedRef.current = true;
    captureStartedRef.current = false;
    setPhase('capturing');
  }, [isCheckingStoredVerification, permission?.granted, phase]);

  useEffect(() => {
    if (phase !== 'capturing' || !cameraReady || captureStartedRef.current) return;
    captureStartedRef.current = true;
    void runCapture();
  }, [phase, cameraReady]);

  const retry = () => {
    hasStartedRef.current = false;
    captureStartedRef.current = false;
    setPhase('intro');
    setError(null);
    setProgress(0);
    setFailureReason(null);
  };

  const uploadLabel =
    progress < 30 ? 'Confirming your identity...'
    : progress < 70 ? 'Matching your profile...'
    : progress < 100 ? 'Almost there...'
    : 'Identity confirmed. Unlocking pickup.';

  const ovalTop = cy - ry;
  const ovalLeft = cx - rx;
  const ovalRight = cx + rx;
  const ovalBottom = cy + ry;
  const bracketInset = 8;

  const CornerBracket = ({ top, left, rotate }: { top: number; left: number; rotate?: string }) => (
    <View
      style={[styles.cornerBracket, { top, left }, rotate ? { transform: [{ rotate }] } : undefined]}
    >
      <View style={styles.bracketH} />
      <View style={styles.bracketV} />
    </View>
  );

  return (
    <SafeAreaView
      style={styles.safe}
      onLayout={(e) => {
        setScreenW(e.nativeEvent.layout.width);
        setScreenH(e.nativeEvent.layout.height);
      }}
    >
      {/*
        CameraView is mounted ONCE for the entire lifetime of this screen.
        It is never conditionally swapped. Previously the isCheckingStoredVerification
        ternary caused React to destroy and recreate CameraView when the cache check
        resolved, restarting the native camera session and losing onCameraReady.
        The checking indicator is now a sibling overlay on top of the live camera.
      */}
      <CameraView
        ref={(ref) => { cameraRef.current = ref as unknown as typeof cameraRef.current; }}
        style={StyleSheet.absoluteFillObject}
        facing="front"
        mute
        onCameraReady={() => setCameraReady(true)}
        onMountError={(event) => {
          setCameraReady(false);
          failVerification(event?.message ?? 'Camera could not be started. Please check camera permission.');
        }}
      />

      <Svg style={StyleSheet.absoluteFillObject} width={screenW} height={screenH} pointerEvents="none">
        <Defs>
          <Mask id="ovalMask" x="0" y="0" width={screenW} height={screenH}>
            <Rect x="0" y="0" width={screenW} height={screenH} fill="white" />
            <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
          </Mask>
        </Defs>
        <Rect x="0" y="0" width={screenW} height={screenH} fill="rgba(10,20,10,0.72)" mask="url(#ovalMask)" />
        {dots.map((dot, i) => (
          <Circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={i % 2 === 0 ? 2.8 : 1.6}
            fill={i % 2 === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
          />
        ))}
      </Svg>

      {isCheckingStoredVerification && (
        <View style={styles.checkingOverlay}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.checkingText}>Checking verification status...</Text>
        </View>
      )}

      {!isCheckingStoredVerification && (
        <>
          <TouchableOpacity style={styles.backBtn} onPress={onBack ?? navigation?.goBack} accessibilityLabel="Go back">
            <Text style={styles.backBtnText}>{'<'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onBack ?? navigation?.goBack} accessibilityLabel="Close">
            <View style={styles.closeBtnInner}>
              <Text style={styles.closeBtnText}>{'x'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headingWrap}>
            <Text style={styles.heading}>Position your face within the frame</Text>
          </View>

          <CornerBracket top={ovalTop - bracketInset} left={ovalLeft - bracketInset} />
          <CornerBracket top={ovalTop - bracketInset} left={ovalRight - 28 + bracketInset} rotate="90deg" />
          <CornerBracket top={ovalBottom - 28 + bracketInset} left={ovalLeft - bracketInset} rotate="-90deg" />
          <CornerBracket top={ovalBottom - 28 + bracketInset} left={ovalRight - 28 + bracketInset} rotate="180deg" />

          <View style={styles.bottomPanel}>
            {phase === 'verified' && (
              <View style={styles.progressWrap}>
                <Text style={styles.progressPercent}>{String.fromCharCode(10003)}</Text>
                <Text style={styles.progressLabel}>Identity confirmed!</Text>
                <Text style={styles.progressHint}>Face verified successfully. Proceeding to next step...</Text>
              </View>
            )}
            {phase === 'uploading' && (
              <View style={styles.progressWrap}>
                <Text style={styles.progressPercent}>{progress}%</Text>
                <Text style={styles.progressLabel}>{uploadLabel}</Text>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
                  />
                </View>
                <Text style={styles.progressHint}>
                  Kindly remain patient as our system processes your face verification.
                  Make sure to look directly at the camera and keep a neutral expression.
                </Text>
              </View>
            )}
            {phase === 'capturing' && (
              <View style={styles.progressWrap}>
                <Text style={styles.progressLabel}>{cameraReady ? 'Hold still...' : 'Starting camera...'}</Text>
                <Text style={styles.progressHint}>Keep your face centred. Capture starts automatically.</Text>
              </View>
            )}
            {phase === 'failed' && error && (
              <View style={styles.errorWrap}>
                <Text style={styles.errorTitle}>Verification stopped</Text>
                <Text style={styles.errorMsg}>{error}</Text>
                <Pressable style={styles.retryBtn} onPress={retry}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </Pressable>
                {failureReason === 'not_at_location' && (
                  <Pressable style={[styles.retryBtn, styles.outlineBtn]} onPress={onBack ?? navigation?.goBack}>
                    <Text style={[styles.retryBtnText, styles.outlineBtnText]}>Go Back</Text>
                  </Pressable>
                )}
              </View>
            )}
            {phase === 'intro' && (
              <>
                <View style={styles.notice}>
                  <View style={styles.noticeDot} />
                  <Text style={styles.noticeText}>
                    Make sure you are in a place where there is enough light to take a clear photo.
                  </Text>
                </View>
                {error ? <Text style={styles.introError}>{error}</Text> : null}
                <Pressable style={styles.startBtn} onPress={() => void startVerification()}>
                  <Text style={styles.startBtnText}>Start Verification</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const BRACKET_SIZE = 28;
const BRACKET_THICKNESS = 3;
const GREEN = '#16A34A';
const GREEN_LIGHT = '#22C55E';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },

  checkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  checkingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },

  backBtn: {
    position: 'absolute', top: 52, left: 16,
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  backBtnText: { color: '#fff', fontSize: 32, lineHeight: 34 },

  closeBtn: { position: 'absolute', top: 52, right: 16, zIndex: 10 },
  closeBtnInner: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  headingWrap: {
    position: 'absolute', top: 100, left: 0, right: 0,
    alignItems: 'center', zIndex: 10, paddingHorizontal: 32,
  },
  heading: { color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2 },

  cornerBracket: { position: 'absolute', width: BRACKET_SIZE, height: BRACKET_SIZE, zIndex: 10 },
  bracketH: {
    position: 'absolute', top: 0, left: 0,
    width: BRACKET_SIZE, height: BRACKET_THICKNESS,
    backgroundColor: GREEN_LIGHT, borderRadius: 2,
  },
  bracketV: {
    position: 'absolute', top: 0, left: 0,
    width: BRACKET_THICKNESS, height: BRACKET_SIZE,
    backgroundColor: GREEN_LIGHT, borderRadius: 2,
  },

  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    zIndex: 10,
  },

  progressWrap: { alignItems: 'center', paddingVertical: 4 },
  progressPercent: { fontSize: 36, fontWeight: '800', color: GREEN, letterSpacing: -0.5 },
  progressLabel: { fontSize: 16, fontWeight: '600', color: '#111', marginTop: 4, textAlign: 'center' },
  progressTrack: {
    width: '100%', height: 6,
    backgroundColor: '#E5E7EB', borderRadius: 3, marginTop: 14, overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: GREEN, borderRadius: 3 },
  progressHint: { marginTop: 12, fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 17 },

  errorWrap: { alignItems: 'center', paddingVertical: 4 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  errorMsg: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: {
    marginTop: 16, width: '100%', height: 52, borderRadius: 26,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: { marginTop: 10, backgroundColor: 'transparent', borderWidth: 2, borderColor: GREEN },
  outlineBtnText: { color: GREEN },

  notice: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF8E8', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  noticeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#B7791F', marginTop: 3, marginRight: 10, flexShrink: 0,
  },
  noticeText: { flex: 1, fontSize: 12, color: '#7C5A1A', lineHeight: 17 },
  introError: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  startBtn: {
    height: 54, borderRadius: 27,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOpacity: 0.35, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});