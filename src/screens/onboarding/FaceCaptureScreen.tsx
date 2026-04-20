import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { FaceDetector as MediaPipeFaceDetector } from '@mediapipe/tasks-vision';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image as RNImage,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SwipeToast, { type SwipeToastType } from '../../components/ui/swipeToast';
import { ApiHttpError, ApiService, VendorFaceStatus } from '../../services/api';
import { AuthStorageService } from '../../services/authStorage';

type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

type UploadFaceSuccessResponse = {
  success: true;
  data: {
    task_id?: string;
    status?: 'processing';
    task_queued?: boolean;
  };
  message?: string;
};

interface FaceCaptureScreenProps {
  onBack: () => void;
  onNext: () => void;
}

const SCRAPIZ_GREEN = '#16a34a';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const PREVIEW_HEIGHT = Math.min(340, Math.max(240, SCREEN_HEIGHT * 0.36));
const DETECTOR_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const FACE_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-assets/blaze_face_short_range.tflite';

const STAGES = [
  { progress: 10, label: 'Starting your secure face check...' },
  { progress: 30, label: 'Checking photo quality...' },
  { progress: 55, label: 'Matching your selfie with your account...' },
  { progress: 75, label: 'Running final security checks...' },
  { progress: 90, label: 'Almost done. Keep this screen open.' },
  { progress: 100, label: 'Face verified. You are ready to continue.' },
] as const;

const getStageLabel = (progress: number): string => {
  const stage = STAGES.find((item) => item.progress === progress);
  return stage?.label || 'Starting your secure face check...';
};

const createUploadFile = (asset: ImagePicker.ImagePickerAsset): UploadFile => ({
  uri: asset.uri,
  name: 'face.jpg',
  type: asset.mimeType || 'image/jpeg',
});

const getFriendlyFailureMessage = (message?: string): string => {
  if (!message) {
    return 'We could not verify this photo. Please retake a clear selfie.';
  }

  const normalized = message.toLowerCase();

  if (normalized.includes('multiple face')) {
    return 'Only you should be in the frame. Move to a clear spot and try again.';
  }
  if (normalized.includes('blurry') || normalized.includes('poorly lit') || normalized.includes('lighting')) {
    return 'The selfie is not clear enough. Please retake in bright lighting.';
  }
  if (normalized.includes('face the camera') || normalized.includes('yaw')) {
    return 'Please face the camera directly and retake your selfie.';
  }
  if (normalized.includes('no clear face') || normalized.includes('no face detected')) {
    return 'Your face was not clearly visible. Hold steady and try again.';
  }
  if (normalized.includes('service unavailable') || normalized.includes('timed out')) {
    return 'Verification is temporarily busy. Please retake once and try again.';
  }

  return message;
};

export default function FaceCaptureScreen({ onBack, onNext }: FaceCaptureScreenProps) {
  const [capturedFile, setCapturedFile] = useState<UploadFile | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<SwipeToastType>('info');
  const [toastDuration, setToastDuration] = useState(2800);

  const detectorRef = useRef<MediaPipeFaceDetector | null>(null);
  const detectorInitPromiseRef = useRef<Promise<MediaPipeFaceDetector | null> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTickRef = useRef(0);
  const pollErrorToastShownRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback(
    (message: string, type: SwipeToastType = 'info', duration = 2800) => {
      setToastMessage(message);
      setToastType(type);
      setToastDuration(duration);
      setToastVisible(true);
    },
    []
  );

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const updateProgress = useCallback((progress: number) => {
    const label = getStageLabel(progress);
    console.log('[FaceCapture] progress', { progress, label });
    showToast(label, progress === 100 ? 'success' : 'info', progress === 100 ? 3000 : 2400);
  }, [showToast]);

  const hideProgress = useCallback(() => {
    hideToast();
  }, [hideToast]);

  const resetCapture = useCallback((message = '') => {
    console.log('[FaceCapture] resetCapture', { message });
    setCapturedFile(null);
    setPreviewUri(null);
    setErrorText(message);
  }, []);

  const ensureDetector = useCallback(async (): Promise<MediaPipeFaceDetector | null> => {
    if (detectorRef.current) {
      return detectorRef.current;
    }

    if (!detectorInitPromiseRef.current) {
      detectorInitPromiseRef.current = (async () => {
        try {
          if (typeof globalThis.Image === 'undefined' || typeof document === 'undefined') {
            throw new Error('HTMLImageElement is unavailable in this runtime');
          }

          const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
          console.log('[FaceCapture] initializing MediaPipe face detector');
          const vision = await FilesetResolver.forVisionTasks(DETECTOR_WASM_PATH);
          const detector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_MODEL_PATH,
            },
            runningMode: 'IMAGE',
            minDetectionConfidence: 0.75,
          });
          detectorRef.current = detector;
          return detector;
        } catch (error) {
          console.log('[FaceCapture] MediaPipe init failed, falling back to server validation', error);
          return null;
        }
      })();
    }

    return detectorInitPromiseRef.current;
  }, []);

  const createHtmlImageElement = useCallback(async (uri: string): Promise<HTMLImageElement> => {
    if (typeof globalThis.Image === 'undefined' || typeof document === 'undefined') {
      throw new Error('HTMLImageElement is unavailable in this runtime');
    }

    const fileBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    return new Promise<HTMLImageElement>((resolve, reject) => {
      const imageElement = new globalThis.Image();
      imageElement.onload = () => resolve(imageElement);
      imageElement.onerror = () => reject(new Error('Failed to construct HTMLImageElement'));
      imageElement.src = `data:image/jpeg;base64,${fileBase64}`;
    });
  }, []);

  const runClientFaceValidation = useCallback(
    async (uri: string): Promise<{ passed: boolean; message?: string }> => {
      try {
        const detector = await ensureDetector();
        if (!detector) {
          return { passed: true };
        }

        const imageElement = await createHtmlImageElement(uri);
        const result = detector.detect(imageElement);
        const detections = result.detections ?? [];
        console.log('[FaceCapture] MediaPipe detections', { count: detections.length });

        if (detections.length === 0) {
          return { passed: false, message: 'Your face was not clearly visible. Please retake your selfie.' };
        }

        if (detections.length > 1) {
          return {
            passed: false,
            message: 'Only you should be in the frame. Please retake your selfie.',
          };
        }

        return { passed: true };
      } catch (error) {
        console.log('[FaceCapture] client face validation skipped', error);
        return { passed: true };
      }
    },
    [createHtmlImageElement, ensureDetector]
  );

  const pollVerificationStatus = useCallback(
    async (onVerified: () => void) => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }

      pollTickRef.current = 0;
      pollErrorToastShownRef.current = false;

      const runPoll = async () => {
        pollTickRef.current += 1;
        console.log('[FaceCapture] polling face status', { tick: pollTickRef.current });

        try {
          const faceStatus: VendorFaceStatus = await ApiService.getVendorFaceStatus();
          console.log('[FaceCapture] face status response', faceStatus);

          if (faceStatus.status === 'verified') {
            updateProgress(100);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            if (pollTimeoutRef.current) {
              clearTimeout(pollTimeoutRef.current);
              pollTimeoutRef.current = null;
            }

            setTimeout(() => {
              hideProgress();
              onVerified();
            }, 2000);
            return;
          }

          if (faceStatus.status === 'rejected') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            if (pollTimeoutRef.current) {
              clearTimeout(pollTimeoutRef.current);
              pollTimeoutRef.current = null;
            }
            hideProgress();
            const friendlyReason = getFriendlyFailureMessage(
              faceStatus.message || faceStatus.rejection_reason || 'Face verification failed.'
            );
            showToast(friendlyReason, 'error', 4600);
            resetCapture(friendlyReason);
            return;
          }

          if (pollTickRef.current === 1 || faceStatus.status === 'processing') {
            updateProgress(75);
          } else {
            updateProgress(90);
          }
        } catch (error) {
          console.log('[FaceCapture] polling failed', error);
          if (!pollErrorToastShownRef.current) {
            showToast('Verification is still running. Please keep this screen open.', 'info', 2800);
            pollErrorToastShownRef.current = true;
          }
        }
      };

      await runPoll();

      pollIntervalRef.current = setInterval(() => {
        void runPoll();
      }, 3000);

      pollTimeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        hideProgress();
        const timeoutMessage =
          'Verification is still processing on the server. If it stays stuck, restart the worker and try again.';
        setErrorText(timeoutMessage);
        showToast(timeoutMessage, 'error', 5000);
      }, 60000);
    },
    [hideProgress, resetCapture, showToast, updateProgress]
  );

  const uploadFace = useCallback(
    async (file: UploadFile) => {
      setErrorText('');
      updateProgress(10);

      const token = await AuthStorageService.getToken();
      if (!token) {
        hideProgress();
        const authMessage = 'Your session expired. Please sign in again to continue.';
        setErrorText(authMessage);
        showToast(authMessage, 'error', 4200);
        return;
      }

      const validation = await runClientFaceValidation(file.uri);
      if (!validation.passed) {
        hideProgress();
        const friendlyValidationMessage = getFriendlyFailureMessage(validation.message);
        showToast(friendlyValidationMessage, 'error', 4600);
        resetCapture(friendlyValidationMessage);
        return;
      }

      updateProgress(30);

      try {
        const payload = (await ApiService.uploadVendorFaceImageFile({
          face_image: {
            uri: file.uri,
            name: file.name || 'face.jpg',
            type: file.type || 'image/jpeg',
          },
        })) as UploadFaceSuccessResponse['data'];

        console.log('[FaceCapture] upload response', {
          status: 202,
          payload,
        });

        updateProgress(55);

        await pollVerificationStatus(onNext);
      } catch (error) {
        console.log('[FaceCapture] upload failed', error);
        hideProgress();
        const rawMessage =
          error instanceof ApiHttpError
            ? error.message
            : 'Upload did not complete. Please retake your selfie and try again.';
        const uploadFailureMessage = getFriendlyFailureMessage(rawMessage);
        setErrorText(uploadFailureMessage);
        showToast(uploadFailureMessage, 'error', 4600);
      }
    },
    [
      hideProgress,
      onNext,
      pollVerificationStatus,
      resetCapture,
      runClientFaceValidation,
      showToast,
      updateProgress,
    ]
  );

  const handleCapture = useCallback(async () => {
    console.log('[FaceCapture] launch camera requested');
    setErrorText('');

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      const permissionMessage = 'Please allow camera access so we can verify your selfie.';
      setErrorText(permissionMessage);
      showToast(permissionMessage, 'error', 4200);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.85,
        base64: true,
        cameraType: ImagePicker.CameraType.front,
      });

      console.log('[FaceCapture] camera result', {
        canceled: result.canceled,
        assetsLength: result.assets?.length ?? 0,
      });

      if (result.canceled || !result.assets?.length) {
        const captureMessage = 'Please capture your face to continue.';
        setErrorText(captureMessage);
        showToast(captureMessage, 'info', 3000);
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        const readFailureMessage = 'We could not read this photo. Please retake your selfie.';
        setErrorText(readFailureMessage);
        showToast(readFailureMessage, 'error', 4200);
        return;
      }

      const file = createUploadFile(asset);
      setCapturedFile(file);
      setPreviewUri(
        asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : asset.uri
      );

      await uploadFace(file);
    } catch (error) {
      console.log('[FaceCapture] launchCameraAsync failed', error);
      const cameraFailureMessage = 'Unable to open the camera right now. Please try again in a moment.';
      setErrorText(cameraFailureMessage);
      showToast(cameraFailureMessage, 'error', 4200);
    }
  }, [showToast, uploadFace]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.previewShell}>
          {previewUri ? (
            <RNImage source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <RNImage
              source={require('../../../assets/images/guideline_image.jpg')}
              style={styles.guidelineImage}
            />
          )}
        </View>

        <Text style={styles.title}>Capture your face</Text>
        <Text style={styles.subtitle}>
          Use a clear, front-facing selfie in good lighting. We will guide you if a retake is needed.
        </Text>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.captureArea}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              void handleCapture();
            }}
            style={styles.captureButton}
          >
            <View style={styles.captureButtonInner}>
              <Ionicons name={capturedFile ? 'camera-reverse' : 'camera'} size={30} color={SCRAPIZ_GREEN} />
            </View>
          </TouchableOpacity>
          <Text style={styles.captureLabel}>{capturedFile ? 'Retake' : 'Open Camera'}</Text>
        </View>

        <SwipeToast
          visible={toastVisible}
          message={toastMessage}
          type={toastType}
          duration={toastDuration}
          onHide={hideToast}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 72,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewShell: {
    marginTop: 12,
    alignSelf: 'center',
    width: '100%',
    height: PREVIEW_HEIGHT,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  guidelineImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  title: {
    marginTop: 20,
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#64748b',
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  captureArea: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 48,
  },
  captureButton: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 3,
    borderColor: SCRAPIZ_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  captureButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureLabel: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
});
