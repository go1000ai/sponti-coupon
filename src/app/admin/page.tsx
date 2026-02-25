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

type DateRange = 'today' | '7d' | '30d' | 'all';

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
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');

  const fetchData = useCallback(async (selectedRange: DateRange) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/overview?range=${selectedRange}`);
      if (!res.ok) throw new Error('Failed to fetch overview data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData(range);
  }, [user, range, fetchData]);

  const handleRangeChange = (newRange: DateRange) => {
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

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'claim': return 'bg-blue-50';
      case 'redemption': return 'bg-green-50';
      case 'signup': return 'bg-purple-50';
      case 'deal': return 'bg-primary-50';
      default: return 'bg-gray-50';
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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Dashboard Overview</h1>
            <p className="text-sm text-gray-500">Platform performance at a glance</p>
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {([
            { key: 'today', label: 'Today' },
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: 'all', label: 'All Time' },
          ] as { key: DateRange; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleRangeChange(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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

      {/* Main Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-6 h-6 text-green-500" />
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">MRR</span>
          </div>
          <p className="text-3xl font-bold text-secondary-500">{formatCurrency(data?.mrr || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Monthly Recurring Revenue</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Store className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{data?.totalVendors || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Vendors</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{data?.totalCustomers || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Customers</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Tag className="w-6 h-6 text-primary-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{data?.activeDeals || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Active Deals</p>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Vendor Signups (Week-over-Week)</h3>
            <div className={`flex items-center gap-1 text-sm font-medium ${vendorGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {vendorGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {vendorGrowth >= 0 ? '+' : ''}{vendorGrowth.toFixed(1)}%
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-2xl font-bold text-secondary-500">{data?.growthMetrics.vendorsThisWeek || 0}</p>
              <p className="text-xs text-gray-400">This week</p>
            </div>
            <div className="text-right">
              <p className="text-lg text-gray-400">{data?.growthMetrics.vendorsLastWeek || 0}</p>
              <p className="text-xs text-gray-400">Last week</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Customer Signups (Week-over-Week)</h3>
            <div className={`flex items-center gap-1 text-sm font-medium ${customerGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {customerGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {customerGrowth >= 0 ? '+' : ''}{customerGrowth.toFixed(1)}%
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-2xl font-bold text-secondary-500">{data?.growthMetrics.customersThisWeek || 0}</p>
              <p className="text-xs text-gray-400">This week</p>
            </div>
            <div className="text-right">
              <p className="text-lg text-gray-400">{data?.growthMetrics.customersLastWeek || 0}</p>
              <p className="text-xs text-gray-400">Last week</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Activity */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            Today&apos;s Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Claims</span>
              </div>
              <span className="text-xl font-bold text-secondary-500">{data?.todayActivity.claims || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">New Signups</span>
              </div>
              <span className="text-xl font-bold text-secondary-500">{data?.todayActivity.signups || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-700">Deals Created</span>
              </div>
              <span className="text-xl font-bold text-secondary-500">{data?.todayActivity.dealsCreated || 0}</span>
            </div>
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-secondary-500 mb-4">Active Subscriptions by Tier</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { tier: 'starter', color: 'bg-blue-50 text-blue-600', price: 49 },
              { tier: 'pro', color: 'bg-primary-50 text-primary-600', price: 99 },
              { tier: 'business', color: 'bg-purple-50 text-purple-600', price: 199 },
              { tier: 'enterprise', color: 'bg-amber-50 text-amber-600', price: 499 },
            ].map(({ tier, color, price }) => (
              <div key={tier} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-secondary-500">
                  {data?.tierBreakdown[tier] || 0}
                </p>
                <p className={`text-xs font-medium px-2 py-1 rounded-full inline-block mt-2 capitalize ${color}`}>
                  {tier}
                </p>
                <p className="text-xs text-gray-400 mt-1">{formatCurrency(price)}/mo</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions + System Health */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/deals"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <Plus className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-500">Create Deal</p>
                <p className="text-xs text-gray-400">New deal listing</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-primary-500 transition-colors" />
            </Link>
            <Link
              href="/admin/featured"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-500">Manage Featured</p>
                <p className="text-xs text-gray-400">Featured deals</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-primary-500 transition-colors" />
            </Link>
            <Link
              href="/admin/claims?status=pending"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-500">Pending Claims</p>
                <p className="text-xs text-gray-400">Review claims</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-primary-500 transition-colors" />
            </Link>
            <Link
              href="/admin/categories"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Grid3X3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-500">Manage Categories</p>
                <p className="text-xs text-gray-400">Deal categories</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-primary-500 transition-colors" />
            </Link>
          </div>
        </div>

        {/* System Health */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary-500" />
            System Health
          </h2>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              (data?.systemHealth.expiredUncleared || 0) > 0 ? 'bg-red-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  (data?.systemHealth.expiredUncleared || 0) > 0 ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <Clock className={`w-5 h-5 ${
                    (data?.systemHealth.expiredUncleared || 0) > 0 ? 'text-red-500' : 'text-green-500'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-500">Expired Deals Needing Cleanup</p>
                  <p className="text-xs text-gray-400">Active deals past expiration date</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${
                (data?.systemHealth.expiredUncleared || 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {data?.systemHealth.expiredUncleared || 0}
              </span>
            </div>
            <div className={`flex items-center justify-between p-4 rounded-lg ${
              (data?.systemHealth.pendingDeposits || 0) > 5 ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  (data?.systemHealth.pendingDeposits || 0) > 5 ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  <DollarSign className={`w-5 h-5 ${
                    (data?.systemHealth.pendingDeposits || 0) > 5 ? 'text-amber-500' : 'text-green-500'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-500">Pending Deposits</p>
                  <p className="text-xs text-gray-400">Unconfirmed claim deposits</p>
                </div>
              </div>
              <span className={`text-2xl font-bold ${
                (data?.systemHealth.pendingDeposits || 0) > 5 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {data?.systemHealth.pendingDeposits || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Recent Activity
        </h2>
        {(data?.recentActivity || []).length === 0 ? (
          <p className="text-gray-400 text-center py-8">No recent activity to show.</p>
        ) : (
          <div className="space-y-3">
            {(data?.recentActivity || []).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(item.type)}`}>
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-secondary-500 truncate">{item.description}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
