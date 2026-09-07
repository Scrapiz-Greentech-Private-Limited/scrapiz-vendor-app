import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BookingActiveResponse,
  LeadOrderItem,
  User,
} from '../types';
import type {
  AuthUserProfile,
  PlanResponse,
  SubscriptionVerifyResponse,
  VendorFaceStatus,
  VendorOnboardingStatus,
  VendorProfile,
  VendorProfileDocument,
  WalletLedgerTransaction,
} from './api';
import { getReviewerSeedData } from '../config/reviewMode';

type ReviewModeBookingState = {
  bookingId: string;
  leadId: string;
  status: string;
  step: number | 'en_route' | 'arrived' | 'in_progress' | 'ready';
  quoteStatus?: string | null;
  paymentMethod?: 'cash' | 'upi' | null;
  quoteTotalAmount?: number | null;
  customerUpiId?: string | null;
  upiReference?: string | null;
  selectedItems?: Array<LeadOrderItem & { rate_per_unit?: number; actual_weight_kg?: number }>;
};

type ReviewModeState = {
  profileCreated: boolean;
  phoneProfileCompleted: boolean;
  documentsUploaded: boolean;
  faceUploaded: boolean;
  verificationSubmitted: boolean;
  walletBalance: number;
  walletTransactions: WalletLedgerTransaction[];
  plan?: PlanResponse['current_plan'];
  planEntitlement?: PlanResponse['entitlement'];
  planTrial?: PlanResponse['trial'];
  planMessage?: string;
  vendorProfile?: VendorProfile | null;
  authUserProfile?: AuthUserProfile | null;
  activeBooking?: ReviewModeBookingState | null;
};

const STORAGE_KEY = '@scrapiz_vendor_review_mode_state';

const seed = getReviewerSeedData();

const nowIso = () => new Date().toISOString();

const buildInitialPlan = (): PlanResponse['trial'] => ({
  is_active: true,
  started_at: nowIso(),
  ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  duration_days: 14,
  days_remaining: 14,
});

const defaultState = (): ReviewModeState => ({
  profileCreated: false,
  phoneProfileCompleted: false,
  documentsUploaded: false,
  faceUploaded: false,
  verificationSubmitted: false,
  walletBalance: seed.walletBalance,
  walletTransactions: [],
  planTrial: buildInitialPlan(),
  planEntitlement: {
    has_active_trial: true,
    has_active_subscription: false,
    is_entitled_for_leads: true,
  },
  plan: {
    code: null,
    name: 'Review Trial',
    status: 'active',
    started_at: nowIso(),
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    days_remaining: 14,
  },
  planMessage: 'Reviewer trial is active.',
  vendorProfile: null,
  authUserProfile: null,
  activeBooking: null,
});

const cloneState = (state: ReviewModeState): ReviewModeState => ({
  ...state,
  walletTransactions: [...state.walletTransactions],
  plan: state.plan ? { ...state.plan } : undefined,
  planEntitlement: state.planEntitlement ? { ...state.planEntitlement } : undefined,
  planTrial: state.planTrial ? { ...state.planTrial } : undefined,
  vendorProfile: state.vendorProfile ? { ...state.vendorProfile } : state.vendorProfile,
  authUserProfile: state.authUserProfile
    ? {
        ...state.authUserProfile,
        addresses: [...(state.authUserProfile.addresses || [])],
      }
    : state.authUserProfile,
  activeBooking: state.activeBooking
    ? {
        ...state.activeBooking,
        selectedItems: state.activeBooking.selectedItems ? [...state.activeBooking.selectedItems] : undefined,
      }
    : state.activeBooking,
});

const ensureVehicleDocumentList = (
  documentsUploaded: boolean,
  secondaryType: 'pan' | 'dl' | 'passport',
): VendorProfileDocument[] => {
  if (!documentsUploaded) {
    return [];
  }

  return [
    {
      id: 1,
      document_type: 'aadhaar',
      document_number: seed.aadhaarNumber,
      document_front_url: seed.profileImage,
      document_back_url: seed.profileImage,
      status: 'verified',
      status_display: 'Verified',
      uploaded_at: nowIso(),
      verified_at: nowIso(),
    },
    {
      id: 2,
      document_type: secondaryType,
      document_number: seed.secondaryNumber,
      document_front_url: seed.profileImage,
      document_back_url: seed.profileImage,
      status: 'verified',
      status_display: 'Verified',
      uploaded_at: nowIso(),
      verified_at: nowIso(),
    },
  ];
};

const deriveVendorProfile = (state: ReviewModeState): VendorProfile | null => {
  if (!state.profileCreated) {
    return null;
  }

  const base = state.vendorProfile;
  const service_city = base?.service_city || seed.serviceCity;
  const service_area = base?.service_area || seed.serviceArea;
  const full_name = base?.full_name || seed.name;
  const age = base?.age ?? Number(seed.age);
  const profile_image = base?.profile_image || seed.profileImage;
  const status = state.verificationSubmitted ? 'approved' : 'pending_verification';

  return {
    id: base?.id || 9001,
    full_name,
    age,
    service_city,
    service_area,
    profile_image,
    effective_profile_image: profile_image,
    profile_image_missing: false,
    requires_profile_image_upload: false,
    missing_fields: [],
    status,
    is_online: base?.is_online ?? false,
    can_go_online: true,
    performance_rating: 4.8,
    allow_app_access_while_pending: true,
    rejection_reason: null,
    vehicle: {
      id: base?.vehicle?.id || 501,
      vehicle_type: base?.vehicle?.vehicle_type || seed.vehicleType,
      vehicle_number: base?.vehicle?.vehicle_number || seed.vehicleNumber,
      vehicle_type_display: base?.vehicle?.vehicle_type_display || seed.vehicleLabel,
      vehicle_name: base?.vehicle?.vehicle_name || seed.vehicleName,
      vehicle_model_name: base?.vehicle?.vehicle_model_name || seed.vehicleModelName,
      weighing_scale_type: base?.vehicle?.weighing_scale_type || seed.weighingScaleType,
      weighing_scale_type_display:
        base?.vehicle?.weighing_scale_type_display ||
        (seed.weighingScaleType === 'digital' ? 'Digital Machine' : 'Tarazu'),
    },
    documents: ensureVehicleDocumentList(state.documentsUploaded, seed.secondaryType),
    biometric: {
      is_verified: state.faceUploaded,
      vector_id: state.faceUploaded ? 'review-vector-1' : null,
      source_document_type: state.documentsUploaded ? 'aadhaar' : null,
      source_image_url: profile_image,
      status: state.faceUploaded ? 'verified' : 'pending',
      rejection_reason: null,
    },
  };
};

const deriveAuthUserProfile = (state: ReviewModeState): AuthUserProfile => ({
  id: state.authUserProfile?.id || 'review-user-1',
  name: state.authUserProfile?.name || seed.name,
  email: state.authUserProfile?.email || seed.email,
  is_email_verified: true,
  phone_number: state.authUserProfile?.phone_number || `+91${seed.phone}`,
  gender: state.authUserProfile?.gender || seed.gender,
  profile_image: state.authUserProfile?.profile_image || seed.profileImage,
  addresses: [
    {
      id: 1,
      name: 'Primary Service Area',
      phone_number: `+91${seed.phone}`,
      area: seed.serviceArea,
      city: seed.serviceCity,
      state: 'Maharashtra',
      country: 'India',
      pincode: '400018',
      is_default: true,
    },
  ],
});

const deriveFaceStatus = (state: ReviewModeState): VendorFaceStatus => ({
  status: state.faceUploaded ? 'verified' : 'pending',
  message: state.faceUploaded ? 'Review face scan verified locally.' : 'Review face scan pending.',
});

const deriveOnboardingStatus = (state: ReviewModeState): VendorOnboardingStatus => {
  const completionParts = [
    state.profileCreated,
    true,
    state.documentsUploaded,
    state.documentsUploaded,
    state.documentsUploaded,
    state.faceUploaded,
    state.verificationSubmitted,
    state.verificationSubmitted,
  ];
  const completionPercent = Math.round(
    (completionParts.filter(Boolean).length / completionParts.length) * 100,
  );

  return {
    profile_created: state.profileCreated,
    vehicle_added: state.profileCreated,
    document_uploaded: state.documentsUploaded,
    aadhaar_uploaded: state.documentsUploaded,
    secondary_document_uploaded: state.documentsUploaded,
    face_uploaded: state.faceUploaded,
    verification_submitted: state.verificationSubmitted,
    approved: state.verificationSubmitted,
    completion_percent: completionPercent,
  };
};

const makeWalletTransaction = (
  amount: number,
  title: string,
  direction: 'credit' | 'debit',
  type: WalletLedgerTransaction['type'],
): WalletLedgerTransaction => {
  const signedAmount = direction === 'credit' ? amount : -amount;
  const createdAt = nowIso();

  return {
    id: Date.now(),
    type,
    title,
    direction,
    amount: Math.abs(signedAmount).toFixed(2),
    signed_amount: signedAmount.toFixed(2),
    status: 'success',
    created_at: createdAt,
    reference_id: `review-${Date.now()}`,
    metadata: {
      review_mode: true,
    },
  };
};

export const ReviewModeStateService = {
  async getState(): Promise<ReviewModeState> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultState();
      }
      const parsed = JSON.parse(raw) as Partial<ReviewModeState>;
      return {
        ...defaultState(),
        ...parsed,
        walletTransactions: Array.isArray(parsed.walletTransactions) ? parsed.walletTransactions : [],
      };
    } catch (error) {
      console.warn('Failed to read review mode state, resetting to defaults.', error);
      return defaultState();
    }
  },

  async setState(nextState: ReviewModeState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  },

  async updateState(updater: (state: ReviewModeState) => ReviewModeState): Promise<ReviewModeState> {
    const current = await this.getState();
    const next = updater(cloneState(current));
    await this.setState(next);
    return next;
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  async getDerivedUser(): Promise<User> {
    const state = await this.getState();
    const profile = deriveVendorProfile(state);
    const authProfile = deriveAuthUserProfile(state);

    return {
      id: String(authProfile.id),
      name: profile?.full_name || authProfile.name || seed.name,
      phone: authProfile.phone_number || `+91${seed.phone}`,
      email: authProfile.email,
      isOnline: profile?.is_online ?? false,
      image: profile?.effective_profile_image || seed.profileImage,
      profileImage: profile?.profile_image || seed.profileImage,
      age: profile?.age ?? Number(seed.age),
      serviceCity: profile?.service_city || seed.serviceCity,
      serviceArea: profile?.service_area || seed.serviceArea,
      vendorStatus: profile?.status || 'pending_verification',
      vehicleNumber: profile?.vehicle?.vehicle_number || seed.vehicleNumber,
      vehicleType: profile?.vehicle?.vehicle_type || seed.vehicleType,
      hasVendorProfile: Boolean(profile),
      canGoOnline: true,
      performanceRating: 4.8,
      onboardingComplete: state.verificationSubmitted,
      allowPendingAccessWhilePending: true,
      rejectionReason: null,
      profileImageMissing: false,
      requiresProfileImageUpload: false,
    };
  },

  async getDerivedVendorProfile(): Promise<VendorProfile | null> {
    const state = await this.getState();
    return deriveVendorProfile(state);
  },

  async getDerivedAuthUserProfile(): Promise<AuthUserProfile> {
    const state = await this.getState();
    return deriveAuthUserProfile(state);
  },

  async getDerivedFaceStatus(): Promise<VendorFaceStatus> {
    const state = await this.getState();
    return deriveFaceStatus(state);
  },

  async getDerivedOnboardingStatus(): Promise<VendorOnboardingStatus> {
    const state = await this.getState();
    return deriveOnboardingStatus(state);
  },

  async markPhoneProfileCompleted(): Promise<void> {
    await this.updateState((state) => ({
      ...state,
      phoneProfileCompleted: true,
    }));
  },

  async saveVendorProfile(profile: VendorProfile): Promise<VendorProfile> {
    const next = await this.updateState((state) => ({
      ...state,
      profileCreated: true,
      vendorProfile: {
        ...profile,
        status: state.verificationSubmitted ? 'approved' : 'pending_verification',
        allow_app_access_while_pending: true,
      },
      authUserProfile: {
        ...(state.authUserProfile || deriveAuthUserProfile(state)),
        name: profile.full_name,
        email: state.authUserProfile?.email || seed.email,
        phone_number: state.authUserProfile?.phone_number || `+91${seed.phone}`,
        profile_image: profile.profile_image || seed.profileImage,
        is_email_verified: true,
        addresses: deriveAuthUserProfile(state).addresses,
      },
    }));

    return deriveVendorProfile(next) as VendorProfile;
  },

  async updateVendorProfile(
    payload: Partial<Pick<VendorProfile, 'full_name' | 'age' | 'service_city' | 'service_area' | 'profile_image'>>,
  ): Promise<VendorProfile> {
    const state = await this.updateState((current) => {
      const existing = deriveVendorProfile(current) || ({} as VendorProfile);
      return {
        ...current,
        profileCreated: true,
        vendorProfile: {
          ...existing,
          ...current.vendorProfile,
          full_name: payload.full_name ?? existing.full_name ?? seed.name,
          age: payload.age ?? existing.age ?? Number(seed.age),
          service_city: payload.service_city ?? existing.service_city ?? seed.serviceCity,
          service_area: payload.service_area ?? existing.service_area ?? seed.serviceArea,
          profile_image:
            payload.profile_image === ''
              ? seed.profileImage
              : payload.profile_image ?? existing.profile_image ?? seed.profileImage,
          effective_profile_image:
            payload.profile_image === ''
              ? seed.profileImage
              : payload.profile_image ?? existing.effective_profile_image ?? seed.profileImage,
        } as VendorProfile,
      };
    });

    return deriveVendorProfile(state) as VendorProfile;
  },

  async setFaceUploaded(): Promise<VendorFaceStatus> {
    const state = await this.updateState((current) => ({
      ...current,
      faceUploaded: true,
    }));
    return deriveFaceStatus(state);
  },

  async setDocumentsUploaded(): Promise<VendorOnboardingStatus> {
    const state = await this.updateState((current) => ({
      ...current,
      documentsUploaded: true,
    }));
    return deriveOnboardingStatus(state);
  },

  async submitVerification(): Promise<{ status: string }> {
    await this.updateState((current) => ({
      ...current,
      verificationSubmitted: true,
      planEntitlement: {
        has_active_trial: true,
        has_active_subscription: Boolean(current.plan?.code),
        is_entitled_for_leads: true,
      },
    }));
    return { status: 'approved' };
  },

  async setWalletBalance(balance: number): Promise<void> {
    await this.updateState((current) => ({
      ...current,
      walletBalance: balance,
    }));
  },

  async topupWallet(amount: number): Promise<{ new_balance: number; credited: number }> {
    const next = await this.updateState((current) => ({
      ...current,
      walletBalance: current.walletBalance + amount,
      walletTransactions: [
        makeWalletTransaction(amount, 'Reviewer wallet top-up', 'credit', 'credit'),
        ...current.walletTransactions,
      ],
    }));

    return {
      new_balance: next.walletBalance,
      credited: amount,
    };
  },

  async spendWallet(amount: number, title: string): Promise<number> {
    const next = await this.updateState((current) => ({
      ...current,
      walletBalance: Math.max(0, current.walletBalance - amount),
      walletTransactions: [
        makeWalletTransaction(amount, title, 'debit', 'subscription_payment'),
        ...current.walletTransactions,
      ],
    }));
    return next.walletBalance;
  },

  async getWalletTransactions(): Promise<WalletLedgerTransaction[]> {
    const state = await this.getState();
    return state.walletTransactions;
  },

  async setPlanFromPurchase(payload: {
    code: string;
    name: string;
    durationDays: number;
    amount: number;
    deductFromWallet?: boolean;
  }): Promise<SubscriptionVerifyResponse> {
    const expiresAt = new Date(Date.now() + payload.durationDays * 24 * 60 * 60 * 1000).toISOString();
    const remainingBalance = payload.deductFromWallet
      ? await this.spendWallet(payload.amount, `${payload.name} subscription`)
      : (await this.getState()).walletBalance;

    const next = await this.updateState((current) => ({
      ...current,
      plan: {
        code: payload.code,
        name: payload.name,
        status: 'active',
        started_at: nowIso(),
        expires_at: expiresAt,
        days_remaining: payload.durationDays,
      },
      planEntitlement: {
        has_active_trial: true,
        has_active_subscription: true,
        is_entitled_for_leads: true,
      },
      planMessage: `${payload.name} activated in review mode.`,
    }));

    return {
      message: next.planMessage,
      subscription_status: 'active',
      subscription_plan_code: payload.code,
      subscription_plan_name: payload.name,
      subscription_expires_at: expiresAt,
      is_entitled_for_leads: true,
      wallet_balance: remainingBalance.toFixed(2),
    };
  },

  async getPlanResponse(): Promise<PlanResponse> {
    const state = await this.getState();
    return {
      current_plan: state.plan,
      trial: state.planTrial,
      entitlement: state.planEntitlement,
      available_plans: [
        { code: 'monthly-basic', name: 'Monthly Basic', duration_days: 30, amount: '299' },
        { code: 'quarterly-pro', name: 'Quarterly Pro', duration_days: 90, amount: '799' },
      ],
    };
  },

  async activateBooking(payload: {
    leadId: string;
    bookingId: string;
    selectedItems: Array<LeadOrderItem & { rate_per_unit?: number; actual_weight_kg?: number }>;
  }): Promise<void> {
    await this.updateState((current) => ({
      ...current,
      activeBooking: {
        leadId: payload.leadId,
        bookingId: payload.bookingId,
        status: 'confirmed',
        step: 1,
        quoteStatus: null,
        paymentMethod: null,
        quoteTotalAmount: null,
        customerUpiId: null,
        upiReference: null,
        selectedItems: payload.selectedItems,
      },
    }));
  },

  async mutateActiveBooking(
    updater: (current: ReviewModeBookingState | null) => ReviewModeBookingState | null,
  ): Promise<ReviewModeBookingState | null> {
    const next = await this.updateState((state) => ({
      ...state,
      activeBooking: updater(state.activeBooking || null),
    }));
    return next.activeBooking || null;
  },

  async getActiveBooking(): Promise<ReviewModeBookingState | null> {
    const state = await this.getState();
    return state.activeBooking || null;
  },

  buildBookingActiveResponse(
    booking: ReviewModeBookingState,
    leadItems: Array<LeadOrderItem & { rate_per_unit?: number; actual_weight_kg?: number }>,
  ): BookingActiveResponse {
    return {
      booking_id: booking.bookingId,
      status: booking.status,
      step: booking.step,
      total_steps: 4,
      customer: {
        name: 'Priya Mehta',
        phone: '+919876543211',
        phone_masked: booking.status !== 'completed',
        rating: 4.8,
      },
      pickup_address: seed.serviceArea,
      pickup_lat: 19.0176,
      pickup_lng: 72.8174,
      material_summary: leadItems[0]?.product_name || 'Mixed Scrap',
      distance_km: 2.4,
      order_items: leadItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.actual_weight_kg || item.quantity,
        unit: item.unit,
        rate_per_unit: item.rate_per_unit || item.min_rate,
      })),
      started_at: nowIso(),
      arrived_at: booking.status === 'arrived' || booking.status === 'in_progress' || booking.status === 'completed' ? nowIso() : undefined,
      contact_unlocked: true,
      quote: booking.quoteStatus
        ? {
            status: booking.quoteStatus,
            payment_method: booking.paymentMethod || 'cash',
            total_amount: booking.quoteTotalAmount || 0,
            customer_upi_id: booking.customerUpiId || 'review@sbi',
          }
        : undefined,
      coordinate_observability: {
        pickup_coordinate_source: 'review_mode',
        pickup_coordinates_present: true,
        vendor_location_timestamp: nowIso(),
        vendor_location_recorded_at: nowIso(),
        vendor_location_accuracy_meters: 10,
        live_distance_meters: 250,
        distance_anomaly: {
          flagged: false,
          reason: null,
        },
      },
    };
  },
};
