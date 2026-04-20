import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';
import { ApiService, ApiHttpError, VerifyOtpResponse, VendorProfile } from '../src/services/api';
import { User } from '../src/types';
import { AuthStorageService } from '../src/services/authStorage';

interface AuthContextType {
  user: User | null;
  login: (session: VerifyOtpResponse & { phone_number?: string }) => Promise<User>;
  completePhoneProfile: (payload: {
    name: string;
    email: string;
    phone_number: string;
  }) => Promise<User>;
  completeVendorOnboarding: (payload: {
    full_name: string;
    age?: number | null;
    service_city: string;
    service_area: string;
    vehicle_type: string;
    vehicle_number: string;
    vehicle_name?: string;
    vehicle_model_name?: string;
    weighing_scale_type?: string;
  }) => Promise<User>;
  refreshVendorProfile: () => Promise<User | null>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isInitialLoading: boolean;
  setOnlineStatus: (nextStatus: boolean) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapVendorToUser = (
  baseUser: Pick<User, 'id' | 'name' | 'phone' | 'email'> & Partial<User>,
  vendorProfile?: VendorProfile | null,
): User => ({
  id: String(baseUser.id),
  name: vendorProfile?.full_name || baseUser.name || 'Vendor',
  phone: baseUser.phone || '',
  email: baseUser.email,
  isOnline: vendorProfile?.is_online ?? baseUser.isOnline ?? false,
  image: vendorProfile?.profile_image || baseUser.image,
  age: vendorProfile?.age ?? baseUser.age ?? null,
  serviceCity: vendorProfile?.service_city || baseUser.serviceCity,
  serviceArea: vendorProfile?.service_area || baseUser.serviceArea,
  vendorStatus: vendorProfile?.status || baseUser.vendorStatus,
  vehicleNumber: vendorProfile?.vehicle?.vehicle_number || baseUser.vehicleNumber,
  vehicleType: vendorProfile?.vehicle?.vehicle_type || baseUser.vehicleType,
  hasVendorProfile: Boolean(vendorProfile),
  canGoOnline: vendorProfile?.can_go_online ?? baseUser.canGoOnline ?? false,
  onboardingComplete: vendorProfile?.status === 'approved',
  allowPendingAccessWhilePending:
    vendorProfile?.allow_app_access_while_pending ??
    baseUser.allowPendingAccessWhilePending ??
    false,
  rejectionReason: vendorProfile?.rejection_reason ?? baseUser.rejectionReason ?? null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const posthog = usePostHog();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const persistUser = async (nextUser: User) => {
    setUser(nextUser);
    await AuthStorageService.setUser(nextUser);
  };

  const identifyUser = (currentUser: User) => {
    if (!posthog?.identify) {
      return;
    }

    const setPayload: Record<string, string> = {
      name: currentUser.name,
      phone: currentUser.phone,
    };

    if (currentUser.email) {
      setPayload.email = currentUser.email;
    }
    if (currentUser.vendorStatus) {
      setPayload.vendor_status = currentUser.vendorStatus;
    }
    if (currentUser.serviceCity) {
      setPayload.service_city = currentUser.serviceCity;
    }

    posthog.identify(currentUser.id, {
      $set: setPayload,
    });
  };

  const hydrateWithVendorProfile = async (baseUser: User): Promise<User> => {
    try {
      const vendorProfile = await ApiService.getVendorProfile();
      const merged = mapVendorToUser(baseUser, vendorProfile);
      await persistUser(merged);
      identifyUser(merged);
      return merged;
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 404) {
        const merged = mapVendorToUser(baseUser, null);
        await persistUser(merged);
        identifyUser(merged);
        return merged;
      }

      console.error('Failed to hydrate vendor profile:', error);

      const hasKnownVendorState =
        typeof baseUser.hasVendorProfile === 'boolean' ||
        typeof baseUser.vendorStatus === 'string';

      // If we already know the vendor state from storage, keep it rather than
      // downgrading the account into a fresh onboarding flow.
      if (hasKnownVendorState) {
        await persistUser(baseUser);
        identifyUser(baseUser);
        return baseUser;
      }

      // For a fresh OTP login, a non-404 here means the auth/profile check
      // failed unexpectedly. Surface the error instead of misrouting into
      // Personal Details and later hitting VENDOR_EXISTS.
      throw error;
    }
  };

  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const [storedUser, token] = await Promise.all([
          AuthStorageService.getUser(),
          AuthStorageService.getToken(),
        ]);

        if (!storedUser || !token) {
          setIsInitialLoading(false);
          return;
        }

        await hydrateWithVendorProfile(storedUser as User);
      } catch (error) {
        console.error('Failed to load user from storage:', error);
        const fallbackUser = await AuthStorageService.getUser();
        if (fallbackUser) {
          setUser(fallbackUser as User);
        } else {
          await AuthStorageService.clearSession();
        }
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadStoredSession();
  }, []);

  const login = async (session: VerifyOtpResponse & { phone_number?: string }) => {
    setIsLoading(true);
    try {
      if (!session.jwt || !session.user?.id) {
        throw new Error('Login session is incomplete');
      }

      const baseUser = mapVendorToUser({
        id: String(session.user.id),
        name: session.user.name || 'Vendor',
        phone: session.phone_number || '',
        email: session.user.email,
        isOnline: false,
      });

      await AuthStorageService.setToken(session.jwt);
      const hydratedUser = await hydrateWithVendorProfile(baseUser);

      posthog?.capture?.('vendor_logged_in', {
        phone: hydratedUser.phone,
        has_vendor_profile: hydratedUser.hasVendorProfile ?? false,
      });

      return hydratedUser;
    } catch (error) {
      posthog?.capture?.('vendor_login_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const completePhoneProfile = async (payload: {
    name: string;
    email: string;
    phone_number: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await ApiService.completePhoneProfile(payload);

      if (response.requires_link_confirmation && response.existing_email) {
        const linked = await ApiService.confirmPhoneLink({
          confirmed: true,
          email: response.existing_email,
          phone_number: payload.phone_number,
        });
        return login({ ...linked, phone_number: payload.phone_number });
      }

      return login({ ...response, phone_number: payload.phone_number });
    } finally {
      setIsLoading(false);
    }
  };

  const completeVendorOnboarding = async (payload: {
    full_name: string;
    age?: number | null;
    service_city: string;
    service_area: string;
    vehicle_type: string;
    vehicle_number?: string;
    vehicle_name?: string;
    vehicle_model_name?: string;
    weighing_scale_type?: string;
  }) => {
    setIsLoading(true);
    try {
      const profile = await ApiService.createVendorProfile(payload);
      const currentUser = user || (await AuthStorageService.getUser());
      if (!currentUser) {
        throw new Error('No active user session found');
      }

      const merged = mapVendorToUser(currentUser as User, profile);
      await persistUser(merged);
      identifyUser(merged);
      return merged;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshVendorProfile = async () => {
    const currentUser = user || (await AuthStorageService.getUser());
    if (!currentUser) {
      return null;
    }
    return hydrateWithVendorProfile(currentUser as User);
  };

  const logout = async () => {
    try {
      const pushToken = await AuthStorageService.getPushToken();
      if (pushToken) {
        try {
          await ApiService.unregisterPushToken(pushToken);
        } catch (error) {
          console.warn('Failed to unregister vendor push token:', error);
        }
      }
      posthog?.capture?.('vendor_logged_out');
      posthog?.reset?.();
      setUser(null);
      await AuthStorageService.clearSession();
    } catch (error) {
      console.error('Failed to clear user from storage:', error);
      setUser(null);
    }
  };

  const setOnlineStatus = async (nextStatus: boolean) => {
    if (!user) {
      return null;
    }

    try {
      const response = await ApiService.updateVendorAvailability(nextStatus);
      const updatedUser = { ...user, isOnline: response.is_online };
      await persistUser(updatedUser);
      return updatedUser;
    } catch (error) {
      // Fallback to local state so the app remains usable if the backend rejects or is unavailable.
      const updatedUser = { ...user, isOnline: nextStatus };
      await persistUser(updatedUser);
      console.warn('Falling back to local online status toggle:', error);
      return updatedUser;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        completePhoneProfile,
        completeVendorOnboarding,
        refreshVendorProfile,
        logout,
        isLoading,
        isInitialLoading,
        setOnlineStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
