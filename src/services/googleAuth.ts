import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

export const handleGoogleSignIn = async () => {
  try {
    // Check if device supports Google Play Services
    await GoogleSignin.hasPlayServices();

    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();

    // Get the ID token
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token received from Google');
    }

    // Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase
    const userCredential = await signInWithCredential(auth, googleCredential);

    // Get Firebase ID token for backend authentication
    const firebaseIdToken = await userCredential.user.getIdToken();

    return {
      success: true,
      user: userCredential.user,
      idToken: firebaseIdToken,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      photoURL: userCredential.user.photoURL,
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    
    if (error.code === 'SIGN_IN_CANCELLED') {
      throw new Error('Sign-in was cancelled');
    } else if (error.code === 'IN_PROGRESS') {
      throw new Error('Sign-in is already in progress');
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      throw new Error('Google Play Services not available');
    }
    
    throw new Error('Failed to sign in with Google');
  }
};

export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    await auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
  }
};
