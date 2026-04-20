import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  ApiService,
  VendorMaterialCategory,
  VendorQuotedMaterialProduct,
} from '../../services/api';

interface MaterialsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
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

const getCategoryDescription = (categoryName?: string, count?: number) => {
  const title = (categoryName || 'Materials').toLowerCase();
  if (title.includes('metal')) return `Types of metal scraps • ${count || 0} products`;
  if (title.includes('electronic') || title.includes('e-waste')) return `Types of electronic scraps • ${count || 0} products`;
  if (title.includes('paper')) return `Paper and board materials • ${count || 0} products`;
  if (title.includes('plastic')) return `Plastic recovery materials • ${count || 0} products`;
  return `${count || 0} products available for vendor pricing`;
};

export default function MaterialsScreen({ onBack }: MaterialsScreenProps) {
  const [categories, setCategories] = useState<VendorMaterialCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.getVendorMaterialCategories();
      const nextCategories = response.categories || [];
      setCategories(nextCategories);
      const nextInputs: Record<string, string> = {};
      nextCategories.forEach((category) => {
        category.products.forEach((product) => {
          if (product.vendor_quote) {
            nextInputs[String(product.id)] = String(product.vendor_quote);
          }
        });
      });
      setQuoteInputs(nextInputs);
    } catch (error: any) {
      Alert.alert('Unable to load materials', error?.message || 'Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === String(selectedCategoryId)) || null,
    [categories, selectedCategoryId],
  );

  const totalProducts = useMemo(
    () => categories.reduce((sum, category) => sum + (category.products?.length || 0), 0),
    [categories],
  );

  const hasEditedQuotes = useMemo(() => {
    return Object.values(quoteInputs).some((value) => value.trim().length > 0);
  }, [quoteInputs]);

  const handleSaveQuotes = async () => {
    if (!selectedCategory) {
      return;
    }

    const payload = selectedCategory.products
      .map((product) => ({
        product_id: product.id,
        quoted_price: Number(quoteInputs[String(product.id)]),
      }))
      .filter((item) => Number.isFinite(item.quoted_price) && item.quoted_price >= 0);

    if (payload.length === 0) {
      Alert.alert('Nothing to save', 'Enter at least one quote before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await ApiService.saveVendorMaterialQuotes(payload);
      Alert.alert('Saved', 'Your quoted prices have been updated successfully.');
      await loadCategories();
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Unable to save quoted prices right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCategoryOverview = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroBlock}>
        <Text style={styles.heroTitle}>Materials</Text>
        <Text style={styles.heroSubtitle}>{totalProducts} products across live inventory categories</Text>
      </View>

      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={String(category.id)}
            style={styles.categoryCard}
            activeOpacity={0.9}
            onPress={() => setSelectedCategoryId(category.id)}
          >
            <View style={styles.categoryMedia}>
              {category.image_url ? (
                <Image source={{ uri: category.image_url }} style={styles.categoryImage} />
              ) : (
                <View style={styles.categoryFallback}>
                  <MaterialIcons name="category" size={26} color="#166534" />
                </View>
              )}
            </View>
            <View style={styles.categoryCopy}>
              <Text style={styles.categoryTitle}>{category.name || 'Materials'}</Text>
              <Text style={styles.categoryDescription}>
                {getCategoryDescription(category.name, category.products?.length || 0)}
              </Text>
            </View>
            <View style={styles.categoryFooter}>
              <Text style={styles.categoryFooterText}>Open category</Text>
              <Ionicons name="chevron-forward" size={18} color="#166534" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderCategoryProducts = () => {
    if (!selectedCategory) {
      return renderCategoryOverview();
    }

    return (
      <View style={styles.screenFill}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.categoryBackChip} onPress={() => setSelectedCategoryId(null)}>
            <Ionicons name="arrow-back" size={16} color="#166534" />
            <Text style={styles.categoryBackChipText}>All categories</Text>
          </TouchableOpacity>

          <View style={styles.detailHero}>
            <Text style={styles.detailTitle}>{selectedCategory.name || 'Materials'}</Text>
            <Text style={styles.detailSubtitle}>
              {getCategoryDescription(selectedCategory.name, selectedCategory.products?.length || 0)}
            </Text>
          </View>

          <View style={styles.productList}>
            {selectedCategory.products.map((product) => (
              <View key={String(product.id)} style={styles.productCard}>
                <View style={styles.productTopRow}>
                  <View style={styles.productImageWrap}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productFallback}>
                        <MaterialIcons name="inventory-2" size={22} color="#166534" />
                      </View>
                    )}
                  </View>
                  <View style={styles.productMeta}>
                    <Text style={styles.productTitle}>{product.name || 'Material item'}</Text>
                    <Text style={styles.productRate}>{formatPriceRange(product)}</Text>
                    {product.description ? (
                      <Text style={styles.productDescription} numberOfLines={2}>
                        {product.description}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.quoteSection}>
                  <Text style={styles.quoteLabel}>Your quoted price</Text>
                  <View style={styles.quoteInputWrap}>
                    <Text style={styles.quotePrefix}>₹</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={quoteInputs[String(product.id)] || ''}
                      onChangeText={(value) =>
                        setQuoteInputs((current) => ({
                          ...current,
                          [String(product.id)]: value.replace(/[^0-9.]/g, ''),
                        }))
                      }
                      placeholder="Enter your rate"
                      placeholderTextColor="#94A3B8"
                      style={styles.quoteInput}
                    />
                    <Text style={styles.quoteUnit}>per {product.unit || 'unit'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Text style={styles.bottomBarHint}>
            Prices are stored per vendor and shown against live inventory products from the dashboard.
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, (!hasEditedQuotes || isSaving) && styles.saveButtonDisabled]}
            disabled={!hasEditedQuotes || isSaving}
            onPress={handleSaveQuotes}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save quoted prices</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={selectedCategoryId ? () => setSelectedCategoryId(null) : onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Material Pricing</Text>
        <TouchableOpacity onPress={loadCategories} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#166534" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#166534" />
          <Text style={styles.loaderText}>Loading inventory categories...</Text>
        </View>
      ) : selectedCategoryId ? (
        renderCategoryProducts()
      ) : (
        renderCategoryOverview()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8F6' },
  screenFill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F7EE',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 15,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 160,
  },
  heroBlock: {
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubtitle: {
    marginTop: 6,
    color: '#166534',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryGrid: {
    gap: 14,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EBE6',
  },
  categoryMedia: {
    height: 136,
    borderRadius: 22,
    backgroundColor: '#EFF6F1',
    marginBottom: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: {
    minHeight: 74,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryDescription: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  categoryFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEF2EF',
    paddingTop: 14,
  },
  categoryFooterText: {
    color: '#166534',
    fontSize: 15,
    fontWeight: '700',
  },
  categoryBackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E9F7EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  categoryBackChipText: {
    marginLeft: 6,
    color: '#166534',
    fontWeight: '700',
  },
  detailHero: {
    marginBottom: 18,
  },
  detailTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailSubtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 16,
    lineHeight: 23,
  },
  productList: {
    gap: 14,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EBE6',
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productFallback: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#E9F7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productMeta: {
    flex: 1,
    marginLeft: 14,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  productRate: {
    marginTop: 6,
    color: '#166534',
    fontSize: 15,
    fontWeight: '700',
  },
  productDescription: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  quoteSection: {
    marginTop: 16,
  },
  quoteLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  quoteInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9E2DC',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  quotePrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 8,
  },
  quoteInput: {
    flex: 1,
    minHeight: 52,
    fontSize: 16,
    color: '#0F172A',
  },
  quoteUnit: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
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
  bottomBarHint: {
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  saveButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});
