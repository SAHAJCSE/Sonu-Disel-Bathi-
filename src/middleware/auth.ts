import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  getAdminBySessionToken,
  getOrLinkAuthorizedAdmin,
} from '../db/repository.ts';

export interface AuthAdminProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthRequest extends Request {
  admin?: AuthAdminProfile;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  try {
    // 1. Check if token is a server-issued session token (from Email/Password login)
    if (token.startsWith('sdb_sess_')) {
      const sessionAdmin = await getAdminBySessionToken(token);
      if (!sessionAdmin) {
        return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
      }
      req.admin = {
        id: sessionAdmin.id,
        uid: sessionAdmin.uid,
        email: sessionAdmin.email,
        name: sessionAdmin.name,
        role: sessionAdmin.role,
      };
      return next();
    }

    // 2. Otherwise verify as Firebase ID token (Google Sign-In)
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken.email) {
      return res.status(403).json({ error: 'Forbidden: Account must have a verified email' });
    }

    const linkedAdmin = await getOrLinkAuthorizedAdmin(
      decodedToken.uid,
      decodedToken.email,
      decodedToken.name
    );

    if (!linkedAdmin) {
      return res.status(403).json({
        error:
          'Access Denied: Only the two pre-authorized Sonu Diesel Bhatti administrator accounts are permitted.',
      });
    }

    req.admin = {
      id: linkedAdmin.id,
      uid: linkedAdmin.uid,
      email: linkedAdmin.email,
      name: linkedAdmin.name,
      role: linkedAdmin.role,
    };
    next();
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
