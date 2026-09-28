import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect, Ellipse, Circle } from 'react-native-svg';
import { getReviewerSeedData, isVendorReviewMode } from '../../config/reviewMode';
import { API_BASE_URL } from '../../config/api';
import { AuthStorageService } from '../../services/authStorage';
import { runFaceCaptureFlow } from './faceCaptureFlow';

type FaceCaptureScreenProps = {
  onBack?: () => void;
  onNext?: () => void;
  navigation?: {
    navigate: (screen: string) => void;
  };
};

const OVAL_W = 260;
const OVAL_H = 320;
const OVAL_CY_OFFSET = -30;
const DASH_COUNT = 48;

type CameraCaptureRef = {
  takePictureAsync: (options?: { quality?: number; skipProcessing?: boolean }) => Promise<{ uri: string }>;
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

export default function FaceCaptureScreen({ onBack, onNext, navigation }: FaceCaptureScreenProps) {
  const reviewModeEnabled = isVendorReviewMode();
  const reviewerSeed = getReviewerSeedData();

  const [phase, setPhase] = useState<
    'intro' | 'capturing' | 'uploading' | 'verified' | 'failed'
  >('intro');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);

  const [screenW, setScreenW] = useState(375);
  const [screenH, setScreenH] = useState(812);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasStartedRef = useRef(false);
  const captureStartedRef = useRef(false);
  const isMountedRef = useRef(true);
  const permissionRequestedRef = useRef(false);
  const cameraRef = useRef<CameraCaptureRef | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    if (!permissionRequestedRef.current && !permission?.granted) {
      permissionRequestedRef.current = true;
      void requestPermission();
    }
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
  };

  const handleVerified = async () => {
    if (!isMountedRef.current) return;
    setPhase('verified');
    setProgress(100);

    await new Promise<void>((resolve) => setTimeout(resolve, 600));

    if (!isMountedRef.current) return;

    if (navigation) {
      navigation.navigate('OnboardingStatus');
      return;
    }
    if (onNext) {
      onNext();
    }
  };

  const runCapture = async () => {
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
      }

      const compressed = await ImageManipulator.manipulateAsync(
        captured,
        [{ resize: { width: 640 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      
      if (isMountedRef.current) setProgress(40);

      const token = await AuthStorageService.getToken();
      if (!token) {
        failVerification('Authentication expired. Please sign in again.');
        return;
      }

      await runFaceCaptureFlow({
        uri: compressed.uri,
        token,
        baseUrl: API_BASE_URL,
        onStage: (stage) => {
          if (!isMountedRef.current) return;
          setProgress(stage.progress);
        },
        onTaskId: (nextTaskId) => {
          if (isMountedRef.current) {
            setTaskId(nextTaskId);
          }
        },
        onRejected: async (message) => {
          if (isMountedRef.current) {
            failVerification(message);
          }
        },
        onFailure: async (message) => {
          if (isMountedRef.current) {
            failVerification(message);
          }
        },
        onVerified: async () => {
          await handleVerified();
        },
      });
    } catch {
      failVerification('Face capture failed. Please try again.');
    }
  };

  const startVerification = async () => {
    if (hasStartedRef.current) return;
    if (!permission?.granted) {
      if (!permissionRequestedRef.current) permissionRequestedRef.current = true;
      const result = await requestPermission();
      if (!result.granted) {
        setError('Camera access is required for face verification.');
        return;
      }
    }
    hasStartedRef.current = true;
    captureStartedRef.current = false;
    setPhase('capturing');
    setError(null);
  };

  useEffect(() => {
    if (phase !== 'intro') return;
    if (hasStartedRef.current) return;
    if (!permission?.granted) return;
    hasStartedRef.current = true;
    captureStartedRef.current = false;
    setPhase('capturing');
  }, [permission?.granted, phase]);

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
    setTaskId(null);
  };

  const handleReviewModeComplete = () => {
    setTaskId(`review-face-${Date.now()}`);
    setError(null);
    void handleVerified();
  };

  const uploadLabel =
    progress < 30 ? 'Setting up your identity...'
    : progress < 70 ? 'Building your profile...'
    : progress < 100 ? 'Almost ready...'
    : 'Identity registered. Welcome to Scrapiz!';

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
      <CameraView
        ref={(ref) => { cameraRef.current = ref as unknown as CameraCaptureRef; }}
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

      <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Go back">
        <Text style={styles.backBtnText}>{'<'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeBtn} onPress={onBack} accessibilityLabel="Close">
        <View style={styles.closeBtnInner}>
          <Text style={styles.closeBtnText}>{'x'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.headingWrap}>
        <Text style={styles.heading}>Position your face within the frame</Text>
        <Text style={styles.subheading}>Setting up your Scrapiz identity</Text>
      </View>

      <CornerBracket top={ovalTop - bracketInset} left={ovalLeft - bracketInset} />
      <CornerBracket top={ovalTop - bracketInset} left={ovalRight - 28 + bracketInset} rotate="90deg" />
      <CornerBracket top={ovalBottom - 28 + bracketInset} left={ovalLeft - bracketInset} rotate="-90deg" />
      <CornerBracket top={ovalBottom - 28 + bracketInset} left={ovalRight - 28 + bracketInset} rotate="180deg" />

      <View style={styles.bottomPanel}>
        {phase === 'verified' && (
          <View style={styles.progressWrap}>
            <Text style={styles.progressPercent}>{String.fromCharCode(10003)}</Text>
            <Text style={styles.progressLabel}>Face registered successfully!</Text>
            <Text style={styles.progressHint}>Your Scrapiz partner identity is now set up. Proceeding to next step...</Text>
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
              Please hold still while we register your face. This creates your secure identity for future pickups.
            </Text>
            {taskId && <Text style={styles.taskIdText}>Registration ID: {taskId}</Text>}
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
            <Text style={styles.errorTitle}>Registration failed</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}
        {phase === 'intro' && (
          <>
            <View style={styles.notice}>
              <View style={styles.noticeDot} />
              <Text style={styles.noticeText}>
                Make sure you are in a well-lit area. This photo will be used to verify your identity during pickups.
              </Text>
            </View>
            {error ? <Text style={styles.introError}>{error}</Text> : null}
            <Pressable style={styles.startBtn} onPress={() => void startVerification()}>
              <Text style={styles.startBtnText}>Register My Face</Text>
            </Pressable>
            {reviewModeEnabled && (
              <Pressable style={styles.reviewBtn} onPress={handleReviewModeComplete}>
                <Text style={styles.reviewBtnText}>Use reviewer sample</Text>
              </Pressable>
            )}
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
  safe: { flex: 1, backgroundColor: '#000' },

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
  subheading: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 6 },

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
  taskIdText: {
    marginTop: 8,
    color: 'rgba(0,0,0,0.48)',
    fontSize: 11,
    textAlign: 'center',
  },

  errorWrap: { alignItems: 'center', paddingVertical: 4 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  errorMsg: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: {
    marginTop: 16, width: '100%', height: 52, borderRadius: 26,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

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
  
  reviewBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
  },
  reviewBtnText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
});
