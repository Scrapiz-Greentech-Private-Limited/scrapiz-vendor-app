import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect, Ellipse, Circle } from 'react-native-svg';
import { ApiService } from '../../services/api';

const OVAL_W = 260;
const OVAL_H = 320;
const OVAL_CY_OFFSET = -30;
const DASH_COUNT = 48;
const BRACKET_SIZE = 24;
const BRACKET_THICKNESS = 3;
const GREEN = '#15803D';
const GREEN_LIGHT = '#22C55E';

type FaceReverificationScreenProps = {
  adminMessage?: string | null;
  onVerified: () => void;
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

export default function FaceReverificationScreen({
  adminMessage,
  onVerified,
  onBack,
}: FaceReverificationScreenProps) {
  const [phase, setPhase] = useState<'intro' | 'capturing' | 'uploading' | 'verified' | 'failed'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState('Position your face inside the frame');
  const [cameraReady, setCameraReady] = useState(false);

  const [screenW, setScreenW] = useState(Dimensions.get('window').width || 375);
  const [screenH, setScreenH] = useState(Dimensions.get('window').height || 812);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const hasStartedRef = useRef(false);
  const captureStartedRef = useRef(false);
  const cameraRef = useRef<any>(null);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    isMountedRef.current = true;
    void requestPermission();
    return () => {
      isMountedRef.current = false;
    };
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

  const failVerification = (message: string) => {
    if (!isMountedRef.current) return;
    setPhase('failed');
    setError(message);
    hasStartedRef.current = false;
    captureStartedRef.current = false;
  };

  const handleSuccess = () => {
    if (isMountedRef.current) {
      setPhase('verified');
      setProgress(100);
      setStageLabel('Identity confirmed. Verification audit complete!');
    }
  };

  const pollFaceStatus = async (maxAttempts = 45): Promise<boolean> => {
    // 45 attempts × 2 s = 90 s total window.
    // InsightFace health-check retries inside the Celery task add up to
    // ~20 s on a cold container start, so we need headroom beyond 50 s.
    const POLL_INTERVAL_MS = 2000;
    const stageMessages = [
      'Processing biometric facial vector...',
      'Running liveness and quality checks...',
      'Generating 512-d facial embedding...',
      'Storing secure identity record...',
    ];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (!isMountedRef.current) return false;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      try {
        const statusData = await ApiService.getVendorFaceStatus();
        if (statusData.status === 'verified') {
          return true;
        }
        if (statusData.status === 'rejected') {
          failVerification(
            statusData.rejection_reason ||
            statusData.message ||
            'Face verification failed. Please retake photo.'
          );
          return false;
        }
        if (isMountedRef.current) {
          // Cycle through descriptive stage messages every ~8 s.
          const msgIndex = Math.floor(attempt / 4) % stageMessages.length;
          setStageLabel(stageMessages[msgIndex]);
          setProgress((prev) => Math.min(prev + 2, 93));
        }
      } catch {
        // Continue polling through transient network blips.
      }
    }
    failVerification('Verification is taking longer than expected. Please retake the photo.');
    return false;
  };

  const runCapture = async () => {
    try {
      if (!cameraRef.current) {
        failVerification('Camera is not ready. Please try again.');
        return;
      }

      setStageLabel('Capturing high-resolution photo...');
      setProgress(20);

      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });

      if (!isMountedRef.current) return;
      setPhase('uploading');
      setProgress(40);
      setStageLabel('Compressing and preparing biometric payload...');

      const compressed = await ImageManipulator.manipulateAsync(
        captured.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      if (!isMountedRef.current) return;
      setProgress(60);
      setStageLabel('Uploading face photo to secure platform...');

      const uploadResult = await ApiService.uploadVendorFaceImageFile({
        face_image: {
          uri: compressed.uri,
          name: 'face_reverification.jpg',
          type: 'image/jpeg',
        },
      });

      if (!isMountedRef.current) return;
      setProgress(75);
      setStageLabel('Analyzing facial biometric features...');

      // If backend instantly returned verified or queued task, poll face status
      if (uploadResult?.status === 'verified') {
        handleSuccess();
        return;
      }

      const verified = await pollFaceStatus();
      if (verified) {
        handleSuccess();
      }
    } catch (err: any) {
      failVerification(err?.message || 'Failed to upload photo. Please check your network.');
    }
  };

  const startVerification = async () => {
    if (hasStartedRef.current) return;

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError('Camera permission is required to verify identity.');
        Alert.alert('Camera Permission Required', 'Please enable camera permissions to complete face verification.');
        return;
      }
    }

    hasStartedRef.current = true;
    captureStartedRef.current = false;
    setPhase('capturing');
    setError(null);
    setProgress(15);
  };

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
    setStageLabel('Position your face inside the frame');
  };

  const CornerBracket = ({
    top,
    left,
    rotate,
  }: {
    top: number;
    left: number;
    rotate?: string;
  }) => (
    <View
      style={[
        styles.cornerBracket,
        { top, left },
        rotate ? { transform: [{ rotate }] } : undefined,
      ]}
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
      {/* Camera View */}
      <CameraView
        ref={(ref) => {
          cameraRef.current = ref;
        }}
        facing="front"
        style={StyleSheet.absoluteFillObject}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* SVG Oval Cutout Mask with Dotted Ring */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <Mask id="mask">
            <Rect x={0} y={0} width={screenW} height={screenH} fill="#fff" />
            <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#000" />
          </Mask>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={screenW}
          height={screenH}
          fill="rgba(0,0,0,0.68)"
          mask="url(#mask)"
        />
        {dots.map((dot, i) => (
          <Circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={1.8}
            fill={phase === 'verified' ? '#22C55E' : 'rgba(255,255,255,0.7)'}
          />
        ))}
      </Svg>

      {/* Corner Brackets around the Oval */}
      <CornerBracket top={cy - ry - 6} left={cx - rx - 6} />
      <CornerBracket top={cy - ry - 6} left={cx + rx + 6 - BRACKET_SIZE} rotate="90deg" />
      <CornerBracket top={cy + ry + 6 - BRACKET_SIZE} left={cx + rx + 6 - BRACKET_SIZE} rotate="180deg" />
      <CornerBracket top={cy + ry + 6 - BRACKET_SIZE} left={cx - rx - 6} rotate="270deg" />

      {/* Top Header */}
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <MaterialIcons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Header Info & Admin Custom Apology/Message */}
      <View style={styles.headingWrap}>
        <View style={styles.badgeRow}>
          <MaterialIcons name="security" size={16} color="#22C55E" />
          <Text style={styles.badgeText}>COMPLIANCE VERIFICATION</Text>
        </View>
        <Text style={styles.heading}>Identity Re-Verification</Text>

        {adminMessage ? (
          <View style={styles.adminMessageCard}>
            <View style={styles.adminMessageHeader}>
              <MaterialIcons name="campaign" size={16} color="#F59E0B" />
              <Text style={styles.adminMessageTitle}>Message from Admin</Text>
            </View>
            <Text style={styles.adminMessageBody}>{adminMessage}</Text>
          </View>
        ) : (
          <Text style={styles.subheading}>
            Platform Administration requested a fresh face photo to keep your account active.
          </Text>
        )}
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {phase === 'intro' ? (
          <View>
            <View style={styles.notice}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>
                Look directly into the front camera in good lighting. Remove face masks and glasses for accurate verification.
              </Text>
            </View>

            {Boolean(error) ? <Text style={styles.introError}>{error}</Text> : null}

            <TouchableOpacity
              onPress={startVerification}
              style={styles.startBtn}
              activeOpacity={0.88}
            >
              <MaterialIcons name="camera-alt" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.startBtnText}>Start Face Verification</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {phase === 'capturing' || phase === 'uploading' ? (
          <View style={styles.progressWrap}>
            <Text style={styles.progressPercent}>{progress}%</Text>
            <Text style={styles.progressLabel}>{stageLabel}</Text>
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
              Please do not close the app while facial embedding is generated.
            </Text>
          </View>
        ) : null}

        {phase === 'verified' ? (
          <View style={styles.verifiedWrap}>
            <View style={styles.verifiedIconWrap}>
              <MaterialIcons name="check-circle" size={48} color="#15803D" />
            </View>
            <Text style={styles.verifiedTitle}>Verification Confirmed!</Text>
            <Text style={styles.verifiedSubtitle}>
              Your facial biometric is verified. You now have full access to resume active bookings.
            </Text>
            <TouchableOpacity
              onPress={onVerified}
              style={styles.startBtn}
              activeOpacity={0.88}
            >
              <Text style={styles.startBtnText}>Continue to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {phase === 'failed' ? (
          <View style={styles.errorWrap}>
            <View style={styles.errorIconWrap}>
              <MaterialIcons name="error-outline" size={40} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Verification Failed</Text>
            <Text style={styles.errorMsg}>
              {error || 'Unable to confirm face identity. Please retake photo in better lighting.'}
            </Text>
            <TouchableOpacity
              onPress={retry}
              style={styles.retryBtn}
              activeOpacity={0.88}
            >
              <Text style={styles.retryBtnText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  headingWrap: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  badgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  heading: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subheading: {
    color: '#D1D5DB',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  adminMessageCard: {
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  adminMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  adminMessageTitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  adminMessageBody: {
    color: '#F3F4F6',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
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
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 20,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 10,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
    marginTop: 4,
    marginRight: 10,
    flexShrink: 0,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  progressWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  progressPercent: {
    fontSize: 34,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: -0.5,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
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
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  verifiedWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  verifiedIconWrap: {
    marginBottom: 8,
  },
  verifiedTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 4,
  },
  verifiedSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  errorIconWrap: {
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorMsg: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  retryBtn: {
    height: 50,
    width: '100%',
    borderRadius: 25,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
