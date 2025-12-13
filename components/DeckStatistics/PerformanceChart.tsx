'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceChartProps {
  difficultCards: number;
  normalCards: number;
  masteredCards: number;
  isMobile: boolean;
}

const PERFORMANCE_COLORS = {
  difficult: '#ef4444',   // red
  normal: '#3b82f6',      // blue
  mastered: '#10b981',    // green
};

export default function PerformanceChart({
  difficultCards,
  normalCards,
  masteredCards,
  isMobile,
}: PerformanceChartProps) {
  const pieData = [
    { name: 'Difficiles', value: difficultCards, color: PERFORMANCE_COLORS.difficult },
    { name: 'Normales', value: normalCards, color: PERFORMANCE_COLORS.normal },
    { name: 'Maîtrisées', value: masteredCards, color: PERFORMANCE_COLORS.mastered },
  ].filter(item => item.value > 0);

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Performance des cartes
      </h3>
      {pieData.length > 0 ? (
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy={isMobile ? "40%" : "50%"}
              labelLine={false}
              label={isMobile ? false : (entry) => `${entry.name}: ${entry.value}`}
              outerRadius={isMobile ? 60 : 80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '0.5rem',
                color: '#fafafa',
              }}
            />
            {isMobile && (
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: '12px' }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className={`${isMobile ? 'h-[300px]' : 'h-[250px]'} flex items-center justify-center text-zinc-500`}>
          Aucune donnée disponible
        </div>
      )}
    </div>
  );
}
