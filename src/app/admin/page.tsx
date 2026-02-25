'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Store,
  Tag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  QrCode,
  UserPlus,
  Clock,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Star,
  ClipboardList,
  Grid3X3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

type DateRange = 'today' | '7d' | '30d' | 'all';

interface SparklinePoint {
  date: string;
  count: number;
}

interface MrrPoint {
  date: string;
  mrr: number;
}

interface OverviewData {
  totalVendors: number;
  totalCustomers: number;
  activeDeals: number;
  mrr: number;
  tierBreakdown: Record<string, number>;
  todayActivity: {
    claims: number;
    signups: number;
    dealsCreated: number;
  };
  recentActivity: {
    id: string;
    type: 'claim' | 'redemption' | 'signup' | 'deal';
    description: string;
    timestamp: string;
  }[];
  growthMetrics: {
    vendorsThisWeek: number;
    vendorsLastWeek: number;
    customersThisWeek: number;
    customersLastWeek: number;
  };
  systemHealth: {
    expiredUncleared: number;
    pendingDeposits: number;
  };
  sparklines: {
    vendors: SparklinePoint[];
    customers: SparklinePoint[];
    claims: SparklinePoint[];
    mrr: MrrPoint[];
  };
}

// --- Inline Sub-Components ---

function AnimatedValue({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 700;
    const steps = 35;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, decimals]);
  return (
    <>
      {prefix}
      {decimals > 0 ? display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : display.toLocaleString()}
      {suffix}
    </>
  );
}

function MiniSparkline({
  data,
  dataKey,
  color,
  gradientId,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  color: string;
  gradientId: string;
}) {
  if (!data || data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={true}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ProgressRing({
  value,
  goal,
  color,
  size = 80,
  strokeWidth = 6,
}: {
  value: number;
  goal: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(value / goal, 1);
  const offset = circumference * (1 - percent);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f0f0f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-secondary-500">{value}</span>
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded mt-1" />
          </div>
        </div>
        <div className="h-9 w-64 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 w-16 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="card p-6 lg:col-span-2">
          <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for the tier donut chart
function TierTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string; price: number } }> }) {
  if (!active || !payload || !payload[0]) return null;
  const item = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
      <p className="font-semibold text-secondary-500 capitalize">{item.name}</p>
      <p className="text-sm text-gray-500">
        {item.value} vendor{item.value !== 1 ? 's' : ''}
      </p>
      <p className="text-sm font-medium text-green-600">
        {formatCurrency(item.value * (item.payload.price || 0))}/mo
      </p>
    </div>
  );
}

// --- Main Page ---

const TIER_CONFIG = [
  { tier: 'starter', color: '#22c55e', price: 49 },
  { tier: 'pro', color: '#f97316', price: 99 },
  { tier: 'business', color: '#3b82f6', price: 199 },
  { tier: 'enterprise', color: '#8b5cf6', price: 499 },
];

const DAILY_GOALS = { claims: 50, signups: 20, deals: 5 };

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');
  const [transitioning, setTransitioning] = useState(false);

  const fetchData = useCallback(async (selectedRange: DateRange) => {
    try {
      const res = await fetch(`/api/admin/overview?range=${selectedRange}`);
      if (!res.ok) throw new Error('Failed to fetch overview data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching overview:', err);
    } finally {
      setLoading(false);
      setTransitioning(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData(range);
  }, [user, range, fetchData]);

  const handleRangeChange = (newRange: DateRange) => {
    if (newRange === range) return;
    setTransitioning(true);
    setRange(newRange);
  };

  const getGrowthPercent = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'claim': return <QrCode className="w-4 h-4 text-blue-500" />;
      case 'redemption': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'signup': return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'deal': return <Tag className="w-4 h-4 text-primary-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityBorder = (type: string) => {
    switch (type) {
      case 'claim': return 'border-l-blue-400';
      case 'redemption': return 'border-l-green-400';
      case 'signup': return 'border-l-purple-400';
      case 'deal': return 'border-l-primary-400';
      default: return 'border-l-gray-300';
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'claim': return { bg: 'bg-blue-50 text-blue-600', label: 'Claim' };
      case 'redemption': return { bg: 'bg-green-50 text-green-600', label: 'Redeemed' };
      case 'signup': return { bg: 'bg-purple-50 text-purple-600', label: 'Signup' };
      case 'deal': return { bg: 'bg-primary-50 text-primary-600', label: 'Deal' };
      default: return { bg: 'bg-gray-50 text-gray-500', label: type };
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const vendorGrowth = data ? getGrowthPercent(data.growthMetrics.vendorsThisWeek, data.growthMetrics.vendorsLastWeek) : 0;
  const customerGrowth = data ? getGrowthPercent(data.growthMetrics.customersThisWeek, data.growthMetrics.customersLastWeek) : 0;

  // Donut chart data
  const tierChartData = TIER_CONFIG.map(({ tier, price }) => ({
    name: tier,
    value: data?.tierBreakdown[tier] || 0,
    price,
  }));
  const tierColors = TIER_CONFIG.map((t) => t.color);

  if (loading && !data) {
    return <SkeletonDashboard />;
  }

  // Stat cards configuration
  const statCards = [
    {
      label: 'Monthly Recurring Revenue',
      value: data?.mrr || 0,
      prefix: '$',
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: 'bg-green-100 text-green-600',
      badge: 'MRR',
      badgeColor: 'bg-green-50 text-green-600',
      sparklineData: data?.sparklines.mrr || [],
      sparklineKey: 'mrr',
      sparklineColor: '#22c55e',
      gradientId: 'mrrGrad',
    },
    {
      label: 'Total Vendors',
      value: data?.totalVendors || 0,
      icon: <Store className="w-5 h-5" />,
      iconBg: 'bg-blue-100 text-blue-600',
      sparklineData: data?.sparklines.vendors || [],
      sparklineKey: 'count',
      sparklineColor: '#3b82f6',
      gradientId: 'vendorsGrad',
    },
    {
      label: 'Total Customers',
      value: data?.totalCustomers || 0,
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-purple-100 text-purple-600',
      sparklineData: data?.sparklines.customers || [],
      sparklineKey: 'count',
      sparklineColor: '#a855f7',
      gradientId: 'customersGrad',
    },
    {
      label: 'Active Deals',
      value: data?.activeDeals || 0,
      icon: <Tag className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      sparklineData: data?.sparklines.claims || [],
      sparklineKey: 'count',
      sparklineColor: '#E8632B',
      gradientId: 'dealsGrad',
    },
  ];

  const healthItems = [
    {
      label: 'Expired Deals Needing Cleanup',
      subtitle: 'Active deals past expiration date',
      value: data?.systemHealth.expiredUncleared || 0,
      max: 20,
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: 'Pending Deposits',
      subtitle: 'Unconfirmed claim deposits',
      value: data?.systemHealth.pendingDeposits || 0,
      max: 30,
      icon: <DollarSign className="w-5 h-5" />,
    },
  ];

  return (
    <div className={`transition-opacity duration-300 ${transitioning ? 'opacity-40' : 'opacity-100'}`}>
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Dashboard Overview</h1>
            <p className="text-sm text-gray-500">Platform performance at a glance</p>
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {([
            { key: 'today', label: 'Today' },
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: 'all', label: 'All Time' },
          ] as { key: DateRange; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleRangeChange(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                range === key
                  ? 'bg-white text-secondary-500 shadow-sm'
                  : 'text-gray-500 hover:text-secondary-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stat Cards with Sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default animate-card-pop overflow-hidden"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
              {card.badge && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-secondary-500 mb-1">
              {card.prefix ? (
                <AnimatedValue value={card.value} prefix={card.prefix} />
              ) : (
                <AnimatedValue value={card.value} />
              )}
            </p>
            <p className="text-xs text-gray-500 mb-2">{card.label}</p>
            <div className="-mx-5 -mb-5">
              <MiniSparkline
                data={card.sparklineData as unknown as Record<string, unknown>[]}
                dataKey={card.sparklineKey}
                color={card.sparklineColor}
                gradientId={card.gradientId}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Growth Metrics with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          {
            label: 'Vendor Signups',
            subtitle: 'Week-over-Week',
            thisWeek: data?.growthMetrics.vendorsThisWeek || 0,
            lastWeek: data?.growthMetrics.vendorsLastWeek || 0,
            growth: vendorGrowth,
            sparkData: data?.sparklines.vendors || [],
            color: '#3b82f6',
            gradId: 'vendorGrowthGrad',
          },
          {
            label: 'Customer Signups',
            subtitle: 'Week-over-Week',
            thisWeek: data?.growthMetrics.customersThisWeek || 0,
            lastWeek: data?.growthMetrics.customersLastWeek || 0,
            growth: customerGrowth,
            sparkData: data?.sparklines.customers || [],
            color: '#a855f7',
            gradId: 'customerGrowthGrad',
          },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-card-pop overflow-hidden"
            style={{ animationDelay: `${400 + index * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-secondary-500">{metric.label}</h3>
                <p className="text-xs text-gray-400">{metric.subtitle}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full ${
                metric.growth >= 0
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-500'
              }`}>
                {metric.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {metric.growth >= 0 ? '+' : ''}{metric.growth.toFixed(1)}%
              </div>
            </div>
            <div className="flex items-end gap-6 mb-3">
              <div>
                <p className="text-2xl font-bold text-secondary-500">
                  <AnimatedValue value={metric.thisWeek} />
                </p>
                <p className="text-xs text-gray-400">This week</p>
              </div>
              <div>
                <p className="text-lg text-gray-400">{metric.lastWeek}</p>
                <p className="text-xs text-gray-400">Last week</p>
              </div>
            </div>
            <div className="-mx-5 -mb-5">
              <MiniSparkline
                data={metric.sparkData as unknown as Record<string, unknown>[]}
                dataKey="count"
                color={metric.color}
                gradientId={metric.gradId}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Today's Activity (Progress Rings) + Tier Breakdown (Donut) */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Activity with Progress Rings */}
        <div
          className="card p-6 animate-card-pop"
          style={{ animationDelay: '600ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-secondary-500 mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            Today&apos;s Activity
          </h2>
          <div className="flex items-center justify-around">
            {[
              {
                label: 'Claims',
                value: data?.todayActivity.claims || 0,
                goal: DAILY_GOALS.claims,
                color: '#3b82f6',
                icon: <QrCode className="w-4 h-4 text-blue-500" />,
              },
              {
                label: 'Signups',
                value: data?.todayActivity.signups || 0,
                goal: DAILY_GOALS.signups,
                color: '#a855f7',
                icon: <UserPlus className="w-4 h-4 text-purple-500" />,
              },
              {
                label: 'Deals',
                value: data?.todayActivity.dealsCreated || 0,
                goal: DAILY_GOALS.deals,
                color: '#E8632B',
                icon: <Tag className="w-4 h-4 text-primary-500" />,
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <ProgressRing
                  value={item.value}
                  goal={item.goal}
                  color={item.color}
                />
                <div className="flex items-center gap-1">
                  {item.icon}
                  <span className="text-xs font-medium text-gray-600">{item.label}</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  / {item.goal} goal
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Breakdown — Interactive Donut Chart */}
        <div
          className="card p-6 lg:col-span-2 animate-card-pop"
          style={{ animationDelay: '700ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-secondary-500 mb-4">Active Subscriptions by Tier</h2>
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={tierChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                    animationDuration={1000}
                    animationBegin={800}
                  >
                    {tierChartData.map((_, index) => (
                      <Cell key={index} fill={tierColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TierTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {TIER_CONFIG.map(({ tier, color, price }) => {
                const count = data?.tierBreakdown[tier] || 0;
                return (
                  <div key={tier} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium text-secondary-500 capitalize group-hover:text-primary-500 transition-colors">
                        {tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-secondary-500">
                        <AnimatedValue value={count} />
                      </span>
                      <span className="text-xs text-gray-400 w-16 text-right">{formatCurrency(price)}/mo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + System Health */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div
          className="card p-6 animate-card-pop"
          style={{ animationDelay: '800ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/admin/deals', icon: <Plus className="w-5 h-5 text-primary-600" />, iconBg: 'bg-primary-100 group-hover:bg-primary-200', label: 'Create Deal', sub: 'New deal listing' },
              { href: '/admin/featured', icon: <Star className="w-5 h-5 text-amber-600" />, iconBg: 'bg-amber-100 group-hover:bg-amber-200', label: 'Manage Featured', sub: 'Featured deals' },
              { href: '/admin/claims?status=pending', icon: <ClipboardList className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-100 group-hover:bg-blue-200', label: 'Pending Claims', sub: 'Review claims' },
              { href: '/admin/categories', icon: <Grid3X3 className="w-5 h-5 text-purple-600" />, iconBg: 'bg-purple-100 group-hover:bg-purple-200', label: 'Manage Categories', sub: 'Deal categories' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${action.iconBg}`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-500">{action.label}</p>
                  <p className="text-xs text-gray-400">{action.sub}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* System Health — Animated Bars */}
        <div
          className="card p-6 animate-card-pop"
          style={{ animationDelay: '900ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary-500" />
            System Health
          </h2>
          <div className="space-y-5">
            {healthItems.map((item) => {
              const severity = item.value === 0 ? 'good' : item.value <= item.max * 0.3 ? 'warning' : 'danger';
              const barColor = severity === 'good' ? 'bg-green-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-red-500';
              const textColor = severity === 'good' ? 'text-green-600' : severity === 'warning' ? 'text-amber-600' : 'text-red-600';
              const bgColor = severity === 'good' ? 'bg-green-50' : severity === 'warning' ? 'bg-amber-50' : 'bg-red-50';
              const iconColor = severity === 'good' ? 'text-green-500' : severity === 'warning' ? 'text-amber-500' : 'text-red-500';
              const statusLabel = severity === 'good' ? 'All clear' : severity === 'warning' ? 'Needs attention' : 'Critical';
              const barPercent = Math.min((item.value / item.max) * 100, 100);

              return (
                <div key={item.label} className={`p-4 rounded-xl ${bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={iconColor}>{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-secondary-500">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${textColor}`}>{item.value}</span>
                      <p className={`text-xs font-medium ${textColor}`}>{statusLabel}</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor} ${
                        severity !== 'good' ? 'animate-pulse-slow' : ''
                      }`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed — Animated Entries */}
      <div
        className="card p-6 animate-card-pop"
        style={{ animationDelay: '1000ms', animationFillMode: 'both' }}
      >
        <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Recent Activity
        </h2>
        {(data?.recentActivity || []).length === 0 ? (
          <p className="text-gray-400 text-center py-8">No recent activity to show.</p>
        ) : (
          <div className="space-y-2">
            {(data?.recentActivity || []).map((item, index) => {
              const badge = getActivityBadge(item.type);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${getActivityBorder(item.type)} hover:bg-gray-50 hover:shadow-sm transition-all duration-200 animate-slide-up-fade`}
                  style={{ animationDelay: `${1100 + index * 60}ms`, animationFillMode: 'both' }}
                >
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary-500 truncate">{item.description}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
