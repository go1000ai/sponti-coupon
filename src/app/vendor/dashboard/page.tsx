'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import {
  Plus, Tag, Users, QrCode, TrendingUp,
  ArrowRight, Clock
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import type { Deal, Vendor } from '@/lib/types/database';

interface Analytics {
  total_deals: number;
  active_deals: number;
  total_claims: number;
  total_redemptions: number;
  conversion_rate: number;
}

export default function VendorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchData() {
      const [vendorRes, dealsRes, analyticsRes] = await Promise.all([
        supabase.from('vendors').select('*').eq('id', user!.id).single(),
        supabase
          .from('deals')
          .select('*')
          .eq('vendor_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.rpc('get_vendor_analytics', { vendor_id_param: user!.id }),
      ]);

      setVendor(vendorRes.data);
      setDeals(dealsRes.data || []);
      setAnalytics(analyticsRes.data);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary-500">
            Welcome back, {vendor?.business_name}
          </h1>
          <p className="text-gray-500 mt-1">
            {vendor?.subscription_tier && (
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full text-sm font-medium capitalize">
                {vendor.subscription_tier} Plan
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/vendor/deals/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Deal
          </Link>
          <Link href="/vendor/scan" className="btn-secondary flex items-center gap-2">
            <QrCode className="w-4 h-4" /> Scan QR
          </Link>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary-50 rounded-lg p-3">
              <Tag className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-500">{analytics?.active_deals || 0}</p>
              <p className="text-sm text-gray-500">Active Deals</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-500">{analytics?.total_claims || 0}</p>
              <p className="text-sm text-gray-500">Total Claims</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 rounded-lg p-3">
              <QrCode className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-500">{analytics?.total_redemptions || 0}</p>
              <p className="text-sm text-gray-500">Redemptions</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-50 rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-500">{analytics?.conversion_rate || 0}%</p>
              <p className="text-sm text-gray-500">Conversion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Deals */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-secondary-500">Recent Deals</h2>
          <Link href="/vendor/deals" className="text-primary-500 hover:underline text-sm font-medium flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {deals.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500">No deals yet</h3>
            <p className="text-gray-400 mt-1">Create your first deal to start attracting customers</p>
            <Link href="/vendor/deals/new" className="btn-primary inline-flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" /> Create Your First Deal
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deals.map(deal => (
              <div key={deal.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`rounded-lg p-2 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-50'}`}>
                    {deal.deal_type === 'sponti_coupon' ? (
                      <SpontiIcon className="w-5 h-5 text-primary-500" />
                    ) : (
                      <Tag className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-secondary-500 truncate">{deal.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        deal.status === 'active' ? 'bg-green-50 text-green-600' :
                        deal.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                        deal.status === 'paused' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {deal.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatPercentage(deal.discount_percentage)} off
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {deal.status === 'active' && deal.deal_type === 'sponti_coupon' && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <CountdownTimer expiresAt={deal.expires_at} size="sm" />
                    </div>
                  )}
                  <div className="text-right">
                    <p className="font-bold text-primary-500">{formatCurrency(deal.deal_price)}</p>
                    <p className="text-xs text-gray-400 line-through">{formatCurrency(deal.original_price)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-secondary-500">{deal.claims_count}</p>
                    <p className="text-xs text-gray-400">claims</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
