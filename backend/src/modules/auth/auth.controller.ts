import { Request, Response } from 'express';
import prisma from '../../config/database.js';
import { verifyFirebaseToken } from '../../config/firebase.js';
import { generateToken } from '../../utils/jwt.js';

export const authController = {
  googleAuth: async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'ID token is required' });
      }

      // Verify Firebase token
      const firebaseResult = await verifyFirebaseToken(idToken);

      if (!firebaseResult.success) {
        return res.status(401).json({ error: firebaseResult.error });
      }

      const { uid, email } = firebaseResult;

      // Check if vendor exists
      let vendor = await prisma.vendor.findUnique({
        where: { firebase_uid: uid! },
      });

      // Create vendor if doesn't exist
      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            firebase_uid: uid!,
            email: email || null,
          },
        });
      }

      // Generate backend JWT
      const token = generateToken({
        uid: vendor.firebase_uid,
        email: vendor.email || undefined,
        vendorId: vendor.id,
      });

      res.json({
        token,
        vendor: {
          id: vendor.id,
          firebase_uid: vendor.firebase_uid,
          email: vendor.email,
          name: vendor.name,
          phone: vendor.phone,
          created_at: vendor.created_at,
        },
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  },

  login: async (req: Request, res: Response) => {
    res.json({ message: 'Login endpoint' });
  },

  register: async (req: Request, res: Response) => {
    res.json({ message: 'Register endpoint' });
  },
};
