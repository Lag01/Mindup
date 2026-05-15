import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { signToken, verifyToken } from './jwt';

const SALT_ROUNDS = 10;
const SESSION_COOKIE_NAME = 'session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();

  // Créer un JWT signé contenant l'userId
  const token = await signToken({ userId });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true, // Toujours HTTPS
    sameSite: 'strict', // Protection CSRF renforcée
    maxAge: 60 * 60 * 2, // 2 heures (JWT expire aussi après 2h)
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  // Vérifier et décoder le JWT
  const userId = await verifyToken(token);
  return userId;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const userId = await getSession();
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function getCurrentUserWithAdmin() {
  const userId = await getSession();
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true, isAdmin: true },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function getCurrentUserWithDashboard() {
  const userId = await getSession();
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        isAdmin: true,
        dashboardVersion: true,
      },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user with dashboard:', error);
    return null;
  }
}

export async function requireAdmin() {
  const user = await getCurrentUserWithAdmin();

  if (!user) {
    throw new Error('Non authentifié');
  }

  if (!user.isAdmin) {
    throw new Error('Accès refusé : droits administrateur requis');
  }

  return user;
}
