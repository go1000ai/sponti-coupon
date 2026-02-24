'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  Users, TrendingUp, Eye, Heart, DollarSign,
  ArrowUpRight, ArrowDownRight, Minus, Loader2, Pencil, Check, X,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface ROIMetric {
  value: number;
  delta?: number;
  rate?: number;
  total_unique?: number;
  avg_ticket?: number;
  conversion_rate?: number;
  label: string;
}

interface ROIData {
  period: number;
  metrics: {
    customers_sent: ROIMetric;
    repeat_customers: ROIMetric;
    estimated_revenue: ROIMetric;
    deal_views: ROIMetric;
    loyalty_active: ROIMetric;
  };
  revenue_chart: { month: string; label: string; revenue: number; customers: number }[];
}

function DeltaBadge({ delta }: { delta?: number }) {
  if (delta === undefined || delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-400 font-medium">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-green-600 font-medium">
        <ArrowUpRight className="w-3 h-3" /> +{delta}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500 font-medium">
      <ArrowDownRight className="w-3 h-3" /> {delta}%
    </span>
  );
}

export function ROIDashboard() {
  const [data, setData] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [editingTicket, setEditingTicket] = useState(false);
  const [ticketValue, setTicketValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchROI = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/roi?period=${period}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setTicketValue(String(json.metrics.estimated_revenue.avg_ticket || 50));
      }
    } catch (err) {
      console.error('Failed to fetch ROI data:', err);
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchROI();
  }, [fetchROI]);

  const saveTicketValue = async () => {
    const val = parseFloat(ticketValue);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      await fetch('/api/vendor/roi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ average_ticket_value: val }),
      });
      setEditingTicket(false);
      fetchROI();
    } catch {
      // ignore
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, revenue_chart } = data;

  const cards = [
    {
      icon: <Users className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50',
      label: metrics.customers_sent.label,
      value: metrics.customers_sent.value.toLocaleString(),
      delta: metrics.customers_sent.delta,
      sub: `in last ${period} days`,
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-green-600" />,
      bg: 'bg-green-50',
      label: metrics.repeat_customers.label,
      value: metrics.repeat_customers.value.toLocaleString(),
      sub: `${metrics.repeat_customers.rate}% repeat rate`,
    },
    {
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50',
      label: metrics.estimated_revenue.label,
      value: formatCurrency(metrics.estimated_revenue.value),
      delta: metrics.estimated_revenue.delta,
      sub: `@ ${formatCurrency(metrics.estimated_revenue.avg_ticket || 50)}/ticket`,
    },
    {
      icon: <Eye className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50',
      label: metrics.deal_views.label,
      value: metrics.deal_views.value.toLocaleString(),
      delta: metrics.deal_views.delta,
      sub: `${metrics.deal_views.conversion_rate}% claimed`,
    },
    {
      icon: <Heart className="w-5 h-5 text-pink-600" />,
      bg: 'bg-pink-50',
      label: metrics.loyalty_active.label,
      value: metrics.loyalty_active.value.toLocaleString(),
      sub: 'enrolled members',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-secondary-500">ROI Dashboard</h2>
          <p className="text-sm text-gray-500">Track the return on your SpontiCoupon investment</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          {[7, 30, 90].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                {card.icon}
              </div>
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-secondary-500">{card.value}</span>
              {card.delta !== undefined && <DeltaBadge delta={card.delta} />}
            </div>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Average Ticket Value Editor */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Average Ticket Value:</span>
          {editingTicket ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                value={ticketValue}
                onChange={e => setTicketValue(e.target.value)}
                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                min="0"
                step="0.01"
              />
              <button
                onClick={saveTicketValue}
                disabled={saving}
                className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingTicket(false)}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTicket(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-secondary-500 hover:text-primary-500 transition-colors"
            >
              {formatCurrency(parseFloat(ticketValue) || 50)}
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs text-gray-400 ml-2">
            Used to estimate revenue from redemptions
          </span>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenue_chart && revenue_chart.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-secondary-500 mb-4">Estimated Monthly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue_chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? 'k' : ''}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Based on unique customers sent × your average ticket value
          </p>
        </div>
      )}
    </div>
  );
}
