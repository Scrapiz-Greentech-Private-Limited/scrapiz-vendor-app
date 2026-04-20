export interface User {
  id: string;
  name: string;
  phone: string;
  isOnline: boolean;
  email?: string;
  image?: string;
  age?: number | null;
  serviceCity?: string;
  serviceArea?: string;
  vendorStatus?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  hasVendorProfile?: boolean;
  canGoOnline?: boolean;
  onboardingComplete?: boolean;
  allowPendingAccessWhilePending?: boolean;
  rejectionReason?: string | null;
}

export interface BookingRequest {
  id: string;
  scrapType: string;
  distance: string;
  customerName: string;
  customerPhone: string;
  address: string;
  paymentMode: string;
  estimatedAmount: number;
  createdAt: Date;
  priority?: 'high' | 'medium' | 'low';
  estimatedTime?: string;
  urgencyTimer?: string;
  customerRating?: number;
  customerReviews?: number;
  isVerified?: boolean;
  estimatedWeight?: string;
  baseRate?: number;
  distanceBonus?: number;
  isFallback?: boolean;
}

export interface ActiveJob extends BookingRequest {
  status: 'on-the-way' | 'arrived' | 'in-progress' | 'completed';
  customerLocation: {
    lat: number;
    lng: number;
  };
  bookingId?: string;
  selectedItems?: LeadOrderItem[];
}

export interface LeadOrderItem {
  product_id: string | number;
  product_name: string;
  quantity: number;
  unit: string;
  min_rate: number;
  max_rate: number;
  image_url?: string;
  category?: string;
  is_fallback?: boolean;
}

export interface LeadDetailsResponse {
  lead_id: string;
  status: string;
  expires_at?: string;
  seconds_remaining: number;
  distance_km: number;
  estimated_minutes: number;
  is_urgent: boolean;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  customer: {
    name: string;
    masked_phone: string;
    rating: number;
    total_orders: number;
    is_verified: boolean;
  };
  order: {
    order_number: string;
    estimated_value_min: number;
    estimated_value_max: number;
    scheduled_at?: string;
    items: LeadOrderItem[];
  };
}

export interface LeadAcceptResponse {
  booking_id: string;
}

export interface BookingActiveOrderItem {
  product_id: string | number;
  product_name: string;
  quantity: number;
  unit: string;
  rate_per_unit: number;
}

export interface BookingActiveResponse {
  booking_id: string;
  status: string;
  step: number | 'en_route' | 'arrived' | 'in_progress' | 'ready';
  total_steps: number;
  customer: {
    name: string;
    phone: string;
    phone_masked?: boolean;
    rating: number;
  };
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  material_summary: string;
  distance_km: number;
  order_items: BookingActiveOrderItem[];
  started_at?: string;
  arrived_at?: string;
  contact_unlocked?: boolean;
  quote?: {
    status: string;
    payment_method?: 'cash' | 'upi' | null;
    total_amount: number;
    customer_upi_id?: string;
  };
}

export interface VendorLocationPayload {
  latitude: number;
  longitude: number;
}

export interface VendorCoordinates extends VendorLocationPayload {
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: number;
}

export interface SelectedPickupItem extends LeadOrderItem {
  rate_per_unit?: number;
  actual_weight_kg?: number;
}

export interface DutySession {
  session_id: string;
  started_at: string;
  ended_at: string;
  duration_display: string;
  orders_completed: number;
  vehicle_number: string;
  vehicle_type: string;
  start_lat: number;
  start_lng: number;
  status: 'live' | 'offline' | string;
}

export interface ScrapItem {
  type: string;
  weight?: number;
  ratePerKg: number;
  color?: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  jobId: string;
  amount: number;
  date: Date;
  status: 'completed' | 'pending';
}

export interface EarningsData {
  totalEarnings: number;
  totalJobs: number;
  transactions: Transaction[];
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: 'auto' | 'truck' | 'van';
  capacity: number;
  isOnline: boolean;
  currentLoad: number;
}

export interface PickupUnit {
  id: string;
  name: string;
  type: string;
  address: string;
}

export interface FutureRequest extends BookingRequest {
  scheduledDate: Date;
  scheduledTime: string;
  isConfirmed: boolean;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  currentRate: number;
  unit: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  type: 'customer' | 'supervisor' | 'partner';
  lastContact: Date;
  avatarUrl?: string;
}

// Credit System Types

export interface CreditTransaction {
  id: string;
  type: 'deduction' | 'addition' | 'penalty';
  amount: number; // Credits
  description: string;
  timestamp: Date;
  bookingId?: string;
  customerName?: string;
  orderValue?: number;
  paymentAmount?: number; // Rupees
  paymentTransactionId?: string;
  status: 'completed' | 'pending' | 'failed';
  metadata?: {
    [key: string]: any;
  };
}

export interface CreditBalanceData {
  vendorId: string;
  currentBalance: number;
  lastUpdated: Date;
  pendingTransactions: string[];
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface CreditPackage {
  id: string;
  credits: number;
  price: number; // In rupees
  bonus?: number; // Bonus credits
  popular?: boolean;
  description: string;
}

export type TransactionFilter = 'all' | 'recharges' | 'expenses' | 'penalties';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  amount?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'upi' | 'wallet' | 'netbanking';
  isDefault?: boolean;
}

// Credit System Service Interfaces

export interface CreditService {
  getCurrentBalance(): Promise<number>;
  deductCredits(amount: number, bookingId: string, orderValue: number): Promise<boolean>;
  addCredits(amount: number, transactionId: string, paymentAmount: number): Promise<void>;
  getTransactionHistory(filter?: TransactionFilter): Promise<CreditTransaction[]>;
  syncWithServer(): Promise<void>;
  calculateRequiredCredits(orderValue: number): number;
}

export interface PaymentService {
  initiatePayment(amount: number, credits: number): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<boolean>;
  getPaymentMethods(): Promise<PaymentMethod[]>;
}
