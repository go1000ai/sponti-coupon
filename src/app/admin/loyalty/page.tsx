'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Gift,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Award,
  Hash,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LoyaltyProgram {
  id: string;
  vendor_id: string;
  name: string;
  type: 'punch_card' | 'points';
  punch_target: number | null;
  points_per_dollar: number | null;
  is_active: boolean;
  created_at: string;
  vendor?: { business_name: string } | null;
  rewards_count: number;
  cards_count: number;
}

interface EditFormData {
  name: string;
  type: 'punch_card' | 'points';
  punch_target: string;
  points_per_dollar: string;
  is_active: boolean;
}

const PAGE_SIZE = 15;

// --- Inline Sub-Components ---

function AnimatedValue({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 700;
    const steps = 35;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(
          decimals > 0
            ? parseFloat(current.toFixed(decimals))
            : Math.round(current)
        );
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, decimals]);
  return (
    <>
      {prefix}
      {decimals > 0
        ? display.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : display.toLocaleString()}
      {suffix}
    </>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload || !payload[0]) return null;
  const item = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: item.payload.fill }}
        />
        <p className="font-semibold text-secondary-500 capitalize">
          {item.name}
        </p>
      </div>
      <p className="text-sm text-gray-500">
        {item.value} program{item.value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

function SkeletonLoyalty() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        <div>
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-200 rounded mt-1" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
            <div className="flex items-center justify-center">
              <div className="w-[160px] h-[160px] bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Search skeleton */}
      <div className="card p-4 mb-6">
        <div className="h-10 w-full bg-gray-200 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 w-20 bg-gray-200 rounded flex-1" />
            ))}
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-50">
            <div className="flex gap-4">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---

export default function AdminLoyaltyPage() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Edit modal state
  const [editProgram, setEditProgram] = useState<LoyaltyProgram | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    type: 'punch_card',
    punch_target: '',
    points_per_dollar: '',
    is_active: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete dialog state
  const [deleteProgram, setDeleteProgram] = useState<LoyaltyProgram | null>(
    null
  );
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/loyalty');
      if (!res.ok) throw new Error('Failed to fetch loyalty programs');
      const data = await res.json();
      setPrograms(data.programs || []);
    } catch {
      // Silent fail — table will show empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchPrograms();
  }, [user, fetchPrograms]);

  // Filtered + paginated data
  const filteredPrograms = useMemo(() => {
    if (!searchQuery) return programs;
    const q = searchQuery.toLowerCase();
    return programs.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const vendorName = (p.vendor?.business_name || '').toLowerCase();
      return name.includes(q) || vendorName.includes(q);
    });
  }, [programs, searchQuery]);

  const totalPages = Math.ceil(filteredPrograms.length / PAGE_SIZE);
  const paginatedPrograms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPrograms.slice(start, start + PAGE_SIZE);
  }, [filteredPrograms, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // --- Helpers ---

  const getTypeBadge = (type: 'punch_card' | 'points') => {
    if (type === 'punch_card') {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-purple-50 text-purple-600">
          <Hash className="w-3 h-3" />
          Punch Card
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-blue-50 text-blue-600">
        <TrendingUp className="w-3 h-3" />
        Points
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-50 text-green-600">
        Active
      </span>
    ) : (
      <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-500">
        Inactive
      </span>
    );
  };

  // --- Edit Handlers ---

  const openEditModal = (program: LoyaltyProgram) => {
    setFormData({
      name: program.name,
      type: program.type,
      punch_target:
        program.punch_target != null ? String(program.punch_target) : '',
      points_per_dollar:
        program.points_per_dollar != null
          ? String(program.points_per_dollar)
          : '',
      is_active: program.is_active,
    });
    setFormError('');
    setEditProgram(program);
  };

  const closeEditModal = () => {
    setEditProgram(null);
    setFormError('');
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEdit = async () => {
    if (!editProgram) return;
    if (!formData.name.trim()) {
      setFormError('Program name is required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch(`/api/admin/loyalty/${editProgram.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          punch_target: formData.punch_target || null,
          points_per_dollar: formData.points_per_dollar || null,
          is_active: formData.is_active,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update program');
      }
      const { program } = await res.json();
      // Preserve the computed counts from the list
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === editProgram.id
            ? {
                ...program,
                rewards_count: p.rewards_count,
                cards_count: p.cards_count,
              }
            : p
        )
      );
      closeEditModal();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to update program'
      );
    } finally {
      setFormLoading(false);
    }
  };

  // --- Delete Handler ---

  const handleDelete = async () => {
    if (!deleteProgram) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/loyalty/${deleteProgram.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete program');
      }
      setPrograms((prev) => prev.filter((p) => p.id !== deleteProgram.id));
      setDeleteProgram(null);
    } catch {
      // Stay on dialog so user can retry
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Stats ---

  const activeCount = programs.filter((p) => p.is_active).length;
  const inactiveCount = programs.length - activeCount;
  const punchCardCount = programs.filter(
    (p) => p.type === 'punch_card'
  ).length;
  const pointsCount = programs.filter((p) => p.type === 'points').length;
  const totalEnrollments = programs.reduce((sum, p) => sum + p.cards_count, 0);

  // --- Chart Data ---

  const typeChartData = [
    { name: 'Punch Card', value: punchCardCount },
    { name: 'Points', value: pointsCount },
  ];
  const typeColors = ['#a855f7', '#3b82f6'];

  const statusChartData = [
    { name: 'Active', value: activeCount },
    { name: 'Inactive', value: inactiveCount },
  ];
  const statusColors = ['#22c55e', '#9ca3af'];

  // --- Stat Cards Config ---

  const statCards = [
    {
      label: 'Total Programs',
      value: programs.length,
      icon: <Gift className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
    },
    {
      label: 'Active Programs',
      value: activeCount,
      icon: <CheckCircle className="w-5 h-5" />,
      iconBg: 'bg-green-100 text-green-600',
    },
    {
      label: 'Punch Card Programs',
      value: punchCardCount,
      icon: <Hash className="w-5 h-5" />,
      iconBg: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Points Programs',
      value: pointsCount,
      icon: <TrendingUp className="w-5 h-5" />,
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Total Enrollments',
      value: totalEnrollments,
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-amber-100 text-amber-600',
    },
  ];

  // --- Render ---

  if (loading) {
    return <SkeletonLoyalty />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <Gift className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-secondary-500">
            Loyalty Programs
          </h1>
          <p className="text-sm text-gray-500">
            Manage all vendor loyalty programs
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default animate-card-pop"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}
              >
                {card.icon}
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary-500 mb-1">
              <AnimatedValue value={card.value} />
            </p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Donut Charts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Type Breakdown Donut */}
        <div
          className="card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-card-pop"
          style={{ animationDelay: '500ms', animationFillMode: 'both' }}
        >
          <h2 className="text-sm font-semibold text-secondary-500 mb-1">
            Program Types
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Punch Card vs Points breakdown
          </p>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {punchCardCount + pointsCount > 0 ? (
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={3}
                      animationDuration={1000}
                      animationBegin={600}
                    >
                      {typeChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={typeColors[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-[160px] h-[160px] flex items-center justify-center">
                  <p className="text-sm text-gray-400">No data</p>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              {[
                {
                  label: 'Punch Card',
                  value: punchCardCount,
                  color: '#a855f7',
                  icon: <Hash className="w-4 h-4 text-purple-500" />,
                },
                {
                  label: 'Points',
                  value: pointsCount,
                  color: '#3b82f6',
                  icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between group cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.icon}
                    <span className="text-sm font-medium text-secondary-500 group-hover:text-primary-500 transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-secondary-500">
                    <AnimatedValue value={item.value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Breakdown Donut */}
        <div
          className="card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-card-pop"
          style={{ animationDelay: '600ms', animationFillMode: 'both' }}
        >
          <h2 className="text-sm font-semibold text-secondary-500 mb-1">
            Program Status
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Active vs Inactive breakdown
          </p>
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {activeCount + inactiveCount > 0 ? (
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={3}
                      animationDuration={1000}
                      animationBegin={700}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={statusColors[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-[160px] h-[160px] flex items-center justify-center">
                  <p className="text-sm text-gray-400">No data</p>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              {[
                {
                  label: 'Active',
                  value: activeCount,
                  color: '#22c55e',
                  icon: <CheckCircle className="w-4 h-4 text-green-500" />,
                },
                {
                  label: 'Inactive',
                  value: inactiveCount,
                  color: '#9ca3af',
                  icon: (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between group cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.icon}
                    <span className="text-sm font-medium text-secondary-500 group-hover:text-primary-500 transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-secondary-500">
                    <AnimatedValue value={item.value} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div
        className="card p-4 mb-6 animate-card-pop"
        style={{ animationDelay: '700ms', animationFillMode: 'both' }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by program name or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="card animate-card-pop"
        style={{ animationDelay: '800ms', animationFillMode: 'both' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">
                  Program Name
                </th>
                <th className="p-4 font-semibold text-sm text-gray-500">
                  Vendor
                </th>
                <th className="p-4 font-semibold text-sm text-gray-500">
                  Type
                </th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">
                  Rewards
                </th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">
                  Enrollments
                </th>
                <th className="p-4 font-semibold text-sm text-gray-500">
                  Status
                </th>
                <th className="p-4 font-semibold text-sm text-gray-500">
                  Created
                </th>
                <th className="p-4 font-semibold text-sm text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPrograms.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-gray-400"
                  >
                    No loyalty programs found.
                  </td>
                </tr>
              ) : (
                paginatedPrograms.map((program, index) => (
                  <tr
                    key={program.id}
                    className={`hover:bg-gray-50 transition-all duration-200 border-l-4 ${
                      program.type === 'punch_card'
                        ? 'border-l-purple-400'
                        : 'border-l-blue-400'
                    } ${index < 15 ? 'animate-slide-up-fade' : ''}`}
                    style={
                      index < 15
                        ? {
                            animationDelay: `${900 + index * 50}ms`,
                            animationFillMode: 'both',
                          }
                        : undefined
                    }
                  >
                    <td className="p-4">
                      <p className="font-medium text-secondary-500 truncate max-w-[200px]">
                        {program.name}
                      </p>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {program.vendor?.business_name || '--'}
                    </td>
                    <td className="p-4">{getTypeBadge(program.type)}</td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5 text-gray-400" />
                        {program.rewards_count}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {program.cards_count}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(program.is_active)}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(program.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(program)}
                          className="text-gray-500 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                          title="Edit Program"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteProgram(program)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete Program"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          totalItems={filteredPrograms.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Edit Modal */}
      <AdminModal
        isOpen={!!editProgram}
        onClose={closeEditModal}
        title="Edit Loyalty Program"
        size="md"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {formError}
            </div>
          )}

          {/* Program Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              className="input-field"
              placeholder="Program name"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleFormChange}
              className="input-field"
            >
              <option value="punch_card">Punch Card</option>
              <option value="points">Points</option>
            </select>
          </div>

          {/* Punch Target (shown when type is punch_card) */}
          {formData.type === 'punch_card' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Punch Target
              </label>
              <input
                type="number"
                name="punch_target"
                value={formData.punch_target}
                onChange={handleFormChange}
                className="input-field"
                placeholder="e.g. 10"
                min="1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Number of punches needed to earn a reward
              </p>
            </div>
          )}

          {/* Points Per Dollar (shown when type is points) */}
          {formData.type === 'points' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points Per Dollar
              </label>
              <input
                type="number"
                name="points_per_dollar"
                value={formData.points_per_dollar}
                onChange={handleFormChange}
                className="input-field"
                placeholder="e.g. 1.5"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-gray-400 mt-1">
                Points earned per dollar spent
              </p>
            </div>
          )}

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-gray-700"
            >
              Active
            </label>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeEditModal}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteProgram}
        onConfirm={handleDelete}
        onCancel={() => setDeleteProgram(null)}
        title="Delete Loyalty Program"
        message={`Are you sure you want to delete "${deleteProgram?.name}"? This will permanently delete all associated rewards, enrollment cards, and transaction history. This action cannot be undone.`}
        confirmLabel="Delete Program"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
