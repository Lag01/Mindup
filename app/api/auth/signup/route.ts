import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';
import rateLimiter, { RATE_LIMITS, getClientIp } from '@/lib/rate-limiter';
import { getAppSettings } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = rateLimiter.check(
      `signup:${clientIp}`,
      RATE_LIMITS.SIGNUP.maxRequests,
      RATE_LIMITS.SIGNUP.windowMs
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Trop de créations de compte. Réessayez dans ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '3600',
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

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cet email' },
        { status: 400 }
      );
    }

    // Vérifier la limite du nombre total d'utilisateurs
    const settings = await getAppSettings();
    const totalUsers = await prisma.user.count();

    if (totalUsers >= settings.maxTotalUsers) {
      return NextResponse.json(
        { error: `Les inscriptions sont fermées. Le nombre maximum de ${settings.maxTotalUsers} comptes a été atteint.` },
        { status: 403 }
      );
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    // Create session
    await createSession(user.id);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte' },
      { status: 500 }
    );
  }
}
