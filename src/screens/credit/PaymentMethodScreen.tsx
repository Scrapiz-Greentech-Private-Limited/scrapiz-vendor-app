import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import { ApiHttpError, ApiService } from '../../services/api';
import { useAuth } from '../../../hooks/useAuth';

export interface WalletPaymentReceipt {
  transactionId: string;
  date: string;
  transactionType: string;
  amount: number;
  taxPercent: number;
  status: 'Success' | 'Failed';
}

interface PaymentMethodScreenProps {
  amount: number;
  onBack: () => void;
  onPaymentSuccess: (receipt: WalletPaymentReceipt) => void;
  onPaymentError: (message: string) => void;
}

type PaymentMethod = 'visa' | 'mastercard' | 'upi' | 'bank';

const METHODS: Array<{ key: PaymentMethod; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { key: 'visa', label: 'Visa', icon: 'credit-card' },
  { key: 'mastercard', label: 'Mastercard', icon: 'credit-card' },
  { key: 'upi', label: 'UPI Apps', icon: 'account-balance-wallet' },
  { key: 'bank', label: 'Bank Account', icon: 'account-balance' },
];

export default function PaymentMethodScreen({
  amount,
  onBack,
  onPaymentSuccess,
  onPaymentError,
}: PaymentMethodScreenProps) {
  const { user } = useAuth();
  const [method, setMethod] = useState<PaymentMethod>('visa');
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const ctaLabel = useMemo(() => {
    if (isPaying) return 'Processing payment...';
    return `Pay Rs ${amount.toLocaleString('en-IN')}`;
  }, [amount, isPaying]);

  const handlePay = async () => {
    if (isPaying) return;

    if ((method === 'visa' || method === 'mastercard') && (!cardNumber.trim() || !cvv.trim())) {
      onPaymentError('Enter card number and CVV to continue.');
      return;
    }

    if (method === 'bank' && !bankAccount.trim()) {
      onPaymentError('Enter a bank account number to continue.');
      return;
    }

    try {
      setIsPaying(true);
      const order = await ApiService.createWalletOrder(amount);
      const razorpayAmount = Number(order.amount || amount);

      const paymentResult = await RazorpayCheckout.open({
        key: order.key,
        amount: Math.round(razorpayAmount * 100),
        currency: 'INR',
        order_id: order.order_id,
        name: 'Scrapiz Vendor',
        description: `Wallet recharge Rs ${amount}`,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone,
        },
        notes: {
          selected_method: method,
        },
        theme: {
          color: '#0F766E',
        },
      });

      await ApiService.verifyWalletPayment({
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      onPaymentSuccess({
        transactionId: paymentResult.razorpay_payment_id,
        date: new Date().toISOString(),
        transactionType: 'Wallet Recharge',
        amount: razorpayAmount,
        taxPercent: 0,
        status: 'Success',
      });
    } catch (error: any) {
      const message = error?.description || error?.message || 'Unable to complete this payment.';
      if (error instanceof ApiHttpError) {
        onPaymentError(error.message);
      } else {
        onPaymentError(message);
      }
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7F5" />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>Rs {amount.toLocaleString('en-IN')}</Text>
          <Text style={styles.amountHint}>Choose your preferred payment method below.</Text>
        </View>

        <View style={styles.methodsWrap}>
          {METHODS.map((item) => {
            const active = method === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setMethod(item.key)}
                style={[styles.methodItem, active && styles.methodItemActive]}
              >
                <View style={[styles.methodIconWrap, active && styles.methodIconWrapActive]}>
                  <MaterialIcons name={item.icon} size={20} color={active ? '#FFFFFF' : '#0F766E'} />
                </View>
                <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(method === 'visa' || method === 'mastercard') ? (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Card Number</Text>
            <TextInput
              value={cardNumber}
              onChangeText={setCardNumber}
              placeholder="1234 5678 9012 3456"
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.formLabel}>CVV</Text>
            <TextInput
              value={cvv}
              onChangeText={setCvv}
              placeholder="123"
              keyboardType="number-pad"
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#94A3B8"
              maxLength={4}
            />
          </View>
        ) : null}

        {method === 'bank' ? (
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Bank Account Number</Text>
            <TextInput
              value={bankAccount}
              onChangeText={setBankAccount}
              placeholder="Enter account number"
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor="#94A3B8"
            />
          </View>
        ) : null}

        {method === 'upi' ? (
          <View style={styles.upiCard}>
            <Text style={styles.upiTitle}>UPI Apps supported</Text>
            <Text style={styles.upiText}>Google Pay, PhonePe, Paytm and other UPI-enabled apps are supported in the Razorpay checkout.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.payButton, isPaying && styles.buttonDisabled]} onPress={handlePay} disabled={isPaying}>
          {isPaying ? <ActivityIndicator color="#FFFFFF" /> : null}
          <Text style={styles.payButtonText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 14,
  },
  amountCard: {
    backgroundColor: '#0F766E',
    borderRadius: 22,
    padding: 18,
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  amountValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
  },
  amountHint: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  methodsWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    gap: 10,
  },
  methodItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCE5DD',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodItemActive: {
    borderColor: '#0F766E',
    backgroundColor: '#E9F8F5',
  },
  methodIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F5F2',
    marginRight: 10,
  },
  methodIconWrapActive: {
    backgroundColor: '#0F766E',
  },
  methodLabel: {
    color: '#0F172A',
    fontWeight: '700',
  },
  methodLabelActive: {
    color: '#0F766E',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  formLabel: {
    color: '#475569',
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE5DD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    backgroundColor: '#F8FBF8',
  },
  upiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
  },
  upiTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
  },
  upiText: {
    color: '#64748B',
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5ECE7',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  payButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
