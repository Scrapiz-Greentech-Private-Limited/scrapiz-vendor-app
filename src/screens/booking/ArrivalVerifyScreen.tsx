import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ProgressSnackbar from '../../components/ProgressSnackbar';
import { API_BASE_URL } from '../../config/api';
import { AuthStorageService } from '../../services/authStorage';
import { vendorLocationStreamer } from '../../services/vendorLocationStreamer';

const ARRIVAL_STAGES = [
  { progress: 20, label: 'Confirming your identity...' },
  { progress: 60, label: 'Matching your profile...' },
  { progress: 100, label: 'Identity confirmed. Unlocking pickup.' },
] as const;

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
  route?: {
    params: ArrivalVerifyRouteParams;
  };
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack?: () => void;
  };
  orderId?: string;
  bookingContext?: Record<string, unknown>;
  onVerified?: (params?: Record<string, unknown>) => void;
  onBack?: () => void;
};

export default function ArrivalVerifyScreen({
  route,
  navigation,
  orderId,
  bookingContext,
  onVerified,
  onBack,
}: ArrivalVerifyScreenProps) {
  const [phase, setPhase] = useState<'capturing' | 'uploading' | 'verified' | 'failed'>('capturing');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [label, setLabel] = useState<string>('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<'identity_mismatch' | 'not_at_location' | null>(null);

  const hasStartedRef = useRef(false);
  const isMountedRef = useRef(true);

  const resolvedOrderId = route?.params.order_id || orderId || '';
  const resolvedBookingContext = route?.params.bookingContext || bookingContext || { order_id: resolvedOrderId };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleVerified = () => {
    if (isMountedRef.current) {
      setPhase('verified');
      setProgress(ARRIVAL_STAGES[2].progress);
      setLabel(ARRIVAL_STAGES[2].label);
    }

    if (navigation) {
      navigation.navigate('ActiveJobScreen', resolvedBookingContext);
      return;
    }

    onVerified?.(resolvedBookingContext);
  };

  const runCapture = async () => {
    if (!resolvedOrderId) {
      if (isMountedRef.current) {
        setPhase('failed');
        setError('Pickup order could not be loaded.');
      }
      return;
    }

    try {
      const cameraResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (cameraResult.canceled || !cameraResult.assets?.length || !cameraResult.assets[0]?.uri) {
        if (isMountedRef.current) {
          setPhase('failed');
          setError('Face capture was cancelled.');
        }
        return;
      }

      const captured = cameraResult.assets[0].uri;

      if (isMountedRef.current) {
        setPreviewUri(captured);
        setPhase('uploading');
        setProgress(ARRIVAL_STAGES[0].progress);
        setLabel(ARRIVAL_STAGES[0].label);
        setError(null);
        setFailureReason(null);
      }

      const compressed = await ImageManipulator.manipulateAsync(
        captured,
        [{ resize: { width: 640 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      if (isMountedRef.current) {
        setProgress(ARRIVAL_STAGES[1].progress);
        setLabel(ARRIVAL_STAGES[1].label);
      }

      const token = await AuthStorageService.getToken();
      if (!token) {
        if (isMountedRef.current) {
          setPhase('failed');
          setError('Authentication expired. Please sign in again.');
        }
        return;
      }

      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        if (isMountedRef.current) {
          setPhase('failed');
          setError('Location access is required for arrival verification.');
        }
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const fallbackLocation = vendorLocationStreamer.getLatestCoords();
      const vendorLat = currentLocation.coords.latitude || fallbackLocation?.latitude;
      const vendorLng = currentLocation.coords.longitude || fallbackLocation?.longitude;

      if (typeof vendorLat !== 'number' || typeof vendorLng !== 'number') {
        if (isMountedRef.current) {
          setPhase('failed');
          setError('Current location could not be determined.');
        }
        return;
      }

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
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      const responseBody = (await response.json().catch(() => null)) as ArrivalVerifyResponse | null;

      if (responseBody?.verified) {
        handleVerified();
        return;
      }

      if (responseBody?.uncertain) {
        handleVerified();
        return;
      }

      if (responseBody?.reason === 'identity_mismatch') {
        if (isMountedRef.current) {
          setPhase('failed');
          setFailureReason('identity_mismatch');
          setError('Identity could not be confirmed. The customer has been notified.');
        }
        return;
      }

      if (responseBody?.reason === 'not_at_location') {
        if (isMountedRef.current) {
          setPhase('failed');
          setFailureReason('not_at_location');
          setError('Please move closer to the pickup location.');
        }
        return;
      }

      if (isMountedRef.current) {
        setPhase('failed');
        setError(responseBody?.message || 'Arrival verification failed.');
      }
    } catch {
      if (isMountedRef.current) {
        setPhase('failed');
        setError('Arrival verification failed.');
      }
    }
  };

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    void runCapture();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.ovalGuide} />
          <Text style={styles.caption}>Look straight at the camera. Capture starts automatically.</Text>
        </View>

        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.previewPlaceholderText}>
              Keep your face centered while we verify your arrival.
            </Text>
          </View>
        )}
      </View>

      {phase === 'failed' && error ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Verification stopped</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          {failureReason === 'not_at_location' ? (
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => {
                if (navigation?.goBack) {
                  navigation.goBack();
                  return;
                }

                onBack?.();
              }}
            >
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <ProgressSnackbar
        visible={phase === 'uploading'}
        progress={progress}
        label={label}
        themeColor="#16a34a"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ovalGuide: {
    width: 120,
    height: 160,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  caption: {
    marginTop: 18,
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  previewImage: {
    width: 160,
    height: 210,
    borderRadius: 18,
    marginTop: 24,
  },
  previewPlaceholder: {
    width: 160,
    height: 210,
    borderRadius: 18,
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  previewPlaceholderText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,15,30,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  errorButton: {
    marginTop: 24,
    minWidth: 150,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
