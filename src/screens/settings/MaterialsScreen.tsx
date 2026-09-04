import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import {
  ApiService,
  VendorMaterialCategory,
  VendorQuotedMaterialProduct,
} from '../../services/api';

interface MaterialsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onSelectProduct: (product: VendorQuotedMaterialProduct, categoryName?: string | null) => void;
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

type MaterialGridItem = VendorQuotedMaterialProduct & {
  categoryId: string;
  categoryName: string;
};

export default function MaterialsScreen({ onBack, onSelectProduct }: MaterialsScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [categories, setCategories] = useState<VendorMaterialCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuotedOnly, setShowQuotedOnly] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.getVendorMaterialCategories();
      const nextCategories = response.categories || [];
      setCategories(nextCategories);
    } catch (error: any) {
      Alert.alert('Unable to load materials', error?.message || 'Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const palette = useMemo(
    () => ({
      background: isDark ? '#0B0F0D' : '#F3F7F4',
      surface: isDark ? '#111915' : '#FFFFFF',
      surfaceSoft: isDark ? '#141E19' : '#E9F7EE',
      border: isDark ? '#1F2A22' : '#E2E8E3',
      textMain: isDark ? '#F8FAFC' : '#0F172A',
      textMuted: isDark ? '#94A3B8' : '#64748B',
      accent: '#1B7332',
      chip: isDark ? '#0F1A14' : '#EFF6F1',
    }),
    [isDark],
  );

  const categoryTabs = useMemo(
    () => [{ id: 'all', name: 'All' }, ...categories],
    [categories],
  );

  const allProducts: MaterialGridItem[] = useMemo(
    () =>
      categories.flatMap((category) =>
        category.products.map((product) => ({
          ...product,
          categoryId: String(category.id),
          categoryName: category.name || 'Materials',
        })),
      ),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
      const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const matchesQuote = !showQuotedOnly || Boolean(product.vendor_quote);
      return matchesCategory && matchesSearch && matchesQuote;
    });
  }, [allProducts, selectedCategoryId, searchQuery, showQuotedOnly]);

  const quotedCount = useMemo(() => allProducts.filter((product) => Boolean(product.vendor_quote)).length, [allProducts]);

  const renderHeader = () => (
    <View>
      <View style={styles.heroBlock}>
        <Text style={[styles.heroTitle, { color: palette.textMain }]}>Materials</Text>
        <Text style={[styles.heroSubtitle, { color: palette.textMuted }]}>Browse, quote, and compare</Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <MaterialIcons name="search" size={20} color={palette.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search materials"
          placeholderTextColor={palette.textMuted}
          style={[styles.searchInput, { color: palette.textMain }]}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close" size={16} color={palette.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tabsRow}>
        <FlatList
          data={categoryTabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => {
            const isActive = String(item.id) === selectedCategoryId;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(String(item.id))}
                style={[
                  styles.tabChip,
                  { backgroundColor: isActive ? palette.accent : palette.chip, borderColor: palette.border },
                ]}
              >
                <Text style={[styles.tabText, { color: isActive ? '#FFFFFF' : palette.textMuted }]}>
                  {item.name || 'Category'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={palette.background} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 6, 14), backgroundColor: palette.surface, borderBottomColor: palette.border }]}
      >
        <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}
        >
          <Ionicons name="chevron-back" size={22} color={palette.textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textMain }]}>Material Pricing</Text>
        <TouchableOpacity
          onPress={() => setShowQuotedOnly((prev) => !prev)}
          style={[styles.quotedButton, showQuotedOnly && styles.quotedButtonActive]}
        >
          <MaterialIcons name="price-check" size={20} color={showQuotedOnly ? '#FFFFFF' : palette.textMain} />
          <View style={styles.quotedBadge}>
            <Text style={styles.quotedBadgeText}>{quotedCount}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={palette.accent} />
          <Text style={[styles.loaderText, { color: palette.textMuted }]}>Loading inventory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 90, 140) }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.productCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              activeOpacity={0.88}
              onPress={() => onSelectProduct(item, item.categoryName)}
            >
              <View style={styles.productMedia}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productFallback, { backgroundColor: palette.surfaceSoft }]}>
                    <MaterialIcons name="inventory-2" size={24} color={palette.accent} />
                  </View>
                )}
              </View>
              <View style={styles.productBody}>
                <Text style={[styles.productTitle, { color: palette.textMain }]} numberOfLines={1}>
                  {item.name || 'Material'}
                </Text>
                <Text style={[styles.productPrice, { color: palette.accent }]} numberOfLines={1}>
                  {formatPriceRange(item)}
                </Text>
                {item.vendor_quote ? (
                  <View style={[styles.quotedChip, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}
                  >
                    <MaterialIcons name="verified" size={12} color={palette.accent} />
                    <Text style={[styles.quotedChipText, { color: palette.textMuted }]}>Quoted</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialIcons name="search-off" size={36} color={palette.textMuted} />
              <Text style={[styles.emptyTitle, { color: palette.textMain }]}>No materials found</Text>
              <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>Try another category</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBlock: {
    paddingTop: 18,
    paddingBottom: 10,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    padding: 4,
  },
  tabsRow: {
    marginTop: 16,
    marginBottom: 10,
  },
  tabsContent: {
    paddingHorizontal: 2,
    gap: 10,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
    fontSize: 22,
    fontWeight: '800',
  },
  quotedButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  quotedButtonActive: {
    backgroundColor: '#1B7332',
  },
  quotedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quotedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
  },
  content: {
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productMedia: {
    height: 120,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productBody: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '700',
  },
  quotedChip: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  quotedChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
});
