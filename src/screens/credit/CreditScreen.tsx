import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService, WalletLedgerTransaction } from '../../services/api';

interface CreditScreenProps {
  onBack: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onNavigate: (screen: string) => void;
}

export default function CreditScreen({ onBack, onShowToast, onNavigate }: CreditScreenProps) {
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('INR');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletLedgerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPayoutLoading, setIsPayoutLoading] = useState(false);
  const [showPayoutPanel, setShowPayoutPanel] = useState(false);

  const [payoutCustomerId, setPayoutCustomerId] = useState('');
  const [payoutBookingId, setPayoutBookingId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutChannel, setPayoutChannel] = useState<'upi' | 'bank_transfer'>('upi');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  const loadWallet = useCallback(async (showErrorToast = false) => {
    try {
      const [wallet, ledger] = await Promise.all([
        ApiService.getVendorWallet(),
        ApiService.getWalletTransactions({ limit: 100 }),
      ]);
      setBalance(Number(wallet.balance || 0));
      setCurrency(wallet.currency || 'INR');
      setLastUpdated(wallet.last_updated || null);
      setTransactions(ledger.transactions || []);
    } catch {
      if (showErrorToast) {
        onShowToast('Unable to refresh wallet right now.', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, WalletLedgerTransaction[]> = {};
    transactions.forEach((item) => {
      const label = new Date(item.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });
    return Object.entries(groups);
  }, [transactions]);

  const downloadStatement = async () => {
    setIsDownloading(true);
    try {
      const localFile = await ApiService.downloadWalletStatementPdf();
      await Linking.openURL(localFile);
      onShowToast('Wallet statement downloaded.', 'success');
    } catch {
      onShowToast('Unable to download statement right now.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePayoutSubmit = async () => {
    const amount = Number(payoutAmount || 0);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid payout amount in INR.');
      return;
    }

    if (!payoutCustomerId && !payoutBookingId) {
      Alert.alert('Missing customer', 'Enter customer ID or booking ID to map the payout.');
      return;
    }

    if (payoutChannel === 'upi' && !payoutUpi.trim()) {
      Alert.alert('Missing UPI', 'Enter customer UPI ID for UPI payout.');
      return;
    }

    if (payoutChannel === 'bank_transfer' && (!bankHolder || !bankAccountNumber || !bankIfsc)) {
      Alert.alert('Missing bank details', 'Provide account holder, account number, and IFSC.');
      return;
    }

    setIsPayoutLoading(true);
    try {
      await ApiService.createWalletCustomerPayout({
        amount,
        payment_channel: payoutChannel,
        customer_id: payoutCustomerId ? Number(payoutCustomerId) : undefined,
        booking_id: payoutBookingId || undefined,
        customer_upi_id: payoutChannel === 'upi' ? payoutUpi : undefined,
        bank_account_holder: payoutChannel === 'bank_transfer' ? bankHolder : undefined,
        bank_account_number: payoutChannel === 'bank_transfer' ? bankAccountNumber : undefined,
        bank_ifsc: payoutChannel === 'bank_transfer' ? bankIfsc : undefined,
      });

      onShowToast('Customer payout completed from wallet.', 'success');
      setPayoutAmount('');
      setPayoutUpi('');
      setBankHolder('');
      setBankAccountNumber('');
      setBankIfsc('');
      await loadWallet();
    } catch {
      onShowToast('Customer payout failed.', 'error');
    } finally {
      setIsPayoutLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7F3" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="help-outline" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#166534" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadWallet(true);
              }}
              colors={['#166534']}
            />
          }
        >
          <View style={styles.heroCard}>
            <View style={styles.heroOrbLarge} />
            <View style={styles.heroOrbSmall} />
            <View style={styles.heroBadge}>
              <MaterialIcons name="account-balance-wallet" size={24} color="#166534" />
            </View>
            <Text style={styles.heroLabel}>Available balance</Text>
            <Text style={styles.heroAmount}>
              {currency === 'INR' ? '₹' : `${currency} `}
              {Math.abs(balance).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.heroStatus}>{balance < 0 ? 'Low balance' : 'Healthy balance'}</Text>
            <Text style={styles.heroSubtext}>Use wallet funds for recharge, subscription plans, and customer payouts.</Text>

            <View style={styles.heroActionRow}>
              <TouchableOpacity style={styles.addMoneyButton} onPress={() => onNavigate('add-money')}>
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addMoneyText}>Add Money</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statementButton} onPress={downloadStatement} disabled={isDownloading}>
                <MaterialIcons name="download" size={18} color="#14532D" />
                <Text style={styles.statementButtonText}>{isDownloading ? 'Preparing...' : 'Statement'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Last updated</Text>
              <Text style={styles.statValue}>
                {lastUpdated ? new Date(lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Live'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Wallet health</Text>
              <Text style={styles.statValue}>{balance >= 0 ? 'Positive' : 'Needs topup'}</Text>
            </View>
          </View>

          <View style={styles.payoutCard}>
            <TouchableOpacity style={styles.payoutHeaderRow} onPress={() => setShowPayoutPanel((current) => !current)}>
              <View style={styles.payoutHeaderCopy}>
                <Text style={styles.sectionTitle}>Pay Customer from Wallet</Text>
                <Text style={styles.sectionSubtitle}>Map payout by customer ID or booking ID, then settle via UPI or bank transfer.</Text>
              </View>
              <MaterialIcons name={showPayoutPanel ? 'expand-less' : 'expand-more'} size={22} color="#14532D" />
            </TouchableOpacity>

            {showPayoutPanel ? (
              <>
                <View style={styles.formRow}>
                  <TextInput
                    value={payoutCustomerId}
                    onChangeText={(text) => setPayoutCustomerId(text.replace(/[^0-9]/g, ''))}
                    placeholder="Customer ID"
                    placeholderTextColor="#7C8B8A"
                    style={styles.inputHalf}
                  />
                  <TextInput
                    value={payoutBookingId}
                    onChangeText={setPayoutBookingId}
                    placeholder="Booking ID"
                    placeholderTextColor="#7C8B8A"
                    style={styles.inputHalf}
                  />
                </View>

                <TextInput
                  value={payoutAmount}
                  onChangeText={(text) => setPayoutAmount(text.replace(/[^0-9]/g, ''))}
                  placeholder="Payout amount (INR)"
                  placeholderTextColor="#7C8B8A"
                  keyboardType="number-pad"
                  style={styles.inputFull}
                />

                <View style={styles.channelRow}>
                  <TouchableOpacity
                    onPress={() => setPayoutChannel('upi')}
                    style={[styles.channelChip, payoutChannel === 'upi' && styles.channelChipActive]}
                  >
                    <Text style={[styles.channelChipText, payoutChannel === 'upi' && styles.channelChipTextActive]}>UPI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPayoutChannel('bank_transfer')}
                    style={[styles.channelChip, payoutChannel === 'bank_transfer' && styles.channelChipActive]}
                  >
                    <Text style={[styles.channelChipText, payoutChannel === 'bank_transfer' && styles.channelChipTextActive]}>Bank Transfer</Text>
                  </TouchableOpacity>
                </View>

                {payoutChannel === 'upi' ? (
                  <TextInput
                    value={payoutUpi}
                    onChangeText={setPayoutUpi}
                    placeholder="customer@upi"
                    placeholderTextColor="#7C8B8A"
                    style={styles.inputFull}
                  />
                ) : (
                  <>
                    <TextInput
                      value={bankHolder}
                      onChangeText={setBankHolder}
                      placeholder="Account holder"
                      placeholderTextColor="#7C8B8A"
                      style={styles.inputFull}
                    />
                    <TextInput
                      value={bankAccountNumber}
                      onChangeText={(text) => setBankAccountNumber(text.replace(/[^0-9]/g, ''))}
                      placeholder="Account number"
                      placeholderTextColor="#7C8B8A"
                      keyboardType="number-pad"
                      style={styles.inputFull}
                    />
                    <TextInput
                      value={bankIfsc}
                      onChangeText={(text) => setBankIfsc(text.toUpperCase())}
                      placeholder="IFSC"
                      placeholderTextColor="#7C8B8A"
                      style={styles.inputFull}
                    />
                  </>
                )}

                <TouchableOpacity style={styles.payoutButton} onPress={handlePayoutSubmit} disabled={isPayoutLoading}>
                  {isPayoutLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.payoutButtonText}>Pay Customer</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.payoutCollapsedText}>Tap to open payout form</Text>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.sectionSubtitle}>Time-wise logs synced from backend wallet audit trail.</Text>
          </View>

          <View style={styles.historyCard}>
            {groupedTransactions.length === 0 ? (
              <Text style={styles.emptyText}>No wallet transactions yet.</Text>
            ) : groupedTransactions.map(([date, items]) => (
              <View key={date} style={styles.historyGroup}>
                <Text style={styles.historyDate}>{date}</Text>
                {items.map((item) => (
                  <View key={String(item.id)} style={styles.historyRow}>
                    <View style={styles.historyIcon}>
                      <MaterialIcons
                        name={item.direction === 'credit' ? 'south-west' : 'north-east'}
                        size={18}
                        color={item.direction === 'credit' ? '#166534' : '#B91C1C'}
                      />
                    </View>
                    <View style={styles.historyMeta}>
                      <Text style={styles.historyTitle}>{item.title}</Text>
                      <Text style={styles.historyTime}>
                        {new Date(item.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.historyAmount, item.direction === 'credit' ? styles.income : styles.expense]}>
                      {item.direction === 'credit' ? '+' : '-'}₹{Math.abs(Number(item.amount || 0)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#123C2D',
    borderRadius: 30,
    padding: 24,
    overflow: 'hidden',
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    right: -40,
    top: -30,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.12)',
    left: -22,
    bottom: -22,
  },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EAF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    marginTop: 8,
  },
  heroStatus: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '700',
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 20,
    marginTop: 14,
  },
  addMoneyButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addMoneyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  heroActionRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statementButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statementButtonText: {
    color: '#14532D',
    fontWeight: '800',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  statLink: {
    color: '#166534',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  payoutCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
  },
  payoutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  payoutHeaderCopy: {
    flex: 1,
  },
  payoutCollapsedText: {
    marginTop: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D8E3DD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontWeight: '600',
    backgroundColor: '#F8FBF9',
  },
  inputFull: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D8E3DD',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontWeight: '600',
    backgroundColor: '#F8FBF9',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  channelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C9DCD0',
    backgroundColor: '#F1F8F4',
  },
  channelChipActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  channelChipText: {
    color: '#355D46',
    fontWeight: '700',
    fontSize: 12,
  },
  channelChipTextActive: {
    color: '#FFFFFF',
  },
  payoutButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#166534',
  },
  payoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
  },
  historyGroup: {
    marginBottom: 14,
  },
  historyDate: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F3F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyMeta: {
    flex: 1,
  },
  historyTitle: {
    color: '#0F172A',
    fontWeight: '700',
  },
  historyTime: {
    color: '#64748B',
    marginTop: 2,
    fontSize: 12,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  income: {
    color: '#166534',
  },
  expense: {
    color: '#B91C1C',
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 20,
  },
});
