import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserWithAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface CleanupResult {
  target: string;
  deleted: number;
  threshold: string;
}

async function cleanupReviewEvents(): Promise<CleanupResult> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const result = await prisma.reviewEvent.deleteMany({
    where: {
      createdAt: {
        lt: oneYearAgo,
      },
    },
  });

  return { target: 'ReviewEvent', deleted: result.count, threshold: '365 jours' };
}

async function cleanupExpiredRefreshTokens(): Promise<CleanupResult> {
  const now = new Date();

  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  return { target: 'RefreshToken', deleted: result.count, threshold: 'expirés' };
}

async function cleanupAuditLogs(): Promise<CleanupResult> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
    },
  });

  return { target: 'AuditLog', deleted: result.count, threshold: '90 jours' };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserWithAdmin();

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Accès non autorisé. Droits administrateur requis.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'all';

    const results: CleanupResult[] = [];

    if (target === 'all' || target === 'review-events') {
      results.push(await cleanupReviewEvents());
    }

    if (target === 'all' || target === 'refresh-tokens') {
      results.push(await cleanupExpiredRefreshTokens());
    }

    if (target === 'all' || target === 'audit-logs') {
      results.push(await cleanupAuditLogs());
    }

    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);

    return NextResponse.json({
      success: true,
      results,
      totalDeleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage de la base de données' },
      { status: 500 }
    );
  }
}
