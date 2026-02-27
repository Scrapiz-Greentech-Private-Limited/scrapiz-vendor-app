import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { logger } from '../utils/logger.js';
import { config } from './env.js';

let firebaseApp: admin.app.App;

export const initializeFirebase = async () => {
  try {
    console.log("CWD:", process.cwd());
    console.log("Env Path:", config.firebaseServiceAccount);

    if (!config.firebaseServiceAccount) {
      throw new Error('Firebase service account path not configured');
    }

    const raw = readFileSync(config.firebaseServiceAccount, 'utf-8');

    console.log("Raw Length:", raw.length);
    console.log("First 100 chars:", raw.slice(0, 100));

    const serviceAccount = JSON.parse(raw);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin');
    console.error(error);
    throw error;
  }
};

export const verifyFirebaseToken = async (token: string) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      data: decodedToken,
    };
  } catch (error) {
    logger.error('Token verification failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
};

export const getFirebaseApp = () => firebaseApp;
