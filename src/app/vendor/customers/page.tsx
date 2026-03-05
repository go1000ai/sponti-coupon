'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Mail, Copy, Check, Filter } from 'lucide-react';

interface CustomerClaim {
  claim_id: string;
  customer_name: string;
  customer_email: string;
  deal_title: string;
  deal_ref: string;
  claimed_at: string;
  redeemed_at: string | null;
  status: 'active' | 'redeemed' | 'expired';
}

interface DealOption {
  id: string;
  title: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  redeemed: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-500',
};

export default function VendorCustomersPage() {
  const [customers, setCustomers] = useState<CustomerClaim[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dealFilter, setDealFilter] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (dealFilter) params.set('deal_id', dealFilter);

    const res = await fetch(`/api/vendor/customers?${params}`);
    const data = await res.json();
    setCustomers(data.customers || []);
    if (data.deals) setDeals(data.deals);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [dealFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="inline-flex bg-primary-50 rounded-full p-3">
          <Users className="w-7 h-7 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm">Everyone who claimed your deals</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="input-field pl-10 w-full"
              />
            </div>
            <button type="submit" className="btn-primary px-4">Search</button>
          </form>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={dealFilter}
              onChange={e => setDealFilter(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Deals</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
          <p className="text-xs text-gray-500">Total Claims</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{customers.filter(c => c.status === 'redeemed').length}</p>
          <p className="text-xs text-gray-500">Redeemed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{customers.filter(c => c.status === 'active').length}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No customers found</p>
          <p className="text-gray-400 text-sm mt-1">Customers will appear here when they claim your deals</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Deal</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map(c => (
                  <tr key={c.claim_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.customer_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{c.customer_email}</span>
                        <button
                          onClick={() => copyEmail(c.customer_email)}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                          title="Copy email"
                        >
                          {copiedEmail === c.customer_email ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{c.deal_title}</p>
                      <p className="text-[10px] text-gray-400 font-mono">#{c.deal_ref}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(c.claimed_at)}
                      {c.redeemed_at && (
                        <p className="text-blue-500">Redeemed {formatDate(c.redeemed_at)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_STYLES[c.status]}`}>
                        {c.status}
                      </span>
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
