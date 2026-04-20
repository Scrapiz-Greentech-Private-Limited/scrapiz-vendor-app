import Constants from 'expo-constants';
import { ApiService, InventoryCategory } from '../../services/api';
import { BookingRequest, LeadDetailsResponse, LeadOrderItem } from '../../types';

const FALLBACK_BOOKING_IDS = ['fallback-live-1', 'fallback-live-2'];

const FALLBACK_BOOKING_SHELL: Omit<BookingRequest, 'id' | 'scrapType' | 'estimatedAmount'>[] = [
  {
    distance: '2.5 km',
    customerName: 'Pickup Request',
    customerPhone: '',
    address: 'Worli, South Mumbai',
    paymentMode: 'Cash',
    createdAt: new Date(),
    priority: 'high',
    estimatedTime: '15 mins',
    isFallback: true,
  },
  {
    distance: '1.9 km',
    customerName: 'Pickup Request',
    customerPhone: '',
    address: 'Worli Naka, South Mumbai',
    paymentMode: 'Cash',
    createdAt: new Date(),
    priority: 'medium',
    estimatedTime: '12 mins',
    isFallback: true,
  },
];

const FALLBACK_LEAD_CACHE = new Map<string, LeadOrderItem[]>();

const STATIC_EMERGENCY_ITEMS: LeadOrderItem[] = [
  {
    product_id: 'fallback-paper-em-1',
    product_name: 'Old Newspaper',
    quantity: 36,
    unit: 'kg',
    min_rate: 14,
    max_rate: 18,
    category: 'paper',
    is_fallback: true,
  },
  {
    product_id: 'fallback-paper-em-2',
    product_name: 'Cardboard',
    quantity: 34,
    unit: 'kg',
    min_rate: 8,
    max_rate: 12,
    category: 'paper',
    is_fallback: true,
  },
  {
    product_id: 'fallback-plastic-em-1',
    product_name: 'Plastic Bottles',
    quantity: 38,
    unit: 'kg',
    min_rate: 12,
    max_rate: 16,
    category: 'plastic',
    is_fallback: true,
  },
  {
    product_id: 'fallback-metal-em-1',
    product_name: 'Iron Scrap',
    quantity: 33,
    unit: 'kg',
    min_rate: 26,
    max_rate: 32,
    category: 'metal',
    is_fallback: true,
  },
  {
    product_id: 'fallback-paper-em-3',
    product_name: 'Books',
    quantity: 35,
    unit: 'kg',
    min_rate: 10,
    max_rate: 14,
    category: 'paper',
    is_fallback: true,
  },
  {
    product_id: 'fallback-metal-em-2',
    product_name: 'Steel Utensils',
    quantity: 40,
    unit: 'kg',
    min_rate: 32,
    max_rate: 38,
    category: 'metal',
    is_fallback: true,
  },
];

const getFallbackModeRawValue = () =>
  (Constants.expoConfig?.extra as any)?.env?.EXPO_PUBLIC_ENABLE_VENDOR_FALLBACK_BOOKINGS ??
  (Constants.manifest as any)?.extra?.env?.EXPO_PUBLIC_ENABLE_VENDOR_FALLBACK_BOOKINGS ??
  process.env.EXPO_PUBLIC_ENABLE_VENDOR_FALLBACK_BOOKINGS ??
  'false';

const toBool = (value: unknown) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const normalizeRateBand = (minRate?: number, maxRate?: number) => {
  const min = Number(minRate || 0);
  const max = Number(maxRate || min);
  const resolvedMin = min > 0 ? min : max;
  const resolvedMax = max >= resolvedMin ? max : resolvedMin;
  return {
    min_rate: Number.isFinite(resolvedMin) && resolvedMin > 0 ? resolvedMin : 1,
    max_rate: Number.isFinite(resolvedMax) && resolvedMax > 0 ? resolvedMax : 1,
  };
};

const getFallbackEstimate = (items: LeadOrderItem[]) => {
  const estimated_value_min = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.min_rate || 0),
    0,
  );
  const estimated_value_max = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.max_rate || 0),
    0,
  );

  return { estimated_value_min, estimated_value_max };
};

const makeScrapTypeLabel = (items: LeadOrderItem[]) => {
  const categories = Array.from(
    new Set(items.map((item) => titleCase((item.category || 'mixed').toString()))),
  );

  if (!categories.length) {
    return 'Mixed Scrap';
  }
  if (categories.length === 1) {
    return categories[0];
  }
  if (categories.length === 2) {
    return `${categories[0]} + ${categories[1]}`;
  }
  return `${categories[0]} + ${categories[1]} +${categories.length - 2} more`;
};

const chooseCategoryPool = (categories: InventoryCategory[]) =>
  categories
    .filter((category) => Array.isArray(category.products) && category.products.length > 0)
    .sort((a, b) => (b.products?.length || 0) - (a.products?.length || 0))
    .slice(0, 3);

const mapInventoryToFallbackItems = (categories: InventoryCategory[]): LeadOrderItem[] => {
  const selectedCategories = chooseCategoryPool(categories);

  const preferredItems: LeadOrderItem[] = [];
  selectedCategories.forEach((category, categoryIndex) => {
    const categoryName = (category.name || 'mixed').toString().toLowerCase();
    (category.products || []).slice(0, 2).forEach((product, productIndex) => {
      const rates = normalizeRateBand(Number(product.min_rate || 0), Number(product.max_rate || 0));
      preferredItems.push({
        product_id: `fallback-${category.id}-${product.id}`,
        product_name: product.name || 'Scrap Item',
        quantity: 31 + ((categoryIndex * 11 + productIndex * 7) % 13),
        unit: product.unit || 'kg',
        min_rate: rates.min_rate,
        max_rate: rates.max_rate,
        image_url: product.image_url || undefined,
        category: categoryName,
        is_fallback: true,
      });
    });
  });

  const seen = new Set(preferredItems.map((item) => String(item.product_name).toLowerCase()));

  categories.forEach((category, categoryIndex) => {
    (category.products || []).forEach((product, productIndex) => {
      if (preferredItems.length >= 6) {
        return;
      }
      const key = String(product.name || '').toLowerCase();
      if (!key || seen.has(key)) {
        return;
      }

      const rates = normalizeRateBand(Number(product.min_rate || 0), Number(product.max_rate || 0));
      preferredItems.push({
        product_id: `fallback-${category.id}-${product.id}`,
        product_name: product.name || 'Scrap Item',
        quantity: 31 + ((categoryIndex * 5 + productIndex * 3) % 16),
        unit: product.unit || 'kg',
        min_rate: rates.min_rate,
        max_rate: rates.max_rate,
        image_url: product.image_url || undefined,
        category: (category.name || 'mixed').toString().toLowerCase(),
        is_fallback: true,
      });
      seen.add(key);
    });
  });

  return preferredItems.slice(0, 6);
};

const withEmergencyFallback = (items: LeadOrderItem[]) => {
  if (items.length >= 5) {
    return items;
  }
  return STATIC_EMERGENCY_ITEMS;
};

const ensureFallbackCache = async () => {
  if (FALLBACK_LEAD_CACHE.size) {
    return;
  }

  let inventoryItems: LeadOrderItem[] = [];
  try {
    const categories = await ApiService.getInventoryCategories();
    inventoryItems = mapInventoryToFallbackItems(categories);
  } catch (error) {
    console.warn('Unable to load inventory-backed fallback items, using emergency fallback set.', error);
  }

  const pool = withEmergencyFallback(inventoryItems);

  const bookingOneItems = pool.slice(0, 5);
  const bookingTwoItems = pool.slice(1, 6).length >= 5 ? pool.slice(1, 6) : pool.slice(0, 5);

  FALLBACK_LEAD_CACHE.set(FALLBACK_BOOKING_IDS[0], bookingOneItems);
  FALLBACK_LEAD_CACHE.set(FALLBACK_BOOKING_IDS[1], bookingTwoItems);
};

export const isFallbackAppTestingEnabled = () => toBool(getFallbackModeRawValue());

export const buildFallbackBookings = async (): Promise<BookingRequest[]> => {
  if (!isFallbackAppTestingEnabled()) {
    return [];
  }

  await ensureFallbackCache();

  return FALLBACK_BOOKING_IDS.map((bookingId, index) => {
    const items = FALLBACK_LEAD_CACHE.get(bookingId) || STATIC_EMERGENCY_ITEMS.slice(0, 5);
    const estimate = getFallbackEstimate(items);
    return {
      id: bookingId,
      ...FALLBACK_BOOKING_SHELL[index],
      scrapType: makeScrapTypeLabel(items),
      estimatedAmount: Math.round((estimate.estimated_value_min + estimate.estimated_value_max) / 2),
      createdAt: new Date(),
    };
  });
};

export const buildFallbackLead = async (booking: BookingRequest, leadId: string): Promise<LeadDetailsResponse> => {
  if (!FALLBACK_LEAD_CACHE.has(booking.id)) {
    await ensureFallbackCache();
  }

  const items = FALLBACK_LEAD_CACHE.get(booking.id) || STATIC_EMERGENCY_ITEMS.slice(0, 5);
  const { estimated_value_min, estimated_value_max } = getFallbackEstimate(items);

  return {
    lead_id: leadId,
    status: 'new',
    seconds_remaining: 600,
    distance_km: Number.parseFloat(booking.distance) || 0,
    estimated_minutes: 15,
    is_urgent: booking.priority === 'high',
    pickup_address: booking.address,
    pickup_lat: 19.0176,
    pickup_lng: 72.8174,
    customer: {
      name: booking.customerName,
      masked_phone: '98******10',
      rating: booking.customerRating || 4.6,
      total_orders: booking.customerReviews || 0,
      is_verified: booking.isVerified ?? true,
    },
    order: {
      order_number: booking.id,
      estimated_value_min,
      estimated_value_max,
      scheduled_at: new Date().toISOString(),
      items,
    },
  };
};
