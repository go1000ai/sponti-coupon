'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  saved: number;
  color: string;
}

export default function CategoryChart({ data }: { data: CategoryData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        No purchase history yet
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="h-48 flex items-center">
      {/* Donut chart */}
      <div className="w-1/2 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#fff',
              }}
              formatter={(value, name) => [`${value} deals`, name]}
              labelStyle={{ color: '#94a3b8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="w-1/2 space-y-1.5 pl-2">
        {data.slice(0, 5).map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-600 truncate flex-1">{item.name}</span>
            <span className="text-xs text-gray-400 font-medium">
              {Math.round((item.value / total) * 100)}%
            </span>
          </div>
        ))}
        {data.length > 5 && (
          <p className="text-[10px] text-gray-400">+{data.length - 5} more</p>
        )}
      </div>
    </div>
  );
}
