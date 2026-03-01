'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  UsersRound,
  Search,
  RefreshCw,
  Mail,
  Shield,
  Crown,
  Star,
} from 'lucide-react';

interface TeamMember {
  id: string;
  vendor_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'staff';
  created_at: string;
  vendor_name: string;
  user_name: string;
  user_email: string | null;
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Crown, color: 'text-red-600 bg-red-50' },
  manager: { label: 'Manager', icon: Star, color: 'text-blue-600 bg-blue-50' },
  staff: { label: 'Staff', icon: Shield, color: 'text-green-600 bg-green-50' },
};

export default function AdminTeamsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await fetch(`/api/admin/teams?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch team members');

      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      showToast('Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchData();
  }, [user, role, fetchData]);

  // Stats
  const stats = useMemo(() => ({
    total: members.length,
    admins: members.filter((m) => m.role === 'admin').length,
    managers: members.filter((m) => m.role === 'manager').length,
    staff: members.filter((m) => m.role === 'staff').length,
  }), [members]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <UsersRound className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm text-gray-500">{members.length} total team members</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Members</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
          <p className="text-xs text-gray-500">Admins</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.managers}</p>
          <p className="text-xs text-gray-500">Managers</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-green-600">{stats.staff}</p>
          <p className="text-xs text-gray-500">Staff</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field w-full sm:w-40"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Member Name</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Email</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Vendor</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Role</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading team members...
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <UsersRound className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No team members found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.staff;
                  const RoleIcon = roleConfig.icon;
                  return (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-xl p-2.5 ${roleConfig.color}`}>
                            <RoleIcon className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-gray-900">{member.user_name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {member.user_email ? (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {member.user_email}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300 italic">No email</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-gray-900">
                          {member.vendor_name}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-500">
                          {new Date(member.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(member.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
