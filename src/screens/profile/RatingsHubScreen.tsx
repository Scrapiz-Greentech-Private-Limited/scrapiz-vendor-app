import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiService, VendorPendingReviewBooking, VendorReview, VendorReviewHubResponse } from '../../services/api';
import { getScrollContentBottomPadding } from '../../utils/safeAreaUtils';

interface RatingsHubScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onStartCustomerReview: (booking: VendorPendingReviewBooking) => void;
}

const StarRow = ({ value }: { value: number }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <MaterialIcons
        key={star}
        name={star <= Math.round(value) ? 'star' : 'star-border'}
        size={16}
        color={star <= Math.round(value) ? '#F59E0B' : '#CBD5E1'}
      />
    ))}
  </View>
);

const ReviewCard = ({ review, accent }: { review: VendorReview; accent: string }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewCardTop}>
      <View>
        <Text style={styles.reviewName}>{review.customer_name}</Text>
        <Text style={styles.reviewMeta}>Order #{review.order_number}</Text>
      </View>
      <View style={[styles.reviewRatingBadge, { backgroundColor: `${accent}18` }]}>
        <Text style={[styles.reviewRatingBadgeText, { color: accent }]}>{review.overall_rating.toFixed(1)}</Text>
      </View>
    </View>
    <StarRow value={review.overall_rating} />
    <Text style={styles.reviewExcerpt}>{review.summary_title || review.review_text || 'No written review yet.'}</Text>
  </View>
);

const RatingsHubScreen = ({ onBack, onShowToast, onStartCustomerReview }: RatingsHubScreenProps) => {
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<VendorReviewHubResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (showPullRefresh = false) => {
    if (showPullRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const nextPayload = await ApiService.getVendorReviewHub();
      setPayload(nextPayload);
    } catch (error: any) {
      onShowToast(error?.message || 'Unable to load ratings right now.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const nextPendingBooking = useMemo(
    () => payload?.pending_bookings?.[0] || null,
    [payload?.pending_bookings],
  );

  if (isLoading && !payload) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3FAE9A" />
        <Text style={styles.loadingText}>Loading your ratings and reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Ratings</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(getScrollContentBottomPadding(), insets.bottom + 36) }]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadData(true)} />}
      >
        <View style={styles.heroPanel}>
          <Text style={styles.heroEyebrow}>Reviews & Reputation</Text>
          <Text style={styles.heroTitle}>Track how customers see you and leave thoughtful feedback for every pickup.</Text>
          <Text style={styles.heroSubtitle}>Two spaces, one clean review loop: incoming customer ratings and your visit reviews for customers.</Text>
        </View>

        <TouchableOpacity style={[styles.featureCard, styles.receivedCard]} activeOpacity={0.92}>
          <View style={styles.featureIconWrap}>
            <MaterialIcons name="star-rate" size={28} color="#0F766E" />
          </View>
          <View style={styles.featureCopy}>
            <Text style={styles.featureTitle}>Customer Ratings to Vendor</Text>
            <Text style={styles.featureSubtitle}>See how customers rate your punctuality, professionalism, and overall pickup experience.</Text>
          </View>
          <View style={styles.featureStats}>
            <Text style={styles.featureStatValue}>{payload?.received_summary?.average_rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.featureStatMeta}>{payload?.received_summary?.total_reviews || 0} reviews</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureCard, styles.givenCard]}
          activeOpacity={0.92}
          onPress={() => nextPendingBooking && onStartCustomerReview(nextPendingBooking)}
        >
          <View style={[styles.featureIconWrap, styles.givenIconWrap]}>
            <MaterialIcons name="rate-review" size={28} color="#166534" />
          </View>
          <View style={styles.featureCopy}>
            <Text style={styles.featureTitle}>Vendor Review to Customer</Text>
            <Text style={styles.featureSubtitle}>Rate ease of access, communication, readiness, and leave a detailed review after each visit.</Text>
          </View>
          <View style={styles.featureStats}>
            <Text style={styles.featureStatValue}>{payload?.pending_bookings?.length || 0}</Text>
            <Text style={styles.featureStatMeta}>pending now</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incoming Customer Feedback</Text>
          <Text style={styles.sectionMeta}>Latest ratings customers have left for your service.</Text>
          {payload?.recent_received_reviews?.length ? (
            payload.recent_received_reviews.map((review) => (
              <ReviewCard key={review.id} review={review} accent="#0F766E" />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No customer ratings yet</Text>
              <Text style={styles.emptyText}>Once customers rate completed visits, they’ll appear here with your latest average.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.pendingHeader}>
            <View>
              <Text style={styles.sectionTitle}>Review Your Customers</Text>
              <Text style={styles.sectionMeta}>Completed visits waiting for your feedback.</Text>
            </View>
            {nextPendingBooking ? (
              <TouchableOpacity style={styles.pendingAction} onPress={() => onStartCustomerReview(nextPendingBooking)}>
                <Text style={styles.pendingActionText}>Start</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {payload?.pending_bookings?.length ? (
            payload.pending_bookings.map((booking) => (
              <TouchableOpacity
                key={booking.booking_id}
                style={styles.pendingCard}
                activeOpacity={0.92}
                onPress={() => onStartCustomerReview(booking)}
              >
                <View style={styles.pendingCardLeft}>
                  <Text style={styles.pendingCustomer}>{booking.customer_name}</Text>
                  <Text style={styles.pendingOrder}>Order #{booking.order_number}</Text>
                  <Text style={styles.pendingAddress}>{booking.pickup_address || 'Pickup address unavailable'}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#64748B" />
              </TouchableOpacity>
            ))
          ) : payload?.recent_given_reviews?.length ? (
            payload.recent_given_reviews.map((review) => (
              <ReviewCard key={`given-${review.id}`} review={review} accent="#166534" />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>All customer reviews are up to date</Text>
              <Text style={styles.emptyText}>As soon as a completed pickup needs your review, it will appear here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default RatingsHubScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF6F3' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF6F3' },
  loadingText: { marginTop: 12, color: '#4B5563', fontSize: 15, fontWeight: '600' },
  header: {
    backgroundColor: '#1D7F71',
    paddingTop: 46,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 44 },
  heroPanel: {
    backgroundColor: '#D7F0E8',
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroTitle: { marginTop: 8, fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#102A22' },
  heroSubtitle: { marginTop: 10, fontSize: 14, lineHeight: 21, color: '#4B5563' },
  featureCard: {
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  receivedCard: { backgroundColor: '#FFFFFF' },
  givenCard: { backgroundColor: '#F4FFF8' },
  featureIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#D7F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  givenIconWrap: { backgroundColor: '#DCFCE7' },
  featureCopy: { flex: 1, paddingRight: 12 },
  featureTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  featureSubtitle: { marginTop: 6, fontSize: 13.5, lineHeight: 19, color: '#64748B' },
  featureStats: { alignItems: 'flex-end' },
  featureStatValue: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  featureStatMeta: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#64748B' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sectionMeta: { marginTop: 4, fontSize: 13, lineHeight: 18, color: '#6B7280', marginBottom: 12 },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  reviewCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  reviewMeta: { marginTop: 4, fontSize: 12, color: '#64748B' },
  reviewRatingBadge: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  reviewRatingBadgeText: { fontSize: 14, fontWeight: '900' },
  starRow: { flexDirection: 'row', marginTop: 10, gap: 2 },
  reviewExcerpt: { marginTop: 10, fontSize: 13.5, lineHeight: 19, color: '#475569' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptyText: { marginTop: 8, fontSize: 13.5, lineHeight: 19, color: '#64748B' },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pendingAction: {
    backgroundColor: '#1D7F71',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  pendingActionText: { color: '#fff', fontWeight: '800' },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingCardLeft: { flex: 1, paddingRight: 8 },
  pendingCustomer: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  pendingOrder: { marginTop: 4, fontSize: 12, color: '#1D7F71', fontWeight: '700' },
  pendingAddress: { marginTop: 8, fontSize: 13, lineHeight: 18, color: '#64748B' },
});
