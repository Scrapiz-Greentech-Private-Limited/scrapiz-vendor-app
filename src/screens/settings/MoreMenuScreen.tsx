import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiService } from '../../services/api';

interface MoreMenuScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const hardcodedBills = [
  { name: 'Shivanya Sharma', amount: '₹17' },
  { name: 'Rashmi Todankar', amount: '₹2,980' },
];

const hardcodedRequests = [
  { name: 'Diksha Mishra', status: 'Cancelled' },
  { name: 'Amit Singh', status: 'Cancelled' },
];

const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({ onBack, onNavigate }) => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [planEnabled, setPlanEnabled] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('No active plan');
  const [materialsCount, setMaterialsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [screenAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const loadMoreData = async () => {
      setIsLoading(true);
      try {
        const [wallet, plan, materials] = await Promise.all([
          ApiService.getVendorWallet(),
          ApiService.getVendorPlan(),
          ApiService.getVendorMaterialCategories(),
        ]);

        const computedMaterials = Array.isArray(materials?.categories)
          ? materials.categories.reduce((sum, category) => sum + (category.products?.length || 0), 0)
          : 0;

        const entitlement = Boolean(plan?.entitlement?.is_entitled_for_leads);
        const resolvedPlanName = plan?.current_plan?.name || 'No active plan';

        setWalletBalance(Number(wallet?.balance || 0));
        setPlanEnabled(entitlement);
        setPlanName(resolvedPlanName);
        setMaterialsCount(computedMaterials);
      } catch {
        setWalletBalance(0);
        setPlanEnabled(false);
        setPlanName('No active plan');
        setMaterialsCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadMoreData();
  }, []);

  useEffect(() => {
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);

  const walletLabel = useMemo(() => `₹${walletBalance.toLocaleString('en-IN')}`, [walletBalance]);
  const planLabel = planEnabled ? 'Lead access active' : 'Lead access inactive';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A3A2A" />

      <View style={styles.bgBubbleTop} />
      <View style={styles.bgBubbleBottom} />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#ECFDF5" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>More</Text>
          <Text style={styles.headerSubtitle}>Settings, plans, requests and tools</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#ECFDF5" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Animated.View
            style={[
              styles.animatedShell,
              {
                opacity: screenAnim,
                transform: [
                  {
                    translateX: screenAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.topCardsRow}>
              <TouchableOpacity style={styles.walletCard} onPress={() => onNavigate('credit')} activeOpacity={0.88}>
                <View style={styles.topCardRow}>
                  <Text style={styles.topCardTitle}>Wallet Balance</Text>
                  {walletBalance <= 0 ? <MaterialIcons name="warning-amber" size={18} color="#FBBF24" /> : null}
                </View>
                <Text style={styles.topCardValue}>{walletLabel}</Text>
                <Text style={styles.topCardMeta}>Tap to add credits</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.planCard} onPress={() => onNavigate('subscription')} activeOpacity={0.88}>
                <View style={styles.topCardRow}>
                  <Text style={styles.topCardTitle}>Subscription</Text>
                  <MaterialIcons
                    name={planEnabled ? 'verified' : 'info-outline'}
                    size={18}
                    color={planEnabled ? '#22C55E' : '#F59E0B'}
                  />
                </View>
                <Text style={styles.topCardValueSmall} numberOfLines={1}>{planName}</Text>
                <Text style={styles.topCardMeta}>{planLabel}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionsWrap}>
              <Text style={styles.blockTitle}>Quick Actions</Text>
              <View style={styles.gridWrap}>
                <TouchableOpacity style={styles.gridCard} onPress={() => onNavigate('contacts')} activeOpacity={0.9}>
                  <View style={styles.gridIconWrap}>
                    <Ionicons name="people-outline" size={20} color="#0F766E" />
                  </View>
                  <Text style={styles.gridTitle}>Contacts</Text>
                  <Text style={styles.gridSubtitle} numberOfLines={2}>Review customer contacts</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridCard} onPress={() => onNavigate('materials')} activeOpacity={0.9}>
                  <View style={styles.gridIconWrap}>
                    <MaterialIcons name="grid-view" size={20} color="#0F766E" />
                  </View>
                  <Text style={styles.gridTitle}>Materials</Text>
                  <Text style={styles.gridSubtitle} numberOfLines={2}>{materialsCount} configured items</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridCard} onPress={() => onNavigate('bills')} activeOpacity={0.9}>
                  <View style={styles.gridIconWrap}>
                    <MaterialIcons name="description" size={20} color="#0F766E" />
                  </View>
                  <Text style={styles.gridTitle}>Bills</Text>
                  <Text style={styles.gridSubtitle} numberOfLines={2}>Track settlements and receipts</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.gridCard} onPress={() => onNavigate('requests')} activeOpacity={0.9}>
                  <View style={styles.gridIconWrap}>
                    <MaterialIcons name="local-shipping" size={20} color="#0F766E" />
                  </View>
                  <Text style={styles.gridTitle}>Requests</Text>
                  <Text style={styles.gridSubtitle} numberOfLines={2}>Handle pickup request queue</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statsCard}>
                <Text style={styles.statsLabel}>Materials Ready</Text>
                <Text style={styles.statsValue}>{materialsCount}</Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.statsLabel}>Plan State</Text>
                <Text style={styles.statsValueSmall}>{planEnabled ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => onNavigate('bills')}>
                <View style={styles.sectionTitleWrap}>
                  <MaterialIcons name="description" size={20} color="#0F172A" />
                  <Text style={styles.sectionTitle}>Recent Bills</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#334155" />
              </TouchableOpacity>

              {hardcodedBills.map((bill) => (
                <View key={bill.name} style={styles.rowItem}>
                  <View style={styles.rowAvatar}>
                    <Text style={styles.avatarText}>{bill.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.rowName} numberOfLines={1} ellipsizeMode="tail">{bill.name}</Text>
                  <View style={styles.amountPill}>
                    <Text style={styles.amountValue}>{bill.amount}</Text>
                    <MaterialIcons name="south" size={14} color="#DC2626" />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => onNavigate('requests')}>
                <View style={styles.sectionTitleWrap}>
                  <MaterialIcons name="local-shipping" size={20} color="#0F172A" />
                  <Text style={styles.sectionTitle}>Pickup Requests</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#334155" />
              </TouchableOpacity>

              {hardcodedRequests.map((request) => (
                <View key={request.name} style={styles.rowItem}>
                  <View style={styles.rowAvatarGreen}>
                    <Ionicons name="person-outline" size={16} color="#1B7332" />
                  </View>
                  <Text style={styles.rowName} numberOfLines={1} ellipsizeMode="tail">{request.name}</Text>
                  <Text style={styles.cancelledBadge}>{request.status}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A3A2A',
    position: 'relative',
  },
  bgBubbleTop: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  bgBubbleBottom: {
    position: 'absolute',
    bottom: -100,
    left: -90,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236, 253, 245, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(236, 253, 245, 0.2)',
    marginRight: 10,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 32, fontWeight: '700', color: '#ECFDF5', lineHeight: 36 },
  headerSubtitle: { marginTop: 2, color: '#A7F3D0', fontSize: 13, fontWeight: '500' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 132 },
  animatedShell: { gap: 14, paddingTop: 2 },
  topCardsRow: { flexDirection: 'row', gap: 10 },
  walletCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#0E5A3A',
    padding: 14,
    borderWidth: 1,
    borderColor: '#166534',
  },
  planCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#0F4A34',
    padding: 14,
    borderWidth: 1,
    borderColor: '#14532D',
  },
  topCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topCardTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' },
  topCardValue: { marginTop: 10, color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  topCardValueSmall: { marginTop: 10, color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  topCardMeta: { marginTop: 6, color: '#BBF7D0', fontSize: 12, fontWeight: '600' },
  quickActionsWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDE7DF',
  },
  blockTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800', marginBottom: 10 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDE7DF',
    padding: 14,
    minHeight: 108,
  },
  gridIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8F3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridTitle: { marginTop: 10, color: '#0F172A', fontWeight: '700', fontSize: 15 },
  gridSubtitle: { color: '#64748B', marginTop: 4, fontSize: 12, lineHeight: 16 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(236, 253, 245, 0.24)',
    backgroundColor: 'rgba(15, 74, 52, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statsLabel: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '600',
  },
  statsValue: {
    marginTop: 5,
    color: '#ECFDF5',
    fontSize: 24,
    fontWeight: '800',
  },
  statsValueSmall: {
    marginTop: 9,
    color: '#ECFDF5',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  rowItem: {
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 54,
  },
  rowAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarGreen: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5F7E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#334155', fontWeight: '700' },
  rowName: {
    marginLeft: 10,
    flex: 1,
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
    marginRight: 8,
  },
  amountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 72,
    justifyContent: 'center',
  },
  amountValue: { color: '#7F1D1D', fontWeight: '800', fontSize: 13 },
  cancelledBadge: {
    backgroundColor: '#FFECEC',
    color: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
});

export default MoreMenuScreen;
