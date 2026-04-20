import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../../services/api';
import { SelectedPickupItem } from '../../types';

interface PriceCalculatorScreenProps {
  bookingId: string;
  selectedItems: SelectedPickupItem[];
  onBack: () => void;
  onQuoteSubmitted: (totalPayout: number, bookingId: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const categoryColor: Record<string, string> = {
  metal: '#14532D',
  plastic: '#0369A1',
  paper: '#854D0E',
  glass: '#6D28D9',
};

const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

const PriceCalculatorScreen: React.FC<PriceCalculatorScreenProps> = ({
  bookingId,
  selectedItems,
  onBack,
  onQuoteSubmitted,
  onShowToast,
}) => {
  const [items, setItems] = useState<Array<SelectedPickupItem & { key: string }>>(
    selectedItems.map((item) => ({ ...item, key: String(item.product_id), actual_weight_kg: item.actual_weight_kg || 0 })),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const itemSubtotals = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, item) => {
        const rate = item.rate_per_unit ?? (item.min_rate + item.max_rate) / 2;
        const weight = Number(item.actual_weight_kg || 0);
        acc[item.key] = weight * rate;
        return acc;
      }, {}),
    [items],
  );

  const grandTotal = useMemo(
    () => Object.values(itemSubtotals).reduce((sum, value) => sum + value, 0),
    [itemSubtotals],
  );

  const updateWeight = (key: string, value: string) => {
    const numeric = Number.parseFloat(value);
    const safe = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, actual_weight_kg: safe } : item)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSubmitQuote = async () => {
    if (grandTotal <= 0 || isSubmitting) {
      return;
    }

    const quoteItems = items
      .filter((item) => Number(item.actual_weight_kg || 0) > 0)
      .map((item) => ({
        product_id: item.product_id,
        is_selected: true,
        quoted_rate_per_kg: Number(item.rate_per_unit ?? (item.min_rate + item.max_rate) / 2),
        actual_weight_kg: Number(item.actual_weight_kg || 0),
      }));

    if (quoteItems.length === 0) {
      onShowToast('Add at least one item weight to proceed', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.submitBookingQuote(bookingId, {
        items: quoteItems,
      });
      onQuoteSubmitted(grandTotal, bookingId);
    } catch (error: any) {
      onShowToast(error?.message || 'Failed to submit quote', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>No items added. Go back and select items.</Text>
        <TouchableOpacity style={styles.backAction} onPress={onBack}>
          <Text style={styles.backActionText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calculate Payout</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>Enter actual weights collected. Payout is calculated at market rate.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => {
          const color = categoryColor[(item.category || '').toLowerCase()] || '#475569';
          const rate = item.rate_per_unit ?? (item.min_rate + item.max_rate) / 2;
          const unit = item.unit || 'kg';
          const subtotal = itemSubtotals[item.key] || 0;

          return (
            <View key={item.key} style={styles.itemCard}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: `${color}22` }]}>
                  <MaterialIcons name="category" size={24} color={color} />
                </View>
              )}

              <View style={styles.itemMeta}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex1}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemRate}>₹{rate}/{unit}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.key)}>
                    <MaterialIcons name="delete" size={22} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <View style={styles.weightRow}>
                  <Text style={styles.weightLabel}>Weight ({unit})</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={item.actual_weight_kg ? String(item.actual_weight_kg) : ''}
                    onChangeText={(value) => updateWeight(item.key, value)}
                    style={styles.weightInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.subtotal}>{formatCurrency(subtotal)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footerWrap}>
        <View style={styles.totalBar}>
          <View style={styles.totalIcon}>
            <MaterialIcons name="currency-rupee" size={18} color="#14532D" />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.totalTitle}>Total Payout</Text>
            <Text style={styles.totalSub}>Payable to customer</Text>
          </View>
          <Text style={styles.totalAmount}>{formatCurrency(grandTotal)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.finalizeBtn, (grandTotal <= 0 || isSubmitting) && styles.disabled]}
          onPress={handleSubmitQuote}
          disabled={grandTotal <= 0 || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.finalizeText}>✓ Submit Quote to Customer</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 44,
    paddingBottom: 14,
    paddingHorizontal: 14,
    backgroundColor: '#14532D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  banner: { margin: 14, marginBottom: 8, backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12 },
  bannerText: { color: '#14532D', fontWeight: '600' },
  content: { paddingHorizontal: 14, paddingBottom: 190 },
  itemCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginTop: 10, flexDirection: 'row', gap: 10 },
  itemImage: { width: 56, height: 56, borderRadius: 12, resizeMode: 'cover', alignItems: 'center', justifyContent: 'center' },
  itemMeta: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontWeight: '800', color: '#0F172A', fontSize: 16 },
  itemRate: { color: '#64748B', marginTop: 2 },
  weightRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  weightLabel: { color: '#475569', fontWeight: '600' },
  weightInput: {
    marginLeft: 10,
    minWidth: 72,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    textAlign: 'center',
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 7,
  },
  subtotal: { marginLeft: 'auto', color: '#166534', fontWeight: '800' },
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  totalBar: { backgroundColor: '#14532D', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  totalIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  totalTitle: { color: '#fff', fontWeight: '800' },
  totalSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  totalAmount: { color: '#fff', fontWeight: '800', fontSize: 20 },
  finalizeBtn: { height: 50, borderRadius: 12, backgroundColor: '#14532D', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  finalizeText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.5 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  backAction: { marginTop: 14, backgroundColor: '#14532D', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  backActionText: { color: '#fff', fontWeight: '700' },
  flex1: { flex: 1 },
});

export default PriceCalculatorScreen;
