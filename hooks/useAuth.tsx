import { useState, createContext, useContext, ReactNode } from 'react';
import { usePostHog } from 'posthog-react-native';
import { User } from '../src/types';

interface AuthContextType {
  user: User | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
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
      posthog.identify(mockUser.id, {
        $set: {
          name: mockUser.name,
          phone: mockUser.phone,
        },
        $set_once: {
          first_login_date: new Date().toISOString(),
        },
      });
      posthog.capture('vendor_logged_in', {
        phone,
      });
    } catch (error) {
      posthog.capture('vendor_login_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error; // Re-throw to be handled by the component
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    posthog.capture('vendor_logged_out');
    posthog.reset();
    setUser(null);
  };

  const toggleOnlineStatus = () => {
    if (user) {
      setUser({ ...user, isOnline: !user.isOnline });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoading,
      toggleOnlineStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};