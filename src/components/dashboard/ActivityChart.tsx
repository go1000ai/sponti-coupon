'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface ActivityData {
  month: string;
  label: string;
  claimed: number;
  redeemed: number;
  expired: number;
}

export default function ActivityChart({ data }: { data: ActivityData[] }) {
  const hasActivity = data.some(d => d.claimed > 0 || d.redeemed > 0 || d.expired > 0);

  if (!hasActivity) {
    return (
      <div className="h-52 flex items-center justify-center text-sm text-gray-400">
        No activity yet — claim a deal to get started!
      </div>
    );
  }

  return (
    <div className="h-52">
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
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{
              background: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              color: '#fff',
            }}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', color: '#6b7280', paddingTop: '8px' }}
          />
          <Bar dataKey="claimed" name="Claimed" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="redeemed" name="Redeemed" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="expired" name="Expired" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
