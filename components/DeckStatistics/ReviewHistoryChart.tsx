'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ReviewHistoryChartProps {
  reviewHistory: { date: string; count: number }[];
  isMobile: boolean;
}

export default function ReviewHistoryChart({
  reviewHistory,
  isMobile,
}: ReviewHistoryChartProps) {
  const lineData = reviewHistory.map(item => ({
    ...item,
    formattedDate: new Date(item.date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    }),
  }));

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Historique des révisions (7 jours)
      </h3>
      <ResponsiveContainer width="100%" height={isMobile ? 350 : 250}>
        <LineChart data={lineData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="formattedDate"
            stroke="#71717a"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            angle={isMobile ? -45 : 0}
            textAnchor={isMobile ? 'end' : 'middle'}
            height={isMobile ? 60 : 30}
          />
          <YAxis stroke="#71717a" style={{ fontSize: isMobile ? '10px' : '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              color: '#fafafa',
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Révisions"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
