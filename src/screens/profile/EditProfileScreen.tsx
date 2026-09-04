import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProgressSnackbar from '../../components/ui/ProgressSnackbar';
import { useAuth } from '../../../hooks/useAuth';
import { getFloatingElementMargin, getScrollContentBottomPadding } from '../../utils/safeAreaUtils';

interface EditProfileScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const EditProfileScreen = ({ onBack, onShowToast }: EditProfileScreenProps) => {
  const { user, updateVendorProfile, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const floatingMargin = getFloatingElementMargin();
  const scrollBottomPadding = getScrollContentBottomPadding();
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [serviceCity, setServiceCity] = useState(user?.serviceCity || '');
  const [serviceArea, setServiceArea] = useState(user?.serviceArea || '');
  const [imageUri, setImageUri] = useState<string | null>(user?.profileImage || user?.image || null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isProgressVisible, setIsProgressVisible] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressLabel, setProgressLabel] = useState('Preparing profile update');
  const [progressSubtitle, setProgressSubtitle] = useState(
    'We are getting everything ready for a secure profile photo update.',
  );

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const hasChanges = useMemo(() => {
    return (
      name !== (user?.name || '') ||
      age !== (user?.age ? String(user.age) : '') ||
      serviceCity !== (user?.serviceCity || '') ||
      serviceArea !== (user?.serviceArea || '') ||
      imageUri !== (user?.image || null) ||
      removeImage
    );
  }, [age, imageUri, name, removeImage, serviceArea, serviceCity, user]);

  const hasCustomProfilePhoto = useMemo(
    () => Boolean(user?.profileImage),
    [user?.profileImage],
  );

  const isLocalImage = useMemo(
    () => Boolean(imageUri?.startsWith('file://') || imageUri?.startsWith('content://')),
    [imageUri],
  );

  const hasRemovablePhoto = Boolean(imageUri) && (hasCustomProfilePhoto || isLocalImage);

  const startProgressFlow = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setIsProgressVisible(true);
    setProgressValue(8);
    setProgressLabel('Uploading profile photo');
    setProgressSubtitle('Moving your image through secure upload and verification checks.');

    progressIntervalRef.current = setInterval(() => {
      setProgressValue((current) => {
        if (current < 30) {
          setProgressLabel('Uploading profile photo');
          setProgressSubtitle('Sending your image to Scrapiz securely.');
          return current + 11;
        }
        if (current < 56) {
          setProgressLabel('Running face-quality checks');
          setProgressSubtitle('Validating image clarity and profile-readiness for the InsightFace pipeline.');
          return current + 7;
        }
        if (current < 82) {
          setProgressLabel('Processing background verification');
          setProgressSubtitle('Applying internal checks before the profile refresh is finalized.');
          return current + 4;
        }
        if (current < 92) {
          setProgressLabel('Finalizing your profile');
          setProgressSubtitle('Preparing the updated profile preview for the app.');
          return current + 2;
        }
        return current;
      });
    }, 850);
  };

  const finishProgressFlow = async (wasSuccessful: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (wasSuccessful) {
      setProgressLabel('Profile update complete');
      setProgressSubtitle('Your updated profile photo and details are now live.');
      setProgressValue(100);
      await new Promise((resolve) => setTimeout(resolve, 380));
    }

    setIsProgressVisible(false);
    if (!wasSuccessful) {
      setProgressValue(0);
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        onShowToast('Camera permission is required to update your profile photo.', 'error');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
        setRemoveImage(false);
      }
    } catch (error) {
      onShowToast('Unable to open the camera right now.', 'error');
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setRemoveImage(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      onShowToast('Full name is required.', 'error');
      return;
    }

    if (!serviceCity.trim() || !serviceArea.trim()) {
      onShowToast('Service city and service area are required.', 'error');
      return;
    }

    const parsedAge = age.trim() ? Number(age) : null;
    if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < 18 || parsedAge > 80)) {
      onShowToast('Age must be between 18 and 80.', 'error');
      return;
    }

    try {
      startProgressFlow();
      await updateVendorProfile({
        full_name: name.trim(),
        age: parsedAge,
        service_city: serviceCity.trim(),
        service_area: serviceArea.trim(),
        profile_image: removeImage ? '' : isLocalImage ? imageUri : user?.profileImage,
      });
      await finishProgressFlow(true);
      onShowToast('Profile updated successfully.', 'success');
      onBack();
    } catch (error: any) {
      await finishProgressFlow(false);
      onShowToast(error?.message || 'Failed to update profile.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={40} color="white" />
              )}
            </View>
            <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage}>
              <MaterialIcons name="camera-alt" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{name || 'Vendor'}</Text>
          <Text style={styles.profileMeta}>
            {user?.requiresProfileImageUpload
              ? 'A current face photo is required for your account.'
              : hasCustomProfilePhoto
                ? 'Your custom profile photo is active.'
                : 'No custom profile photo is set. The verified face image may be used as a fallback elsewhere in the app.'}
          </Text>
          {hasRemovablePhoto ? (
            <TouchableOpacity onPress={handleRemoveImage} style={styles.removePhotoButton}>
              <Text style={styles.removePhotoText}>Remove photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.formSection}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="person" size={20} color="#1B7332" />
              <Text style={styles.cardTitle}>Basic Details</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="Your full name" />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.textInput}
                value={age}
                onChangeText={setAge}
                placeholder="Your age"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={[styles.textInput, styles.readOnlyInput]} value={user?.phone || ''} editable={false} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="location-on" size={20} color="#1B7332" />
              <Text style={styles.cardTitle}>Service Area</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Service City</Text>
              <TextInput
                style={styles.textInput}
                value={serviceCity}
                onChangeText={setServiceCity}
                placeholder="City where you operate"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Service Area</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={serviceArea}
                onChangeText={setServiceArea}
                placeholder="Area / landmark / locality"
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.floatingButton,
          {
            paddingBottom: Math.max(insets.bottom + 16, floatingMargin.bottom + 8),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || isLoading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || isLoading}
        >
          <MaterialIcons name={isLoading ? 'hourglass-empty' : 'save'} size={20} color="white" />
          <Text style={styles.saveButtonText}>{isLoading ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>

      <ProgressSnackbar
        visible={isProgressVisible}
        progress={progressValue}
        label={progressLabel}
        subtitle={progressSubtitle}
        themeColor="#1B7332"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    backgroundColor: '#1B7332',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    backgroundColor: '#1B7332',
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    backgroundColor: '#1B7332',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  profileMeta: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 20,
  },
  removePhotoButton: {
    marginTop: 12,
  },
  removePhotoText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  readOnlyInput: {
    color: '#6b7280',
  },
  textArea: {
    minHeight: 96,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#1B7332',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
