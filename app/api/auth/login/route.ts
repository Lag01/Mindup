import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';
import rateLimiter, { RATE_LIMITS, getClientIp } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = rateLimiter.check(
      `login:${clientIp}`,
      RATE_LIMITS.LOGIN.maxRequests,
      RATE_LIMITS.LOGIN.windowMs
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop de tentatives de connexion. Réessayez dans ${rateLimit.retryAfter} secondes.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '900',
          },
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Dummy hash pour éviter une timing attack (révélation d'emails existants)
    const DUMMY_HASH = '$2b$10$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const isPasswordValid = await verifyPassword(password, user?.password ?? DUMMY_HASH);

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Create session
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
