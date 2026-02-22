'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import {
  LayoutDashboard, Users, Store, Tag, DollarSign,
  Ban, Star
} from 'lucide-react';
import type { Vendor, Deal, Subscription } from '@/lib/types/database';

interface AdminStats {
  totalVendors: number;
  totalCustomers: number;
  totalDeals: number;
  activeDeals: number;
  totalSubscriptions: number;
  mrr: number;
  tierBreakdown: Record<string, number>;
}

export default function AdminPage() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'vendors' | 'deals'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    const supabase = createClient();

    async function fetchAdminData() {
      const [vendorsRes, customersRes, dealsRes, subsRes] = await Promise.all([
        supabase.from('vendors').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('deals').select('*, vendor:vendors(business_name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('subscriptions').select('*').eq('status', 'active'),
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
        totalVendors: vendorsRes.data?.length || 0,
        totalCustomers: customersRes.count || 0,
        totalDeals: dealsRes.data?.length || 0,
        activeDeals: dealsRes.data?.filter(d => d.status === 'active').length || 0,
        totalSubscriptions: subs.length,
        mrr,
        tierBreakdown,
      });

      setVendors(vendorsRes.data || []);
      setDeals(dealsRes.data || []);
      setLoading(false);
    }

    fetchAdminData();
  }, [user, role]);

  const handleSuspendVendor = async (vendorId: string) => {
    const supabase = createClient();
    await supabase.from('vendors').update({ subscription_status: 'canceled' }).eq('id', vendorId);
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, subscription_status: 'canceled' } : v));
  };

  const handleFeatureDeal = async (dealId: string) => {
    const supabase = createClient();
    await supabase.from('featured_deals').insert({ deal_id: dealId, position: 0 });
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Ban className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-500">Access Denied</h1>
          <p className="text-gray-400 mt-2">Admin access only</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-secondary-500">Admin Portal</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 pb-2">
        {(['overview', 'vendors', 'deals'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card p-6">
              <DollarSign className="w-6 h-6 text-green-500 mb-2" />
              <p className="text-3xl font-bold text-secondary-500">{formatCurrency(stats.mrr)}</p>
              <p className="text-sm text-gray-500">Monthly Recurring Revenue</p>
            </div>
            <div className="card p-6">
              <Store className="w-6 h-6 text-blue-500 mb-2" />
              <p className="text-3xl font-bold text-secondary-500">{stats.totalVendors}</p>
              <p className="text-sm text-gray-500">Total Vendors</p>
            </div>
            <div className="card p-6">
              <Users className="w-6 h-6 text-purple-500 mb-2" />
              <p className="text-3xl font-bold text-secondary-500">{stats.totalCustomers}</p>
              <p className="text-sm text-gray-500">Total Customers</p>
            </div>
            <div className="card p-6">
              <Tag className="w-6 h-6 text-primary-500 mb-2" />
              <p className="text-3xl font-bold text-secondary-500">{stats.activeDeals}</p>
              <p className="text-sm text-gray-500">Active Deals</p>
            </div>
          </div>

          {/* Tier Breakdown */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-secondary-500 mb-4">Active Subscriptions by Tier</h2>
            <div className="grid grid-cols-4 gap-4">
              {['starter', 'pro', 'business', 'enterprise'].map(tier => (
                <div key={tier} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-secondary-500">{stats.tierBreakdown[tier] || 0}</p>
                  <p className="text-sm text-gray-500 capitalize">{tier}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vendors Tab */}
      {activeTab === 'vendors' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-semibold text-sm text-gray-500">Business</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Email</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Tier</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Location</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendors.map(vendor => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-secondary-500">{vendor.business_name}</td>
                    <td className="p-4 text-sm text-gray-500">{vendor.email}</td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium capitalize">
                        {vendor.subscription_tier || 'none'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        vendor.subscription_status === 'active' ? 'bg-green-50 text-green-600' :
                        vendor.subscription_status === 'canceled' ? 'bg-red-50 text-red-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {vendor.subscription_status || 'inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {vendor.city && `${vendor.city}, ${vendor.state}`}
                    </td>
                    <td className="p-4">
                      {vendor.subscription_status === 'active' && (
                        <button
                          onClick={() => handleSuspendVendor(vendor.id)}
                          className="text-red-500 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deals Tab */}
      {activeTab === 'deals' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Type</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Claims</th>
                  <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {deals.map(deal => (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-secondary-500">{deal.title}</td>
                    <td className="p-4 text-sm text-gray-500">{(deal.vendor as Deal['vendor'])?.business_name}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        deal.deal_type === 'sponti_coupon' ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {deal.deal_type === 'sponti_coupon' ? 'Sponti' : 'Regular'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        deal.status === 'active' ? 'bg-green-50 text-green-600' :
                        deal.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                        'bg-yellow-50 text-yellow-600'
                      }`}>
                        {deal.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium">{deal.claims_count}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleFeatureDeal(deal.id)}
                        className="text-primary-500 hover:bg-primary-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" /> Feature
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
