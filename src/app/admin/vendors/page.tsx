'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Store,
  Search,
  ChevronUp,
  Eye,
  Ban,
  CheckCircle,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Tag,
  QrCode,
} from 'lucide-react';
import type { Vendor } from '@/lib/types/database';

interface VendorWithStats extends Vendor {
  deal_count?: number;
  total_claims?: number;
}

export default function AdminVendorsPage() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<VendorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchVendors() {
      const { data: vendorsData } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (!vendorsData) {
        setLoading(false);
        return;
      }

      // Fetch deal counts and claims for each vendor
      const vendorIds = vendorsData.map(v => v.id);

      const [dealsRes, claimsRes] = await Promise.all([
        supabase
          .from('deals')
          .select('vendor_id')
          .in('vendor_id', vendorIds),
        supabase
          .from('claims')
          .select('deal:deals(vendor_id)')
          .in('deal.vendor_id', vendorIds),
      ]);

      const dealCounts: Record<string, number> = {};
      (dealsRes.data || []).forEach((d: { vendor_id: string }) => {
        dealCounts[d.vendor_id] = (dealCounts[d.vendor_id] || 0) + 1;
      });

      const claimCounts: Record<string, number> = {};
      (claimsRes.data || []).forEach((c: Record<string, unknown>) => {
        const deal = c.deal as { vendor_id: string } | { vendor_id: string }[] | null;
        const vid = Array.isArray(deal) ? deal[0]?.vendor_id : deal?.vendor_id;
        if (vid) claimCounts[vid] = (claimCounts[vid] || 0) + 1;
      });

      const enriched: VendorWithStats[] = vendorsData.map(v => ({
        ...v,
        deal_count: dealCounts[v.id] || 0,
        total_claims: claimCounts[v.id] || 0,
      }));

      setVendors(enriched);
      setLoading(false);
    }

    fetchVendors();
  }, [user]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch =
        searchQuery === '' ||
        v.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.city && v.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (v.subscription_status || 'inactive') === statusFilter;

      const matchesTier =
        tierFilter === 'all' ||
        (v.subscription_tier || 'none') === tierFilter;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [vendors, searchQuery, statusFilter, tierFilter]);

  const handleSuspendVendor = async (vendorId: string) => {
    const supabase = createClient();
    await supabase
      .from('vendors')
      .update({ subscription_status: 'canceled' })
      .eq('id', vendorId);
    setVendors(prev =>
      prev.map(v => (v.id === vendorId ? { ...v, subscription_status: 'canceled' } : v))
    );
  };

  const handleActivateVendor = async (vendorId: string) => {
    const supabase = createClient();
    await supabase
      .from('vendors')
      .update({ subscription_status: 'active' })
      .eq('id', vendorId);
    setVendors(prev =>
      prev.map(v => (v.id === vendorId ? { ...v, subscription_status: 'active' } : v))
    );
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Store className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Vendor Management</h1>
            <p className="text-sm text-gray-500">{vendors.length} total vendors</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      {/* Table */}
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
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Deals</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No vendors found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <>
                    <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-secondary-500">{vendor.business_name}</td>
                      <td className="p-4 text-sm text-gray-500">{vendor.email}</td>
                      <td className="p-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium capitalize">
                          {vendor.subscription_tier || 'none'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            vendor.subscription_status === 'active'
                              ? 'bg-green-50 text-green-600'
                              : vendor.subscription_status === 'canceled'
                              ? 'bg-red-50 text-red-500'
                              : vendor.subscription_status === 'past_due'
                              ? 'bg-yellow-50 text-yellow-600'
                              : vendor.subscription_status === 'trialing'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {vendor.subscription_status || 'inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {vendor.city ? `${vendor.city}, ${vendor.state}` : '--'}
                      </td>
                      <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                        {vendor.deal_count || 0}
                      </td>
                      <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                        {vendor.total_claims || 0}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)
                            }
                            className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                            title="View Details"
                          >
                            {expandedVendor === vendor.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          {vendor.subscription_status === 'active' ? (
                            <button
                              onClick={() => handleSuspendVendor(vendor.id)}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                              title="Suspend"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateVendor(vendor.id)}
                              className="text-green-500 hover:bg-green-50 p-2 rounded-lg transition-colors"
                              title="Activate"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {expandedVendor === vendor.id && (
                      <tr key={`${vendor.id}-details`}>
                        <td colSpan={8} className="p-0">
                          <div className="bg-gray-50 p-6 border-t border-gray-100">
                            <div className="flex items-start justify-between mb-4">
                              <h3 className="text-lg font-bold text-secondary-500">
                                {vendor.business_name} Details
                              </h3>
                              <button
                                onClick={() => setExpandedVendor(null)}
                                className="text-gray-400 hover:text-gray-600 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{vendor.email}</span>
                              </div>
                              {vendor.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">{vendor.phone}</span>
                                </div>
                              )}
                              {vendor.address && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">
                                    {vendor.address}, {vendor.city}, {vendor.state} {vendor.zip}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">
                                  Joined {new Date(vendor.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Tag className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">
                                  {vendor.deal_count || 0} deals created
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <QrCode className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">
                                  {vendor.total_claims || 0} total claims
                                </span>
                              </div>
                              {vendor.category && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Store className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">Category: {vendor.category}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
