import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../../services/api';

interface WalletTopupScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2000];
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#ff5b14', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function WalletTopupScreen({ onBack, onShowToast }: WalletTopupScreenProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [creditedAmount, setCreditedAmount] = useState(0);

  // Confetti animation
  const confettiAnims = useRef(
    Array.from({ length: 12 }, () => ({
      translateY: new Animated.Value(-20),
      rotate: new Animated.Value(0),
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }))
  ).current;

  // Success circle pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showSuccess) {
      // Start confetti animation
      const confettiAnimations = confettiAnims.map((item) =>
        Animated.parallel([
          Animated.timing(item.translateY, {
            toValue: SCREEN_HEIGHT * 0.6,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(item.rotate, {
            toValue: 360,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.parallel(confettiAnimations).start();

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showSuccess]);

  const getAmount = (): number => {
    if (customAmount) {
      return parseFloat(customAmount) || 0;
    }
    return selectedAmount;
  };

  const handleProceed = async () => {
    const amount = getAmount();

    if (amount < MIN_AMOUNT) {
      Alert.alert('Invalid Amount', `Minimum amount is ₹${MIN_AMOUNT}`);
      return;
    }

    if (amount > MAX_AMOUNT) {
      Alert.alert('Invalid Amount', `Maximum amount is ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      return;
    }

    setSubmitting(true);

    try {
      // Create Razorpay order
      const orderData = await ApiService.createWalletRazorpayOrder(amount);
      const RazorpayCheckout = (await import('react-native-razorpay')).default;

      const options = {
        description: `Wallet Topup - ₹${amount}`,
        image: 'https://scrapiz.in/logo.png',
        currency: orderData.currency,
        key: orderData.key_id,
        amount: String(orderData.amount),
        order_id: orderData.razorpay_order_id,
        name: 'Scrapiz Vendor',
        prefill: {
          name: orderData.prefill.name,
        },
        method: {
          card: true,
          upi: true,
          netbanking: true,
          wallet: true,
        },
        theme: { color: '#ff5b14' },
      };

      const rzpData = await RazorpayCheckout.open(options);

      // Verify payment
      const verifyResult = await ApiService.verifyWalletRazorpayPayment({
        razorpay_order_id: rzpData.razorpay_order_id,
        razorpay_payment_id: rzpData.razorpay_payment_id,
        razorpay_signature: rzpData.razorpay_signature,
      });

      setTransactionId(rzpData.razorpay_payment_id);
      setCreditedAmount(verifyResult.credited);
      setShowSuccess(true);
    } catch (err: any) {
      if (err?.code === 0) {
        Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      } else {
        Alert.alert(
          'Payment Failed',
          err?.description || err?.message || 'Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F7F3" />

        {/* Confetti Layer */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confettiAnims.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  left: `${item.left}%`,
                  backgroundColor: item.color,
                  transform: [
                    { translateY: item.translateY },
                    {
                      rotate: item.rotate.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        {/* Success Content */}
        <View style={styles.successContainer}>
          <Animated.View
            style={[
              styles.successCircleOuter,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.successCircleInner}>
              <MaterialIcons name="check" size={32} color="#FFFFFF" />
            </View>
          </Animated.View>

          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSubtitle}>
            Wallet credited · ₹{creditedAmount.toLocaleString('en-IN')}
          </Text>

          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Transaction ID</Text>
              <Text style={styles.successValue}>{transactionId.slice(-12)}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Date</Text>
              <Text style={styles.successValue}>
                {new Date().toLocaleDateString('en-IN')}
              </Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Amount</Text>
              <Text style={styles.successValue}>
                ₹{creditedAmount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Status</Text>
              <Text style={[styles.successValue, { color: '#22c55e' }]}>Success</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={onBack}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7F3" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Money</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountBadge}>
            <MaterialIcons name="account-balance-wallet" size={24} color="#ff5b14" />
          </View>
          <Text style={styles.amountLabel}>Amount to add</Text>
          <Text style={styles.amountValue}>
            ₹{getAmount().toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Preset Amounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick amounts</Text>
          <View style={styles.presetRow}>
            {PRESET_AMOUNTS.map((amount) => {
              const selected = selectedAmount === amount && !customAmount;
              return (
                <TouchableOpacity
                  key={amount}
                  onPress={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  style={[styles.presetChip, selected && styles.presetChipSelected]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      selected && styles.presetChipTextSelected,
                    ]}
                  >
                    ₹{amount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Custom Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Or enter custom amount</Text>
          <TextInput
            value={customAmount}
            onChangeText={(text) => {
              setCustomAmount(text.replace(/[^0-9]/g, ''));
              if (text) {
                setSelectedAmount(0);
              }
            }}
            placeholder="Enter amount"
            keyboardType="number-pad"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
          <Text style={styles.helperText}>
            Min: ₹{MIN_AMOUNT} · Max: ₹{MAX_AMOUNT.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Info Note */}
        <View style={styles.noteCard}>
          <MaterialIcons name="info-outline" size={18} color="#64748B" />
          <Text style={styles.noteText}>
            Secure payment via Razorpay. Supports cards, UPI, net banking, and wallets.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.proceedButton, submitting && styles.proceedButtonDisabled]}
          onPress={handleProceed}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.proceedButtonText}>Proceed to Pay</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7F3',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  amountCard: {
    backgroundColor: '#ff5b14',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  amountBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  amountValue: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  presetChipSelected: {
    backgroundColor: '#ff5b14',
    borderColor: '#ff5b14',
  },
  presetChipText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  presetChipTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    backgroundColor: '#f8fafc',
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748B',
  },
  noteCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#fef3e7',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    color: '#78350f',
    lineHeight: 20,
    fontSize: 13,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  proceedButton: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff5b14',
  },
  proceedButtonDisabled: {
    opacity: 0.6,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Success Screen Styles
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  successCircleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successCircleInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  successSubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  successCard: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  successValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  doneButton: {
    marginTop: 24,
    width: '100%',
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Confetti
  confetti: {
    position: 'absolute',
    width: 8,
    height: 20,
    borderRadius: 2,
  },
});
