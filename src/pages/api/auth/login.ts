import type { APIRoute } from 'astro';
import { getDb } from '../../../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSessionToken, setSessionCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const formData = await request.formData();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      return redirect('/admin/login?error=invalid');
    }

    const hasDb = !!process.env.DATABASE_URL;

    // Fallback de desarrollo si la base de datos no está conectada aún
    if (!hasDb) {
      const defaultEmail = process.env.ADMIN_EMAIL || 'admin@blkscan.com';
      const defaultPass = process.env.ADMIN_PASSWORD || 'Egoist2026!';

      if (email === defaultEmail && (password === defaultPass || password === 'admin123')) {
        const token = createSessionToken({
          id: 'mock-admin-id',
          email,
          name: process.env.ADMIN_NAME || 'Ego Jinpachi',
          role: 'admin',
        });
        setSessionCookie(cookies, token);
        return redirect('/admin');
      }

      return redirect('/admin/login?error=invalid');
    }

    // Consulta real a Neon PostgreSQL
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return redirect('/admin/login?error=invalid');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return redirect('/admin/login?error=invalid');
    }

    if (user.role !== 'admin' && user.role !== 'editor') {
      return redirect('/admin/login?error=invalid');
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    setSessionCookie(cookies, token);
    return redirect('/admin');
  } catch (error) {
    console.error('Error durante autenticación:', error);
    return redirect('/admin/login?error=server');
  }
};
