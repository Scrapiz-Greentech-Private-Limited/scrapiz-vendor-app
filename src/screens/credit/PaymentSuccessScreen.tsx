import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import type { WalletPaymentReceipt } from './PaymentMethodScreen';

interface PaymentSuccessScreenProps {
  receipt: WalletPaymentReceipt;
  onDone: () => void;
}

const { width, height } = Dimensions.get('window');
const CONFETTI_COUNT = 24;

export default function PaymentSuccessScreen({ receipt, onDone }: PaymentSuccessScreenProps) {
  const confetti = useRef(
    Array.from({ length: CONFETTI_COUNT }).map(() => ({
      x: Math.random() * width,
      y: new Animated.Value(-Math.random() * height),
      size: 6 + Math.random() * 8,
      color: ['#0F766E', '#F59E0B', '#22C55E', '#2563EB'][Math.floor(Math.random() * 4)],
      duration: 2000 + Math.random() * 2000,
    })),
  ).current;

  useEffect(() => {
    const animations = confetti.map((piece) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(piece.y, {
            toValue: height + 40,
            duration: piece.duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.y, {
            toValue: -40,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((anim) => anim.start());
    return () => {
      animations.forEach((anim) => anim.stop());
    };
  }, [confetti]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF8F2" />

      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {confetti.map((piece, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                left: piece.x,
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                transform: [{ translateY: piece.y }],
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.topCard}>
          <View style={styles.successIconWrap}>
            <MaterialIcons name="check-circle" size={72} color="#16A34A" />
          </View>
          <Text style={styles.title}>Payment Accepted</Text>
          <Text style={styles.subtitle}>Your wallet recharge was verified successfully.</Text>
        </View>

        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>Transaction Receipt</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Transaction Id</Text>
            <Text style={styles.value}>{receipt.transactionId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{new Date(receipt.date).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type of transaction</Text>
            <Text style={styles.value}>{receipt.transactionType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>Rs {receipt.amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tax %</Text>
            <Text style={styles.value}>{receipt.taxPercent}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={[styles.value, styles.statusSuccess]}>{receipt.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={onDone}>
          <Text style={styles.doneButtonText}>Back to Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF8F2',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
    opacity: 0.85,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
  },
  topCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  successIconWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748B',
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 2,
  },
  label: {
    color: '#64748B',
    fontSize: 13,
  },
  value: {
    color: '#0F172A',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  statusSuccess: {
    color: '#16A34A',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  doneButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
