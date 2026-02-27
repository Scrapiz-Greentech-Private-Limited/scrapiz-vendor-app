import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  vendor_id?: string;
  uid?: string;
  email?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.vendor_id = decoded.vendorId;
    req.uid = decoded.uid;
    req.email = decoded.email;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
