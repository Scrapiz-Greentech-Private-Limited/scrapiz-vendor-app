import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../../services/api';
import { BookingActiveResponse } from '../../types';

interface QuoteSettlementScreenProps {
  bookingId: string;
  initialAmount?: number;
  onBack: () => void;
  onDone: (payload: { bookingId: string; totalPayout: number }) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const QuoteSettlementScreen: React.FC<QuoteSettlementScreenProps> = ({
  bookingId,
  initialAmount,
  onBack,
  onDone,
  onShowToast,
}) => {
  const [activeData, setActiveData] = useState<BookingActiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [upiReference, setUpiReference] = useState('');

  const loadActive = useCallback(async () => {
    try {
      const response = await ApiService.getBookingActive(bookingId);
      setActiveData(response);
    } catch {
      onShowToast('Failed to refresh quote status.', 'error');
    } finally {
      setLoading(false);
    }
  }, [bookingId, onShowToast]);

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
      onShowToast('Enter a valid UPI reference.', 'error');
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

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#14532D" />
        <Text style={styles.loaderText}>Checking quote status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Quote Settlement</Text>
          <Text style={styles.headerSub}>Booking #{bookingId}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <Text style={styles.statusValue}>{quoteStatus ? quoteStatus.toUpperCase() : 'WAITING'}</Text>
          <Text style={styles.statusMeta}>Amount: ₹{totalAmount.toFixed(2)}</Text>
          {quote?.payment_method ? <Text style={styles.statusMeta}>Payment: {quote.payment_method.toUpperCase()}</Text> : null}
        </View>

        {quoteStatus === 'submitted' && (
          <HintBox
            icon="hourglass-empty"
            title="Waiting for customer"
            body="Customer needs to accept/reject the quote in their app."
          />
        )}

        {quoteStatus === 'rejected' && (
          <HintBox
            icon="cancel"
            title="Quote rejected"
            body="Customer rejected the quote. You can revisit the pickup and submit a revised quote if needed."
            tone="danger"
          />
        )}

        {quoteStatus === 'awaiting_payment' && quote?.payment_method === 'upi' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Confirm UPI Payment</Text>
            <Text style={styles.cardMeta}>Customer UPI ID: {quote.customer_upi_id || 'Not shared'}</Text>
            <TextInput
              value={upiReference}
              onChangeText={setUpiReference}
              placeholder="Enter UPI transaction reference"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, confirming && styles.disabled]}
              onPress={() => void handleConfirmUpi()}
              disabled={confirming}
            >
              {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm Payment & Complete Job</Text>}
            </TouchableOpacity>
          </View>
        )}

        {quoteStatus === 'paid' && (
          <HintBox
            icon="check-circle"
            title="Payment completed"
            body="Settlement is complete. Returning to completion screen..."
            tone="success"
          />
        )}
      </ScrollView>
    </View>
  );
};

const HintBox = ({
  icon,
  title,
  body,
  tone = 'default',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
  tone?: 'default' | 'danger' | 'success';
}) => {
  const palette =
    tone === 'danger'
      ? { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' }
      : tone === 'success'
      ? { bg: '#DCFCE7', border: '#86EFAC', text: '#14532D' }
      : { bg: '#EFF6FF', border: '#93C5FD', text: '#1E3A8A' };

  return (
    <View style={[styles.hintBox, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
      <MaterialIcons name={icon} size={20} color={palette.text} />
      <View style={styles.hintTextWrap}>
        <Text style={[styles.hintTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.hintBody, { color: palette.text }]}>{body}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F7F5' },
  loaderText: { marginTop: 10, color: '#475569' },
  header: {
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#14532D',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.85)', marginTop: 2, fontSize: 12 },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  statusTitle: { color: '#475569', fontWeight: '700' },
  statusValue: { color: '#0F172A', fontSize: 26, fontWeight: '900', marginTop: 4 },
  statusMeta: { color: '#334155', marginTop: 4, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  cardMeta: { marginTop: 8, color: '#64748B', fontWeight: '600' },
  input: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    color: '#0F172A',
  },
  primaryBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#14532D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.6 },
  hintBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  hintTextWrap: { flex: 1 },
  hintTitle: { fontWeight: '800', fontSize: 14 },
  hintBody: { marginTop: 4, lineHeight: 20 },
});

export default QuoteSettlementScreen;
