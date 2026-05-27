'use client';

import { CHART_COLORS } from '@/lib/cardCategories';

interface DeckHealthCardProps {
  stabilityDistribution: { lt7: number; lt30: number; lt90: number; gte90: number };
  difficultyDistribution: { easy: number; medium: number; hard: number };
  avgStability: number;
}

interface SegmentProps {
  count: number;
  total: number;
  color: string;
  label: string;
}

function Segment({ count, total, color, label }: SegmentProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  if (count === 0) return null;
  // Z5-10 : garantir une largeur min visible pour les buckets non-vides (sinon les segments
  // < 5% disparaissent et l'utilisateur croit qu'il n'y a aucune carte dans la catégorie).
  return (
    <div
      className="flex items-center justify-center text-xs font-semibold text-white transition-all"
      style={{ width: `${pct}%`, backgroundColor: color, minWidth: '6px' }}
      title={`${label}: ${count} (${Math.round(pct)}%)`}
    >
      {pct >= 8 ? `${Math.round(pct)}%` : ''}
    </div>
  );
}

export default function DeckHealthCard({
  stabilityDistribution,
  difficultyDistribution,
  avgStability,
}: DeckHealthCardProps) {
  const stabilityTotal =
    stabilityDistribution.lt7 +
    stabilityDistribution.lt30 +
    stabilityDistribution.lt90 +
    stabilityDistribution.gte90;

  const difficultyTotal =
    difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Santé du deck</h3>
        <p className="mt-1 text-xs text-zinc-400">
          Distribution FSRS de la stabilité mnésique et de la difficulté perçue
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-zinc-300">Stabilité mnésique</span>
          <span className="text-xs text-zinc-500">
            Moyenne : <span className="text-zinc-300 font-semibold">{avgStability}j</span>
          </span>
        </div>
        <div className="flex h-6 overflow-hidden rounded-md bg-zinc-800">
          <Segment count={stabilityDistribution.lt7} total={stabilityTotal} color={CHART_COLORS.danger} label="< 7j" />
          <Segment count={stabilityDistribution.lt30} total={stabilityTotal} color={CHART_COLORS.warning} label="7–30j" />
          <Segment count={stabilityDistribution.lt90} total={stabilityTotal} color={CHART_COLORS.info} label="30–90j" />
          <Segment count={stabilityDistribution.gte90} total={stabilityTotal} color={CHART_COLORS.success} label="≥ 90j" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          <LegendDot color={CHART_COLORS.danger} label={`Fragile <7j (${stabilityDistribution.lt7})`} />
          <LegendDot color={CHART_COLORS.warning} label={`7–30j (${stabilityDistribution.lt30})`} />
          <LegendDot color={CHART_COLORS.info} label={`30–90j (${stabilityDistribution.lt90})`} />
          <LegendDot color={CHART_COLORS.success} label={`Solide ≥90j (${stabilityDistribution.gte90})`} />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-zinc-300">Difficulté FSRS</span>
          <span className="text-xs text-zinc-500">Échelle 1–10</span>
        </div>
        <div className="flex h-6 overflow-hidden rounded-md bg-zinc-800">
          <Segment count={difficultyDistribution.easy} total={difficultyTotal} color={CHART_COLORS.success} label="Facile" />
          <Segment count={difficultyDistribution.medium} total={difficultyTotal} color={CHART_COLORS.caution} label="Moyenne" />
          <Segment count={difficultyDistribution.hard} total={difficultyTotal} color={CHART_COLORS.danger} label="Difficile" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          <LegendDot color={CHART_COLORS.success} label={`Facile 1–3 (${difficultyDistribution.easy})`} />
          <LegendDot color={CHART_COLORS.caution} label={`Moyenne 4–7 (${difficultyDistribution.medium})`} />
          <LegendDot color={CHART_COLORS.danger} label={`Difficile 8–10 (${difficultyDistribution.hard})`} />
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
