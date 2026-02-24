'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface SavingsData {
  month: string;
  label: string;
  saved: number;
}

export default function SavingsChart({ data }: { data: SavingsData[] }) {
  const hasSavings = data.some(d => d.saved > 0);

  if (!hasSavings) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        No savings yet — redeem a deal to start tracking!
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(249, 115, 22, 0.08)' }}
            contentStyle={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              color: '#fff',
            }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Saved']}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
          />
          <Bar
            dataKey="saved"
            fill="#f97316"
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
