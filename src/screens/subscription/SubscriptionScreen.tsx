import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { ApiHttpError, ApiService, PlanResponse } from '../../services/api';

interface SubscriptionScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

type BillingView = 'annual' | 'monthly';

type PlanVisualMeta = {
  shortName: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  badgeLabel?: string;
  description: string;
  included: string[];
  excluded: string[];
};

const { width } = Dimensions.get('window');

const PLAN_META: Record<string, PlanVisualMeta> = {
  BASIC_30: {
    shortName: 'Recruit Basic',
    accentColor: '#A3E635',
    bgColor: '#12372B',
    borderColor: '#2D6A4F',
    description:
      'Best for starting vendors handling neighborhood scrap pickups with predictable lead flow and essential payout controls.',
    included: [
      'Access to verified scrap pickup leads',
      'Lead radius and city visibility',
      'Basic quote + payout tracking',
      'Manage up to 10 active leads/day',
    ],
    excluded: [
      'Priority dispatch boost',
      'Advanced lead analytics',
      'Dedicated vendor success support',
    ],
  },
  PRO_90: {
    shortName: 'Talent Pro',
    accentColor: '#D9F99D',
    bgColor: '#0F2F25',
    borderColor: '#84CC16',
    badgeLabel: 'Save 15%',
    description:
      'Designed for growth vendors who want stronger lead consistency, better acceptance tools, and faster earnings velocity.',
    included: [
      'Everything in Basic plan',
      'Priority lead routing in your zone',
      'Smart reminders for expiring offers',
      'Manage up to 30 active leads/day',
      'Quote conversion insights',
      'Faster dispute resolution lane',
    ],
    excluded: [
      'Dedicated account manager',
      'City-level performance benchmarking',
    ],
  },
  ELITE_365: {
    shortName: 'Elite Network',
    accentColor: '#BBF7D0',
    bgColor: '#0B241D',
    borderColor: '#4ADE80',
    badgeLabel: 'Top Value',
    description:
      'For power vendors and fleet operators maximizing high-value scrap pickups across wider service clusters year-round.',
    included: [
      'Everything in Pro plan',
      'Highest dispatch priority tier',
      'Unlimited active lead handling',
      'Lead quality heatmap + trends',
      'Dedicated growth manager support',
      'Annual loyalty pricing lock',
    ],
    excluded: [],
  },
};

const FALLBACK_META: PlanVisualMeta = {
  shortName: 'Scrap Plan',
  accentColor: '#A3E635',
  bgColor: '#12372B',
  borderColor: '#2D6A4F',
  description: 'Flexible pickup lead access tuned for your service area.',
  included: ['Verified leads', 'Payout tracking'],
  excluded: [],
};

const getPlanMeta = (planCode?: string): PlanVisualMeta => {
  if (!planCode) return FALLBACK_META;
  return PLAN_META[planCode] || FALLBACK_META;
};

const formatRupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const getPerMonthAmount = (amount: number, days: number): number => {
  if (!days || days <= 0) return amount;
  const monthlyCycle = days / 30;
  if (monthlyCycle <= 0) return amount;
  return Math.round(amount / monthlyCycle);
};

export default function SubscriptionScreen({ onBack, onShowToast }: SubscriptionScreenProps) {
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [billingView, setBillingView] = useState<BillingView>('annual');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [entryAnim] = useState(new Animated.Value(0));

  const loadPlan = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.getVendorPlan();
      setPlanData(response);
      if (response.available_plans?.length && !selectedPlanCode) {
        setSelectedPlanCode(response.available_plans[0].code);
      }
    } catch {
      Alert.alert('Unable to load subscription', 'Please try again in a few moments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, []);

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 640,
      useNativeDriver: true,
    }).start();
  }, [entryAnim]);

  const selectedPlan = useMemo(() => {
    if (!planData?.available_plans?.length) return null;
    return planData.available_plans.find((item) => item.code === selectedPlanCode) || planData.available_plans[0];
  }, [planData, selectedPlanCode]);

  const handleBuyPlan = async () => {
    if (!selectedPlan || isPurchasing) return;

    try {
      setIsPurchasing(true);
      const order = await ApiService.createSubscriptionOrder(selectedPlan.code);

      const paymentResult = await RazorpayCheckout.open({
        key: order.key,
        amount: Math.round(Number(order.amount.total) * 100),
        currency: 'INR',
        order_id: order.order_id,
        name: 'Scrapiz Vendor',
        description: `${order.plan.name} subscription`,
        notes: {
          plan_code: order.plan.code,
        },
        theme: {
          color: '#1D4ED8',
        },
      });

      const verifyResult = await ApiService.verifySubscriptionPayment({
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      Alert.alert('Subscription Activated', verifyResult.message || 'Your plan is active now.');
      await loadPlan();
    } catch (error: any) {
      const isCancelled =
        error?.code === 0 ||
        String(error?.description || '').toLowerCase().includes('cancel') ||
        String(error?.message || '').toLowerCase().includes('cancel');

      if (isCancelled) {
        onShowToast('Payment cancelled. You can retry anytime.', 'info');
        return;
      }

      if (error instanceof ApiHttpError) {
        Alert.alert('Payment failed', error.message);
      } else {
        Alert.alert('Payment failed', error?.description || error?.message || 'Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const entitlementText = planData?.entitlement?.is_entitled_for_leads
    ? 'You are eligible to receive verified pickup leads.'
    : 'Lead entitlement is inactive. Activate a plan to continue receiving leads.';

  const availablePlans = planData?.available_plans || [];
  const selectedMeta = getPlanMeta(selectedPlan?.code);
  const selectedAmount = Number(selectedPlan?.amount || 0);
  const selectedDays = Number(selectedPlan?.duration_days || 30);
  const selectedMonthly = getPerMonthAmount(selectedAmount, selectedDays);
  const cardWidth = Math.min(width - 32, 420);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.bgGlowTop} />
        <View style={styles.bgGlowBottom} />

        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color="#E2E8F0" />
          </TouchableOpacity>
          <View style={styles.segmentWrap}>
            <TouchableOpacity
              style={[styles.segmentButton, billingView === 'annual' && styles.segmentButtonActive]}
              onPress={() => setBillingView('annual')}
              activeOpacity={0.9}
            >
              <Text style={[styles.segmentText, billingView === 'annual' && styles.segmentTextActive]}>Annual</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, billingView === 'monthly' && styles.segmentButtonActive]}
              onPress={() => setBillingView('monthly')}
              activeOpacity={0.9}
            >
              <Text style={[styles.segmentText, billingView === 'monthly' && styles.segmentTextActive]}>Monthly</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[
                styles.animatedShell,
                {
                  opacity: entryAnim,
                  transform: [
                    {
                      translateX: entryAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-28, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.screenTitle}>Pricing</Text>

              <View style={styles.statusStrip}>
                <Text style={styles.statusText}>{entitlementText}</Text>
                <Text style={styles.statusMeta}>
                  Trial {planData?.trial?.is_active ? 'Active' : 'Inactive'} • {planData?.trial?.days_remaining ?? 0} day(s) left
                </Text>
              </View>

              <View style={styles.planSwitcherRow}>
                {availablePlans.map((plan, index) => {
                  const selected = selectedPlanCode === plan.code;
                  const meta = getPlanMeta(plan.code);
                  return (
                    <TouchableOpacity
                      key={plan.code}
                      style={[
                        styles.planChip,
                        selected && { borderColor: meta.accentColor, backgroundColor: 'rgba(217,249,157,0.16)' },
                      ]}
                      onPress={() => setSelectedPlanCode(plan.code)}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.planChipText, selected && { color: '#F8FAFC' }]} numberOfLines={1}>
                        {plan.name.split(' ')[0]}
                      </Text>
                      {index === availablePlans.findIndex((p) => p.code === selectedPlanCode) ? (
                        <View style={styles.planChipDot} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedPlan ? (
                <View
                  style={[
                    styles.featureCard,
                    {
                      width: cardWidth,
                      backgroundColor: selectedMeta.bgColor,
                      borderColor: selectedMeta.borderColor,
                    },
                  ]}
                >
                  {selectedMeta.badgeLabel ? (
                    <View style={styles.badgeCorner}>
                      <Text style={styles.badgeText}>{selectedMeta.badgeLabel}</Text>
                    </View>
                  ) : null}

                  <View style={styles.featureHeaderTop}>
                    <Text style={styles.featureTitle}>{selectedMeta.shortName}</Text>
                    <View style={styles.featureStatusPill}>
                      <Text style={styles.featureStatusText}>Active</Text>
                      <View style={[styles.featureStatusDot, { backgroundColor: selectedMeta.accentColor }]} />
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    {billingView === 'annual' ? (
                      <Text style={styles.slashPrice}>
                        {formatRupees(selectedMonthly + Math.round(selectedMonthly * 0.5))}
                      </Text>
                    ) : null}
                    <Text style={[styles.currentPrice, { color: selectedMeta.accentColor }]}>
                      {billingView === 'annual' ? formatRupees(selectedMonthly) : formatRupees(selectedAmount)}
                    </Text>
                    <Text style={styles.priceSuffix}>
                      {billingView === 'annual' ? '/ month' : ` / ${selectedDays} days`}
                    </Text>
                  </View>

                  <Text style={styles.billingNote}>
                    {billingView === 'annual'
                      ? `${formatRupees(selectedAmount)} billed every ${selectedDays} days`
                      : `One-time ${selectedDays}-day subscription recharge`}
                  </Text>

                  <Text style={styles.description}>{selectedMeta.description}</Text>

                  <View style={styles.divider} />

                  <View style={styles.featureList}>
                    {selectedMeta.included.map((feature) => (
                      <View style={styles.featureRow} key={`in-${feature}`}>
                        <View style={styles.featureIconWrap}>
                          <Ionicons name="checkmark" size={13} color="#0F172A" />
                        </View>
                        <Text style={styles.featureRowText}>{feature}</Text>
                      </View>
                    ))}

                    {selectedMeta.excluded.map((feature) => (
                      <View style={styles.featureRow} key={`ex-${feature}`}>
                        <View style={styles.featureIconWrapMuted}>
                          <Ionicons name="close" size={12} color="#94A3B8" />
                        </View>
                        <Text style={styles.featureRowMutedText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={handleBuyPlan}
                    disabled={isPurchasing}
                    style={styles.cardCtaButton}
                    activeOpacity={0.9}
                  >
                    {isPurchasing ? <ActivityIndicator color="#0F172A" size="small" /> : null}
                    <Text style={styles.cardCtaText}>
                      {selectedPlan ? `Buy ${selectedPlan.name}` : 'Select Plan'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Plans Available</Text>
                  <Text style={styles.emptySubtitle}>Please try again in a moment.</Text>
                </View>
              )}

              <View style={styles.currentPlanWrap}>
                <Text style={styles.currentPlanTitle}>Current Plan</Text>
                <Text style={styles.currentPlanName}>{planData?.current_plan?.name || 'No active plan'}</Text>
                <Text style={styles.currentPlanMeta}>
                  Status: {planData?.current_plan?.status || 'inactive'} • Expires:{' '}
                  {planData?.current_plan?.expires_at
                    ? new Date(planData.current_plan.expires_at).toLocaleDateString('en-IN')
                    : 'N/A'}
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#071F1A',
  },
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  bgGlowTop: {
    position: 'absolute',
    top: -80,
    right: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 232, 240, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.2)',
  },
  segmentWrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  segmentButtonActive: {
    backgroundColor: '#F8FAFC',
  },
  segmentText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#0F172A',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 46,
  },
  animatedShell: {
    alignItems: 'center',
    paddingTop: 14,
  },
  screenTitle: {
    width: '100%',
    color: '#ECFDF5',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  statusStrip: {
    marginTop: 8,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
    backgroundColor: 'rgba(11, 54, 44, 0.78)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statusText: {
    color: '#D1FAE5',
    fontSize: 13,
    fontWeight: '600',
  },
  statusMeta: {
    marginTop: 4,
    color: '#86EFAC',
    fontSize: 12,
    fontWeight: '500',
  },
  planSwitcherRow: {
    marginTop: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(30, 41, 59, 0.54)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  planChipText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  planChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9F99D',
  },
  featureCard: {
    marginTop: 16,
    borderRadius: 26,
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  badgeCorner: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#D9F99D',
    borderBottomLeftRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopRightRadius: 24,
  },
  badgeText: {
    color: '#1A2E05',
    fontWeight: '800',
    fontSize: 11,
  },
  featureHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 72,
  },
  featureTitle: {
    color: '#F8FAFC',
    fontSize: 29,
    fontWeight: '300',
    lineHeight: 34,
  },
  featureStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureStatusText: {
    color: '#D1FAE5',
    fontSize: 13,
    fontWeight: '600',
  },
  featureStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priceRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
  },
  slashPrice: {
    color: '#94A3B8',
    fontSize: 24,
    textDecorationLine: 'line-through',
    fontWeight: '300',
  },
  currentPrice: {
    fontSize: 46,
    fontWeight: '300',
    lineHeight: 50,
  },
  priceSuffix: {
    color: '#D1FAE5',
    fontSize: 16,
    fontWeight: '600',
  },
  billingNote: {
    marginTop: 2,
    color: '#86EFAC',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    marginTop: 12,
    color: '#D1FAE5',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginTop: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 999,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#A3E635',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureIconWrapMuted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(148,163,184,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  featureRowText: {
    flex: 1,
    color: '#ECFDF5',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  featureRowMutedText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
  },
  cardCtaButton: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cardCtaText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    marginTop: 16,
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 16,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#CBD5E1',
    fontSize: 12,
  },
  currentPlanWrap: {
    marginTop: 16,
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    padding: 14,
  },
  currentPlanTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  currentPlanName: {
    marginTop: 7,
    color: '#ECFDF5',
    fontSize: 20,
    fontWeight: '700',
  },
  currentPlanMeta: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  buyButton: {
    marginTop: 12,
    borderRadius: 18,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    gap: 8,
  },
  buyButtonDisabled: {
    opacity: 0.65,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  currentCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
