import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  getAdminBySessionToken,
  getOrLinkAuthorizedAdmin,
  getOrRegisterUserProfile,
  ADMIN_EMAILS,
} from '../db/repository.ts';

export interface AuthUserProfile {
  id?: number;
  uid: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  role: 'admin' | 'customer' | 'staff';
}

export interface AuthRequest extends Request {
  admin?: AuthUserProfile;
  user?: AuthUserProfile;
}

/**
 * Universal authentication helper that resolves both session tokens
 * and Firebase ID tokens (Google Sign-In) into an AuthUserProfile with Role-Based Access.
 */
export async function resolveAuthUser(
  req: Request
): Promise<AuthUserProfile | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) return null;

  // 1. Password session token (Internal Admin Portal)
  if (token.startsWith('sdb_sess_')) {
    const sessionAdmin = await getAdminBySessionToken(token);
    if (!sessionAdmin) return null;
    return {
      id: sessionAdmin.id,
      uid: sessionAdmin.uid,
      email: sessionAdmin.email,
      name: sessionAdmin.name,
      role: 'admin',
    };
  }

  // 2. Firebase ID Token (Google Sign-In for simple users and administrators)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken.email) return null;

    const email = decodedToken.email.toLowerCase().trim();
    const isAdmin = ADMIN_EMAILS.includes(email);

    // Register or retrieve user profile from PostgreSQL
    const profile = await getOrRegisterUserProfile(
      decodedToken.uid,
      email,
      decodedToken.name || (isAdmin ? 'Administrator' : 'Valued Customer'),
      (decodedToken.picture as string) || undefined
    );

    // If admin, also ensure linked in admin_profiles table
    if (isAdmin) {
      await getOrLinkAuthorizedAdmin(
        decodedToken.uid,
        email,
        decodedToken.name
      ).catch(() => null);
    }

    return {
      id: profile.id,
      uid: profile.uid,
      email: profile.email,
      name: profile.name,
      photoUrl: profile.photoUrl,
      role: (profile.role as 'admin' | 'customer' | 'staff') || (isAdmin ? 'admin' : 'customer'),
    };
  } catch (err) {
    console.warn('Failed to verify Firebase auth token:', err);
    return null;
  }
}

/**
 * Require any authenticated user (Customer, Staff, or Admin).
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized: Please sign in to continue.',
    });
  }

  req.user = user;
  if (user.role === 'admin') {
    req.admin = user;
  }
  next();
};

/**
 * Require strictly Administrator role for protected management operations.
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = await resolveAuthUser(req);
  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized: Admin authentication required.',
    });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({
      error:
        'Access Denied: This operation requires Administrator privileges. Simple user accounts cannot modify workshop inventory.',
    });
  }

  req.user = user;
  req.admin = user;
  next();
};

/**
 * Optional authentication middleware: populates req.user if token is present, but doesn't block guests.
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const user = await resolveAuthUser(req);
  if (user) {
    req.user = user;
    if (user.role === 'admin') {
      req.admin = user;
    }
  }
  next();
};
