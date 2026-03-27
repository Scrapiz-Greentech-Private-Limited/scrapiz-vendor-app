import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { usePostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../src/types';

const AUTH_STORAGE_KEY = '@scrapiz_auth_user';

interface AuthContextType {
  user: User | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isInitialLoading: boolean;
  toggleOnlineStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // Load user from storage on mount
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Identify in PostHog if user exists
          if (posthog?.identify) {
            posthog.identify(parsedUser.id, {
              $set: {
                name: parsedUser.name,
                phone: parsedUser.phone,
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  const login = async (phone: string) => {
    setIsLoading(true);

    try {
      // Simulate API call with potential failure
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate 5% failure rate
          if (Math.random() < 0.05) {
            reject(new Error('Network error. Please check your connection.'));
          } else {
            resolve(true);
          }
        }, 2000);
      });

      const mockUser: User = {
        id: '1',
        name: 'Rajesh Kumar',
        phone,
        isOnline: false
      };

      setUser(mockUser);
      // Persist user
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockUser));

      if (posthog?.identify) {
        posthog.identify(mockUser.id, {
          $set: {
            name: mockUser.name,
            phone: mockUser.phone,
          },
          $set_once: {
            first_login_date: new Date().toISOString(),
          },
        });
      }
      if (posthog?.capture) {
        posthog.capture('vendor_logged_in', {
          phone,
        });
      }
    } catch (error) {
      if (posthog?.capture) {
        posthog.capture('vendor_login_failed', {
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      throw error; // Re-throw to be handled by the component
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (posthog?.capture) posthog.capture('vendor_logged_out');
      if (posthog?.reset) posthog.reset();
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear user from storage:', error);
      setUser(null); // Clear state anyway
    }
  };

  const toggleOnlineStatus = () => {
    if (user) {
      const updatedUser = { ...user, isOnline: !user.isOnline };
      setUser(updatedUser);
      // Update persistence
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser)).catch(err => 
        console.error('Failed to update persisted user status:', err)
      );
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoading,
      isInitialLoading,
      toggleOnlineStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};