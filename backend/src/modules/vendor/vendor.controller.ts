import { Response } from 'express';
import prisma from '../../config/database.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';

export const vendorController = {
  getProfile: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.vendor_id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const vendor = await prisma.vendor.findUnique({
        where: { id: req.vendor_id },
        include: {
          subscriptions: {
            include: {
              plan: true,
            },
          },
        },
      });

      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      res.json({
        vendor: {
          id: vendor.id,
          firebase_uid: vendor.firebase_uid,
          email: vendor.email,
          phone: vendor.phone,
          name: vendor.name,
          created_at: vendor.created_at,
          subscriptions: vendor.subscriptions,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  getAll: async (req: AuthRequest, res: Response) => {
    res.json({ message: 'Get all vendors' });
  },
};
