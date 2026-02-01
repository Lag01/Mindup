import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupResult {
  target: string;
  deleted: number;
  threshold: string;
}

async function cleanupReviewEvents(dryRun = false): Promise<CleanupResult> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (dryRun) {
    const count = await prisma.reviewEvent.count({
      where: {
        createdAt: {
          lt: oneYearAgo,
        },
      },
    });
    console.log(`[DRY RUN] Supprimerait ${count} ReviewEvent de plus d'un an`);
    return { target: 'ReviewEvent', deleted: count, threshold: '365 jours' };
  }

  const result = await prisma.reviewEvent.deleteMany({
    where: {
      createdAt: {
        lt: oneYearAgo,
      },
    },
  });

  console.log(`✓ Supprimé ${result.count} ReviewEvent de plus d'un an`);
  return { target: 'ReviewEvent', deleted: result.count, threshold: '365 jours' };
}

async function cleanupExpiredRefreshTokens(dryRun = false): Promise<CleanupResult> {
  const now = new Date();

  if (dryRun) {
    const count = await prisma.refreshToken.count({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
    console.log(`[DRY RUN] Supprimerait ${count} RefreshToken expirés`);
    return { target: 'RefreshToken', deleted: count, threshold: 'expirés' };
  }

  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
    },
  });

  console.log(`✓ Supprimé ${result.count} RefreshToken expirés`);
  return { target: 'RefreshToken', deleted: result.count, threshold: 'expirés' };
}

async function cleanupAuditLogs(dryRun = false): Promise<CleanupResult> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  if (dryRun) {
    const count = await prisma.auditLog.count({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });
    console.log(`[DRY RUN] Supprimerait ${count} AuditLog de plus de 90 jours`);
    return { target: 'AuditLog', deleted: count, threshold: '90 jours' };
  }

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: ninetyDaysAgo,
      },
    },
  });

  console.log(`✓ Supprimé ${result.count} AuditLog de plus de 90 jours`);
  return { target: 'AuditLog', deleted: result.count, threshold: '90 jours' };
}

async function cleanup(options: { dryRun?: boolean; targets?: string[] } = {}) {
  const { dryRun = false, targets = ['all'] } = options;

  console.log('\n🧹 Nettoyage de la base de données Mindup');
  console.log(`Mode: ${dryRun ? 'DRY RUN (simulation)' : 'PRODUCTION'}\n`);

  const results: CleanupResult[] = [];
  const shouldCleanAll = targets.includes('all');

  try {
    if (shouldCleanAll || targets.includes('review-events')) {
      results.push(await cleanupReviewEvents(dryRun));
    }

    if (shouldCleanAll || targets.includes('refresh-tokens')) {
      results.push(await cleanupExpiredRefreshTokens(dryRun));
    }

    if (shouldCleanAll || targets.includes('audit-logs')) {
      results.push(await cleanupAuditLogs(dryRun));
    }

    console.log('\n📊 Résumé du nettoyage:');
    console.log('─'.repeat(60));
    results.forEach(r => {
      console.log(`${r.target.padEnd(20)} | ${r.deleted.toString().padStart(8)} entrées (> ${r.threshold})`);
    });
    console.log('─'.repeat(60));
    console.log(`Total: ${results.reduce((sum, r) => sum + r.deleted, 0)} entrées supprimées\n`);

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Gestion des arguments CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetArg = args.find(arg => arg.startsWith('--target='));
const targets = targetArg
  ? targetArg.split('=')[1].split(',')
  : ['all'];

cleanup({ dryRun, targets })
  .then(() => {
    console.log('✅ Nettoyage terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
