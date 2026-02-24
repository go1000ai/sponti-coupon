'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  Search,
  Mail,
  MapPin,
  QrCode,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import type { Customer } from '@/lib/types/database';

interface CustomerWithStats extends Customer {
  total_claims: number;
  total_redeemed: number;
  total_saved: number;
}

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchCustomers() {
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!customersData) {
        setLoading(false);
        return;
      }

      const customerIds = customersData.map(c => c.id);

      // Fetch claims for these customers with deal info for savings calculation
      const { data: claimsData } = await supabase
        .from('claims')
        .select('customer_id, redeemed, deal:deals(original_price, deal_price)')
        .in('customer_id', customerIds);

      const statsMap: Record<string, { total_claims: number; total_redeemed: number; total_saved: number }> = {};

      (claimsData || []).forEach((claim: Record<string, unknown>) => {
        const customerId = claim.customer_id as string;
        const redeemed = claim.redeemed as boolean;
        const dealRaw = claim.deal as { original_price: number; deal_price: number } | { original_price: number; deal_price: number }[] | null;
        const deal = Array.isArray(dealRaw) ? dealRaw[0] : dealRaw;

        if (!statsMap[customerId]) {
          statsMap[customerId] = { total_claims: 0, total_redeemed: 0, total_saved: 0 };
        }
        statsMap[customerId].total_claims += 1;
        if (redeemed) {
          statsMap[customerId].total_redeemed += 1;
          if (deal) {
            statsMap[customerId].total_saved += (deal.original_price - deal.deal_price);
          }
        }
      });

      const enriched: CustomerWithStats[] = customersData.map(c => ({
        ...c,
        total_claims: statsMap[c.id]?.total_claims || 0,
        total_redeemed: statsMap[c.id]?.total_redeemed || 0,
        total_saved: statsMap[c.id]?.total_saved || 0,
      }));

      setCustomers(enriched);
      setLoading(false);
    }

    fetchCustomers();
  }, [user]);

  const filteredCustomers = useMemo(() => {
    if (searchQuery === '') return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      (c.first_name && c.first_name.toLowerCase().includes(q)) ||
      (c.last_name && c.last_name.toLowerCase().includes(q)) ||
      c.email.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

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
          <Users className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Customer Management</h1>
            <p className="text-sm text-gray-500">{customers.length} total customers</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Total Customers</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">{customers.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Total Claims</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">
            {customers.reduce((sum, c) => sum + c.total_claims, 0)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Total Redeemed</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">
            {customers.reduce((sum, c) => sum + c.total_redeemed, 0)}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Total Savings</span>
          </div>
          <p className="text-2xl font-bold text-secondary-500">
            {formatCurrency(customers.reduce((sum, c) => sum + c.total_saved, 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Email</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Location</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Claims</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Redeemed</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-right">Total Saved</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {(customer.first_name?.[0] || customer.email[0]).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-secondary-500">
                          {customer.first_name || ''} {customer.last_name || ''}
                          {!customer.first_name && !customer.last_name && (
                            <span className="text-gray-400 italic">No name</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </div>
                    </td>
                    <td className="p-4">
                      {customer.city ? (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {customer.city}, {customer.state}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {customer.total_claims}
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {customer.total_redeemed}
                    </td>
                    <td className="p-4 text-sm text-green-600 font-medium text-right">
                      {customer.total_saved > 0 ? formatCurrency(customer.total_saved) : '--'}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString()}
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
