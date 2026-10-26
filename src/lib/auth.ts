import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AstroCookies } from 'astro';
import type { User } from '../db/schema';

const SESSION_COOKIE_NAME = 'blk_session';
const JWT_SECRET = process.env.SESSION_SECRET || 'blkscan_fallback_secret_only_for_dev_change_in_env_32chars';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function createSessionToken(user: { id: string; email: string; name: string; role: string }): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(cookies: AstroCookies, token: string) {
  cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
  });
}

export function getSession(cookies: AstroCookies): SessionPayload | null {
  const cookie = cookies.get(SESSION_COOKIE_NAME);
  if (!cookie || !cookie.value) return null;
  return verifySessionToken(cookie.value);
}

export function requireAdmin(cookies: AstroCookies): SessionPayload {
  const session = getSession(cookies);
  if (!session || (session.role !== 'admin' && session.role !== 'editor')) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
