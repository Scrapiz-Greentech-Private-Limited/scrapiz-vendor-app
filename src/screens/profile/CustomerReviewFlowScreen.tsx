import React, { useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiService, VendorPendingReviewBooking } from '../../services/api';
import { getScrollContentBottomPadding } from '../../utils/safeAreaUtils';

interface CustomerReviewFlowScreenProps {
  booking: VendorPendingReviewBooking;
  onBack: () => void;
  onComplete: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ASPECTS = [
  {
    key: 'ease_of_access_rating',
    label: 'Ease of access',
    captions: ['Bad', 'So so', 'Good', 'Great', 'Amazing'],
  },
  {
    key: 'punctuality_rating',
    label: 'Punctuality',
    captions: ['Late', 'Slow', 'Fine', 'On time', 'Excellent'],
  },
  {
    key: 'communication_rating',
    label: 'Communication',
    captions: ['Poor', 'Okay', 'Clear', 'Helpful', 'Excellent'],
  },
  {
    key: 'material_readiness_rating',
    label: 'Material readiness',
    captions: ['Messy', 'Low', 'Fair', 'Ready', 'Perfect'],
  },
  {
    key: 'overall_experience_rating',
    label: 'Overall experience',
    captions: ['Bad', 'Average', 'Good', 'Great', 'Perfect'],
  },
] as const;

type AspectKey = (typeof ASPECTS)[number]['key'];

type ReviewFormState = Record<AspectKey, number> & {
  overall_rating: number;
  recommendation: boolean;
  review_text: string;
  summary_title: string;
  review_images: Array<{ uri: string; name: string; type: string }>;
};

const StepPills = ({ activeStep }: { activeStep: number }) => (
  <View style={styles.stepPills}>
    {[1, 2, 3].map((step) => (
      <View key={step} style={[styles.stepPill, step <= activeStep ? styles.stepPillActive : styles.stepPillInactive]} />
    ))}
  </View>
);

const ScoreChooser = ({
  label,
  value,
  captions,
  onSelect,
}: {
  label: string;
  value: number;
  captions: readonly string[];
  onSelect: (score: number) => void;
}) => (
  <View style={styles.aspectCard}>
    <Text style={styles.aspectLabel}>{label}</Text>
    <View style={styles.scoreRow}>
      {[1, 2, 3, 4, 5].map((score, index) => {
        const active = score === value;
        return (
          <TouchableOpacity key={score} style={styles.scoreItem} onPress={() => onSelect(score)} activeOpacity={0.9}>
            <View style={[styles.scoreBubble, active ? styles.scoreBubbleActive : styles.scoreBubbleInactive]}>
              <Text style={[styles.scoreNumber, active ? styles.scoreNumberActive : styles.scoreNumberInactive]}>{score}</Text>
            </View>
            <Text style={[styles.scoreCaption, active && styles.scoreCaptionActive]}>{captions[index]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const CustomerReviewFlowScreen = ({ booking, onBack, onComplete, onShowToast }: CustomerReviewFlowScreenProps) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<ReviewFormState>({
    overall_rating: 5,
    recommendation: true,
    ease_of_access_rating: 4,
    punctuality_rating: 4,
    communication_rating: 4,
    material_readiness_rating: 4,
    overall_experience_rating: 4,
    review_text: '',
    summary_title: '',
    review_images: [],
  });

  const heroSubtitle = useMemo(() => {
    if (booking.pickup_address) {
      return booking.pickup_address;
    }
    return `Order #${booking.order_number}`;
  }, [booking.order_number, booking.pickup_address]);

  const updateAspect = (key: AspectKey, value: number) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const pickImage = async () => {
    if (form.review_images.length >= 3) {
      onShowToast('You can attach up to 3 visit photos.', 'info');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        onShowToast('Photo permission is needed to attach visit photos.', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || `review-${Date.now()}.jpg`;
        const extMatch = /\.(\w+)$/.exec(filename);
        const type = extMatch ? `image/${extMatch[1]}` : 'image/jpeg';
        setForm((current) => ({
          ...current,
          review_images: [...current.review_images, { uri: asset.uri, name: filename, type }].slice(0, 3),
        }));
      }
    } catch {
      onShowToast('Unable to open the photo library right now.', 'error');
    }
  };

  const removeImage = (uri: string) => {
    setForm((current) => ({
      ...current,
      review_images: current.review_images.filter((image) => image.uri !== uri),
    }));
  };

  const submitReview = async () => {
    if (!form.summary_title.trim()) {
      onShowToast('Add a short summary before submitting.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.submitVendorCustomerReview({
        booking_id: booking.booking_id,
        overall_rating: form.overall_rating,
        recommendation: form.recommendation,
        ease_of_access_rating: form.ease_of_access_rating,
        punctuality_rating: form.punctuality_rating,
        communication_rating: form.communication_rating,
        material_readiness_rating: form.material_readiness_rating,
        overall_experience_rating: form.overall_experience_rating,
        review_text: form.review_text.trim(),
        summary_title: form.summary_title.trim(),
        review_images: form.review_images,
      });
      setStep(3);
      onShowToast('Customer review submitted successfully.', 'success');
    } catch (error: any) {
      onShowToast(error?.message || 'Unable to submit this review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 3) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.thankYouScrollContent,
          { paddingBottom: Math.max(getScrollContentBottomPadding(), insets.bottom + 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.thankYouScreen}>
          <View style={styles.thankYouGhostCardTop} />
          <View style={styles.thankYouGhostCardBottom} />
          <View style={styles.thankYouBadge}>
            <MaterialIcons name="verified" size={22} color="#0F766E" />
            <Text style={styles.thankYouBadgeText}>Review saved</Text>
          </View>
          <StepPills activeStep={3} />
          <View style={styles.thankYouPanel}>
            <View style={styles.thankYouIconWrap}>
              <MaterialIcons name="thumb-up-alt" size={34} color="#0F766E" />
            </View>
            <Text style={styles.thankYouTitle}>Thank you for your review!</Text>
            <Text style={styles.thankYouSubtitle}>
              Your feedback helps us understand what makes every pickup smoother, safer, and more reliable for future visits.
            </Text>
            <View style={styles.thankYouPoints}>
              <View style={styles.thankYouPointRow}>
                <MaterialIcons name="check-circle" size={18} color="#4AAE9A" />
                <Text style={styles.thankYouPointText}>Your customer review is now part of the pickup history.</Text>
              </View>
              <View style={styles.thankYouPointRow}>
                <MaterialIcons name="check-circle" size={18} color="#4AAE9A" />
                <Text style={styles.thankYouPointText}>Admin teams can review service quality with clearer context.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryActionButton} onPress={onComplete}>
              <Text style={styles.primaryActionText}>See All Your Reviews</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(getScrollContentBottomPadding(), insets.bottom + 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topWash} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reviews and Ratings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <StepPills activeStep={step} />

        {step === 1 ? (
          <>
            <View style={styles.tripCard}>
              <View style={styles.tripThumb}>
                <MaterialIcons name="person-outline" size={30} color="#3FAE9A" />
              </View>
              <View style={styles.tripCopy}>
                <Text style={styles.tripTitle}>How was your experience with {booking.customer_name}?</Text>
                <Text style={styles.tripMeta}>{heroSubtitle}</Text>
              </View>
            </View>

            <View style={styles.mainCard}>
              <Text style={styles.promptTitle}>How was the visit?</Text>
              <View style={styles.mainStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setForm((current) => ({ ...current, overall_rating: star }))}>
                    <MaterialIcons
                      name={star <= form.overall_rating ? 'star' : 'star-border'}
                      size={44}
                      color="#63C3B1"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingNarrative}>Great 5 star! We’d love to hear what made this pickup go so well.</Text>

              <TouchableOpacity
                style={[styles.recommendRow, form.recommendation && styles.recommendRowActive]}
                onPress={() => setForm((current) => ({ ...current, recommendation: !current.recommendation }))}
              >
                <View style={styles.recommendDot}>
                  {form.recommendation ? <MaterialIcons name="check" size={16} color="#fff" /> : null}
                </View>
                <Text style={styles.recommendText}>I would happily work with this customer again</Text>
              </TouchableOpacity>

              <View style={styles.aspectSection}>
                <Text style={styles.aspectSectionTitle}>How would you rate the following aspects?</Text>
                {ASPECTS.map((aspect) => (
                  <ScoreChooser
                    key={aspect.key}
                    label={aspect.label}
                    value={form[aspect.key]}
                    captions={aspect.captions}
                    onSelect={(score) => updateAspect(aspect.key, score)}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.primaryActionButton} onPress={() => setStep(2)}>
                <Text style={styles.primaryActionText}>Share More Details</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.calloutPill}>
              <MaterialIcons name="star" size={20} color="#4AAE9A" />
              <Text style={styles.calloutText}>You gave it a strong score. We'd love to hear more about your experience.</Text>
            </View>

            <View style={[styles.mainCard, styles.detailCard]}>
              <Text style={styles.formSectionTitle}>Write your review</Text>
              <Text style={styles.formSectionIntro}>Share the visit details in your own words so the record feels useful and complete.</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Review notes</Text>
                <TextInput
                  style={[styles.textArea, styles.bigInput, styles.reviewInput]}
                  multiline
                  value={form.review_text}
                  onChangeText={(text) => setForm((current) => ({ ...current, review_text: text }))}
                  placeholder="Tell us about the visit"
                  placeholderTextColor="#94A3B8"
                  textAlignVertical="top"
                />
              </View>

              <View style={[styles.fieldGroup, styles.formSectionSpacing]}>
                <Text style={styles.fieldLabel}>Short summary</Text>
                <TextInput
                  style={[styles.textInput, styles.summaryInput]}
                  value={form.summary_title}
                  onChangeText={(text) => setForm((current) => ({ ...current, summary_title: text }))}
                  placeholder="Amazing experience"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <Text style={[styles.formSectionTitle, styles.formSectionSpacing]}>Share some photos of your visit</Text>
              <View style={styles.photoRow}>
                {form.review_images.map((image) => (
                  <View key={image.uri} style={styles.photoTileWrap}>
                    <Image source={{ uri: image.uri }} style={styles.photoTile} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeImage(image.uri)}>
                      <Ionicons name="remove" size={12} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                ))}
                {form.review_images.length < 3 ? (
                  <TouchableOpacity style={styles.photoAddTile} onPress={pickImage}>
                    <MaterialIcons name="add-photo-alternate" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity style={styles.primaryActionButton} onPress={() => void submitReview()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <View style={styles.submitLoading}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryActionText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryActionText}>Submit Your Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default CustomerReviewFlowScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FBFA' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#C9EFE7',
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  headerRow: {
    paddingTop: 48,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  stepPills: { flexDirection: 'row', gap: 8, alignSelf: 'center', marginTop: 18 },
  stepPill: { width: 46, height: 6, borderRadius: 999 },
  stepPillActive: { backgroundColor: '#4AAE9A' },
  stepPillInactive: { backgroundColor: '#D9E7E3' },
  tripCard: {
    marginTop: 18,
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripThumb: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E7F8F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tripCopy: { flex: 1 },
  tripTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800', color: '#111827' },
  tripMeta: { marginTop: 4, fontSize: 13, color: '#64748B' },
  mainCard: {
    marginTop: 16,
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6F2EF',
  },
  detailCard: {
    paddingBottom: 24,
  },
  promptTitle: { textAlign: 'center', fontSize: 34, fontWeight: '800', color: '#111827' },
  mainStars: { marginTop: 16, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  ratingNarrative: { marginTop: 12, textAlign: 'center', fontSize: 17, lineHeight: 24, color: '#475569' },
  recommendRow: {
    marginTop: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEF2F7',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendRowActive: { borderColor: '#E0F2ED' },
  recommendDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#52B49F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recommendText: { fontSize: 15, fontWeight: '600', color: '#334155', flex: 1 },
  aspectSection: { marginTop: 18 },
  aspectSectionTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#111827', marginBottom: 14 },
  aspectCard: { backgroundColor: '#FBFDFD', borderRadius: 22, padding: 14, marginBottom: 12 },
  aspectLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 14 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  scoreItem: { alignItems: 'center', flex: 1 },
  scoreBubble: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  scoreBubbleActive: { backgroundColor: '#171717' },
  scoreBubbleInactive: { backgroundColor: '#F1F5F9' },
  scoreNumber: { fontSize: 15, fontWeight: '800' },
  scoreNumberActive: { color: '#fff' },
  scoreNumberInactive: { color: '#334155' },
  scoreCaption: { marginTop: 8, fontSize: 10.5, color: '#94A3B8', textAlign: 'center' },
  scoreCaptionActive: { color: '#111827', fontWeight: '700' },
  primaryActionButton: {
    marginTop: 18,
    backgroundColor: '#4AAE9A',
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryActionText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  calloutPill: {
    marginTop: 20,
    marginHorizontal: 18,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calloutText: { flex: 1, fontSize: 14, lineHeight: 19, color: '#1F2937', fontWeight: '600' },
  formSectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  formSectionIntro: { marginTop: 8, fontSize: 14, lineHeight: 20, color: '#64748B' },
  formSectionSpacing: { marginTop: 18 },
  fieldGroup: { marginTop: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
    borderWidth: 1.5,
    borderColor: '#DCEAE6',
  },
  bigInput: { minHeight: 130 },
  reviewInput: {
    minHeight: 180,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1.5,
    borderColor: '#DCEAE6',
  },
  summaryInput: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  photoRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  photoTileWrap: { position: 'relative' },
  photoTile: { width: 78, height: 78, borderRadius: 18, backgroundColor: '#E2E8F0' },
  photoRemove: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: 78,
    height: 78,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  submitLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thankYouScreen: {
    backgroundColor: '#FAF9F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 72,
    minHeight: 720,
  },
  thankYouScrollContent: {
    flexGrow: 1,
  },
  thankYouGhostCardTop: {
    position: 'absolute',
    top: 58,
    left: 18,
    width: 164,
    height: 92,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.78)',
    transform: [{ rotate: '-12deg' }],
  },
  thankYouGhostCardBottom: {
    position: 'absolute',
    bottom: 116,
    right: 12,
    width: 220,
    height: 112,
    borderRadius: 28,
    backgroundColor: 'rgba(247,250,240,0.92)',
    transform: [{ rotate: '14deg' }],
  },
  thankYouBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  thankYouBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  thankYouPanel: {
    marginTop: 22,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thankYouIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#E7F8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thankYouTitle: {
    marginTop: 20,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  thankYouSubtitle: {
    marginTop: 14,
    fontSize: 17,
    lineHeight: 26,
    color: '#4B5563',
    textAlign: 'center',
  },
  thankYouPoints: {
    marginTop: 22,
    width: '100%',
    gap: 12,
  },
  thankYouPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  thankYouPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    fontWeight: '600',
  },
});
