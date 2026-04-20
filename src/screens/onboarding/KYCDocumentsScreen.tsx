import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

interface KYCDocumentsScreenProps {
  onBack: () => void;
  onComplete: (payload: {
    aadhaarNumber: string;
    aadhaarFrontFile: UploadFile;
    aadhaarBackFile?: UploadFile;
    secondaryType: 'pan' | 'dl' | 'passport';
    secondaryNumber: string;
    secondaryFrontFile: UploadFile;
    secondaryBackFile?: UploadFile;
  }) => Promise<void> | void;
}

const BRAND_GREEN = '#166534';
const BRAND_GREEN_SOFT = '#DCFCE7';
const BRAND_GREEN_TINT = '#F0FDF4';
const CARD_BORDER = '#E2E8F0';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#64748B';

const createUploadFile = (asset: ImagePicker.ImagePickerAsset, prefix: string): UploadFile => {
  const fallbackUri = asset.uri || '';
  const fileName = asset.fileName || `${prefix}-${Date.now()}.jpg`;
  const extensionMatch = fileName.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const extension = (extensionMatch?.[1] || 'jpg').toLowerCase();
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  const mimeType = asset.mimeType || `image/${normalizedExtension === 'jpg' ? 'jpeg' : normalizedExtension}`;

  return {
    uri: fallbackUri,
    name: fileName.includes('.') ? fileName : `${prefix}-${Date.now()}.${normalizedExtension}`,
    type: mimeType,
  };
};

type SecondaryType = 'pan' | 'dl' | 'passport';

type UploadCardProps = {
  label: string;
  helper: string;
  file?: UploadFile;
  optional?: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onPreview: () => void;
};

function UploadCard({
  label,
  helper,
  file,
  optional = false,
  onCamera,
  onGallery,
  onPreview,
}: UploadCardProps) {
  const statusLabel = file ? 'Selected' : optional ? 'Optional' : 'Required';

  return (
    <View style={styles.uploadCard}>
      <View style={styles.uploadHeader}>
        <View style={styles.uploadTitleBlock}>
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={styles.uploadHelper}>{helper}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            file ? styles.statusBadgeSuccess : optional ? styles.statusBadgeOptional : styles.statusBadgeRequired,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              file ? styles.statusBadgeTextSuccess : optional ? styles.statusBadgeTextOptional : styles.statusBadgeTextRequired,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity onPress={onCamera} style={[styles.actionButton, styles.actionButtonPrimary]}>
          <Ionicons name="camera-outline" size={18} color={BRAND_GREEN} />
          <Text style={styles.actionButtonText}>Use camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onGallery} style={styles.actionButton}>
          <Ionicons name="images-outline" size={18} color={BRAND_GREEN} />
          <Text style={styles.actionButtonText}>Choose file</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onPreview}
        disabled={!file}
        style={[styles.previewButton, !file && styles.previewButtonDisabled]}
      >
        <View style={styles.previewButtonLeft}>
          <Ionicons name="eye-outline" size={18} color={file ? '#FFFFFF' : '#94A3B8'} />
          <Text style={[styles.previewButtonText, !file && styles.previewButtonTextDisabled]}>
            {file ? 'Preview uploaded image' : 'Preview available after upload'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={file ? '#FFFFFF' : '#94A3B8'} />
      </TouchableOpacity>

      {file ? (
        <View style={styles.fileMetaRow}>
          <Ionicons name="checkmark-circle" size={16} color={BRAND_GREEN} />
          <Text style={styles.fileMetaText}>Document selected successfully</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function KYCDocumentsScreen({ onBack, onComplete }: KYCDocumentsScreenProps) {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<UploadFile | undefined>();
  const [aadhaarBackFile, setAadhaarBackFile] = useState<UploadFile | undefined>();
  const [secondaryType, setSecondaryType] = useState<SecondaryType>('pan');
  const [secondaryNumber, setSecondaryNumber] = useState('');
  const [secondaryFrontFile, setSecondaryFrontFile] = useState<UploadFile | undefined>();
  const [secondaryBackFile, setSecondaryBackFile] = useState<UploadFile | undefined>();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const secondaryLabel = useMemo(() => {
    if (secondaryType === 'pan') return 'PAN Card';
    if (secondaryType === 'dl') return 'Driving License';
    return 'Passport';
  }, [secondaryType]);

  const secondaryPlaceholder = useMemo(() => {
    if (secondaryType === 'pan') return 'Enter PAN number';
    if (secondaryType === 'dl') return 'Enter driving license number';
    return 'Enter passport number';
  }, [secondaryType]);

  const pickImage = async (
    onPick: (file: UploadFile) => void,
    prefix: string,
    source: 'camera' | 'library' = 'library',
  ) => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          source === 'camera' ? 'Please allow camera access.' : 'Please allow photo access.',
        );
        return;
      }

      const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Image error', 'Could not load image. Please try again.');
        return;
      }

      onPick(createUploadFile(asset, prefix));
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Could not load image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!aadhaarNumber.trim() || !aadhaarFrontFile || !secondaryNumber.trim() || !secondaryFrontFile) {
      Alert.alert('Missing details', 'Please upload Aadhaar and one additional document.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({
        aadhaarNumber: aadhaarNumber.trim().toUpperCase(),
        aadhaarFrontFile,
        aadhaarBackFile,
        secondaryType,
        secondaryNumber: secondaryNumber.trim().toUpperCase(),
        secondaryFrontFile,
        secondaryBackFile,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <View style={styles.backButtonIcon}>
            <Ionicons name="arrow-back" size={18} color={TEXT_PRIMARY} />
          </View>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text-outline" size={52} color={BRAND_GREEN} />
          </View>
          <Text style={styles.heroTitle}>Upload KYC documents</Text>
          <Text style={styles.heroSubtitle}>
            Upload Aadhaar and one additional ID proof. This review helps us approve partners faster and keeps pickups secure.
          </Text>
        </View>

        <View style={styles.stepCard}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
          </View>
          <Text style={styles.stepTitle}>Aadhaar details</Text>
          <Text style={styles.stepDescription}>
            Add your 12-digit Aadhaar number and upload clear images of both sides. Sharp photos reduce review delays.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter Aadhaar number"
            placeholderTextColor="#94A3B8"
            value={aadhaarNumber}
            onChangeText={setAadhaarNumber}
            keyboardType="number-pad"
            maxLength={12}
          />

          <View style={styles.uploadStack}>
            <UploadCard
              label="Aadhaar front"
              helper="Make sure all text and edges are fully visible."
              file={aadhaarFrontFile}
              onCamera={() => pickImage(setAadhaarFrontFile, 'aadhaar-front', 'camera')}
              onGallery={() => pickImage(setAadhaarFrontFile, 'aadhaar-front', 'library')}
              onPreview={() => aadhaarFrontFile && setPreviewUri(aadhaarFrontFile.uri)}
            />
            <UploadCard
              label="Aadhaar back"
              helper="Add the back side if available. It helps with smoother verification."
              file={aadhaarBackFile}
              optional
              onCamera={() => pickImage(setAadhaarBackFile, 'aadhaar-back', 'camera')}
              onGallery={() => pickImage(setAadhaarBackFile, 'aadhaar-back', 'library')}
              onPreview={() => aadhaarBackFile && setPreviewUri(aadhaarBackFile.uri)}
            />
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepTitle}>Additional ID proof</Text>
          <Text style={styles.stepDescription}>
            Choose one more government ID. Use the document that you can capture most clearly right now.
          </Text>

          <View style={styles.documentTypeRow}>
            {[
              { label: 'PAN Card', value: 'pan' },
              { label: 'Driving License', value: 'dl' },
              { label: 'Passport', value: 'passport' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSecondaryType(option.value as SecondaryType)}
                style={[
                  styles.documentTypeButton,
                  secondaryType === option.value && styles.documentTypeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.documentTypeButtonText,
                    secondaryType === option.value && styles.documentTypeButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder={secondaryPlaceholder}
            placeholderTextColor="#94A3B8"
            value={secondaryNumber}
            onChangeText={setSecondaryNumber}
            autoCapitalize="characters"
          />

          <View style={styles.uploadStack}>
            <UploadCard
              label={`${secondaryLabel} front`}
              helper="Upload a well-lit image with all document details visible."
              file={secondaryFrontFile}
              onCamera={() => pickImage(setSecondaryFrontFile, `${secondaryType}-front`, 'camera')}
              onGallery={() => pickImage(setSecondaryFrontFile, `${secondaryType}-front`, 'library')}
              onPreview={() => secondaryFrontFile && setPreviewUri(secondaryFrontFile.uri)}
            />
            <UploadCard
              label={`${secondaryLabel} back`}
              helper="Add the back side if your selected document includes important details there."
              file={secondaryBackFile}
              optional
              onCamera={() => pickImage(setSecondaryBackFile, `${secondaryType}-back`, 'camera')}
              onGallery={() => pickImage(setSecondaryBackFile, `${secondaryType}-back`, 'library')}
              onPreview={() => secondaryBackFile && setPreviewUri(secondaryBackFile.uri)}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || !aadhaarFrontFile || !secondaryFrontFile}
          style={[
            styles.submitButton,
            (isSubmitting || !aadhaarFrontFile || !secondaryFrontFile) && styles.submitButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit for review</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={Boolean(previewUri)} animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity onPress={() => setPreviewUri(null)} style={styles.modalCloseButton}>
            <Ionicons name="close-circle" size={40} color="#FFFFFF" />
          </TouchableOpacity>
          {previewUri ? <Image source={{ uri: previewUri }} resizeMode="contain" style={styles.modalImage} /> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIcon: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: BRAND_GREEN_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 26,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BRAND_GREEN_SOFT,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  stepBadgeText: {
    color: BRAND_GREEN,
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  input: {
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    fontSize: 18,
    color: TEXT_PRIMARY,
    marginBottom: 18,
  },
  uploadStack: {
    gap: 14,
  },
  uploadCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  uploadTitleBlock: {
    flex: 1,
  },
  uploadLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  uploadHelper: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: TEXT_SECONDARY,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusBadgeSuccess: {
    backgroundColor: BRAND_GREEN_SOFT,
  },
  statusBadgeOptional: {
    backgroundColor: '#EEF2F6',
  },
  statusBadgeRequired: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeTextSuccess: {
    color: BRAND_GREEN,
  },
  statusBadgeTextOptional: {
    color: '#64748B',
  },
  statusBadgeTextRequired: {
    color: '#B45309',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D8E4D9',
    gap: 8,
    paddingHorizontal: 12,
  },
  actionButtonPrimary: {
    backgroundColor: BRAND_GREEN_TINT,
    borderColor: '#C8E7CF',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND_GREEN,
  },
  previewButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  previewButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewButtonTextDisabled: {
    color: '#94A3B8',
  },
  fileMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND_GREEN,
  },
  documentTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  documentTypeButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  documentTypeButtonActive: {
    borderColor: BRAND_GREEN,
    backgroundColor: BRAND_GREEN_TINT,
  },
  documentTypeButtonText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  documentTypeButtonTextActive: {
    color: BRAND_GREEN,
  },
  submitButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_GREEN,
    borderRadius: 20,
    gap: 8,
    marginTop: 8,
    shadowColor: BRAND_GREEN,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 58,
    right: 24,
    zIndex: 10,
  },
  modalImage: {
    width: '100%',
    height: 540,
    borderRadius: 22,
  },
});
