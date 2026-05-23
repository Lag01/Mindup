'use client';

export interface RetentionCell {
  rate: number | null;
  count: number;
}
export interface RetentionRow {
  young: RetentionCell;
  mature: RetentionCell;
  all: RetentionCell;
}
export interface RetentionTable {
  today: RetentionRow;
  yesterday: RetentionRow;
  week: RetentionRow;
  month: RetentionRow;
  year: RetentionRow;
}

interface TrueRetentionTableProps {
  data: RetentionTable;
}

const PERIODS: Array<{ key: keyof RetentionTable; label: string }> = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: 'week', label: 'Semaine dernière' },
  { key: 'month', label: 'Mois dernier' },
  { key: 'year', label: 'Année passée' },
];

function toneClass(rate: number | null): string {
  if (rate === null) return 'text-zinc-500';
  if (rate >= 90) return 'text-green-400';
  if (rate >= 85) return 'text-blue-400';
  if (rate >= 75) return 'text-orange-400';
  return 'text-red-400';
}

function Cell({ cell }: { cell: RetentionCell }) {
  return (
    <td className="px-3 py-2 text-right tabular-nums">
      <span className={`font-semibold ${toneClass(cell.rate)}`}>
        {cell.rate === null ? 'N/A' : `${cell.rate.toFixed(1)} %`}
      </span>
      {cell.count > 0 && (
        <span className="ml-1 text-[10px] text-zinc-500">({cell.count})</span>
      )}
    </td>
  );
}

export default function TrueRetentionTable({ data }: TrueRetentionTableProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Rétention réelle</h3>
        <p className="mt-1 text-xs text-zinc-400">
          Taux de réussite des cartes avec un intervalle ≥ 1 jour. Récentes = 1-20 j,
          Matures = ≥ 21 j.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs text-zinc-400">
              <th className="px-3 py-2 text-left font-medium">Période</th>
              <th className="px-3 py-2 text-right font-medium">Récentes</th>
              <th className="px-3 py-2 text-right font-medium">Matures</th>
              <th className="px-3 py-2 text-right font-medium">Tout</th>
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(({ key, label }) => {
              const row = data[key];
              return (
                <tr key={key} className="border-b border-zinc-800/50 last:border-0">
                  <td className="px-3 py-2 text-left text-zinc-300">{label}</td>
                  <Cell cell={row.young} />
                  <Cell cell={row.mature} />
                  <Cell cell={row.all} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-zinc-500 italic">
        Le nombre entre parenthèses indique l'effectif de révisions. Approximation : l'intervalle
        utilisé est l'intervalle actuel de la carte.
      </p>
    </div>
  );
}
