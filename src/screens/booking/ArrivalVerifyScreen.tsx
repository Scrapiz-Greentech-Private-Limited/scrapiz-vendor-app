import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from "react-native-safe-area-context" 
import Svg, {
  Defs,
  Mask,
  Rect,
  Ellipse,
  Circle,
} from 'react-native-svg';
import { API_BASE_URL } from '../../config/api';
import { AuthStorageService } from '../../services/authStorage';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';

// ─── Layout constants ──────────────────────────────────────────────────────────
const OVAL_W = 260;
const OVAL_H = 320;
const OVAL_CX = '50%';  // centered horizontally
const OVAL_CY_OFFSET = -30; // shift oval up slightly from center

// Number of dashes around the oval perimeter
const DASH_COUNT = 48;

type ArrivalVerifyRouteParams = {
  order_id: string;
  bookingContext?: Record<string, unknown>;
};

type ArrivalVerifyResponse = {
  verified?: boolean;
  uncertain?: boolean;
  reason?: 'identity_mismatch' | 'not_at_location' | string;
  message?: string;
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

// ─── Generates evenly-spaced dot positions along an ellipse perimeter ─────────
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
  const [failureReason, setFailureReason] = useState<
    'identity_mismatch' | 'not_at_location' | null
  >(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [screenW, setScreenW] = useState(375);
  const [screenH, setScreenH] = useState(812);

  // Animated progress bar width
  const progressAnim = useRef(new Animated.Value(0)).current;

  const hasStartedRef = useRef(false);
  const isMountedRef = useRef(true);
  const cameraRef = useRef<{
    takePictureAsync: (opts?: {
      quality?: number;
      skipProcessing?: boolean;
    }) => Promise<{ uri: string }>;
  } | null>(null);
  const captureStartedRef = useRef(false);

  const failVerification = (message: string, reason: 'identity_mismatch' | 'not_at_location' | null = null) => {
    if (!isMountedRef.current) return;
    setPhase('failed');
    setFailureReason(reason);
    setError(message);
    onError?.(message);
  };

  const resolvedOrderId = route?.params.order_id ?? orderId ?? '';
  const resolvedBookingContext =
    route?.params.bookingContext ?? bookingContext ?? { order_id: resolvedOrderId };

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Warm up the preview as soon as this screen opens. Previously the camera
  // was mounted only after Start Verification was pressed, which allowed the
  // first capture attempt to race CameraView initialization.
  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) return;
    void requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!permission?.granted) {
      setCameraReady(false);
    }
  }, [permission?.granted]);

  // Animate progress bar whenever progress value changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // ── Oval geometry (computed from measured screen dimensions) ────────────────
  const cx = screenW / 2;
  const cy = screenH / 2 + OVAL_CY_OFFSET;
  const rx = OVAL_W / 2;
  const ry = OVAL_H / 2;

  const dots = ellipseDots(cx, cy, rx, ry, DASH_COUNT);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleVerified = () => {
    if (isMountedRef.current) {
      setPhase('verified');
      setProgress(100);
    }
    if (navigation) {
      navigation.navigate('ActiveJobScreen', resolvedBookingContext);
      return;
    }
    onVerified?.(resolvedBookingContext);
  };

  const runCapture = async () => {
    if (!resolvedOrderId) {
      failVerification('Pickup order could not be loaded.');
      return;
    }
    try {
      // onCameraReady and the native ref are delivered on separate turns on
      // some Android devices. Give the native preview one frame to settle.
      if (!cameraReady || !cameraRef.current) {
        throw new Error('Camera not ready.');
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
      if (!cameraRef.current) throw new Error('Camera not ready.');

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
      formData.append('arrival_photo', {
        uri: compressed.uri,
        name: 'arrival-photo.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
      formData.append('order_id', resolvedOrderId);
      formData.append('vendor_lat', String(vendorLat));
      formData.append('vendor_lng', String(vendorLng));

      const response = await fetch(`${API_BASE_URL}/api/booking/arrival-verify/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: formData,
      });

      const body = (await response.json().catch(() => null)) as ArrivalVerifyResponse | null;

      if (body?.verified || body?.uncertain) { handleVerified(); return; }

      if (body?.reason === 'identity_mismatch') {
        failVerification('Identity could not be confirmed. Please try again.', 'identity_mismatch');
        return;
      }

      if (body?.reason === 'not_at_location') {
        failVerification('Please move closer to the pickup location.', 'not_at_location');
        return;
      }

      failVerification(body?.message ?? 'Arrival verification failed.');
    } catch {
      failVerification('Arrival verification failed. Please try again.');
    }
  };

  const startVerification = async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const perm = permission?.granted ? permission : await requestPermission();
    if (!perm.granted) {
      hasStartedRef.current = false;
      setPhase('intro');
      setError('Camera access is required for face verification.');
      onError?.('Camera access is required for face verification.');
      Alert.alert('Camera required', 'Please allow camera access and tap Start Verification again.');
      return;
    }

    setPhase('capturing');
  };

  useEffect(() => {
    if (phase !== 'capturing' || !cameraReady || captureStartedRef.current) return;
    captureStartedRef.current = true;
    void runCapture();
  }, [cameraReady, phase]);

  const retry = () => {
    hasStartedRef.current = false;
    captureStartedRef.current = false;
    setPhase('intro');
    setError(null);
    setProgress(0);
    setFailureReason(null);
  };

  // ── Uploading label ───────────────────────────────────────────────────────────
  const uploadLabel =
    progress < 30
      ? 'Confirming your identity…'
      : progress < 70
      ? 'Matching your profile…'
      : progress < 100
      ? 'Almost there…'
      : 'Identity confirmed. Unlocking pickup.';

  // ── Shared camera + mask overlay (used in all phases) ───────────────────────
  const CameraLayer = () => (
    <>
      {permission?.granted && (
          <CameraView
          ref={(ref) => {
            cameraRef.current = ref as unknown as typeof cameraRef.current;
          }}
          style={StyleSheet.absoluteFillObject}
            facing="front"
            mute
            onCameraReady={() => setCameraReady(true)}
            onMountError={(event) => {
              setCameraReady(false);
              failVerification(event?.message || 'Camera could not be started. Please check camera permission.');
            }}
          />
      )}

      {/* SVG inverted mask: darkens everything EXCEPT the oval */}
      <Svg
        style={StyleSheet.absoluteFillObject}
        width={screenW}
        height={screenH}
      >
        <Defs>
          <Mask id="ovalMask" x="0" y="0" width={screenW} height={screenH}>
            {/* White = visible in mask (will be kept) */}
            <Rect x="0" y="0" width={screenW} height={screenH} fill="white" />
            {/* Black = cut out (the oval — will reveal camera beneath) */}
            <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
          </Mask>
        </Defs>

        {/* Dark overlay applied everywhere EXCEPT the oval cutout */}
        <Rect
          x="0"
          y="0"
          width={screenW}
          height={screenH}
          fill="rgba(10,20,10,0.72)"
          mask="url(#ovalMask)"
        />

        {/* White dotted border along the oval perimeter */}
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
    </>
  );

  // ── Corner bracket component ─────────────────────────────────────────────────
  const CornerBracket = ({
    top, left, right, bottom, rotate,
  }: {
    top?: number; left?: number; right?: number; bottom?: number; rotate?: string;
  }) => (
    <View
      style={[
        styles.cornerBracket,
        top !== undefined && { top },
        left !== undefined && { left },
        right !== undefined && { right },
        bottom !== undefined && { bottom },
        rotate ? { transform: [{ rotate }] } : undefined,
      ]}
    >
      <View style={styles.bracketH} />
      <View style={styles.bracketV} />
    </View>
  );

  // ── Bracket positions relative to oval box ───────────────────────────────────
  const ovalTop = cy - ry;
  const ovalLeft = cx - rx;
  const ovalRight = cx + rx;
  const ovalBottom = cy + ry;
  const bracketInset = 8;

  return (
    <SafeAreaView
      style={styles.safe}
      onLayout={(e) => {
        setScreenW(e.nativeEvent.layout.width);
        setScreenH(e.nativeEvent.layout.height);
      }}
    >
      <CameraLayer />

      {/* ── Back button ─────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack ?? navigation?.goBack}
        accessibilityLabel="Go back"
      >
        <Text style={styles.backBtnText}>‹</Text>
      </TouchableOpacity>

      {/* ── Close / X button (top right) ────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onBack ?? navigation?.goBack}
        accessibilityLabel="Close"
      >
        <View style={styles.closeBtnInner}>
          <Text style={styles.closeBtnText}>✕</Text>
        </View>
      </TouchableOpacity>

      {/* ── Heading ─────────────────────────────────────────────────────────── */}
      <View style={styles.headingWrap}>
        <Text style={styles.heading}>Position your face within the frame</Text>
      </View>

      {/* ── Corner bracket markers around oval ──────────────────────────────── */}
      {/* Top-left */}
      <CornerBracket
        top={ovalTop - bracketInset}
        left={ovalLeft - bracketInset}
      />
      {/* Top-right */}
      <CornerBracket
        top={ovalTop - bracketInset}
        left={ovalRight - 28 + bracketInset}
        rotate="90deg"
      />
      {/* Bottom-left */}
      <CornerBracket
        top={ovalBottom - 28 + bracketInset}
        left={ovalLeft - bracketInset}
        rotate="-90deg"
      />
      {/* Bottom-right */}
      <CornerBracket
        top={ovalBottom - 28 + bracketInset}
        left={ovalRight - 28 + bracketInset}
        rotate="180deg"
      />

      {/* ── Bottom panel ────────────────────────────────────────────────────── */}
      <View style={styles.bottomPanel}>
        {/* ── Uploading state: progress ring + label ─────────────────────── */}
        {phase === 'uploading' && (
          <View style={styles.progressWrap}>
            <Text style={styles.progressPercent}>{progress}%</Text>
            <Text style={styles.progressLabel}>{uploadLabel}</Text>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressHint}>
              Kindly remain patient as our system processes your face verification.
              Make sure to look directly at the camera and keep a neutral expression.
            </Text>
          </View>
        )}

        {/* ── Capturing state ────────────────────────────────────────────── */}
        {phase === 'capturing' && (
          <View style={styles.progressWrap}>
            <Text style={styles.progressLabel}>Look straight at the camera…</Text>
            <Text style={styles.progressHint}>
              Keep your face centered. Capture starts automatically.
            </Text>
          </View>
        )}

        {/* ── Failed state ───────────────────────────────────────────────── */}
        {phase === 'failed' && error && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>Verification stopped</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
            {failureReason === 'not_at_location' && (
              <Pressable
                style={[styles.retryBtn, styles.outlineBtn]}
                onPress={onBack ?? navigation?.goBack}
              >
                <Text style={[styles.retryBtnText, styles.outlineBtnText]}>Go Back</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Intro state: notice + start button ─────────────────────────── */}
        {phase === 'intro' && (
          <>
            <View style={styles.notice}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>
                Make sure you are in a place where there is enough light to take a clear photo.
              </Text>
            </View>
            {error && <Text style={styles.introError}>{error}</Text>}
            <Pressable style={styles.startBtn} onPress={() => void startVerification()}>
              <Text style={styles.startBtnText}>Start Verification</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const BRACKET_SIZE = 28;
const BRACKET_THICKNESS = 3;
const GREEN = '#16A34A';
const GREEN_LIGHT = '#22C55E';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Navigation ──────────────────────────────────────────────────────────────
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 34,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    zIndex: 10,
  },
  closeBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Heading ─────────────────────────────────────────────────────────────────
  headingWrap: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 32,
  },
  heading: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ── Corner brackets ─────────────────────────────────────────────────────────
  cornerBracket: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    zIndex: 10,
  },
  bracketH: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BRACKET_SIZE,
    height: BRACKET_THICKNESS,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 2,
  },
  bracketV: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BRACKET_THICKNESS,
    height: BRACKET_SIZE,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 2,
  },

  // ── Bottom panel ─────────────────────────────────────────────────────────────
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 10,
  },

  // ── Progress ─────────────────────────────────────────────────────────────────
  progressWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  progressPercent: {
    fontSize: 36,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: -0.5,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginTop: 4,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: GREEN,
    borderRadius: 3,
  },
  progressHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 17,
  },

  // ── Error ────────────────────────────────────────────────────────────────────
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  errorMsg: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 16,
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  outlineBtn: {
    marginTop: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: GREEN,
  },
  outlineBtnText: {
    color: GREEN,
  },

  // ── Intro ────────────────────────────────────────────────────────────────────
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B7791F',
    marginTop: 3,
    marginRight: 10,
    flexShrink: 0,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#7C5A1A',
    lineHeight: 17,
  },
  introError: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  startBtn: {
    height: 54,
    borderRadius: 27,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
