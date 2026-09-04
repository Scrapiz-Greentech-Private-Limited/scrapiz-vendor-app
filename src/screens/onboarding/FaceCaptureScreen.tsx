import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ProgressSnackbar from '../../components/ProgressSnackbar';
import SlideToConfirmButton from '../../components/ui/SlideToConfirmButton';
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

type ScreenPhase = 'intro' | 'camera' | 'verifying' | 'verified';

type CameraCaptureRef = {
  takePictureAsync: (options?: { quality?: number; skipProcessing?: boolean }) => Promise<{ uri: string }>;
};

const SCRAPIZ_GREEN = '#16a34a';
const INTRO_GREEN = '#16a34a';
const POSE_SEQUENCE = [
  'Hold steady while we map your face',
  'Turn your face slightly left',
  'Tilt your head slightly right',
  'Look up gently',
  'Look down a little',
  'Finalizing your Scrapiz identity',
] as const;

export default function FaceCaptureScreen({ onBack, onNext, navigation }: FaceCaptureScreenProps) {
  const reviewModeEnabled = isVendorReviewMode();
  const reviewerSeed = getReviewerSeedData();
  const [permission, requestPermission] = useCameraPermissions();
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('intro');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [label, setLabel] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [poseStepIndex, setPoseStepIndex] = useState<number>(0);
  const [showContinueSlider, setShowContinueSlider] = useState<boolean>(false);
  const [scanStarted, setScanStarted] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const cameraRef = useRef<CameraCaptureRef | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (screenPhase !== 'camera' && screenPhase !== 'verifying') {
      return;
    }

    const intervalId = setInterval(() => {
      setPoseStepIndex((current) => (current + 1) % POSE_SEQUENCE.length);
    }, 1500);

    return () => {
      clearInterval(intervalId);
    };
  }, [screenPhase]);

  useEffect(() => {
    if (screenPhase !== 'camera' || !permission?.granted || scanStarted) {
      return;
    }

    setScanStarted(true);
    const timeoutId = setTimeout(() => {
      void captureLiveFrame();
    }, 2200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [permission?.granted, scanStarted, screenPhase]);

  const handleVerificationComplete = () => {
    if (!isMountedRef.current) {
      return;
    }

    setIsUploading(false);
    setScreenPhase('verified');
    setShowContinueSlider(true);
  };

  const startCameraFlow = async () => {
    setError(null);
    setTaskId(null);
    setPoseStepIndex(0);
    setShowContinueSlider(false);
    setProgress(0);
    setLabel('');

    const granted = permission?.granted ? true : (await requestPermission()).granted;
    if (!granted) {
      setError('Camera permission is required to continue onboarding.');
      return;
    }

    setScanStarted(false);
    setScreenPhase('camera');
  };

  const captureLiveFrame = async () => {
    if (!cameraRef.current) {
      if (isMountedRef.current) {
        setError('Camera is not ready yet. Please try again.');
        setScanStarted(false);
      }
      return;
    }

    try {
      setScreenPhase('verifying');
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });
      await handleUpload(result.uri);
    } catch {
      if (isMountedRef.current) {
        setError('Please capture your face to continue');
        setIsUploading(false);
        setScreenPhase('camera');
        setScanStarted(false);
      }
    }
  };

  const handleUpload = async (uri: string) => {
    const token = await AuthStorageService.getToken();

    if (!token) {
      if (isMountedRef.current) {
        setIsUploading(false);
        setError('Authentication expired. Please sign in again.');
      }
      return;
    }

    if (isMountedRef.current) {
      setIsUploading(true);
      setError(null);
      setTaskId(null);
      setProgress(0);
      setLabel('');
    }

    try {
      await runFaceCaptureFlow({
        uri,
        token,
        baseUrl: API_BASE_URL,
        onStage: (stage) => {
          if (!isMountedRef.current) {
            return;
          }

          setProgress(stage.progress);
          setLabel(stage.label);
        },
        onTaskId: (nextTaskId) => {
          if (isMountedRef.current) {
            setTaskId(nextTaskId);
          }
        },
        onRejected: async (message) => {
          if (isMountedRef.current) {
            setIsUploading(false);
            setError(message);
            setTaskId(null);
            setScreenPhase('camera');
            setScanStarted(false);
          }
        },
        onFailure: async (message) => {
          if (isMountedRef.current) {
            setIsUploading(false);
            setError(message);
            setScreenPhase('camera');
            setScanStarted(false);
          }
        },
        onVerified: async () => {
          handleVerificationComplete();
        },
      });
    } catch {
      if (isMountedRef.current) {
        setIsUploading(false);
        setError('Upload failed. Please try again.');
        setScreenPhase('camera');
        setScanStarted(false);
      }
    }
  };

  const handleContinue = () => {
    if (navigation) {
      navigation.navigate('OnboardingStatus');
      return;
    }

    onNext?.();
  };

  const handleReviewModeComplete = () => {
    setTaskId(`review-face-${Date.now()}`);
    setLabel(`Reviewer face profile ready for ${reviewerSeed.name}`);
    setError(null);
    handleVerificationComplete();
  };

  if (screenPhase === 'intro') {
    return (
      <SafeAreaView style={styles.introSafeArea}>
        <View style={styles.introContainer}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.introBackButton}>
              <Text style={styles.introBackText}>Back</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.introHero}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>S</Text>
            </View>
            <Text style={styles.introEyebrow}>Let&apos;s start onboarding</Text>
            <Text style={styles.introTitle}>Welcome To Scrapiz Family</Text>
            <Text style={styles.introBody}>
              We are setting up your Scrapiz partner identity with a warm, secure face verification journey.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => {
              void startCameraFlow();
            }}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
          {reviewModeEnabled ? (
            <TouchableOpacity style={styles.reviewButton} onPress={handleReviewModeComplete}>
              <Text style={styles.reviewButtonText}>Use reviewer sample</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        {permission?.granted ? (
          <CameraView
            ref={(ref) => {
              cameraRef.current = ref as CameraCaptureRef | null;
            }}
            style={StyleSheet.absoluteFillObject}
            facing="front"
            mute={true}
          />
        ) : (
          <View style={styles.cameraFallback} />
        )}

        <View style={styles.cameraFallbackOverlay} />
        <View style={styles.overlay}>
          <View style={styles.header}>
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <Text style={styles.headerTag}>Scrapiz Face Setup</Text>
          </View>

          <View style={styles.topCopyWrap}>
            <Text style={styles.topTitle}>
              {screenPhase === 'verified'
                ? 'Identity confirmed'
                : 'Please put your phone in front of your face'}
            </Text>
            <Text style={styles.topSubtitle}>
              {screenPhase === 'verified'
                ? 'Your face profile has been verified and stored securely.'
                : POSE_SEQUENCE[poseStepIndex]}
            </Text>
          </View>

          <View style={styles.faceFrameWrap}>
            <View style={styles.faceFrameOuter}>
              <View style={styles.faceFrameInner}>
                <View
                  style={[
                    styles.verticalFill,
                    {
                      height: `${Math.max(progress, screenPhase === 'verified' ? 100 : 8)}%`,
                    },
                  ]}
                />
                <View style={styles.meshWrap}>
                  <View style={styles.meshLineOne} />
                  <View style={styles.meshLineTwo} />
                  <View style={styles.meshLineThree} />
                  <View style={styles.meshLineFour} />
                  <View style={styles.meshLineFive} />
                  <View style={styles.meshPointA} />
                  <View style={styles.meshPointB} />
                  <View style={styles.meshPointC} />
                  <View style={styles.meshPointD} />
                  <View style={styles.meshPointE} />
                  <View style={styles.meshPointF} />
                  <View style={styles.meshPointG} />
                  <View style={styles.meshPointH} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomPanel}>
            <Text style={styles.progressValue}>
              {screenPhase === 'verified' ? '100%' : `${Math.max(progress, 6)}%`}
            </Text>
            <Text style={styles.progressLabel}>
              {screenPhase === 'verified' ? 'Your Scrapiz identity is ready.' : label || 'Preparing your capture...'}
            </Text>

            {taskId ? <Text style={styles.taskIdText}>Verification ID: {taskId}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {showContinueSlider ? (
              <View style={styles.sliderWrap}>
                <SlideToConfirmButton
                  label="Slide to Continue"
                  onConfirm={handleContinue}
                />
              </View>
            ) : null}

            {!isUploading && (screenPhase === 'camera' || screenPhase === 'verifying') ? (
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => {
                  void startCameraFlow();
                }}
              >
                <Text style={styles.retakeButtonText}>Restart Face Scan</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ProgressSnackbar
          visible={isUploading}
          progress={progress}
          label={label}
          themeColor={SCRAPIZ_GREEN}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  introSafeArea: {
    flex: 1,
    backgroundColor: INTRO_GREEN,
  },
  introContainer: {
    flex: 1,
    backgroundColor: INTRO_GREEN,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  introBackButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  introBackText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  introHero: {
    flex: 1,
    justifyContent: 'center',
  },
  brandBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  brandBadgeText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
  },
  introEyebrow: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  introTitle: {
    color: '#ffffff',
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '900',
    letterSpacing: -1.6,
    maxWidth: 300,
  },
  introBody: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 19,
    lineHeight: 28,
    maxWidth: 320,
  },
  getStartedButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButtonText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  reviewButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  reviewButtonText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#05070d',
  },
  background: {
    flex: 1,
    backgroundColor: '#05070d',
  },
  cameraFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
  },
  cameraFallbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.34)',
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTag: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topCopyWrap: {
    marginTop: 22,
    alignItems: 'center',
  },
  topTitle: {
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 320,
  },
  topSubtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 300,
  },
  faceFrameWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrameOuter: {
    width: 274,
    height: 344,
    borderRadius: 170,
    borderWidth: 12,
    borderColor: '#57e59a',
    backgroundColor: 'rgba(87,229,154,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#57e59a',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
  },
  faceFrameInner: {
    width: 248,
    height: 316,
    borderRadius: 158,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(15,23,42,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(34,197,94,0.26)',
  },
  meshWrap: {
    width: 176,
    height: 210,
    position: 'relative',
  },
  meshLineOne: {
    position: 'absolute',
    top: 16,
    left: 28,
    width: 120,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.78)',
    transform: [{ rotate: '18deg' }],
  },
  meshLineTwo: {
    position: 'absolute',
    top: 54,
    left: 16,
    width: 145,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    transform: [{ rotate: '-20deg' }],
  },
  meshLineThree: {
    position: 'absolute',
    top: 96,
    left: 18,
    width: 136,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
    transform: [{ rotate: '12deg' }],
  },
  meshLineFour: {
    position: 'absolute',
    top: 144,
    left: 24,
    width: 118,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    transform: [{ rotate: '-16deg' }],
  },
  meshLineFive: {
    position: 'absolute',
    top: 38,
    left: 82,
    width: 1,
    height: 126,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  meshPointA: {
    position: 'absolute',
    top: 14,
    left: 24,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  meshPointB: {
    position: 'absolute',
    top: 12,
    right: 24,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  meshPointC: {
    position: 'absolute',
    top: 58,
    left: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  meshPointD: {
    position: 'absolute',
    top: 60,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  meshPointE: {
    position: 'absolute',
    top: 98,
    left: 28,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  meshPointF: {
    position: 'absolute',
    top: 100,
    right: 28,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  meshPointG: {
    position: 'absolute',
    bottom: 44,
    left: 74,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  meshPointH: {
    position: 'absolute',
    bottom: 16,
    left: 84,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  bottomPanel: {
    alignItems: 'center',
  },
  progressValue: {
    color: '#4ade80',
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '900',
  },
  progressLabel: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
  },
  taskIdText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 10,
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sliderWrap: {
    width: '100%',
    marginTop: 22,
  },
  retakeButton: {
    marginTop: 18,
    minWidth: 190,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(15,23,42,0.44)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  retakeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
