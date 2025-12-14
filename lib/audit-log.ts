import { prisma } from './prisma';
import { NextRequest } from 'next/server';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_SIGNUP'
  | 'USER_DELETE'
  | 'DECK_CREATE'
  | 'DECK_UPDATE'
  | 'DECK_DELETE'
  | 'DECK_PUBLISH'
  | 'DECK_UNPUBLISH'
  | 'CARD_CREATE'
  | 'CARD_UPDATE'
  | 'CARD_DELETE'
  | 'SETTINGS_UPDATE'
  | 'ADMIN_ACTION'
  | 'TWO_FACTOR_ENABLE'
  | 'TWO_FACTOR_DISABLE'
  | 'TWO_FACTOR_VERIFY';

interface AuditLogOptions {
  userId?: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Créer une entrée dans l'audit log
 * Utilisation : await logAudit({ userId, action, ... })
 */
export async function logAudit(options: AuditLogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        targetType: options.targetType,
        targetId: options.targetId,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    });
  } catch (error) {
    // Ne pas faire échouer la requête si le logging échoue
    console.error('[Audit Log] Failed to create audit log:', error);
  }
}

/**
 * Extraire l'IP et user agent depuis une NextRequest
 */
export function getRequestInfo(request: NextRequest): {
  ipAddress: string;
  userAgent: string;
} {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}

/**
 * Helper pour logger les actions admin
 */
export async function logAdminAction(
  userId: string,
  action: AuditAction,
  targetType: string,
  targetId: string,
  request: NextRequest,
  metadata?: Record<string, any>
): Promise<void> {
  const { ipAddress, userAgent } = getRequestInfo(request);

  await logAudit({
    userId,
    action,
    targetType,
    targetId,
    ipAddress,
    userAgent,
    metadata,
  });
}

/**
 * Récupérer les logs d'audit pour un utilisateur
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
): Promise<any[]> {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Récupérer tous les logs d'audit (admin)
 */
export async function getAllAuditLogs(
  page: number = 1,
  limit: number = 50,
  action?: AuditAction
): Promise<{ logs: any[]; total: number }> {
  const skip = (page - 1) * limit;

  const where = action ? { action } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
