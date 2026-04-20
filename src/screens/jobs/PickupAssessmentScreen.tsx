import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ApiHttpError, ApiService } from '../../services/api';
import { LeadOrderItem } from '../../types';

interface PickupAssessmentScreenProps {
  leadId: string;
  items: LeadOrderItem[];
  orderNumber: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  onBack: () => void;
  onAccepted: (bookingId: string, selectedItems: LeadOrderItem[]) => void;
  onLeadUnavailable: (message: string) => void;
}

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

const PickupAssessmentScreen: React.FC<PickupAssessmentScreenProps> = ({
  leadId,
  items,
  orderNumber,
  onBack,
  onAccepted,
  onLeadUnavailable,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(items.map((item) => String(item.product_id))));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(String(item.product_id))),
    [items, selectedIds],
  );

  const selectedEstimate = useMemo(() => {
    const minTotal = selectedItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.min_rate || 0),
      0,
    );
    const maxTotal = selectedItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.max_rate || 0),
      0,
    );
    return { minTotal, maxTotal };
  }, [selectedItems]);

  const toggleSelection = (id: string | number) => {
    const key = String(id);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedItems.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await ApiService.acceptLead(leadId);
      const bookingId = response.booking_id || leadId;

      // Ensure strict arrival flow can proceed by moving confirmed -> en_route.
      if (response.booking_id) {
        try {
          await ApiService.startBookingJourney(response.booking_id);
        } catch (startError) {
          if (__DEV__) {
            console.warn('[PickupAssessment] booking start failed after accept', startError);
          }
        }
      }

      onAccepted(bookingId, selectedItems);
    } catch (error) {
      if (error instanceof ApiHttpError) {
        if (error.status === 409) {
          onLeadUnavailable('Lead taken by another vendor');
          return;
        }
        if (error.status === 410) {
          onLeadUnavailable('Lead expired');
          return;
        }
      }
      Alert.alert('Error', 'Unable to accept this booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Pickup Check</Text>
          <Text style={styles.headerSubtitle}>Order #{orderNumber}</Text>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <MaterialIcons name="info-outline" size={18} color="#14532D" />
        <Text style={styles.infoBannerText}>Pick only what you can collect today.</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.product_id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const checked = selectedIds.has(String(item.product_id));
          const showFallbackVisuals = Boolean(item.is_fallback);
          const showFallbackImage = Boolean(item.is_fallback && item.image_url);

          return (
            <TouchableOpacity
              style={[styles.itemCard, !checked && styles.itemCardUnchecked]}
              onPress={() => toggleSelection(item.product_id)}
              activeOpacity={0.9}
            >
              {showFallbackImage ? (
                <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, !checked && styles.itemImageMuted]}>
                  <MaterialIcons name="category" size={22} color={checked ? '#166534' : '#94A3B8'} />
                </View>
              )}

              <View style={styles.itemCopy}>
                <Text style={styles.itemTitle}>{item.product_name}</Text>
                {!showFallbackVisuals ? (
                  <Text style={styles.itemMeta}>
                    {item.quantity} {item.unit} requested
                  </Text>
                ) : null}
                {showFallbackVisuals ? (
                  <Text style={styles.itemCategory}>
                    {(item.category || 'scrap').toString().replace(/^\w/, (char) => char.toUpperCase())}
                  </Text>
                ) : null}
                {showFallbackVisuals ? (
                  <View style={styles.fallbackMetricRow}>
                    <View style={styles.fallbackMetricCard}>
                      <Text style={styles.fallbackMetricLabel}>Qty</Text>
                      <Text style={styles.fallbackMetricValue}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                    <View style={styles.fallbackMetricCard}>
                      <Text style={styles.fallbackMetricLabel}>Rate</Text>
                      <Text style={styles.fallbackMetricValue}>
                        ₹{item.min_rate}-{item.max_rate}/{item.unit}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.bottomWrap}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Estimated Payout</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(selectedEstimate.minTotal)} - {formatCurrency(selectedEstimate.maxTotal)}
          </Text>
          <Text style={styles.summaryHint}>
            (Based on {selectedItems.length} of {items.length} items)
          </Text>
        </View>

        {selectedItems.length === 0 ? (
          <View style={styles.warningBanner}>
            <MaterialIcons name="warning-amber" size={18} color="#B45309" />
            <Text style={styles.warningText}>Select at least one item to continue.</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.confirmButton, (selectedItems.length === 0 || isSubmitting) && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={selectedItems.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>✓ Confirm & Accept Booking</Text>
              <Text style={styles.confirmButtonHint}>You are committing to pick up the selected items</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerCopy: { marginLeft: 12, flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  headerSubtitle: { marginTop: 4, color: '#64748B' },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: '#E8F3EB',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  infoBannerText: { color: '#14532D', flex: 1, lineHeight: 20, fontWeight: '600' },
  listContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 250, gap: 14 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EBE6',
  },
  itemCardUnchecked: {
    backgroundColor: '#F8FAFC',
    opacity: 0.72,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
    resizeMode: 'cover',
    backgroundColor: '#E9F7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImageMuted: {
    backgroundColor: '#E2E8F0',
  },
  itemCopy: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemMeta: {
    marginTop: 4,
    color: '#64748B',
  },
  itemCategory: {
    marginTop: 8,
    color: '#166534',
    fontWeight: '700',
  },
  itemRate: {
    marginTop: 4,
    color: '#166534',
    fontWeight: '800',
  },
  fallbackMetricRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  fallbackMetricCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  fallbackMetricLabel: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },
  fallbackMetricValue: {
    marginTop: 2,
    color: '#14532D',
    fontSize: 12,
    fontWeight: '800',
  },
  checkbox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  bottomWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5ECE7',
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: '#123C2D',
    padding: 18,
  },
  summaryLabel: {
    color: '#D1FAE5',
    fontWeight: '700',
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryHint: {
    color: 'rgba(255,255,255,0.76)',
    lineHeight: 20,
    marginTop: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  warningText: {
    color: '#92400E',
    fontWeight: '700',
    flex: 1,
  },
  confirmButton: {
    height: 66,
    borderRadius: 18,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  confirmButtonHint: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    marginTop: 4,
  },
});

export default PickupAssessmentScreen;
