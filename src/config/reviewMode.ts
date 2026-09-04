import Constants from 'expo-constants';

const REVIEW_MODE_RAW =
  (Constants.expoConfig?.extra as any)?.env?.EXPO_PUBLIC_VENDOR_REVIEW_MODE ??
  (Constants.manifest as any)?.extra?.env?.EXPO_PUBLIC_VENDOR_REVIEW_MODE ??
  process.env.EXPO_PUBLIC_VENDOR_REVIEW_MODE ??
  '';

const normalize = (value: unknown) => String(value || '').trim().toLowerCase();

export const isVendorReviewMode = () => normalize(REVIEW_MODE_RAW) === 'testing';

export type ReviewerSeedData = {
  phone: string;
  otp: string;
  name: string;
  email: string;
  age: string;
  gender: string;
  serviceCity: string;
  serviceArea: string;
  businessName: string;
  vehicleType: string;
  vehicleLabel: string;
  vehicleNumber: string;
  vehicleName: string;
  vehicleModelName: string;
  weighingScaleType: string;
  aadhaarNumber: string;
  secondaryType: 'pan' | 'dl' | 'passport';
  secondaryNumber: string;
  profileImage: string;
  walletBalance: number;
  subscriptionPlanCode: string;
};

const REVIEWER_SEED_DATA: ReviewerSeedData = {
  phone: '9876543210',
  otp: '123456',
  name: 'Rahul Patil',
  email: 'reviewer.vendor@scrapiz.test',
  age: '31',
  gender: 'Male',
  serviceCity: 'Mumbai',
  serviceArea: 'Worli, Mumbai, Maharashtra 400018',
  businessName: 'Worli Scrap Partner',
  vehicleType: 'thela',
  vehicleLabel: 'Thela',
  vehicleNumber: 'MH02AB4567',
  vehicleName: 'Green Route Cart',
  vehicleModelName: 'Partner Hauler',
  weighingScaleType: 'digital',
  aadhaarNumber: '400012341234',
  secondaryType: 'pan',
  secondaryNumber: 'ABCDE1234F',
  profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
  walletBalance: 1250,
  subscriptionPlanCode: 'monthly-basic',
};

export const getReviewerSeedData = (): ReviewerSeedData => REVIEWER_SEED_DATA;
