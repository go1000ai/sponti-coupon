'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Users, QrCode, DollarSign, Tag } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Deal, Redemption } from '@/lib/types/database';

interface Analytics {
  total_deals: number;
  active_deals: number;
  total_claims: number;
  total_redemptions: number;
  conversion_rate: number;
}

export default function VendorAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    Promise.all([
      supabase.rpc('get_vendor_analytics', { vendor_id_param: user.id }),
      supabase
        .from('deals')
        .select('*')
        .eq('vendor_id', user.id)
        .eq('status', 'active')
        .order('claims_count', { ascending: false }),
      supabase
        .from('redemptions')
        .select('*, claim:claims(*, customer:customers(first_name, last_name)), deal:deals(title)')
        .eq('vendor_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(20),
    ]).then(([analyticsRes, dealsRes, redemptionsRes]) => {
      setAnalytics(analyticsRes.data);
      setDeals(dealsRes.data || []);
      setRecentRedemptions(redemptionsRes.data || []);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const totalDepositRevenue = deals.reduce((sum, d) => {
    if (d.deal_type === 'sponti_coupon' && d.deposit_amount) {
      return sum + (d.deposit_amount * d.claims_count);
    }
    return sum;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-secondary-500">Analytics</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="card p-5">
          <Tag className="w-5 h-5 text-primary-500 mb-2" />
          <p className="text-2xl font-bold text-secondary-500">{analytics?.total_deals || 0}</p>
          <p className="text-sm text-gray-500">Total Deals</p>
        </div>
        <div className="card p-5">
          <SpontiIcon className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-secondary-500">{analytics?.active_deals || 0}</p>
          <p className="text-sm text-gray-500">Active Deals</p>
        </div>
        <div className="card p-5">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-secondary-500">{analytics?.total_claims || 0}</p>
          <p className="text-sm text-gray-500">Total Claims</p>
        </div>
        <div className="card p-5">
          <QrCode className="w-5 h-5 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-secondary-500">{analytics?.total_redemptions || 0}</p>
          <p className="text-sm text-gray-500">Redemptions</p>
        </div>
        <div className="card p-5">
          <DollarSign className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-secondary-500">{formatCurrency(totalDepositRevenue)}</p>
          <p className="text-sm text-gray-500">Deposit Revenue</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Active Deals Performance */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-secondary-500">Active Deals Performance</h2>
          </div>
          {deals.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No active deals</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {deals.map(deal => (
                <div key={deal.id} className="p-4 flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-50'}`}>
                    {deal.deal_type === 'sponti_coupon' ? (
                      <SpontiIcon className="w-4 h-4 text-primary-500" />
                    ) : (
                      <Tag className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary-500 truncate">{deal.title}</p>
                    <p className="text-xs text-gray-400">{deal.discount_percentage}% off</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-secondary-500">{deal.claims_count}</p>
                    <p className="text-xs text-gray-400">claims</p>
                  </div>
                  {deal.max_claims && (
                    <div className="w-20">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-primary-500 h-1.5 rounded-full"
                          style={{ width: `${(deal.claims_count / deal.max_claims) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Redemptions */}
        <div className="card">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-secondary-500">Recent Redemptions</h2>
          </div>
          {recentRedemptions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No redemptions yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentRedemptions.map(r => (
                <div key={r.id} className="p-4 flex items-center gap-3">
                  <div className="bg-green-50 rounded-full p-2">
                    <QrCode className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary-500 truncate text-sm">
                      {(r as Redemption & { deal?: { title: string } }).deal?.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(r as Redemption & { claim?: { customer?: { first_name: string; last_name: string } } }).claim?.customer?.first_name} {(r as Redemption & { claim?: { customer?: { first_name: string; last_name: string } } }).claim?.customer?.last_name}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(r.scanned_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
