'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  QrCode,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

type ClaimStatus = 'active' | 'redeemed' | 'expired' | 'pending';

interface ClaimRow {
  id: string;
  customer_name: string;
  deal_title: string;
  vendor_name: string;
  status: ClaimStatus;
  deposit_confirmed: boolean;
  created_at: string;
  redeemed_at: string | null;
  expires_at: string;
}

export default function AdminClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchClaims() {
      const { data } = await supabase
        .from('claims')
        .select(`
          id,
          deposit_confirmed,
          redeemed,
          redeemed_at,
          expires_at,
          created_at,
          customer:customers(first_name, last_name),
          deal:deals(title, vendor:vendors(business_name))
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!data) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const rows: ClaimRow[] = data.map((claim: Record<string, unknown>) => {
        const customer = claim.customer as { first_name: string | null; last_name: string | null } | null;
        const deal = claim.deal as { title: string; vendor: { business_name: string } | null } | null;

        let status: ClaimStatus;
        if (claim.redeemed) {
          status = 'redeemed';
        } else if (!claim.deposit_confirmed) {
          status = 'pending';
        } else if (new Date(claim.expires_at as string) < now) {
          status = 'expired';
        } else {
          status = 'active';
        }

        return {
          id: claim.id as string,
          customer_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown',
          deal_title: deal?.title || 'Unknown Deal',
          vendor_name: deal?.vendor?.business_name || 'Unknown Vendor',
          status,
          deposit_confirmed: claim.deposit_confirmed as boolean,
          created_at: claim.created_at as string,
          redeemed_at: claim.redeemed_at as string | null,
          expires_at: claim.expires_at as string,
        };
      });

      setClaims(rows);
      setLoading(false);
    }

    fetchClaims();
  }, [user]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch =
        searchQuery === '' ||
        c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.deal_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claims, searchQuery, statusFilter]);

  const getStatusIcon = (status: ClaimStatus) => {
    switch (status) {
      case 'active': return <Clock className="w-3 h-3" />;
      case 'redeemed': return <CheckCircle className="w-3 h-3" />;
      case 'expired': return <XCircle className="w-3 h-3" />;
      case 'pending': return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getStatusBadgeClass = (status: ClaimStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-50 text-blue-600';
      case 'redeemed': return 'bg-green-50 text-green-600';
      case 'expired': return 'bg-gray-100 text-gray-500';
      case 'pending': return 'bg-yellow-50 text-yellow-600';
    }
  };

  // Stats
  const statusCounts = {
    active: claims.filter(c => c.status === 'active').length,
    redeemed: claims.filter(c => c.status === 'redeemed').length,
    expired: claims.filter(c => c.status === 'expired').length,
    pending: claims.filter(c => c.status === 'pending').length,
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
          <QrCode className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Claims Management</h1>
            <p className="text-sm text-gray-500">{claims.length} total claims</p>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active', count: statusCounts.active, color: 'text-blue-500', bg: 'bg-blue-50', icon: <Clock className="w-5 h-5" /> },
          { label: 'Redeemed', count: statusCounts.redeemed, color: 'text-green-500', bg: 'bg-green-50', icon: <CheckCircle className="w-5 h-5" /> },
          { label: 'Expired', count: statusCounts.expired, color: 'text-gray-500', bg: 'bg-gray-100', icon: <XCircle className="w-5 h-5" /> },
          { label: 'Pending', count: statusCounts.pending, color: 'text-yellow-500', bg: 'bg-yellow-50', icon: <AlertCircle className="w-5 h-5" /> },
        ].map(({ label, count, color, bg, icon }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(statusFilter === label.toLowerCase() ? 'all' : label.toLowerCase())}
            className={`card p-4 text-left transition-all hover:shadow-lg ${
              statusFilter === label.toLowerCase() ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className={`inline-flex p-2 rounded-lg ${bg} ${color} mb-2`}>
              {icon}
            </div>
            <p className="text-2xl font-bold text-secondary-500">{count}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, deal, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full sm:w-40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="redeemed">Redeemed</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Customer</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Deal</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Claimed</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Redeemed</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No claims found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-secondary-500">{claim.customer_name}</span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-secondary-500 truncate max-w-[180px]">
                        {claim.deal_title}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{claim.vendor_name}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeClass(claim.status)}`}
                      >
                        {getStatusIcon(claim.status)}
                        {claim.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {claim.redeemed_at
                        ? new Date(claim.redeemed_at).toLocaleDateString()
                        : '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(claim.expires_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
