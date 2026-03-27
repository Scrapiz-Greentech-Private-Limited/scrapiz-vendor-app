export interface User {
  id: string;
  name: string;
  phone: string;
  isOnline: boolean;
  image?: string;
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
}

export interface ActiveJob extends BookingRequest {
  status: 'on-the-way' | 'arrived' | 'in-progress' | 'completed';
  customerLocation: {
    lat: number;
    lng: number;
  };
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