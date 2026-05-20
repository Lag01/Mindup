import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';
import rateLimiter, { RATE_LIMITS, getClientIp } from '@/lib/rate-limiter';
import { getAppSettings } from '@/lib/settings';
import { generateDisplayNameFromEmail } from '@/lib/utils/display-name';

// Format basique RFC 5321 simplifié. Pas une validation parfaite, juste un garde-fou contre
// les chaînes manifestement invalides ("foo", "a@b", domaine sans point…).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

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

    // Z1-03 / Z1-08 : validation de format et longueur d'email
    if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
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

    // Create user — Z1-02 : on s'appuie sur l'unique constraint (email) pour gérer les
    // signups concurrents. Le catch P2002 ci-dessous retourne un message propre.
    const hashedPassword = await hashPassword(password);
    const displayName = generateDisplayNameFromEmail(email);
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          displayName,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          createdAt: true,
        },
      });
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === 'P2002'
      ) {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec cet email' },
          { status: 400 }
        );
      }
      throw createError;
    }

    // Z1-06 : atomicité signup. createSession() ne touche pas la BD (JWT + cookie),
    // mais si la pose du cookie échoue (erreur runtime, cookies() KO), on aurait un
    // compte créé sans session : on compense en supprimant le user pour permettre un
    // nouveau signup propre.
    try {
      await createSession(user.id);
    } catch (sessionError) {
      try {
        await prisma.user.delete({ where: { id: user.id } });
      } catch (rollbackError) {
        console.error('Signup rollback failed:', rollbackError);
      }
      throw sessionError;
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte' },
      { status: 500 }
    );
  }
}
