'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Headphones,
  Search,
  RefreshCw,
  CircleDot,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

/* ── Types ──────────────────────────── */
interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string;
  user_role: 'vendor' | 'customer';
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'billing' | 'technical' | 'account' | 'general';
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface StatusCounts {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'account', label: 'Account' },
  { value: 'general', label: 'General' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'customer', label: 'Customer' },
];

/* ── Helpers ──────────────────────────── */
function getStatusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Open' },
    in_progress: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'In Progress' },
    resolved: { bg: 'bg-green-50', text: 'text-green-600', label: 'Resolved' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Closed' },
  };
  const s = map[status] || map.open;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function getPriorityBadge(priority: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-gray-50', text: 'text-gray-500', label: 'Low' },
    medium: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Medium' },
    high: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'High' },
    urgent: { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgent' },
  };
  const p = map[priority] || map.medium;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${p.bg} ${p.text}`}>
      {p.label}
    </span>
  );
}

function getCategoryBadge(category: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    billing: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Billing' },
    technical: { bg: 'bg-cyan-50', text: 'text-cyan-600', label: 'Technical' },
    account: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Account' },
    general: { bg: 'bg-gray-50', text: 'text-gray-500', label: 'General' },
  };
  const c = map[category] || map.general;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Status Summary Cards ──────────────────────────── */
function StatusCard({
  label,
  count,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left transition-all duration-200 hover:shadow-md ${
        active ? `ring-2 ring-primary-500 shadow-md` : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {active && (
          <span className="text-[10px] font-bold text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
            ACTIVE
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{count}</p>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
    </button>
  );
}

/* ── Main Page ──────────────────────────── */
export default function AdminSupportPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(roleFilter && { user_role: roleFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const res = await fetch(`/api/admin/support?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();

      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setStatusCounts(data.statusCounts || { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 });

      if (isRefresh) showToast('success', 'Tickets refreshed');
    } catch {
      showToast('error', 'Failed to load tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, statusFilter, priorityFilter, categoryFilter, roleFilter, searchQuery]);

  useEffect(() => {
    if (!user) return;
    fetchTickets();
  }, [user, fetchTickets]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, categoryFilter, roleFilter, searchQuery]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleStatusCardClick = (status: string) => {
    setStatusFilter(prev => prev === status ? '' : status);
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Headphones className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-gray-500">
              {statusCounts.total} total &middot; {statusCounts.open} open &middot; {statusCounts.in_progress} in progress
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchTickets(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatusCard
          label="Open"
          count={statusCounts.open}
          icon={CircleDot}
          color="bg-blue-50 text-blue-500"
          active={statusFilter === 'open'}
          onClick={() => handleStatusCardClick('open')}
        />
        <StatusCard
          label="In Progress"
          count={statusCounts.in_progress}
          icon={Clock}
          color="bg-yellow-50 text-yellow-500"
          active={statusFilter === 'in_progress'}
          onClick={() => handleStatusCardClick('in_progress')}
        />
        <StatusCard
          label="Resolved"
          count={statusCounts.resolved}
          icon={CheckCircle2}
          color="bg-green-50 text-green-500"
          active={statusFilter === 'resolved'}
          onClick={() => handleStatusCardClick('resolved')}
        />
        <StatusCard
          label="Closed"
          count={statusCounts.closed}
          icon={XCircle}
          color="bg-gray-100 text-gray-500"
          active={statusFilter === 'closed'}
          onClick={() => handleStatusCardClick('closed')}
        />
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by subject or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 hidden md:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm py-2 min-w-[130px]"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field text-sm py-2 min-w-[130px]"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field text-sm py-2 min-w-[130px]"
            >
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field text-sm py-2 min-w-[120px]"
            >
              {ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Subject</th>
                <th className="p-4 font-semibold text-sm text-gray-500">User</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Role</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Status</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Priority</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Category</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Updated</th>
                <th className="p-4 font-semibold text-sm text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No support tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/admin/support/${ticket.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {ticket.priority === 'urgent' && (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <p className="font-medium text-gray-900 truncate max-w-[250px]">
                          {ticket.subject}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500 truncate max-w-[180px]">
                      {ticket.user_email}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        ticket.user_role === 'vendor'
                          ? 'bg-primary-50 text-primary-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {ticket.user_role === 'vendor' ? 'Vendor' : 'Customer'}
                      </span>
                    </td>
                    <td className="p-4">{getStatusBadge(ticket.status)}</td>
                    <td className="p-4">{getPriorityBadge(ticket.priority)}</td>
                    <td className="p-4">{getCategoryBadge(ticket.category)}</td>
                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(ticket.updated_at)}
                    </td>
                    <td className="p-4">
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
