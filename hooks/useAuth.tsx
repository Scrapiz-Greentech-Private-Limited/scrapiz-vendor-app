import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useState } from 'react';
import { authenticateWithBackend } from '../src/services/backendAuth';
import { handleGoogleSignIn, signOutGoogle } from '../src/services/googleAuth';
import { User } from '../src/types';

interface AuthContextType {
  user: User | null;
  login: (phone: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
    } catch (error) {
      throw error; // Re-throw to be handled by the component
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    
    try {
      // Sign in with Google and Firebase
      const googleResult = await handleGoogleSignIn();
      
      if (!googleResult.success) {
        throw new Error('Google sign-in failed');
      }

      // Authenticate with backend
      const backendResult = await authenticateWithBackend(googleResult.idToken);

      // Store token
      await AsyncStorage.setItem('authToken', backendResult.token);
      await AsyncStorage.setItem('vendor', JSON.stringify(backendResult.vendor));

      // Set user
      const newUser: User = {
        id: backendResult.vendor.id,
        name: backendResult.vendor.name || googleResult.displayName || 'Vendor',
        phone: backendResult.vendor.phone || '',
        email: backendResult.vendor.email || googleResult.email || '',
        isOnline: false,
      };
      
      setUser(newUser);
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOutGoogle();
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('vendor');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
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
      loginWithGoogle,
      logout,
      isLoading,
      toggleOnlineStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};