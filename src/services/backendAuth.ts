const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const authenticateWithBackend = async (firebaseIdToken: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: firebaseIdToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Backend authentication failed');
    }

    const data = await response.json();
    return {
      token: data.token,
      vendor: data.vendor,
    };
  } catch (error) {
    console.error('Backend auth error:', error);
    throw error;
  }
};

export const getVendorProfile = async (token: string) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/vendors/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch vendor profile');
    }

    const data = await response.json();
    return data.vendor;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};
