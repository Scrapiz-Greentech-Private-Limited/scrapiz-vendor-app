import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface TokenPayload {
  uid: string;
  email?: string;
  [key: string]: any;
}

export const generateToken = (payload: TokenPayload): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
