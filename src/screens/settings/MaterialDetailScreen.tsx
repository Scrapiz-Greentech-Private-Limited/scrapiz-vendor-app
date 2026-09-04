import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ApiService, VendorQuotedMaterialProduct } from '../../services/api';

interface MaterialDetailScreenProps {
  product: VendorQuotedMaterialProduct;
  categoryName?: string | null;
  onBack: () => void;
}

const formatPriceRange = (product: VendorQuotedMaterialProduct) => {
  const min = Number(product.min_rate || 0);
  const max = Number(product.max_rate || 0);
  if (min > 0 && max > 0 && min !== max) {
    return `₹${min.toFixed(0)} - ₹${max.toFixed(0)} / ${product.unit || 'unit'}`;
  }
  const price = max || min;
  return `₹${price.toFixed(0)} / ${product.unit || 'unit'}`;
};

export default function MaterialDetailScreen({ product, categoryName, onBack }: MaterialDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [quoteValue, setQuoteValue] = useState(product.vendor_quote ? String(product.vendor_quote) : '');
  const [isSaving, setIsSaving] = useState(false);

  const palette = useMemo(
    () => ({
      background: isDark ? '#0B0F0D' : '#F6F8F5',
      surface: isDark ? '#111915' : '#FFFFFF',
      surfaceSoft: isDark ? '#141E19' : '#F1F5F1',
      border: isDark ? '#1F2A22' : '#DCE8DF',
      textMain: isDark ? '#F8FAFC' : '#0F172A',
      textMuted: isDark ? '#94A3B8' : '#64748B',
      accent: '#1B7332',
    }),
    [isDark],
  );

  const handleSave = async () => {
    const price = Number(quoteValue);
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('Invalid price', 'Enter a valid quoted price to save.');
      return;
    }

    setIsSaving(true);
    try {
      await ApiService.saveVendorMaterialQuotes([
        { product_id: product.id, quoted_price: price },
      ]);
      Alert.alert('Saved', 'Your quoted price has been updated.');
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Unable to save quoted price right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={palette.background} />

      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}
      >
        <TouchableOpacity onPress={onBack} style={[styles.iconButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={palette.textMain} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: palette.textMain }]}>Material Details</Text>
          {categoryName ? (
            <Text style={[styles.headerSubtitle, { color: palette.textMuted }]}>{categoryName}</Text>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={styles.heroMedia}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroFallback, { backgroundColor: palette.surfaceSoft }]}>
                <MaterialIcons name="inventory-2" size={40} color={palette.accent} />
              </View>
            )}
          </View>
          <View style={styles.heroBody}>
            <Text style={[styles.heroTitle, { color: palette.textMain }]}>{product.name || 'Material item'}</Text>
            <Text style={[styles.heroPrice, { color: palette.accent }]}>{formatPriceRange(product)}</Text>
            {product.description ? (
              <Text style={[styles.heroDescription, { color: palette.textMuted }]} numberOfLines={2}>
                {product.description}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Quoted prices</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Live range</Text>
            <Text style={[styles.infoValue, { color: palette.textMain }]}>{formatPriceRange(product)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Your quote</Text>
            <Text style={[styles.infoValue, { color: palette.textMain }]}>
              {product.vendor_quote ? `₹${product.vendor_quote}` : 'Not quoted'}
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Update your price</Text>
          <View style={[styles.inputWrap, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}
          >
            <Text style={[styles.inputPrefix, { color: palette.textMuted }]}>₹</Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="Enter your rate"
              placeholderTextColor={palette.textMuted}
              value={quoteValue}
              onChangeText={(value) => setQuoteValue(value.replace(/[^0-9.]/g, ''))}
              style={[styles.input, { color: palette.textMain }]}
            />
            <Text style={[styles.inputSuffix, { color: palette.textMuted }]}>/ {product.unit || 'unit'}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save quote</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={{ height: Math.max(insets.bottom, 12) }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroMedia: {
    height: 200,
    backgroundColor: '#E2E8F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    padding: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  inputSuffix: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#1B7332',
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
