'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Store,
  Tag,
  DollarSign,
  TrendingUp,
  QrCode,
  UserPlus,
  Clock,
} from 'lucide-react';
import type { Subscription } from '@/lib/types/database';

interface AdminStats {
  totalVendors: number;
  totalCustomers: number;
  activeDeals: number;
  mrr: number;
  tierBreakdown: Record<string, number>;
}

interface TodayActivity {
  claimsToday: number;
  signupsToday: number;
  dealsCreatedToday: number;
}

interface RecentActivityItem {
  id: string;
  type: 'claim' | 'redemption' | 'signup' | 'deal';
  description: string;
  timestamp: string;
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [todayActivity, setTodayActivity] = useState<TodayActivity | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchOverviewData() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const [
        vendorsRes,
        customersRes,
        dealsRes,
        subsRes,
        claimsTodayRes,
        signupsTodayRes,
        dealsCreatedTodayRes,
        recentClaimsRes,
        recentRedemptionsRes,
        recentCustomersRes,
        recentDealsRes,
      ] = await Promise.all([
        supabase.from('vendors').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('subscriptions').select('*').eq('status', 'active'),
        supabase.from('claims').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('deals').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase
          .from('claims')
          .select('id, created_at, customer:customers(first_name, last_name), deal:deals(title)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('redemptions')
          .select('id, scanned_at, customer:customers(first_name, last_name), deal:deals(title)')
          .order('scanned_at', { ascending: false })
          .limit(5),
        supabase
          .from('customers')
          .select('id, first_name, last_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('deals')
          .select('id, title, created_at, vendor:vendors(business_name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const subs = subsRes.data || [];
      const tierBreakdown: Record<string, number> = {};
      let mrr = 0;
      const tierPrices: Record<string, number> = {
        starter: 49,
        pro: 99,
        business: 199,
        enterprise: 499,
      };

      subs.forEach((sub: Subscription) => {
        tierBreakdown[sub.tier] = (tierBreakdown[sub.tier] || 0) + 1;
        mrr += tierPrices[sub.tier] || 0;
      });

      setStats({
        totalVendors: vendorsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        activeDeals: dealsRes.count || 0,
        mrr,
        tierBreakdown,
      });

      setTodayActivity({
        claimsToday: claimsTodayRes.count || 0,
        signupsToday: signupsTodayRes.count || 0,
        dealsCreatedToday: dealsCreatedTodayRes.count || 0,
      });

      // Build recent activity feed
      const activity: RecentActivityItem[] = [];

      (recentClaimsRes.data || []).forEach((claim: Record<string, unknown>) => {
        const customer = claim.customer as { first_name: string | null; last_name: string | null } | null;
        const deal = claim.deal as { title: string } | null;
        activity.push({
          id: `claim-${claim.id}`,
          type: 'claim',
          description: `${customer?.first_name || 'A customer'} ${customer?.last_name || ''} claimed "${deal?.title || 'a deal'}"`,
          timestamp: claim.created_at as string,
        });
      });

      (recentRedemptionsRes.data || []).forEach((redemption: Record<string, unknown>) => {
        const customer = redemption.customer as { first_name: string | null; last_name: string | null } | null;
        const deal = redemption.deal as { title: string } | null;
        activity.push({
          id: `redemption-${redemption.id}`,
          type: 'redemption',
          description: `${customer?.first_name || 'A customer'} ${customer?.last_name || ''} redeemed "${deal?.title || 'a deal'}"`,
          timestamp: redemption.scanned_at as string,
        });
      });

      (recentCustomersRes.data || []).forEach((cust: Record<string, unknown>) => {
        activity.push({
          id: `signup-${cust.id}`,
          type: 'signup',
          description: `${cust.first_name || 'New customer'} ${cust.last_name || ''} signed up`,
          timestamp: cust.created_at as string,
        });
      });

      (recentDealsRes.data || []).forEach((deal: Record<string, unknown>) => {
        const vendor = deal.vendor as { business_name: string } | null;
        activity.push({
          id: `deal-${deal.id}`,
          type: 'deal',
          description: `${vendor?.business_name || 'A vendor'} created "${deal.title}"`,
          timestamp: deal.created_at as string,
        });
      });

      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 10));
      setLoading(false);
    }

    fetchOverviewData();
  }, [user]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-secondary-500">Dashboard Overview</h1>
          <p className="text-sm text-gray-500">Platform performance at a glance</p>
        </div>
      </div>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-6 h-6 text-green-500" />
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">MRR</span>
          </div>
          <p className="text-3xl font-bold text-secondary-500">{formatCurrency(stats?.mrr || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Monthly Recurring Revenue</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Store className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{stats?.totalVendors || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Vendors</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{stats?.totalCustomers || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total Customers</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <Tag className="w-6 h-6 text-primary-500" />
          </div>
          <p className="text-3xl font-bold text-secondary-500">{stats?.activeDeals || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Active Deals</p>
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
              <span className="text-xl font-bold text-secondary-500">{todayActivity?.claimsToday || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">New Signups</span>
              </div>
              <span className="text-xl font-bold text-secondary-500">{todayActivity?.signupsToday || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-700">Deals Created</span>
              </div>
              <span className="text-xl font-bold text-secondary-500">{todayActivity?.dealsCreatedToday || 0}</span>
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
                  {stats?.tierBreakdown[tier] || 0}
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

      {/* Recent Activity Feed */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No recent activity to show.</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item) => (
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
