import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api';
import { BookingActiveResponse } from '../../types';

interface QuoteSettlementScreenProps {
  bookingId: string;
  orderNumber?: string;
  initialAmount?: number;
  onBack: () => void;
  onDone: (payload: { bookingId: string; totalPayout: number }) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const QuoteSettlementScreen: React.FC<QuoteSettlementScreenProps> = ({
  bookingId,
  orderNumber,
  initialAmount,
  onBack,
  onDone,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const [activeData, setActiveData] = useState<BookingActiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [upiReference, setUpiReference] = useState('');

  const loadActive = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      }
      try {
        const response = await ApiService.getBookingActive(bookingId);
        setActiveData(response);
      } catch {
        if (isManualRefresh) {
          onShowToast('Failed to refresh quote status.', 'error');
        }
      } finally {
        setLoading(false);
        if (isManualRefresh) {
          setRefreshing(false);
        }
      }
    },
    [bookingId, onShowToast]
  );

  useEffect(() => {
    void loadActive();
    const interval = setInterval(() => {
      void loadActive();
    }, 7000);

    return () => clearInterval(interval);
  }, [loadActive]);

  const quote = activeData?.quote;
  const quoteStatus = (quote?.status || '').toLowerCase();
  const bookingStatus = (activeData?.status || '').toLowerCase();

  const totalAmount = useMemo(() => {
    if (quote?.total_amount != null) {
      return Number(quote.total_amount || 0);
    }
    return Number(initialAmount || 0);
  }, [initialAmount, quote?.total_amount]);

  // Derive original friendly Order ID instead of raw UUID
  const displayOrderId = useMemo(() => {
    if (orderNumber && orderNumber.trim().length > 0) {
      return orderNumber.trim();
    }
    if (activeData?.order_number && activeData.order_number.trim().length > 0) {
      return activeData.order_number.trim();
    }
    if (bookingId.toLowerCase().startsWith('ord')) {
      return bookingId;
    }
    // Clean fallback if long UUID
    if (bookingId.includes('-') && bookingId.length > 10) {
      return `ORD-${bookingId.slice(0, 8).toUpperCase()}`;
    }
    return bookingId;
  }, [orderNumber, activeData?.order_number, bookingId]);

  const canConfirmPayment = quoteStatus === 'awaiting_payment' && quote?.payment_method === 'upi';
  const isComplete = bookingStatus === 'completed' || quoteStatus === 'paid';

  useEffect(() => {
    if (isComplete) {
      onDone({
        bookingId,
        totalPayout: totalAmount,
      });
    }
  }, [bookingId, isComplete, onDone, totalAmount]);

  const handleConfirmUpi = async () => {
    if (!canConfirmPayment || confirming) {
      return;
    }

    if (upiReference.trim().length < 6) {
      onShowToast('Enter a valid UPI reference (min 6 characters).', 'error');
      return;
    }

    setConfirming(true);
    try {
      await ApiService.confirmBookingQuotePayment(bookingId, upiReference.trim());
      onShowToast('UPI payment confirmed. Booking completed.', 'success');
      await loadActive();
    } catch (error: any) {
      onShowToast(error?.message || 'Failed to confirm UPI payment.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleCallCustomer = () => {
    const phone = activeData?.customer?.phone;
    if (phone) {
      void Linking.openURL(`tel:${phone}`);
    } else {
      onShowToast('Customer contact is masked or unavailable.', 'info');
    }
  };

  const formatStatusDisplay = (status: string) => {
    switch (status) {
      case 'submitted':
        return { label: 'AWAITING APPROVAL', tone: 'submitted' };
      case 'awaiting_payment':
        return { label: 'PAYMENT PENDING', tone: 'pending' };
      case 'paid':
        return { label: 'PAID & COMPLETED', tone: 'success' };
      case 'rejected':
        return { label: 'QUOTE REJECTED', tone: 'danger' };
      default:
        return { label: status ? status.toUpperCase() : 'PENDING RESPONSE', tone: 'neutral' };
    }
  };

  const statusMeta = formatStatusDisplay(quoteStatus);

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#15803D" />
          <Text style={styles.loaderTitle}>Connecting to Settlement Server</Text>
          <Text style={styles.loaderSubtitle}>Fetching live order status...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header with Dark-to-Light Green Gradient */}
      <LinearGradient
        colors={['#064E3B', '#0A3822', '#14532D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top + 8, 20) }]}
      >
        {/* Navigation Bar Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => void loadActive(true)}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Large Bold Header Title & Original Order ID Badge */}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Quote Settlement</Text>
          <View style={styles.orderBadgeRow}>
            <View style={styles.orderBadge}>
              <Ionicons name="receipt-outline" size={13} color="#A7F3D0" />
              <Text style={styles.orderBadgeText}>Order #{displayOrderId}</Text>
            </View>
            <View style={styles.liveSyncBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveSyncText}>Live Polling</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 32, 48) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadActive(true)}
            tintColor="#15803D"
            colors={['#15803D']}
          />
        }
      >
        {/* Current Status & Amount Hero Card */}
        <View style={styles.statusCard}>
          {/* Status Label & Status Pill */}
          <View style={styles.statusCardHeader}>
            <Text style={styles.statusLabel}>CURRENT STATUS</Text>
            <View
              style={[
                styles.statusPill,
                statusMeta.tone === 'submitted' && styles.statusPillSubmitted,
                statusMeta.tone === 'pending' && styles.statusPillPending,
                statusMeta.tone === 'success' && styles.statusPillSuccess,
                statusMeta.tone === 'danger' && styles.statusPillDanger,
              ]}
            >
              <View
                style={[
                  styles.statusPillDot,
                  statusMeta.tone === 'submitted' && styles.statusPillDotSubmitted,
                  statusMeta.tone === 'pending' && styles.statusPillDotPending,
                  statusMeta.tone === 'success' && styles.statusPillDotSuccess,
                  statusMeta.tone === 'danger' && styles.statusPillDotDanger,
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  statusMeta.tone === 'submitted' && styles.statusPillTextSubmitted,
                  statusMeta.tone === 'pending' && styles.statusPillTextPending,
                  statusMeta.tone === 'success' && styles.statusPillTextSuccess,
                  statusMeta.tone === 'danger' && styles.statusPillTextDanger,
                ]}
              >
                {statusMeta.label}
              </Text>
            </View>
          </View>

          {/* Amount and Attractive ActivityIndicator Row */}
          <View style={styles.amountIndicatorRow}>
            <View style={styles.amountCol}>
              <Text style={styles.amountSub}>Settlement Amount</Text>
              <Text style={styles.amountValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>

            {/* Attractive ActivityIndicator / Live Sync Badge */}
            <View style={styles.syncCapsule}>
              <View style={styles.syncIndicatorHalo}>
                <ActivityIndicator size="small" color="#16A34A" />
              </View>
              <View style={styles.syncTextCol}>
                <Text style={styles.syncTitle}>Syncing</Text>
                <Text style={styles.syncSub}>Real-time</Text>
              </View>
            </View>
          </View>

          {/* Bottom Card Metadata Chips */}
          <View style={styles.statusMetaDivider} />
          <View style={styles.statusMetaChipsRow}>
            <View style={styles.metaChip}>
              <Ionicons name="card-outline" size={13} color="#047857" />
              <Text style={styles.metaChipText}>
                Mode: {quote?.payment_method ? quote.payment_method.toUpperCase() : 'Awaiting Choice'}
              </Text>
            </View>
            {activeData?.customer?.name ? (
              <View style={styles.metaChip}>
                <Ionicons name="person-outline" size={13} color="#047857" />
                <Text style={styles.metaChipText} numberOfLines={1}>
                  {activeData.customer.name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* State 1: Submitted - Waiting for Customer */}
        {quoteStatus === 'submitted' && (
          <>
            {/* Redesigned Waiting Card with ActivityIndicator */}
            <View style={styles.waitingCard}>
              <View style={styles.waitingTopRow}>
                <View style={styles.waitingIndicatorHalo}>
                  <ActivityIndicator size="small" color="#059669" />
                </View>
                <View style={styles.waitingTextCol}>
                  <Text style={styles.waitingTitle}>Waiting for customer</Text>
                  <Text style={styles.waitingBody}>
                    Customer needs to accept or reject the quote in their Scrapiz app.
                  </Text>
                </View>
              </View>

              <View style={styles.waitingFooterRow}>
                <View style={styles.waitingDot} />
                <Text style={styles.waitingFooterText}>
                  Listening for customer decision • Auto-refreshing every 7s
                </Text>
              </View>
            </View>

            {/* Executive On-Duty Placeholder Image Card (person1.png) */}
            <View style={styles.partnerShowcaseCard}>
              <LinearGradient
                colors={['#ECFDF5', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.partnerGradientContent}
              >
                <View style={styles.partnerBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                  <Text style={styles.partnerBadgeText}>Scrapiz Verified Executive On-Duty</Text>
                </View>

                {/* Scrapiz Partner Portrait Image */}
                <View style={styles.partnerImageWrap}>
                  <Image
                    source={require('../../../assets/images/avatars/person1.png')}
                    style={styles.partnerImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Instructions & Help */}
                <View style={styles.partnerTextSection}>
                  <Text style={styles.partnerHeadline}>Stay with Customer</Text>
                  <Text style={styles.partnerDescription}>
                    Ask the customer to open their Scrapiz app to review the item weights and payout amount. This screen will automatically proceed once they confirm.
                  </Text>
                </View>

                {/* Direct Call Customer Action */}
                {activeData?.customer?.phone ? (
                  <TouchableOpacity
                    style={styles.callCustomerBtn}
                    onPress={handleCallCustomer}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    <Text style={styles.callCustomerBtnText}>
                      Call {activeData.customer.name || 'Customer'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </LinearGradient>
            </View>
          </>
        )}

        {/* State 2: Awaiting Payment via UPI */}
        {quoteStatus === 'awaiting_payment' && quote?.payment_method === 'upi' && (
          <View style={styles.upiCard}>
            <View style={styles.upiHeaderRow}>
              <View style={styles.upiIconWrap}>
                <MaterialCommunityIcons name="qrcode-scan" size={24} color="#15803D" />
              </View>
              <View style={styles.upiHeaderTextCol}>
                <Text style={styles.upiCardTitle}>Confirm UPI Payment</Text>
                <Text style={styles.upiCardSubtitle}>
                  Customer approved the quote and chose UPI payout.
                </Text>
              </View>
            </View>

            <View style={styles.upiDetailsBox}>
              <Text style={styles.upiFieldLabel}>CUSTOMER UPI ID</Text>
              <Text style={styles.upiFieldValue}>
                {quote.customer_upi_id || 'Not shared (ask customer)'}
              </Text>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>UPI TRANSACTION REFERENCE (UTR)</Text>
              <TextInput
                value={upiReference}
                onChangeText={setUpiReference}
                placeholder="Enter 12-digit UTR or reference"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void handleConfirmUpi()}
              disabled={confirming}
              style={styles.confirmBtnTouchable}
            >
              <LinearGradient
                colors={['#16A34A', '#0D5C3A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.confirmBtnGradient, confirming && styles.disabledBtn]}
              >
                {confirming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Confirm Payment & Complete Job</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* State 3: Quote Rejected */}
        {quoteStatus === 'rejected' && (
          <View style={styles.rejectedCard}>
            <View style={styles.rejectedIconWrap}>
              <MaterialIcons name="cancel" size={26} color="#DC2626" />
            </View>
            <View style={styles.rejectedTextCol}>
              <Text style={styles.rejectedTitle}>Quote Rejected by Customer</Text>
              <Text style={styles.rejectedBody}>
                Customer declined the proposed valuation. You can revisit items with customer, adjust the rate calculator, or contact support.
              </Text>
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={onBack} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>Return to Job Overview</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* State 4: Paid / Completed */}
        {quoteStatus === 'paid' && (
          <View style={styles.paidCard}>
            <View style={styles.paidIconWrap}>
              <Ionicons name="checkmark-done-circle" size={32} color="#16A34A" />
            </View>
            <Text style={styles.paidTitle}>Payment Completed</Text>
            <Text style={styles.paidBody}>
              Settlement is confirmed! Finalizing your job payout...
            </Text>
            <ActivityIndicator size="small" color="#16A34A" style={{ marginTop: 10 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F6',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F8F6',
    padding: 24,
  },
  loaderBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#064E3B',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.15)',
  },
  loaderTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  loaderSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  /* Header Styles */
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerTitleWrap: {
    marginTop: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  orderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.3)',
  },
  orderBadgeText: {
    color: '#ECFDF5',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  liveSyncText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
  },

  /* Main Scroll Content */
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  /* Current Status & Amount Card */
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.14)',
    shadowColor: '#064E3B',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusPillSubmitted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusPillDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillDotSubmitted: {
    backgroundColor: '#059669',
  },
  statusPillDotPending: {
    backgroundColor: '#D97706',
  },
  statusPillDotSuccess: {
    backgroundColor: '#16A34A',
  },
  statusPillDotDanger: {
    backgroundColor: '#DC2626',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusPillTextSubmitted: {
    color: '#065F46',
  },
  statusPillTextPending: {
    color: '#92400E',
  },
  statusPillTextSuccess: {
    color: '#14532D',
  },
  statusPillTextDanger: {
    color: '#991B1B',
  },

  amountIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  amountCol: {
    flex: 1,
  },
  amountSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginTop: 2,
  },

  /* Attractive ActivityIndicator Capsule */
  syncCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.22)',
  },
  syncIndicatorHalo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTextCol: {
    justifyContent: 'center',
  },
  syncTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14532D',
  },
  syncSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },

  statusMetaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  statusMetaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },

  /* Waiting Card with ActivityIndicator */
  waitingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.18)',
    shadowColor: '#064E3B',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  waitingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waitingIndicatorHalo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  waitingTextCol: {
    flex: 1,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  waitingBody: {
    fontSize: 13,
    color: '#475569',
    marginTop: 3,
    lineHeight: 18,
  },
  waitingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  waitingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  waitingFooterText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },

  /* Scrapiz Partner Showcase Card (person1.png) */
  partnerShowcaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
    shadowColor: '#064E3B',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  partnerGradientContent: {
    padding: 18,
    alignItems: 'center',
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 12,
  },
  partnerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14532D',
  },
  partnerImageWrap: {
    width: 190,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  partnerImage: {
    width: '100%',
    height: '100%',
  },
  partnerTextSection: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  partnerHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  partnerDescription: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  callCustomerBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803D',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#15803D',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  callCustomerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  /* UPI Payment Card */
  upiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
    shadowColor: '#064E3B',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  upiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upiIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiHeaderTextCol: {
    flex: 1,
  },
  upiCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  upiCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  upiDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  upiFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  upiFieldValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  inputWrap: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
  },
  confirmBtnTouchable: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.65,
  },

  /* Rejected & Paid States */
  rejectedCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  rejectedIconWrap: {
    marginBottom: 8,
  },
  rejectedTextCol: {
    gap: 4,
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9F1239',
  },
  rejectedBody: {
    fontSize: 13,
    color: '#881337',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#E11D48',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  paidCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  paidIconWrap: {
    marginBottom: 8,
  },
  paidTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#14532D',
  },
  paidBody: {
    fontSize: 13,
    color: '#166534',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default QuoteSettlementScreen;
