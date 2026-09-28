/**
 * vendorApp/src/screens/jobs/VendorPaymentScreen.tsx
 *
 * NEW canonical vendor payment screen.
 *
 * Replaces the legacy QuoteSettlementScreen for the updated payment architecture.
 * The vendor controls payment method. The customer confirms receipt.
 *
 * STATE MACHINE (server-authoritative, polled every 6 s):
 *  payment_ready              → Show QR scanner (UPI) or "hand cash" button
 *  payment_initiated          → Vendor scanned QR, submit UTR
 *  vendor_reference_submitted → Waiting for customer
 *  customer_confirmation_pending → Waiting for customer
 *  paid / cash_paid           → Job complete → navigate away
 *  disputed                   → Customer raised dispute
 *
 * SECURITY:
 * - Amount is always from server (tx.amount). Never from client.
 * - UTR submission goes via VendorSubmitPaymentReferenceView.
 * - Cash fallback via VendorCashFallbackView if allowed.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const POLL_INTERVAL_MS = 6_000;

interface VendorPaymentScreenProps {
  bookingId: string;
  orderNumber?: string;
  /** Vendor's chosen payout preference from quote submission */
  preferredPaymentMethod: 'upi' | 'cash';
  cashFallbackAllowed: boolean;
  onBack: () => void;
  onDone: (payload: { bookingId: string; totalPayout: number }) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const VendorPaymentScreen: React.FC<VendorPaymentScreenProps> = ({
  bookingId,
  orderNumber,
  preferredPaymentMethod,
  cashFallbackAllowed,
  onBack,
  onDone,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();

  const [txData, setTxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UTR submission state
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);

  // Cash handover state
  const [submittingCash, setSubmittingCash] = useState(false);

  // Cash fallback state
  const [switchingToCash, setSwitchingToCash] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPaymentState = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const response = await ApiService.getVendorPaymentState(bookingId);
      const data = (response as any)?.data ?? response;
      setTxData(data?.payment_transaction ?? null);
    } catch (err: any) {
      if (isManual) onShowToast(err?.message || 'Failed to refresh.', 'error');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [bookingId, onShowToast]);

  useEffect(() => {
    void loadPaymentState();
    pollRef.current = setInterval(() => void loadPaymentState(), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadPaymentState]);

  // Auto-done on terminal success or customer confirmation
  const txStatus: string = txData?.status ?? '';
  const isComplete = txStatus === 'paid' || txStatus === 'cash_paid';
  const totalAmount = useMemo(() => Number(txData?.amount ?? 0), [txData?.amount]);

  useEffect(() => {
    if (isComplete) {
      if (pollRef.current) clearInterval(pollRef.current);
      onDone({ bookingId, totalPayout: totalAmount });
    }
  }, [isComplete, bookingId, totalAmount, onDone]);

  // ── Derived state ────────────────────────────────────────────────────────
  const effectivePaymentMethod: 'upi' | 'cash' = useMemo(() => {
    if (!txData) return preferredPaymentMethod;
    if (txData.cash_fallback_used) return 'cash';
    return txData.preferred_payment_method ?? preferredPaymentMethod;
  }, [txData, preferredPaymentMethod]);

  const isUpiFlow = effectivePaymentMethod === 'upi';
  const isCashFlow = effectivePaymentMethod === 'cash';
  const canSwitchToCash = cashFallbackAllowed && isUpiFlow && !txData?.cash_fallback_used
    && !['vendor_reference_submitted', 'customer_confirmation_pending', 'paid', 'cash_paid'].includes(txStatus);

  const customerUpiVpaMasked: string = txData?.customer_upi_vpa_masked ?? '';
  const customerUpiName: string = txData?.customer_upi_name ?? '';

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleOpenUpiApp = () => {
    // Open UPI intent for paying the customer
    if (!txData?.customer_upi_vpa || !totalAmount) {
      onShowToast('Customer UPI details not available yet.', 'info');
      return;
    }
    const note = encodeURIComponent(`Scrapiz-${orderNumber ?? bookingId}`);
    const uri = `upi://pay?pa=${encodeURIComponent(txData.customer_upi_vpa)}&pn=${encodeURIComponent(txData.customer_upi_name || 'Scrapiz Customer')}&am=${totalAmount}&cu=INR&tn=${note}`;
    Linking.openURL(uri).catch(() => {
      onShowToast('No UPI app found. Please pay manually and enter UTR.', 'info');
    });
  };

  const handleSubmitUtr = async () => {
    if (submittingUtr) return;
    const utr = utrInput.trim().toUpperCase();
    if (utr.length < 6) {
      onShowToast('Enter a valid UTR (min 6 characters).', 'error');
      return;
    }
    setSubmittingUtr(true);
    try {
      const result = await ApiService.submitPaymentReference(bookingId, utr);
      const data = (result as any)?.data ?? result;
      setTxData(data?.payment_transaction ?? txData);
      onShowToast('Payment reference submitted. Waiting for customer confirmation.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to submit payment reference.', 'error');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleCashHandedOver = async () => {
    if (submittingCash) return;
    Alert.alert(
      'Confirm Cash Handover',
      `Have you handed over ₹${totalAmount.toFixed(2)} cash to the customer?`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, confirm',
          onPress: async () => {
            setSubmittingCash(true);
            try {
              const result = await ApiService.submitCashHandedOver(bookingId);
              const data = (result as any)?.data ?? result;
              setTxData(data?.payment_transaction ?? txData);
              onShowToast('Cash handover recorded. Waiting for customer.', 'success');
            } catch (err: any) {
              onShowToast(err?.message || 'Failed to record cash handover.', 'error');
            } finally {
              setSubmittingCash(false);
            }
          },
        },
      ],
    );
  };

  const handleSwitchToCash = async () => {
    if (switchingToCash) return;
    Alert.alert(
      'Switch to Cash?',
      'UPI is not available. Will you pay the customer in cash instead?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Cash',
          onPress: async () => {
            setSwitchingToCash(true);
            try {
              const result = await ApiService.switchToCashFallback(bookingId);
              const data = (result as any)?.data ?? result;
              setTxData(data?.payment_transaction ?? txData);
              onShowToast('Switched to cash payment.', 'success');
            } catch (err: any) {
              onShowToast(err?.message || 'Failed to switch to cash.', 'error');
            } finally {
              setSwitchingToCash(false);
            }
          },
        },
      ],
    );
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#15803D" />
          <Text style={styles.loaderTitle}>Loading payment state…</Text>
        </View>
      </View>
    );
  }

  // ── Status label ─────────────────────────────────────────────────────────
  const statusMeta = getStatusMeta(txStatus);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#064E3B', '#0A3822', '#14532D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top + 8, 20) }]}
      >
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => void loadPaymentState(true)}
            disabled={refreshing}
          >
            {refreshing
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Pay Customer</Text>
          <View style={styles.orderBadgeRow}>
            {orderNumber ? (
              <View style={styles.orderBadge}>
                <Ionicons name="receipt-outline" size={13} color="#A7F3D0" />
                <Text style={styles.orderBadgeText}>Order #{orderNumber}</Text>
              </View>
            ) : null}
            <View style={styles.liveSyncBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveSyncText}>Live</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 32, 48) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPaymentState(true)}
            tintColor="#15803D"
            colors={['#15803D']}
          />
        }
      >
        {/* Amount & status card */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Amount to Pay</Text>
              <Text style={styles.amountValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusMeta.dotColor }]} />
              <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>

          {/* Payment method chip */}
          <View style={styles.methodChipRow}>
            <View style={[styles.methodChip, isUpiFlow ? styles.methodChipUpi : styles.methodChipCash]}>
              {isUpiFlow
                ? <MaterialCommunityIcons name="qrcode-scan" size={14} color="#0369A1" />
                : <MaterialIcons name="payments" size={14} color="#166534" />}
              <Text style={[styles.methodChipText, { color: isUpiFlow ? '#0369A1' : '#166534' }]}>
                {isUpiFlow ? 'UPI Transfer' : 'Cash'}
                {txData?.cash_fallback_used ? ' (fallback)' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ── UPI flow: payment_ready ── */}
        {isUpiFlow && (txStatus === 'payment_ready' || txStatus === 'payment_initiated' || !txStatus) && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconWrap}>
                <MaterialCommunityIcons name="qrcode-scan" size={22} color="#15803D" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Pay via UPI</Text>
                <Text style={styles.cardSubtitle}>Open your UPI app and pay the customer</Text>
              </View>
            </View>

            {/* Customer UPI info */}
            {(customerUpiVpaMasked || customerUpiName) ? (
              <View style={styles.upiDetailsBox}>
                <Text style={styles.upiFieldLabel}>CUSTOMER UPI ID</Text>
                <Text style={styles.upiFieldValue}>{customerUpiVpaMasked || '—'}</Text>
                {customerUpiName ? (
                  <Text style={styles.upiFieldName}>{customerUpiName}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.waitingBox}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.waitingText}>Waiting for customer to share UPI details…</Text>
              </View>
            )}

            {/* Open UPI app button */}
            {customerUpiVpaMasked && (
              <TouchableOpacity style={styles.openUpiBtn} onPress={handleOpenUpiApp}>
                <MaterialCommunityIcons name="cellphone-arrow-down" size={18} color="#fff" />
                <Text style={styles.openUpiBtnText}>Open UPI App to Pay</Text>
              </TouchableOpacity>
            )}

            {/* UTR input */}
            <View style={styles.utrSection}>
              <Text style={styles.utrLabel}>ENTER UTR / TRANSACTION REFERENCE</Text>
              <Text style={styles.utrSubLabel}>After paying, enter the UTR from your UPI app</Text>
              <TextInput
                value={utrInput}
                onChangeText={setUtrInput}
                placeholder="e.g. 425611234567"
                placeholderTextColor="#94A3B8"
                style={styles.utrInput}
                autoCapitalize="characters"
                keyboardType="default"
              />
              <TouchableOpacity
                style={[styles.submitUtrBtn, (submittingUtr || utrInput.trim().length < 6) && styles.disabledBtn]}
                onPress={() => void handleSubmitUtr()}
                disabled={submittingUtr || utrInput.trim().length < 6}
              >
                {submittingUtr
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.submitUtrBtnText}>Submit Payment Reference</Text>
                    </>}
              </TouchableOpacity>
            </View>

            {/* Cash fallback option */}
            {canSwitchToCash && (
              <TouchableOpacity style={styles.cashFallbackBtn} onPress={() => void handleSwitchToCash()}>
                {switchingToCash
                  ? <ActivityIndicator size="small" color="#92400E" />
                  : <Text style={styles.cashFallbackBtnText}>UPI not working? Switch to Cash</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Cash flow: payment_ready ── */}
        {isCashFlow && txStatus === 'payment_ready' && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <MaterialIcons name="payments" size={22} color="#15803D" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Hand Over Cash</Text>
                <Text style={styles.cardSubtitle}>
                  Count out ₹{totalAmount.toFixed(2)} and hand it to the customer.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitUtrBtn, submittingCash && styles.disabledBtn]}
              onPress={() => void handleCashHandedOver()}
              disabled={submittingCash}
            >
              {submittingCash
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <MaterialIcons name="handshake" size={18} color="#fff" />
                    <Text style={styles.submitUtrBtnText}>I've Handed Over Cash</Text>
                  </>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Waiting for customer confirmation ── */}
        {(txStatus === 'vendor_reference_submitted' || txStatus === 'customer_confirmation_pending') && (
          <View style={styles.waitingCard}>
            <View style={styles.waitingTopRow}>
              <View style={styles.waitingIndicatorHalo}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
              <View style={styles.waitingTextCol}>
                <Text style={styles.waitingTitle}>Waiting for Customer</Text>
                <Text style={styles.waitingBody}>
                  {isUpiFlow
                    ? `UTR ${utrInput || txData?.upi_reference || ''} submitted. Customer needs to confirm receipt.`
                    : 'Customer needs to confirm they received the cash.'}
                </Text>
              </View>
            </View>
            <View style={styles.waitingFooterRow}>
              <View style={styles.waitingFooterDot} />
              <Text style={styles.waitingFooterText}>Auto-refreshing every {POLL_INTERVAL_MS / 1000}s</Text>
            </View>
          </View>
        )}

        {/* ── Dispute ── */}
        {txStatus === 'disputed' && (
          <View style={styles.disputedCard}>
            <MaterialIcons name="cancel" size={26} color="#DC2626" />
            <View style={styles.disputedTextCol}>
              <Text style={styles.disputedTitle}>Payment Disputed by Customer</Text>
              <Text style={styles.disputedBody}>
                Customer says they did not receive ₹{totalAmount.toFixed(2)}.
                {txData?.dispute_reason ? ` Reason: "${txData.dispute_reason}"` : ''}
                {' '}Contact support or try paying again.
              </Text>
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={onBack}>
              <Text style={styles.retryBtnText}>Return to Job Overview</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Complete ── */}
        {isComplete && (
          <View style={styles.paidCard}>
            <Ionicons name="checkmark-done-circle" size={32} color="#16A34A" />
            <Text style={styles.paidTitle}>Payment Confirmed!</Text>
            <Text style={styles.paidBody}>Customer confirmed receipt. Job complete.</Text>
            <ActivityIndicator size="small" color="#16A34A" style={{ marginTop: 8 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ── Status meta ──────────────────────────────────────────────────────────────
function getStatusMeta(status: string) {
  switch (status) {
    case 'payment_ready':
      return { label: 'READY TO PAY',  color: '#065F46', dotColor: '#059669', bg: '#D1FAE5' };
    case 'payment_initiated':
      return { label: 'IN PROGRESS',   color: '#1E40AF', dotColor: '#3B82F6', bg: '#DBEAFE' };
    case 'vendor_reference_submitted':
    case 'customer_confirmation_pending':
      return { label: 'PENDING CONFIRM', color: '#92400E', dotColor: '#D97706', bg: '#FEF3C7' };
    case 'paid':
    case 'cash_paid':
      return { label: 'PAID ✓',        color: '#14532D', dotColor: '#16A34A', bg: '#DCFCE7' };
    case 'disputed':
      return { label: 'DISPUTED',      color: '#991B1B', dotColor: '#DC2626', bg: '#FEE2E2' };
    default:
      return { label: (status || 'PENDING').toUpperCase(), color: '#475569', dotColor: '#94A3B8', bg: '#F1F5F9' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8F6' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8F6', padding: 24 },
  loaderBox: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center',
    width: '100%', maxWidth: 320,
    shadowColor: '#064E3B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 4, borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.15)',
  },
  loaderTitle: { marginTop: 16, fontSize: 16, fontWeight: '800', color: '#0F172A', textAlign: 'center' },

  /* Header */
  headerGradient: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  refreshBtn: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerTitleWrap: { marginTop: 4 },
  headerTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 24, letterSpacing: -0.5 },
  orderBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  orderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167, 243, 208, 0.3)',
  },
  orderBadgeText: { color: '#ECFDF5', fontSize: 13, fontWeight: '700' },
  liveSyncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.22)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  livePulseDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#34D399' },
  liveSyncText: { color: '#A7F3D0', fontSize: 11, fontWeight: '700' },

  /* Content */
  content: { padding: 16, gap: 14 },

  /* Amount card */
  amountCard: {
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.14)',
    shadowColor: '#064E3B', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    gap: 12,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  amountValue: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  methodChipRow: { flexDirection: 'row' },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  methodChipUpi: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  methodChipCash: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  methodChipText: { fontSize: 12, fontWeight: '700' },

  /* Generic card */
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.2)',
    shadowColor: '#064E3B', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    gap: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cardSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 17 },

  /* UPI details */
  upiDetailsBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 2 },
  upiFieldLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, textTransform: 'uppercase' },
  upiFieldValue: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 },
  upiFieldName: { fontSize: 12, color: '#475569', marginTop: 1 },

  /* Waiting box */
  waitingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12 },
  waitingText: { fontSize: 13, color: '#065F46', fontWeight: '600', flex: 1 },

  /* Open UPI */
  openUpiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0369A1', borderRadius: 12, paddingVertical: 12,
  },
  openUpiBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  /* UTR section */
  utrSection: { gap: 6 },
  utrLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  utrSubLabel: { fontSize: 11, color: '#94A3B8' },
  utrInput: {
    height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 14, color: '#0F172A', fontSize: 14, fontWeight: '600', backgroundColor: '#FFFFFF',
  },
  submitUtrBtn: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#16A34A', borderRadius: 12, paddingHorizontal: 16,
  },
  submitUtrBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabledBtn: { opacity: 0.5 },

  /* Cash fallback */
  cashFallbackBtn: {
    alignSelf: 'center',
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
  },
  cashFallbackBtnText: { fontSize: 12, fontWeight: '700', color: '#92400E' },

  /* Waiting card */
  waitingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.18)',
    shadowColor: '#064E3B', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  waitingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waitingIndicatorHalo: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#A7F3D0',
  },
  waitingTextCol: { flex: 1 },
  waitingTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  waitingBody: { fontSize: 13, color: '#475569', marginTop: 3, lineHeight: 18 },
  waitingFooterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  waitingFooterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  waitingFooterText: { fontSize: 11, color: '#059669', fontWeight: '600' },

  /* Disputed / paid */
  disputedCard: { backgroundColor: '#FFF1F2', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#FECDD3', gap: 8 },
  disputedTextCol: { gap: 4 },
  disputedTitle: { fontSize: 16, fontWeight: '800', color: '#9F1239' },
  disputedBody: { fontSize: 13, color: '#881337', lineHeight: 18 },
  retryBtn: { marginTop: 6, backgroundColor: '#E11D48', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  retryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  paidCard: { backgroundColor: '#DCFCE7', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC', gap: 6 },
  paidTitle: { fontSize: 18, fontWeight: '900', color: '#14532D' },
  paidBody: { fontSize: 13, color: '#166534', textAlign: 'center' },
});

export default VendorPaymentScreen;
