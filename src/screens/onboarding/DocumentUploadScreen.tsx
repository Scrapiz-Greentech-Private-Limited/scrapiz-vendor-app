import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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

type PreviewPayload = {
  uri: string;
  base64?: string | null;
  type?: string | null;
};

interface DocumentUploadScreenProps {
  onBack: () => void;
  onComplete: (payload: {
    faceImage?: UploadFile;
    aadhaarNumber: string;
    aadhaarFrontFile: UploadFile;
    aadhaarBackFile?: UploadFile;
    secondaryType: 'pan' | 'dl' | 'passport';
    secondaryNumber: string;
    secondaryFrontFile: UploadFile;
    secondaryBackFile?: UploadFile;
  }) => Promise<void> | void;
}

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

export default function DocumentUploadScreen({ onBack, onComplete }: DocumentUploadScreenProps) {
  const [faceImage, setFaceImage] = useState<UploadFile | undefined>();
  const [facePreviewUri, setFacePreviewUri] = useState<string | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<UploadFile | undefined>();
  const [aadhaarBackFile, setAadhaarBackFile] = useState<UploadFile | undefined>();
  const [secondaryType, setSecondaryType] = useState<'pan' | 'dl' | 'passport'>('pan');
  const [secondaryNumber, setSecondaryNumber] = useState('');
  const [secondaryFrontFile, setSecondaryFrontFile] = useState<UploadFile | undefined>();
  const [secondaryBackFile, setSecondaryBackFile] = useState<UploadFile | undefined>();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isPickingFace, setIsPickingFace] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.debug('[DocumentUploadScreen] faceImage changed', faceImage);
  }, [faceImage]);

  useEffect(() => {
    console.debug('[DocumentUploadScreen] facePreviewUri changed', facePreviewUri);
  }, [facePreviewUri]);

  const pickImage = async (
    onPick: (file: UploadFile) => void,
    prefix: string,
    aspect: [number, number],
    source: 'camera' | 'library' = 'library',
    onPreview?: (payload: PreviewPayload) => void,
  ) => {
    const isFacePicker = prefix === 'face-image';

    if (isFacePicker) {
      setIsPickingFace(true);
    }

    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          source === 'camera'
            ? 'Please allow camera access to capture your selfie.'
            : 'Please allow photo access to upload your documents.',
        );
        if (isFacePicker) {
          setIsPickingFace(false);
        }
        return;
      }

      const picker =
        source === 'camera'
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;

      console.debug('[DocumentUploadScreen] opening picker', { prefix, source, aspect });
      
      const result = await picker({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect,
        quality: 0.8,
        base64: false,
        exif: false,
        cameraType: source === 'camera' && isFacePicker ? ImagePicker.CameraType.front : undefined,
      });

      console.debug('[DocumentUploadScreen] picker result', { 
        canceled: result.canceled, 
        assetsLength: result.assets?.length,
        firstAssetUri: result.assets?.[0]?.uri 
      });

      if (result.canceled) {
        console.debug('[DocumentUploadScreen] picker cancelled by user');
        if (isFacePicker) {
          setIsPickingFace(false);
        }
        return;
      }

      if (!result.assets?.length) {
        console.warn('[DocumentUploadScreen] no assets returned from picker');
        Alert.alert('Image error', 'No image was selected. Please try again.');
        if (isFacePicker) {
          setIsPickingFace(false);
        }
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        console.error('[DocumentUploadScreen] picker asset missing uri', asset);
        Alert.alert('Image error', 'The selected image could not be loaded. Please try again.');
        if (isFacePicker) {
          setIsPickingFace(false);
        }
        return;
      }

      console.debug('[DocumentUploadScreen] asset received', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
      });

      const file = createUploadFile(asset, prefix);
      console.debug('[DocumentUploadScreen] upload file created', file);
      
      onPick(file);
      
      if (onPreview) {
        onPreview({
          uri: asset.uri,
          base64: null,
          type: asset.mimeType,
        });
      }
      
      console.debug('[DocumentUploadScreen] image picked successfully');
    } catch (error) {
      console.error('[DocumentUploadScreen] pickImage failed', error);
      Alert.alert('Upload failed', 'We could not load that image. Please try again.');
    } finally {
      if (isFacePicker) {
        setIsPickingFace(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!faceImage || !aadhaarNumber.trim() || !aadhaarFrontFile || !secondaryNumber.trim() || !secondaryFrontFile) {
      Alert.alert('Missing details', 'Please upload your selfie, Aadhaar, and one additional document.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({
        faceImage,
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

  const renderUploadRow = (
    label: string,
    file: UploadFile | undefined,
    onCamera: () => void,
    onGallery: () => void,
    optional = false,
  ) => (
    <View style={styles.uploadRow}>
      <View style={styles.uploadRowContent}>
        <View style={styles.uploadRowInfo}>
          <Text style={styles.uploadRowLabel}>{label}</Text>
          <Text style={styles.uploadRowStatus}>
            {file ? 'File selected' : optional ? 'Optional upload' : 'Upload required'}
          </Text>
        </View>
        <View style={styles.uploadRowActions}>
          <TouchableOpacity onPress={onCamera} style={styles.uploadButtonCamera}>
            <Text style={styles.uploadButtonCameraText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onGallery} style={styles.uploadButtonGallery}>
            <Text style={styles.uploadButtonGalleryText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => file && setPreviewUri(file.uri)}
            disabled={!file}
            style={[styles.uploadButtonView, !file && styles.uploadButtonViewDisabled]}
          >
            <Text style={[styles.uploadButtonViewText, !file && styles.uploadButtonViewTextDisabled]}>
              View
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const handleFacePreview = ({ uri, base64, type }: PreviewPayload) => {
    // Always use the URI directly instead of base64 to avoid rendering issues
    console.debug('[DocumentUploadScreen] computed face preview', {
      uri,
      hasBase64: Boolean(base64),
      type,
    });
    setFacePreviewUri(uri);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <TouchableOpacity onPress={onBack} className="self-start">
          <Text className="text-green-800 text-base font-semibold">Back</Text>
        </TouchableOpacity>

        <View className="mt-6 items-center">
          <View style={styles.heroVisualWrap}>
            <View style={styles.heroVisualCircle} />
            {facePreviewUri ? (
              <Image source={{ uri: facePreviewUri }} style={styles.heroFaceImage} />
            ) : (
              <View style={styles.heroFacePlaceholder}>
                <Ionicons name="person" size={92} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text className="text-3xl font-bold text-center text-slate-900">
            Complete your verification
          </Text>
          <Text className="mt-3 max-w-[320px] text-center text-base leading-6 text-slate-500">
            Start with a clear selfie, then upload your Aadhaar and one additional KYC document.
          </Text>
        </View>

        <View style={styles.stepCard} className="mt-8">
          <View style={styles.stepHeaderStack}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Step 1</Text>
            </View>
            <Text style={styles.stepTitleCentered}>Capture your selfie</Text>
            <Text style={styles.stepSubtitleCentered}>
              This photo is used for biometric verification. Keep your face centered and crop it before continuing.
            </Text>
          </View>

          <View style={styles.faceHero}>
            {isPickingFace ? (
              <View style={styles.faceLoadingState}>
                <ActivityIndicator size="large" color="#166534" />
                <Text style={styles.faceLoadingTitle}>Preparing your selfie</Text>
                <Text style={styles.faceLoadingText}>Cropping and loading your image preview...</Text>
              </View>
            ) : facePreviewUri ? (
              <Image source={{ uri: facePreviewUri }} style={styles.facePreview} />
            ) : (
              <View style={styles.facePlaceholder}>
                <Image
                  source={require('../../../assets/images/guideline_image.jpg')}
                  style={styles.guidelineImage}
                  resizeMode="cover"
                />
                <Text style={styles.facePlaceholderTitle}>Clear front-facing selfie required</Text>
                <Text style={styles.facePlaceholderText}>
                  Use good light, remove sunglasses or masks, and keep only one face in frame.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.faceActionRow}>
            <TouchableOpacity
              disabled={isPickingFace}
              onPress={() =>
                pickImage(setFaceImage, 'face-image', [1, 1], 'camera', handleFacePreview)
              }
              style={styles.primaryFaceButton}
            >
              {isPickingFace ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.primaryFaceButtonText}>{faceImage ? 'Retake Selfie' : 'Open Camera'}</Text>
            </TouchableOpacity>
          </View>

          {facePreviewUri ? (
            <>
              <View style={styles.faceSuccessPill}>
                <Ionicons name="checkmark-circle" size={18} color="#166534" />
                <Text style={styles.faceSuccessText}>Selfie selected. This will upload to secure storage on submit.</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewUri(facePreviewUri)} style={styles.previewFaceButton}>
                <Text style={styles.previewFaceButtonText}>Preview cropped selfie</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View style={[styles.stepCard, styles.documentCard, !faceImage && styles.documentCardDisabled]}>
              <View style={styles.inlineStepHeader}>
                <View style={styles.inlineStepBadge}>
                  <Text style={styles.inlineStepBadgeText}>Step 2</Text>
                </View>
                <Text className="text-lg font-semibold text-slate-800">Upload Aadhaar</Text>
              </View>

              <TextInput
                style={styles.documentInput}
                placeholder="Enter Aadhaar number"
                placeholderTextColor="#94A3B8"
                value={aadhaarNumber}
                onChangeText={setAadhaarNumber}
                keyboardType="number-pad"
                editable={Boolean(faceImage)}
              />

              <View style={styles.uploadRowSpacing}>
                {renderUploadRow(
                  'Aadhaar front',
                  aadhaarFrontFile,
                  () => faceImage && pickImage(setAadhaarFrontFile, 'aadhaar-front', [4, 3], 'camera'),
                  () => faceImage && pickImage(setAadhaarFrontFile, 'aadhaar-front', [4, 3], 'library'),
                )}
              </View>

              <View style={styles.uploadRowSpacing}>
                {renderUploadRow(
                  'Aadhaar back',
                  aadhaarBackFile,
                  () => faceImage && pickImage(setAadhaarBackFile, 'aadhaar-back', [4, 3], 'camera'),
                  () => faceImage && pickImage(setAadhaarBackFile, 'aadhaar-back', [4, 3], 'library'),
                  true,
                )}
              </View>
        </View>

        <View style={[styles.stepCard, styles.documentCard, !faceImage && styles.documentCardDisabled]}>
              <View style={styles.inlineStepHeader}>
                <View style={styles.inlineStepBadge}>
                  <Text style={styles.inlineStepBadgeText}>Step 3</Text>
                </View>
                <Text className="text-lg font-semibold text-slate-800">Upload additional document</Text>
              </View>

              <View style={styles.documentTypeRow}>
                {[
                  { label: 'PAN', value: 'pan' },
                  { label: 'DL', value: 'dl' },
                  { label: 'Passport', value: 'passport' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => faceImage && setSecondaryType(option.value as 'pan' | 'dl' | 'passport')}
                    style={[
                      styles.documentTypeButton,
                      secondaryType === option.value && styles.documentTypeButtonActive,
                    ]}
                  >
                    <Text style={[
                      styles.documentTypeButtonText,
                      secondaryType === option.value && styles.documentTypeButtonTextActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.documentInput}
                placeholder={`Enter ${secondaryType === 'pan' ? 'PAN' : secondaryType === 'dl' ? 'driving licence' : 'passport'} number`}
                placeholderTextColor="#94A3B8"
                value={secondaryNumber}
                onChangeText={setSecondaryNumber}
                autoCapitalize="characters"
                editable={Boolean(faceImage)}
              />

              <View style={styles.uploadRowSpacing}>
                {renderUploadRow(
                  `${secondaryType === 'pan' ? 'PAN' : secondaryType === 'dl' ? 'Driving licence' : 'Passport'} front`,
                  secondaryFrontFile,
                  () => faceImage && pickImage(setSecondaryFrontFile, `${secondaryType}-front`, [4, 3], 'camera'),
                  () => faceImage && pickImage(setSecondaryFrontFile, `${secondaryType}-front`, [4, 3], 'library'),
                )}
              </View>

              <View style={styles.uploadRowSpacing}>
                {renderUploadRow(
                  `${secondaryType === 'pan' ? 'PAN' : secondaryType === 'dl' ? 'Driving licence' : 'Passport'} back`,
                  secondaryBackFile,
                  () => faceImage && pickImage(setSecondaryBackFile, `${secondaryType}-back`, [4, 3], 'camera'),
                  () => faceImage && pickImage(setSecondaryBackFile, `${secondaryType}-back`, [4, 3], 'library'),
                  true,
                )}
              </View>
        </View>

        <TouchableOpacity
          className="bg-green-800 rounded-2xl mt-10 py-4 items-center"
          onPress={handleSubmit}
          disabled={isSubmitting || !faceImage}
          style={!faceImage ? styles.submitDisabled : undefined}
        >
          <Text className="text-white text-lg font-bold">{isSubmitting ? 'Submitting...' : 'Submit for Review'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={Boolean(previewUri)} animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View className="flex-1 bg-black/80 px-6 justify-center">
          <TouchableOpacity onPress={() => setPreviewUri(null)} className="absolute top-14 right-6 z-10">
            <Ionicons name="close-circle" size={34} color="#FFFFFF" />
          </TouchableOpacity>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              resizeMode="contain"
              style={{ width: '100%', height: 420, borderRadius: 24 }}
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E7EEE8',
    padding: 20,
  },
  heroVisualWrap: {
    width: 214,
    height: 214,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  heroVisualCircle: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#1F5FD0',
  },
  heroFaceImage: {
    width: 176,
    height: 176,
    borderRadius: 88,
    resizeMode: 'cover',
  },
  heroFacePlaceholder: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#1F5FD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeaderStack: {
    alignItems: 'center',
  },
  stepBadge: {
    backgroundColor: '#166534',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  stepTitleCentered: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  stepSubtitleCentered: {
    color: '#64748B',
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  faceHero: {
    marginTop: 18,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F8FBF8',
    borderWidth: 1,
    borderColor: '#E6EFE8',
  },
  facePreview: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#F5FAF6',
  },
  facePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  guidelineImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#EEF4F0',
  },
  faceLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  facePlaceholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 18,
    textAlign: 'center',
  },
  facePlaceholderText: {
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  faceLoadingTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  faceLoadingText: {
    marginTop: 6,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  faceActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryFaceButton: {
    minWidth: 190,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#166534',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryFaceButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  previewFaceButton: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E6F4EA',
  },
  previewFaceButtonText: {
    color: '#166534',
    fontWeight: '800',
  },
  faceSuccessPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: '#EAF7EE',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  faceSuccessText: {
    color: '#166534',
    fontWeight: '700',
    maxWidth: 240,
    textAlign: 'center',
  },
  inlineStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineStepBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10,
  },
  inlineStepBadgeText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 12,
  },
  documentCard: {
    marginTop: 20,
  },
  documentCardDisabled: {
    opacity: 0.52,
  },
  submitDisabled: {
    opacity: 0.55,
  },
  documentInput: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#0F172A',
  },
  uploadRowSpacing: {
    marginTop: 16,
  },
  documentTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  documentTypeButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  documentTypeButtonActive: {
    borderColor: '#15803D',
    backgroundColor: '#F0FDF4',
  },
  documentTypeButtonText: {
    color: '#475569',
    fontWeight: '600',
  },
  documentTypeButtonTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  uploadRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  uploadRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadRowInfo: {
    flex: 1,
    paddingRight: 12,
  },
  uploadRowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  uploadRowStatus: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748B',
  },
  uploadRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonCamera: {
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  uploadButtonCameraText: {
    fontWeight: '600',
    color: '#166534',
  },
  uploadButtonGallery: {
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  uploadButtonGalleryText: {
    fontWeight: '600',
    color: '#334155',
  },
  uploadButtonView: {
    borderRadius: 999,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  uploadButtonViewDisabled: {
    backgroundColor: '#E2E8F0',
  },
  uploadButtonViewText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  uploadButtonViewTextDisabled: {
    color: '#94A3B8',
  },
});
