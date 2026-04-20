import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import {
  BookingActiveResponse,
  BookingRequest,
  CreditBalanceData,
  CreditTransaction,
  DutySession,
  LeadAcceptResponse,
  LeadDetailsResponse,
  VendorLocationPayload,
} from '../types';
import { AuthStorageService } from './authStorage';

const FRONTEND_KEY =
  (Constants.expoConfig?.extra as any)?.env?.EXPO_PUBLIC_FRONTEND_SECRET ||
  (Constants.expoConfig?.extra as any)?.env?.EXPO_PUBLIC_VENDOR_FRONTEND_SECRET ||
  (Constants.manifest as any)?.extra?.env?.EXPO_PUBLIC_FRONTEND_SECRET ||
  (Constants.manifest as any)?.extra?.env?.EXPO_PUBLIC_VENDOR_FRONTEND_SECRET ||
  process.env.EXPO_PUBLIC_FRONTEND_SECRET ||
  process.env.EXPO_PUBLIC_VENDOR_FRONTEND_SECRET ||
  'ScrapizVendor#0nn$(tab!z';

export const API_BASE_URL =
  (Constants.expoConfig?.extra as any)?.env?.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as any)?.env?.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.manifest as any)?.extra?.env?.EXPO_PUBLIC_API_URL ||
  (Constants.manifest as any)?.extra?.env?.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://api.scrapiz.in/api';

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiErrorEnvelope = {
  success?: false;
  error?: string;
  message?: string;
  details?: unknown;
};

export interface VendorVehicle {
  id?: number;
  vehicle_type: string;
  vehicle_number: string;
  vehicle_name?: string | null;
  vehicle_model_name?: string | null;
  weighing_scale_type?: string;
}

export interface VendorProfile {
  id: number;
  full_name: string;
  age?: number | null;
  service_city: string;
  service_area: string;
  profile_image?: string | null;
  status: string;
  is_online: boolean;
  can_go_online?: boolean;
  allow_app_access_while_pending?: boolean;
  rejection_reason?: string | null;
  vehicle?: VendorVehicle | null;
  biometric?: {
    is_verified?: boolean;
    vector_id?: string | null;
    source_document_type?: string | null;
    source_image_url?: string | null;
  } | null;
}

export interface VendorOnboardingStatus {
  profile_created: boolean;
  vehicle_added: boolean;
  document_uploaded: boolean;
  aadhaar_uploaded: boolean;
  secondary_document_uploaded: boolean;
  face_uploaded: boolean;
  verification_submitted: boolean;
  approved: boolean;
  completion_percent: number;
}

export interface VendorFaceStatus {
  status: 'pending' | 'processing' | 'verified' | 'rejected';
  message?: string;
  rejection_reason?: string;
}

export interface VendorDocumentPayload {
  document_type: string;
  document_number: string;
  document_front_url: string;
  document_back_url?: string;
}

export interface VendorLeadSummary {
  id: string;
  order_number: string;
  estimated_value?: string | number;
  scheduled_at?: string | null;
  items: Array<{ product: string; quantity: string; unit: string }>;
  address?: {
    area?: string;
    city?: string;
    pincode?: string | number;
  } | null;
  expires_in_s?: number;
  distance_km?: number | null;
}

export interface DutySessionsResponse {
  sessions: DutySession[];
  total_sessions: number;
}

export interface WalletResponse {
  balance: number;
  currency?: string;
  last_updated?: string | null;
  ledger_enabled?: boolean;
}

export interface WalletOrderResponse {
  order_id: string;
  amount: string;
  key: string;
}

export interface WalletVerifyResponse {
  message?: string;
  wallet_balance: string;
}

export interface WalletLedgerTransaction {
  id: number;
  type: 'credit' | 'subscription_payment' | 'platform_charge' | 'vendor_payout' | 'refund';
  title: string;
  direction: 'credit' | 'debit';
  amount: string;
  signed_amount: string;
  status: 'pending' | 'success' | 'failed';
  created_at: string;
  reference_id?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WalletTransactionsResponse {
  wallet_balance: string;
  currency: 'INR';
  summary: {
    credits: string;
    debits: string;
  };
  count: number;
  transactions: WalletLedgerTransaction[];
}

export interface WalletCustomerPayoutPayload {
  amount: number;
  payment_channel: 'upi' | 'bank_transfer';
  customer_id?: number;
  booking_id?: string;
  customer_upi_id?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  note?: string;
}

export interface WalletCustomerPayoutResponse {
  transaction: WalletLedgerTransaction;
  wallet_balance: string;
  customer_referred_balance: string;
}

export interface PlanResponse {
  current_plan?: {
    code?: string | null;
    name?: string | null;
    status?: 'inactive' | 'active' | 'expired' | 'cancelled';
    started_at?: string | null;
    expires_at?: string | null;
    days_remaining?: number | null;
  };
  trial?: {
    is_active: boolean;
    started_at?: string | null;
    ends_at?: string | null;
    duration_days?: number;
    days_remaining?: number | null;
  };
  entitlement?: {
    has_active_trial: boolean;
    has_active_subscription: boolean;
    is_entitled_for_leads: boolean;
  };
  available_plans?: Array<{
    code: string;
    name: string;
    duration_days: number;
    amount: string;
  }>;
}

export interface SubscriptionOrderResponse {
  order_id: string;
  key: string;
  plan: {
    code: string;
    name: string;
    duration_days: number;
  };
  amount: {
    base: string;
    tax_percent: string;
    tax: string;
    total: string;
  };
}

export interface SubscriptionVerifyResponse {
  message?: string;
  subscription_status?: string;
  subscription_plan_code?: string | null;
  subscription_plan_name?: string | null;
  subscription_expires_at?: string | null;
  is_entitled_for_leads?: boolean;
}

export interface MaterialsResponse {
  count?: number;
  materials: {
    id?: string | number;
    name?: string;
    min_rate?: number;
    max_rate?: number;
    unit?: string;
    category?: string | null;
    image_url?: string | null;
  }[];
}

export interface VendorQuotedMaterialProduct {
  id: string | number;
  name?: string;
  min_rate?: number;
  max_rate?: number;
  unit?: string;
  description?: string | null;
  image_url?: string | null;
  vendor_quote?: string | null;
}

export interface VendorMaterialCategory {
  id: string | number;
  name?: string;
  image_url?: string | null;
  products: VendorQuotedMaterialProduct[];
}

export interface VendorMaterialCategoryResponse {
  count?: number;
  categories: VendorMaterialCategory[];
}

export interface VendorMaterialQuoteSaveResponse {
  count?: number;
  quotes: Array<{
    id: string | number;
    product: string | number;
    product_name?: string;
    unit?: string;
    image_url?: string | null;
    quoted_price: string;
  }>;
}

export interface InventoryCategoryProduct {
  id: string | number;
  name?: string;
  min_rate?: number;
  max_rate?: number;
  unit?: string;
  description?: string | null;
  image_url?: string | null;
  category?: string | number | null;
}

export interface InventoryCategory {
  id: string | number;
  name?: string;
  image_url?: string | null;
  products: InventoryCategoryProduct[];
}

export interface SendOtpResponse {
  message?: string;
}

export interface VerifyOtpResponse {
  jwt?: string;
  message?: string;
  profile_required?: boolean;
  phone_number?: string;
  user?: {
    id?: string | number;
    email?: string;
    name?: string;
  };
}

export interface PhoneCompleteProfileResponse extends VerifyOtpResponse {
  requires_link_confirmation?: boolean;
  existing_email?: string;
  auth_provider?: string;
}

export interface PaymentVerificationResponse {
  verified: boolean;
  transactionId: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  timestamp: Date;
}

export interface ApiResponse {
  success?: boolean;
  message?: string;
  created?: boolean;
  deleted?: boolean;
}

export interface CreditSyncRequest {
  vendorId: string;
  balance: CreditBalanceData;
  transactions: CreditTransaction[];
  pendingOperations: string[];
}

export interface CreditSyncResponse {
  success: boolean;
  serverBalance: CreditBalanceData;
  serverTransactions: CreditTransaction[];
  conflicts?: {
    balanceConflict?: boolean;
    transactionConflicts?: string[];
  };
}

export class ApiHttpError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.data = data;
  }
}

const getErrorMessage = (payload: unknown, status: number) => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as ApiErrorEnvelope & { detail?: string };
    return candidate.error || candidate.message || candidate.detail || `HTTP error! status: ${status}`;
  }

  return `HTTP error! status: ${status}`;
};

const unwrapData = <T>(payload: ApiSuccessEnvelope<T> | T): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in (payload as Record<string, unknown>) &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as ApiSuccessEnvelope<T>).data;
  }

  return payload as T;
};

const mapLeadToBookingRequest = (lead: VendorLeadSummary): BookingRequest => {
  const firstItem = lead.items?.[0];
  const itemCount = lead.items?.length || 0;
  const estimatedAmount = Number(lead.estimated_value || 0);
  const distance = Number(lead.distance_km || 0);
  const addressParts = [
    lead.address?.area,
    lead.address?.city,
    lead.address?.pincode ? String(lead.address?.pincode) : undefined,
  ].filter(Boolean);

  const secondsRemaining = Number(lead.expires_in_s || 0);
  const priority: BookingRequest['priority'] =
    secondsRemaining > 0 && secondsRemaining < 600 ? 'high' : distance > 5 ? 'medium' : 'low';

  return {
    id: lead.id,
    scrapType: itemCount > 1 ? `${firstItem?.product || 'Mixed Scrap'} +${itemCount - 1} more` : firstItem?.product || 'Mixed Scrap',
    distance: `${distance.toFixed(1)} km`,
    customerName: 'Pickup Request',
    customerPhone: '',
    address: addressParts.join(', ') || 'Address shared after acceptance',
    paymentMode: 'Cash',
    estimatedAmount,
    createdAt: lead.scheduled_at ? new Date(lead.scheduled_at) : new Date(),
    priority,
    estimatedTime: distance > 0 ? `${Math.max(10, Math.round((distance / 25) * 60))} mins` : '15 mins',
  };
};

const trimBearerPrefix = (token: string) => token.replace(/^Bearer\s+/i, '');

export class ApiService {
  private static baseURL = API_BASE_URL;

  private static buildRequestBody(data?: unknown): BodyInit | undefined {
    if (data === undefined) {
      return undefined;
    }

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return data;
    }

    if (typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams) {
      return data;
    }

    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      return data;
    }

    if (typeof data === 'string') {
      return data;
    }

    return JSON.stringify(data);
  }

  static getBaseUrl() {
    return this.baseURL;
  }

  static getVendorLocationSocketUrl(token: string) {
    const realtimeBase = this.baseURL.replace(/\/api\/?$/, '');

    if (realtimeBase.startsWith('https://')) {
      return `${realtimeBase.replace(/^https:\/\//, 'wss://')}/ws/vendor/location/?token=${encodeURIComponent(
        trimBearerPrefix(token),
      )}`;
    }

    if (realtimeBase.startsWith('http://')) {
      return `${realtimeBase.replace(/^http:\/\//, 'ws://')}/ws/vendor/location/?token=${encodeURIComponent(
        trimBearerPrefix(token),
      )}`;
    }

    return `ws://${realtimeBase}/ws/vendor/location/?token=${encodeURIComponent(trimBearerPrefix(token))}`;
  }

  static getVendorLeadSocketUrl(token: string) {
    const realtimeBase = this.baseURL.replace(/\/api\/?$/, '');

    if (realtimeBase.startsWith('https://')) {
      return `${realtimeBase.replace(/^https:\/\//, 'wss://')}/ws/vendor/leads/?token=${encodeURIComponent(
        trimBearerPrefix(token),
      )}`;
    }

    if (realtimeBase.startsWith('http://')) {
      return `${realtimeBase.replace(/^http:\/\//, 'ws://')}/ws/vendor/leads/?token=${encodeURIComponent(
        trimBearerPrefix(token),
      )}`;
    }

    return `ws://${realtimeBase}/ws/vendor/leads/?token=${encodeURIComponent(trimBearerPrefix(token))}`;
  }

  static mapVendorLeadSummaryToBookingRequest(lead: VendorLeadSummary) {
    return mapLeadToBookingRequest(lead);
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = true,
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = requireAuth ? await AuthStorageService.getToken() : null;

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      'x-auth-app': FRONTEND_KEY,
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!isFormData) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    } else if (headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    if (token) {
      headers.Authorization = /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      throw new ApiHttpError(response.status, getErrorMessage(payload, response.status), payload);
    }

    return payload as T;
  }

  static get<T>(endpoint: string, requireAuth = true) {
    return this.request<T>(endpoint, { method: 'GET' }, requireAuth);
  }

  static post<T>(endpoint: string, data?: unknown, requireAuth = true) {
    const body = this.buildRequestBody(data);
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        ...(body !== undefined ? { body } : {}),
      },
      requireAuth,
    );
  }

  static patch<T>(endpoint: string, data?: unknown, requireAuth = true) {
    const body = this.buildRequestBody(data);
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        ...(body !== undefined ? { body } : {}),
      },
      requireAuth,
    );
  }

  static put<T>(endpoint: string, data?: unknown, requireAuth = true) {
    const body = this.buildRequestBody(data);
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        ...(body !== undefined ? { body } : {}),
      },
      requireAuth,
    );
  }

  static async sendPhoneOtp(phoneNumber: string): Promise<SendOtpResponse> {
    return this.post<SendOtpResponse>(
      '/authentication/phone/send-otp/',
      { phone_number: phoneNumber },
      false,
    );
  }

  static async verifyPhoneOtp(phoneNumber: string, otp: string): Promise<VerifyOtpResponse> {
    return this.post<VerifyOtpResponse>(
      '/authentication/phone/verify/',
      { phone_number: phoneNumber, otp },
      false,
    );
  }

  static async completePhoneProfile(payload: {
    name: string;
    email: string;
    phone_number: string;
  }): Promise<PhoneCompleteProfileResponse> {
    return this.post<PhoneCompleteProfileResponse>(
      '/authentication/phone/complete-profile/',
      payload,
      false,
    );
  }

  static async confirmPhoneLink(payload: {
    confirmed: boolean;
    email: string;
    phone_number: string;
  }): Promise<VerifyOtpResponse> {
    return this.post<VerifyOtpResponse>(
      '/authentication/phone/confirm-link/',
      payload,
      false,
    );
  }

  static async getVendorProfile(): Promise<VendorProfile> {
    const response = await this.get<ApiSuccessEnvelope<VendorProfile>>('/vendor/profile/');
    return unwrapData(response);
  }

  static async getVendorOnboardingStatus(): Promise<VendorOnboardingStatus> {
    const response = await this.get<ApiSuccessEnvelope<VendorOnboardingStatus>>('/vendor/onboarding-status/');
    return unwrapData(response);
  }

  static async getVendorFaceStatus(): Promise<VendorFaceStatus> {
    const response = await this.get<ApiSuccessEnvelope<VendorFaceStatus>>('/vendor/face-status/');
    return unwrapData(response);
  }

  static async createVendorProfile(payload: {
    full_name: string;
    age?: number | null;
    service_city: string;
    service_area: string;
    vehicle_type: string;
    vehicle_number?: string;
    vehicle_name?: string;
    vehicle_model_name?: string;
    weighing_scale_type?: string;
  }): Promise<VendorProfile> {
    const response = await this.post<ApiSuccessEnvelope<VendorProfile>>('/vendor/create-profile/', payload);
    return unwrapData(response);
  }

  static async uploadVendorDocument(payload: VendorDocumentPayload) {
    const response = await this.post<ApiSuccessEnvelope<any>>('/vendor/upload-document/', payload);
    return unwrapData(response);
  }

  static async uploadVendorDocumentFile(payload: {
    document_type: string;
    document_number: string;
    document_front: { uri: string; name: string; type: string };
    document_back?: { uri: string; name: string; type: string } | null;
  }) {
    const formData = new FormData();
    formData.append('document_type', payload.document_type);
    formData.append('document_number', payload.document_number);
    formData.append('document_front', payload.document_front as any);
    if (payload.document_back) {
      formData.append('document_back', payload.document_back as any);
    }

    const response = await this.post<ApiSuccessEnvelope<any>>('/vendor/upload-document/', formData);
    return unwrapData(response);
  }

  static async uploadVendorFaceImageFile(payload: {
    face_image: { uri: string; name: string; type: string };
  }) {
    const formData = new FormData();
    formData.append('face_image', payload.face_image as any);

    const response = await this.post<ApiSuccessEnvelope<any>>('/vendor/upload-face/', formData);
    return unwrapData(response);
  }

  static async submitVendorVerification() {
    const response = await this.post<ApiSuccessEnvelope<{ status: string }>>('/vendor/submit-verification/');
    return unwrapData(response);
  }

  static async updateVendorAvailability(isOnline: boolean): Promise<{ is_online: boolean }> {
    const response = await this.patch<ApiSuccessEnvelope<{ is_online: boolean }>>('/vendor/availability/', {
      is_online: isOnline,
    });
    return unwrapData(response);
  }

  static updateVendorLocation(payload: VendorLocationPayload): Promise<{ success?: boolean; message?: string }> {
    return this.patch<{ success?: boolean; message?: string }>('/vendor/location/', payload);
  }

  static async getVendorLeads(): Promise<VendorLeadSummary[]> {
    const response = await this.get<unknown>('/lead/vendor/leads/');

    if (Array.isArray(response)) {
      return response as VendorLeadSummary[];
    }

    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;

      if (Array.isArray(payload.leads)) {
        return payload.leads as VendorLeadSummary[];
      }

      if (Array.isArray(payload.results)) {
        return payload.results as VendorLeadSummary[];
      }

      if (Array.isArray(payload.data)) {
        return payload.data as VendorLeadSummary[];
      }

      if (payload.data && typeof payload.data === 'object') {
        const nested = payload.data as Record<string, unknown>;

        if (Array.isArray(nested.leads)) {
          return nested.leads as VendorLeadSummary[];
        }

        if (Array.isArray(nested.results)) {
          return nested.results as VendorLeadSummary[];
        }
      }

      if (__DEV__) {
        console.warn('[Leads] Unexpected response shape from /lead/vendor/leads/', {
          topLevelKeys: Object.keys(payload),
          hasDataObject: Boolean(payload.data && typeof payload.data === 'object'),
        });
      }
    }

    return [];
  }

  static async getVendorLeadBookings(): Promise<BookingRequest[]> {
    const leads = await this.getVendorLeads();
    return leads.map(mapLeadToBookingRequest);
  }

  static getLeadDetails(leadId: string): Promise<LeadDetailsResponse> {
    return this.get<ApiSuccessEnvelope<LeadDetailsResponse>>(`/lead/vendor/leads/${leadId}/`).then(unwrapData);
  }

  static acceptLead(leadId: string): Promise<LeadAcceptResponse> {
    return this.post<LeadAcceptResponse>(`/lead/vendor/leads/${leadId}/accept/`);
  }

  static rejectLead(leadId: string): Promise<{ message?: string; success?: boolean }> {
    return this.post<{ message?: string; success?: boolean }>(`/lead/vendor/leads/${leadId}/reject/`);
  }

  static async getCurrentBooking(): Promise<any> {
    return this.get<{ booking?: any; message?: string }>('/booking/current/');
  }

  static startBookingJourney(bookingId: string): Promise<{ success?: boolean; message?: string }> {
    return this.post<{ success?: boolean; message?: string }>(`/booking/${bookingId}/start/`);
  }

  static getBookingActive(bookingId: string): Promise<BookingActiveResponse> {
    return this.get<ApiSuccessEnvelope<BookingActiveResponse>>(`/booking/${bookingId}/active/`).then(unwrapData);
  }

  static markBookingArrived(bookingId: string): Promise<{ success?: boolean; message?: string }> {
    return this.post<{ success?: boolean; message?: string }>(`/booking/${bookingId}/arrived/`);
  }

  static startBookingCollection(bookingId: string): Promise<{ success?: boolean; message?: string }> {
    return this.post<{ success?: boolean; message?: string }>(`/booking/${bookingId}/collect/`);
  }

  static initiateArrivalVerification(
    bookingId: string,
    payload: { selfie_url: string; vendor_latitude: number; vendor_longitude: number },
  ): Promise<{ success?: boolean; message?: string; data?: any }> {
    return this.post<{ success?: boolean; message?: string; data?: any }>(
      `/booking/${bookingId}/arrival/initiate/`,
      payload,
    );
  }

  static verifyArrivalOtp(
    bookingId: string,
    otp: string,
  ): Promise<{ success?: boolean; message?: string; data?: any }> {
    return this.post<{ success?: boolean; message?: string; data?: any }>(
      `/booking/${bookingId}/arrival/verify-otp/`,
      { otp },
    );
  }

  static markBookingReady(bookingId: string): Promise<{ success?: boolean; message?: string }> {
    return this.post<{ success?: boolean; message?: string }>(`/booking/${bookingId}/ready/`);
  }

  static submitBookingQuote(
    bookingId: string,
    payload: {
      items: Array<{
        product_id: string | number;
        is_selected: boolean;
        quoted_rate_per_kg: number;
        actual_weight_kg: number;
      }>;
      remarks?: string;
    },
  ): Promise<{ success?: boolean; message?: string; data?: any }> {
    return this.post<{ success?: boolean; message?: string; data?: any }>(
      `/booking/${bookingId}/quote/submit/`,
      payload,
    );
  }

  static confirmBookingQuotePayment(
    bookingId: string,
    upiReference: string,
  ): Promise<{ success?: boolean; message?: string; data?: any }> {
    return this.post<{ success?: boolean; message?: string; data?: any }>(
      `/booking/${bookingId}/quote/confirm-payment/`,
      { upi_reference: upiReference },
    );
  }

  static finalizeBooking(
    bookingId: string,
    items: { product_id: string | number; actual_weight_kg: number }[],
  ): Promise<{ total_payout?: number; booking_id?: string; message?: string }> {
    return this.post<{ total_payout?: number; booking_id?: string; message?: string }>(
      `/booking/${bookingId}/finalize/`,
      { items },
    );
  }

  static async getDutySessions(period: 'this_week' | 'last_month' | 'all_time'): Promise<DutySessionsResponse> {
    const backendPeriod = period === 'this_week' ? 'last_week' : period === 'all_time' ? 'all' : 'last_month';
    const response = await this.get<ApiSuccessEnvelope<DutySessionsResponse>>(`/vendor/duty-sessions/?period=${backendPeriod}`);
    return unwrapData(response);
  }

  static async getVendorWallet(): Promise<WalletResponse> {
    const response = await this.get<ApiSuccessEnvelope<WalletResponse>>('/vendor/wallet/');
    const data = unwrapData(response);
    return {
      ...data,
      balance: Number(data.balance || 0),
    };
  }

  static async createWalletOrder(amount: number): Promise<WalletOrderResponse> {
    const response = await this.post<ApiSuccessEnvelope<WalletOrderResponse>>('/vendor/wallet/create-order/', {
      amount,
    });
    return unwrapData(response);
  }

  static async verifyWalletPayment(payload: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): Promise<WalletVerifyResponse> {
    const response = await this.post<ApiSuccessEnvelope<WalletVerifyResponse>>(
      '/vendor/wallet/verify-payment/',
      payload,
    );
    return unwrapData(response);
  }

  // ── Razorpay Wallet Topup ─────────────────────────────────────────────────
  static async createWalletRazorpayOrder(amountInr: number): Promise<{
    razorpay_order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    prefill: { name: string };
  }> {
    const response = await this.post<ApiSuccessEnvelope<any>>('/vendor/wallet/razorpay-order/', {
      amount: amountInr,
    });
    const data = unwrapData(response);
    return {
      ...data,
      razorpay_order_id: data.razorpay_order_id || data.order_id,
      key_id: data.key_id || data.key,
      amount: Number(data.amount || 0),
      currency: data.currency || 'INR',
      prefill: data.prefill || { name: '' },
    };
  }

  static async verifyWalletRazorpayPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ new_balance: number; credited: number }> {
    const response = await this.post<ApiSuccessEnvelope<any>>(
      '/vendor/wallet/razorpay-verify/',
      payload,
    );
    const data = unwrapData(response);
    return {
      new_balance: Number(data.new_balance ?? data.wallet_balance ?? 0),
      credited: Number(data.credited ?? 0),
    };
  }

  static async getWalletTransactions(params?: {
    limit?: number;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<WalletTransactionsResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await this.get<ApiSuccessEnvelope<WalletTransactionsResponse>>(
      `/vendor/wallet/transactions/${suffix}`,
    );
    return unwrapData(response);
  }

  static async createWalletCustomerPayout(
    payload: WalletCustomerPayoutPayload,
  ): Promise<WalletCustomerPayoutResponse> {
    const response = await this.post<ApiSuccessEnvelope<WalletCustomerPayoutResponse>>(
      '/vendor/wallet/customer-payout/',
      payload,
    );
    return unwrapData(response);
  }

  static async downloadWalletStatementPdf(params?: { from?: string; to?: string }): Promise<string> {
    const query = new URLSearchParams();
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);
    const suffix = query.toString() ? `?${query.toString()}` : '';

    const token = await AuthStorageService.getToken();
    const headers: Record<string, string> = {
      'x-auth-app': FRONTEND_KEY,
    };
    if (token) {
      headers.Authorization = /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`;
    }

    if (!FileSystem.documentDirectory) {
      throw new Error('Device storage is not available for statement download.');
    }

    const fileUri = `${FileSystem.documentDirectory}wallet_statement_${Date.now()}.pdf`;
    const result = await FileSystem.downloadAsync(
      `${this.baseURL}/vendor/wallet/statement/pdf/${suffix}`,
      fileUri,
      { headers },
    );

    if ((result as any).status && (result as any).status >= 400) {
      throw new Error('Failed to download wallet statement.');
    }

    return result.uri;
  }

  static async getVendorPlan(): Promise<PlanResponse> {
    const response = await this.get<ApiSuccessEnvelope<PlanResponse>>('/vendor/plan/');
    return unwrapData(response);
  }

  static async createSubscriptionOrder(planCode: string): Promise<SubscriptionOrderResponse> {
    const response = await this.post<ApiSuccessEnvelope<SubscriptionOrderResponse>>('/vendor/subscription/create-order/', {
      plan_code: planCode,
    });
    return unwrapData(response);
  }

  static async verifySubscriptionPayment(payload: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }): Promise<SubscriptionVerifyResponse> {
    const response = await this.post<ApiSuccessEnvelope<SubscriptionVerifyResponse>>(
      '/vendor/subscription/verify-payment/',
      payload,
    );
    return unwrapData(response);
  }

  static async getVendorMaterials(): Promise<MaterialsResponse | { id?: string | number; name?: string }[]> {
    const response = await this.get<ApiSuccessEnvelope<MaterialsResponse>>('/vendor/materials/');
    return unwrapData(response);
  }

  static async getVendorMaterialCategories(): Promise<VendorMaterialCategoryResponse> {
    const response = await this.get<ApiSuccessEnvelope<VendorMaterialCategoryResponse>>('/vendor/material-categories/');
    return unwrapData(response);
  }

  static async getInventoryCategories(): Promise<InventoryCategory[]> {
    const response = await this.get<any>('/inventory/categories/', false);

    const rawCategories = Array.isArray(response)
      ? response
      : Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response?.data)
          ? response.data
          : [];

    return rawCategories.map((category: any) => ({
      id: category?.id,
      name: category?.name,
      image_url: category?.image_url,
      products: Array.isArray(category?.products)
        ? category.products.map((product: any) => ({
            id: product?.id,
            name: product?.name,
            min_rate: Number(product?.min_rate || 0),
            max_rate: Number(product?.max_rate || 0),
            unit: product?.unit,
            description: product?.description,
            image_url: product?.image_url,
            category: product?.category,
          }))
        : [],
    }));
  }

  static async saveVendorMaterialQuotes(
    quotes: Array<{ product_id: string | number; quoted_price: number }>
  ): Promise<VendorMaterialQuoteSaveResponse> {
    const response = await this.post<ApiSuccessEnvelope<VendorMaterialQuoteSaveResponse>>(
      '/vendor/material-quotes/',
      { quotes },
    );
    return unwrapData(response);
  }

  static registerPushToken(token: string, deviceName?: string): Promise<ApiResponse> {
    return this.post<ApiResponse>('/user/register-push-token/', {
      token,
      device_name: deviceName || '',
    });
  }

  static unregisterPushToken(token: string): Promise<ApiResponse> {
    return this.post<ApiResponse>('/user/unregister-push-token/', { token });
  }

  // Credit System API Methods - keep mocked fallback behaviour.
  static async syncCreditBalance(vendorId: string): Promise<CreditBalanceData> {
    return Promise.resolve({
      vendorId,
      currentBalance: 50,
      lastUpdated: new Date(),
      pendingTransactions: [],
      syncStatus: 'synced',
    });
  }

  static async syncTransactionHistory(vendorId: string, lastSyncTimestamp?: Date): Promise<CreditTransaction[]> {
    console.log('Mock API: syncTransactionHistory for vendor', vendorId, 'since', lastSyncTimestamp);
    return Promise.resolve([]);
  }

  static async syncCreditData(syncRequest: CreditSyncRequest): Promise<CreditSyncResponse> {
    console.log('Mock API: syncCreditData', syncRequest);
    return Promise.resolve({
      success: true,
      serverBalance: syncRequest.balance,
      serverTransactions: syncRequest.transactions,
    });
  }

  static async verifyPayment(transactionId: string): Promise<PaymentVerificationResponse> {
    console.log('Mock API: verifyPayment', transactionId);
    return Promise.resolve({
      verified: true,
      transactionId,
      amount: 100,
      status: 'success',
      timestamp: new Date(),
    });
  }

  static async submitCreditTransaction(
    vendorId: string,
    transaction: CreditTransaction,
  ): Promise<{ success: boolean; serverId?: string }> {
    console.log('Mock API: submitCreditTransaction for vendor', vendorId, transaction);
    return Promise.resolve({
      success: true,
      serverId: `server_${transaction.id}`,
    });
  }

  static async updateCreditBalance(vendorId: string, balance: CreditBalanceData): Promise<{ success: boolean }> {
    console.log('Mock API: updateCreditBalance for vendor', vendorId, balance);
    return Promise.resolve({ success: true });
  }

  static async resolveSyncConflicts(
    vendorId: string,
    resolution: {
      useServerBalance?: boolean;
      useServerTransactions?: boolean;
      mergeStrategy?: 'server-wins' | 'client-wins' | 'merge';
    },
  ): Promise<CreditSyncResponse> {
    console.log('Mock API: resolveSyncConflicts for vendor', vendorId, resolution);
    return Promise.resolve({
      success: true,
      serverBalance: {
        vendorId,
        currentBalance: 50,
        lastUpdated: new Date(),
        pendingTransactions: [],
        syncStatus: 'synced',
      },
      serverTransactions: [],
    });
  }
}
