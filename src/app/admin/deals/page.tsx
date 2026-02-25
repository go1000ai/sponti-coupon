'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatPercentage, formatCurrency } from '@/lib/utils';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Tag,
  Search,
  Star,
  Trash2,
  Plus,
  Play,
  Pause,
  XCircle,
  Loader2,
  Upload,
  ChevronDown,
  Sparkles,
  Brain,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Lightbulb,
  LayoutGrid,
  List,
  Package,
  Users,
  Percent,
  Zap,
  ImageIcon,
} from 'lucide-react';
import type { Deal, DealStatus, DealType } from '@/lib/types/database';

// ── Types ──────────────────────────────────────────────────────────────

interface DealWithVendor extends Omit<Deal, 'vendor'> {
  vendor?: { business_name: string } | null;
  is_featured?: boolean;
}

interface VendorOption {
  id: string;
  business_name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

type DealFormData = {
  vendor_id: string;
  title: string;
  description: string;
  deal_type: DealType;
  original_price: string;
  deal_price: string;
  discount_percentage: string;
  deposit_amount: string;
  max_claims: string;
  starts_at: string;
  expires_at: string;
  status: DealStatus;
  terms_and_conditions: string;
  image_url: string;
  category_id: string;
};

const emptyFormData: DealFormData = {
  vendor_id: '',
  title: '',
  description: '',
  deal_type: 'regular',
  original_price: '',
  deal_price: '',
  discount_percentage: '',
  deposit_amount: '',
  max_claims: '',
  starts_at: '',
  expires_at: '',
  status: 'draft',
  terms_and_conditions: '',
  image_url: '',
  category_id: '',
};

interface AIInsights {
  top_performers: { title: string; reason: string }[];
  underperformers: { title: string; reason: string }[];
  trends: string[];
  recommendations: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────


function useAnimatedCounter(target: number, duration = 500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let cancelled = false;
    const startTime = performance.now();
    const animate = (now: number) => {
      if (cancelled) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { cancelled = true; };
  }, [target, duration]);
  return value;
}

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// ── Status / Type helpers ──────────────────────────────────────────────

const getDealTypeLabel = (type: DealType) =>
  type === 'sponti_coupon' ? 'Sponti' : 'Steady';

const getDealTypeBadgeClass = (type: DealType) =>
  type === 'sponti_coupon'
    ? 'bg-primary-50 text-primary-600'
    : 'bg-accent-50 text-accent-600';

const getStatusBadgeClass = (status: DealStatus) => {
  switch (status) {
    case 'active': return 'bg-green-50 text-green-600';
    case 'expired': return 'bg-gray-100 text-gray-500';
    case 'paused': return 'bg-yellow-50 text-yellow-600';
    case 'draft': return 'bg-blue-50 text-blue-500';
    default: return 'bg-gray-100 text-gray-500';
  }
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  draft: '#3b82f6',
  paused: '#eab308',
  expired: '#9ca3af',
};

// ── Main Component ─────────────────────────────────────────────────────

export default function AdminDealsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Data
  const [deals, setDeals] = useState<DealWithVendor[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');

  // Collapsible sections
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // AI Insights
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<DealFormData>(emptyFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Delete dialog
  const [deleteDeal, setDeleteDeal] = useState<DealWithVendor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status action loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // ── Fetch data ───────────────────────────────────────────────────────

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/deals');
      if (!res.ok) throw new Error('Failed to fetch deals');
      const data = await res.json();
      setDeals(data.deals || []);
      setVendors(data.vendors || []);

      const catRes = await fetch('/api/admin/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchDeals();
  }, [user, fetchDeals]);

  // ── Filtered deals ───────────────────────────────────────────────────

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchesSearch =
        searchQuery === '' ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.vendor?.business_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchesType = typeFilter === 'all' || d.deal_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deals, searchQuery, statusFilter, typeFilter]);

  // ── Computed stats ───────────────────────────────────────────────────

  const activeCount = deals.filter((d) => d.status === 'active').length;
  const spontiCount = deals.filter((d) => d.deal_type === 'sponti_coupon').length;
  const steadyCount = deals.filter((d) => d.deal_type === 'regular').length;
  const totalClaims = deals.reduce((sum, d) => sum + d.claims_count, 0);
  const avgDiscount = deals.length > 0
    ? Math.round(deals.reduce((sum, d) => sum + d.discount_percentage, 0) / deals.length)
    : 0;

  // Animated counters
  const animatedTotal = useAnimatedCounter(deals.length);
  const animatedActive = useAnimatedCounter(activeCount);
  const animatedClaims = useAnimatedCounter(totalClaims);
  const animatedDiscount = useAnimatedCounter(avgDiscount);

  // ── Chart data ───────────────────────────────────────────────────────

  const topClaimsData = useMemo(() => {
    return [...deals]
      .sort((a, b) => b.claims_count - a.claims_count)
      .slice(0, 10)
      .map((d) => ({
        name: truncate(d.title, 20),
        claims: d.claims_count,
      }));
  }, [deals]);

  const dealTypePerformance = useMemo(() => {
    const spontiDeals = deals.filter((d) => d.deal_type === 'sponti_coupon');
    const steadyDeals = deals.filter((d) => d.deal_type === 'regular');
    const avgClaims = (arr: DealWithVendor[]) =>
      arr.length > 0 ? Math.round(arr.reduce((s, d) => s + d.claims_count, 0) / arr.length) : 0;
    const avgDiscountCalc = (arr: DealWithVendor[]) =>
      arr.length > 0 ? Math.round(arr.reduce((s, d) => s + d.discount_percentage, 0) / arr.length) : 0;
    return [
      { name: 'Sponti', avgClaims: avgClaims(spontiDeals), avgDiscount: avgDiscountCalc(spontiDeals) },
      { name: 'Steady', avgClaims: avgClaims(steadyDeals), avgDiscount: avgDiscountCalc(steadyDeals) },
    ];
  }, [deals]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = { active: 0, draft: 0, paused: 0, expired: 0 };
    deals.forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [deals]);

  // ── AI Insights ──────────────────────────────────────────────────────

  const fetchAiInsights = async () => {
    if (aiInsights) return; // Use cached results
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/admin/deals/ai-insights', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to fetch insights');
      const data: AIInsights = await res.json();
      setAiInsights(data);
    } catch {
      setAiError('Failed to generate AI insights. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Form handlers ────────────────────────────────────────────────────

  const openCreateModal = () => {
    setFormData(emptyFormData);
    setFormError('');
    setIsCreateOpen(true);
  };

  const closeModals = () => {
    setIsCreateOpen(false);
    setFormError('');
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDealImageUpload = async (file: File, vendorId: string) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'deal-images');
      fd.append('user_id', vendorId);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setFormData((prev) => ({ ...prev, image_url: data.url }));
    } catch {
      setFormError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.vendor_id || !formData.deal_type) {
      setFormError('Title, vendor, and deal type are required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          original_price: formData.original_price || 0,
          deal_price: formData.deal_price || 0,
          discount_percentage: formData.discount_percentage || 0,
          deposit_amount: formData.deposit_amount || null,
          max_claims: formData.max_claims || null,
          starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : undefined,
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : undefined,
          image_url: formData.image_url || null,
          category_id: formData.category_id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create deal');
      }
      const { deal } = await res.json();
      setDeals((prev) => [deal, ...prev]);
      closeModals();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDeal) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/deals/${deleteDeal.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete deal');
      }
      setDeals((prev) => prev.filter((d) => d.id !== deleteDeal.id));
      setDeleteDeal(null);
    } catch {
      // Stay on dialog so user can retry
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Status quick actions ─────────────────────────────────────────────

  const updateDealStatus = async (dealId: string, newStatus: DealStatus) => {
    setActionLoadingId(dealId);
    try {
      const res = await fetch(`/api/admin/deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) return;
      const { deal } = await res.json();
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...deal, is_featured: d.is_featured } : d))
      );
    } catch {
      // Silent fail
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Feature toggle ───────────────────────────────────────────────────

  const toggleFeature = async (deal: DealWithVendor) => {
    const newFeatured = !deal.is_featured;
    setActionLoadingId(deal.id);
    try {
      const res = await fetch(`/api/admin/deals/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: newFeatured }),
      });
      if (!res.ok) return;
      setDeals((prev) =>
        prev.map((d) => (d.id === deal.id ? { ...d, is_featured: newFeatured } : d))
      );
    } catch {
      // Silent fail
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Action buttons (shared between gallery and list views) ──────────

  const renderActionButtons = (deal: DealWithVendor) => {
    const isActionLoading = actionLoadingId === deal.id;
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); toggleFeature(deal); }}
          disabled={isActionLoading}
          className={`p-2 rounded-lg transition-all duration-300 hover:scale-[1.02] ${
            deal.is_featured
              ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
          }`}
          title={deal.is_featured ? 'Unfeature Deal' : 'Feature Deal'}
        >
          <Star className={`w-4 h-4 ${deal.is_featured ? 'fill-yellow-500' : ''}`} />
        </button>

        {isActionLoading ? (
          <div className="p-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {deal.status !== 'active' && deal.status !== 'expired' && (
              <button
                onClick={(e) => { e.stopPropagation(); updateDealStatus(deal.id, 'active'); }}
                className="text-green-500 hover:bg-green-50 p-2 rounded-lg transition-all duration-300 hover:scale-[1.02]"
                title="Activate"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {deal.status === 'active' && (
              <button
                onClick={(e) => { e.stopPropagation(); updateDealStatus(deal.id, 'paused'); }}
                className="text-yellow-500 hover:bg-yellow-50 p-2 rounded-lg transition-all duration-300 hover:scale-[1.02]"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {(deal.status === 'active' || deal.status === 'paused') && (
              <button
                onClick={(e) => { e.stopPropagation(); updateDealStatus(deal.id, 'expired'); }}
                className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-all duration-300 hover:scale-[1.02]"
                title="Expire"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setDeleteDeal(deal); }}
          className="text-red-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all duration-300 hover:scale-[1.02]"
          title="Delete Deal"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
          <p className="text-sm text-gray-400">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {/* ── 1. Header ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between mb-8 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Deal Management</h1>
            <p className="text-sm text-gray-500">
              {deals.length} total deals &middot; {activeCount} active &middot; {spontiCount} Sponti &middot; {steadyCount} Steady
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-300 text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Create Deal
        </button>
      </div>

      {/* ── 2. KPI Stats Bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Deals', value: animatedTotal, icon: Package, color: 'text-primary-500', bg: 'bg-primary-50' },
          { label: 'Active Deals', value: animatedActive, icon: Zap, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Total Claims', value: animatedClaims, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Avg Discount', value: animatedDiscount, icon: Percent, color: 'text-purple-500', bg: 'bg-purple-50', suffix: '%' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: `${(i + 1) * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</span>
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-secondary-500">
              {stat.value}{stat.suffix || ''}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3. Analytics Section (collapsible) ────────────────────── */}
      <div className="mb-6">
        <button
          onClick={() => setAnalyticsOpen(!analyticsOpen)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 hover:shadow-sm"
        >
          <BarChart3 className="w-4 h-4 text-primary-500" />
          {analyticsOpen ? 'Hide Analytics' : 'Show Analytics'}
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${analyticsOpen ? 'rotate-180' : ''}`} />
        </button>

        {analyticsOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]">
            {/* Chart A: Top 10 Deals by Claims */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-secondary-500 mb-3">Top 10 Deals by Claims</h3>
              {topClaimsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topClaimsData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="claims" fill="url(#orangeGradient)" radius={[0, 6, 6, 0]} />
                    <defs>
                      <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">No claims data yet</div>
              )}
            </div>

            {/* Chart B: Deal Type Performance */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-secondary-500 mb-3">Deal Type Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dealTypePerformance} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="avgClaims" name="Avg Claims" fill="#f97316" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgDiscount" name="Avg Discount %" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart C: Status Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-secondary-500 mb-3">Status Distribution</h3>
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {statusDistribution.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => [value, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
                    />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold" fill="#1e293b">
                      {deals.length}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">No deals yet</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. AI Insights Panel (collapsible) ────────────────────── */}
      <div className="mb-6">
        <button
          onClick={() => setAiOpen(!aiOpen)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-300 hover:shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
          AI Insights
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${aiOpen ? 'rotate-180' : ''}`} />
        </button>

        {aiOpen && (
          <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]">
            {/* Analyze button */}
            {!aiInsights && !aiLoading && (
              <div className="text-center py-4">
                <button
                  onClick={fetchAiInsights}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
                >
                  <Brain className="w-5 h-5" />
                  Analyze Deals
                </button>
                <p className="text-xs text-gray-400 mt-2">AI-powered analysis of your deal portfolio</p>
              </div>
            )}

            {/* Error */}
            {aiError && (
              <div className="text-center py-4">
                <p className="text-sm text-red-500 mb-3">{aiError}</p>
                <button
                  onClick={() => { setAiInsights(null); setAiError(''); }}
                  className="text-sm text-purple-500 hover:text-purple-700 font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {aiLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl p-4 border border-gray-100">
                    <div className="shimmer-bg h-4 w-32 rounded mb-3" />
                    <div className="space-y-2">
                      <div className="shimmer-bg h-3 w-full rounded" />
                      <div className="shimmer-bg h-3 w-4/5 rounded" />
                      <div className="shimmer-bg h-3 w-3/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {aiInsights && !aiLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Performers */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <h4 className="text-sm font-semibold text-secondary-500">Top Performers</h4>
                  </div>
                  <div className="space-y-2">
                    {aiInsights.top_performers.map((item, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium text-secondary-500">{item.title}</p>
                        <p className="text-xs text-gray-400">{item.reason}</p>
                      </div>
                    ))}
                    {aiInsights.top_performers.length === 0 && (
                      <p className="text-xs text-gray-400">No data available</p>
                    )}
                  </div>
                </div>

                {/* Needs Attention */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-l-4 border-orange-500">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <h4 className="text-sm font-semibold text-secondary-500">Needs Attention</h4>
                  </div>
                  <div className="space-y-2">
                    {aiInsights.underperformers.map((item, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium text-secondary-500">{item.title}</p>
                        <p className="text-xs text-gray-400">{item.reason}</p>
                      </div>
                    ))}
                    {aiInsights.underperformers.length === 0 && (
                      <p className="text-xs text-gray-400">No data available</p>
                    )}
                  </div>
                </div>

                {/* Trends */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h4 className="text-sm font-semibold text-secondary-500">Trends</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {aiInsights.trends.map((trend, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-blue-400 mt-0.5">&#x2022;</span>
                        {trend}
                      </li>
                    ))}
                    {aiInsights.trends.length === 0 && (
                      <li className="text-xs text-gray-400">No trends detected</li>
                    )}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-l-4 border-purple-500">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-purple-500" />
                    <h4 className="text-sm font-semibold text-secondary-500">Recommendations</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {aiInsights.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-purple-400 mt-0.5">&#x2022;</span>
                        {rec}
                      </li>
                    ))}
                    {aiInsights.recommendations.length === 0 && (
                      <li className="text-xs text-gray-400">No recommendations at this time</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Filters Bar ────────────────────────────────────────── */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 opacity-0 animate-[fadeInLeft_0.5s_ease-out_forwards]"
        style={{ animationDelay: '200ms' }}
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by deal title or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full sm:w-36"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field w-full sm:w-36"
          >
            <option value="all">All Types</option>
            <option value="sponti_coupon">Sponti</option>
            <option value="regular">Steady</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('gallery')}
              className={`p-2 rounded-md transition-all duration-300 ${
                viewMode === 'gallery'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Gallery View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-300 ${
                viewMode === 'list'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 6. Deal Views ─────────────────────────────────────────── */}

      {filteredDeals.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-1">No deals found</h3>
          <p className="text-sm text-gray-400">Try adjusting your filters or create a new deal.</p>
        </div>
      ) : viewMode === 'gallery' ? (
        /* ── Gallery View ─────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDeals.map((deal, index) => {
            const claimPercent = deal.max_claims
              ? Math.min((deal.claims_count / deal.max_claims) * 100, 100)
              : null;

            return (
              <div
                key={deal.id}
                onClick={() => router.push(`/admin/deals/${deal.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image */}
                <div className="relative h-44 w-full overflow-hidden">
                  {deal.image_url ? (
                    <img
                      src={deal.image_url}
                      alt={deal.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Badges */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm ${
                      deal.deal_type === 'sponti_coupon'
                        ? 'bg-primary-500/90 text-white'
                        : 'bg-white/90 text-gray-700'
                    }`}>
                      {getDealTypeLabel(deal.deal_type)}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold backdrop-blur-sm capitalize ${
                      deal.status === 'active' ? 'bg-green-500/90 text-white'
                      : deal.status === 'draft' ? 'bg-blue-500/90 text-white'
                      : deal.status === 'paused' ? 'bg-yellow-500/90 text-white'
                      : 'bg-gray-500/90 text-white'
                    }`}>
                      {deal.status}
                    </span>
                  </div>

                  {/* Featured star */}
                  {deal.is_featured && (
                    <div className="absolute top-2 right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-secondary-500 text-sm truncate mb-0.5">
                    {deal.title}
                  </h3>
                  <p className="text-xs text-gray-400 truncate mb-3">
                    {deal.vendor?.business_name || 'Unknown Vendor'}
                  </p>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-xs text-gray-400 line-through">
                      {formatCurrency(deal.original_price)}
                    </span>
                    <span className="text-lg font-bold text-secondary-500">
                      {formatCurrency(deal.deal_price)}
                    </span>
                    <span className="text-xs font-semibold text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">
                      -{formatPercentage(deal.discount_percentage)}
                    </span>
                  </div>

                  {/* Claims progress */}
                  {claimPercent !== null && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span>Claims</span>
                        <span>{deal.claims_count}/{deal.max_claims}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
                          style={{ width: `${claimPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {claimPercent === null && (
                    <p className="text-[10px] text-gray-400 mb-2">{deal.claims_count} claims</p>
                  )}

                  <p className="text-[10px] text-gray-400 mb-3">
                    Created: {new Date(deal.created_at).toLocaleDateString()}
                  </p>

                  {/* Actions */}
                  <div
                    className="pt-3 border-t border-gray-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderActionButtons(deal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View ────────────────────────────────────────── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Image</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Vendor</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">Claims</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide text-right">Price</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide text-center">Discount</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="p-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDeals.map((deal, index) => (
                  <tr
                    key={deal.id}
                    onClick={() => router.push(`/admin/deals/${deal.id}`)}
                    className="hover:bg-gray-50/50 transition-all duration-300 cursor-pointer opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="p-4">
                      {deal.image_url ? (
                        <img
                          src={deal.image_url}
                          alt={deal.title}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-secondary-500 truncate max-w-[200px] text-sm">
                          {deal.title}
                        </p>
                        {deal.is_featured && (
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {deal.vendor?.business_name || '--'}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDealTypeBadgeClass(deal.deal_type)}`}>
                        {getDealTypeLabel(deal.deal_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusBadgeClass(deal.status)}`}>
                        {deal.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {deal.claims_count}
                      {deal.max_claims != null && (
                        <span className="text-gray-400">/{deal.max_claims}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-right">
                      <span className="text-gray-400 line-through mr-1">
                        {formatCurrency(deal.original_price)}
                      </span>
                      <span className="text-secondary-500 font-medium">
                        {formatCurrency(deal.deal_price)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-secondary-500 font-medium text-center">
                      {formatPercentage(deal.discount_percentage)}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(deal.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {renderActionButtons(deal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 7. Create Deal Modal ──────────────────────────────────── */}
      <AdminModal
        isOpen={isCreateOpen}
        onClose={closeModals}
        title="Create Deal"
        size="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{formError}</div>
          )}

          {/* Vendor Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
            <select
              name="vendor_id"
              value={formData.vendor_id}
              onChange={handleFormChange}
              className="input-field"
            >
              <option value="">Select a vendor...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.business_name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              className="input-field"
              placeholder="Deal title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={3}
              className="input-field"
              placeholder="Deal description"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Image</label>
            {formData.image_url && (
              <div className="mb-2 relative inline-block">
                <img src={formData.image_url} alt="Deal" className="h-24 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  &times;
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const vendorId = formData.vendor_id;
                      if (vendorId) handleDealImageUpload(file, vendorId);
                      else setFormError('Select a vendor first');
                    }
                  }}
                />
              </label>
              {formData.image_url && (
                <span className="text-xs text-green-600">Image uploaded</span>
              )}
            </div>
          </div>

          {/* Deal Type + Status + Category */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Type *</label>
              <select
                name="deal_type"
                value={formData.deal_type}
                onChange={handleFormChange}
                className="input-field"
              >
                <option value="regular">Steady</option>
                <option value="sponti_coupon">Sponti Coupon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="input-field"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleFormChange}
                className="input-field"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Price</label>
              <input
                type="number"
                name="original_price"
                value={formData.original_price}
                onChange={handleFormChange}
                className="input-field"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Price</label>
              <input
                type="number"
                name="deal_price"
                value={formData.deal_price}
                onChange={handleFormChange}
                className="input-field"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
              <input
                type="number"
                name="discount_percentage"
                value={formData.discount_percentage}
                onChange={handleFormChange}
                className="input-field"
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Deposit + Max Claims */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
              <input
                type="number"
                name="deposit_amount"
                value={formData.deposit_amount}
                onChange={handleFormChange}
                className="input-field"
                placeholder="Optional"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Claims</label>
              <input
                type="number"
                name="max_claims"
                value={formData.max_claims}
                onChange={handleFormChange}
                className="input-field"
                placeholder="Unlimited"
                min="0"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
              <input
                type="datetime-local"
                name="starts_at"
                value={formData.starts_at}
                onChange={handleFormChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
              <input
                type="datetime-local"
                name="expires_at"
                value={formData.expires_at}
                onChange={handleFormChange}
                className="input-field"
              />
            </div>
          </div>

          {/* Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
            <textarea
              name="terms_and_conditions"
              value={formData.terms_and_conditions}
              onChange={handleFormChange}
              rows={3}
              className="input-field"
              placeholder="Terms and conditions..."
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={closeModals}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary-500/25"
            >
              {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Deal
            </button>
          </div>
        </div>
      </AdminModal>

      {/* ── 8. Delete Confirmation Dialog ─────────────────────────── */}
      <AdminConfirmDialog
        isOpen={!!deleteDeal}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDeal(null)}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deleteDeal?.title}"? This will permanently remove the deal and cascade-delete all associated claims. This action cannot be undone.`}
        confirmLabel="Delete Deal"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
