'use client';

import { Fragment, useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  BarChart3, Users, QrCode, DollarSign, Tag, TrendingUp,
  ArrowUpRight, ArrowDownRight, Calendar, Clock, Sparkles, Brain,
  ChevronDown, ChevronUp, Zap, Target, PieChart as PieChartIcon,
  Activity, Lightbulb, CheckCircle2, ArrowRight, RefreshCw,
  Table as TableIcon,
} from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  Legend, ComposedChart, Line, Area,
} from 'recharts';
import type { Deal, Claim, Redemption } from '@/lib/types/database';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';

// ─── Theme colors ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#E8632B',
  primaryLight: '#F4945E',
  secondary: '#1A1A2E',
  secondaryLight: '#2D2D4A',
  positive: '#10B981',
  negative: '#EF4444',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  amber: '#F59E0B',
  cyan: '#06B6D4',
  pink: '#EC4899',
};

const CHART_COLORS = [COLORS.primary, COLORS.purple, COLORS.blue, COLORS.positive, COLORS.amber, COLORS.pink, COLORS.cyan];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClaimWithDeal extends Claim {
  deal?: Deal;
}

interface InsightsResponse {
  vendor: { category: string; city: string };
  myStats: {
    totalDeals: number;
    activeDeals: number;
    avgDiscount: number;
    avgClaims: number;
    spontiCount: number;
    regularCount: number;
    spontiAvgClaims: number;
    regularAvgClaims: number;
    bestDeal: Deal | null;
    worstActiveDeal: Deal | null;
  };
  competitors: {
    count: number;
    avgDiscount: number;
    avgClaims: number;
    priceRange: { min: number; max: number };
    discountRange: { min: number; max: number };
  } | null;
  localCompetitorCount: number;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    action?: string;
  }>;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';
type SortField = 'title' | 'deal_type' | 'discount_percentage' | 'claims_count' | 'redemptions' | 'rate' | 'revenue' | 'status';
type SortDir = 'asc' | 'desc';

// ─── Tooltip styling ─────────────────────────────────────────────────────────
const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
  fontSize: '13px',
  padding: '10px 14px',
};

// ─── Custom tooltip for charts ───────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xl p-3" style={{ minWidth: 140 }}>
      <p className="text-xs font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-500 capitalize">{entry.name}:</span>
          <span className="font-bold text-gray-800">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Animated number component ───────────────────────────────────────────────
function AnimatedValue({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 600;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({
  icon: Icon,
  iconColor,
  label,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendLabel,
  delay = 0,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  trendLabel?: string;
  delay?: number;
}) {
  return (
    <div
      className="card p-5 hover:shadow-lg transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110`} style={{ backgroundColor: `${iconColor}15` }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(Math.round(trend))}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[#1A1A2E] tracking-tight">
        {prefix === '$' ? formatCurrency(value) : <><AnimatedValue value={value} />{suffix}</>}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {trendLabel && <p className="text-xs text-gray-400 mt-0.5">{trendLabel}</p>}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#E8632B] to-[#F4945E]">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#1A1A2E]">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-600',
    paused: 'bg-yellow-100 text-yellow-700',
    draft: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Deal Type Badge ─────────────────────────────────────────────────────────
function DealTypeBadge({ type }: { type: string }) {
  if (type === 'sponti_coupon') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        <SpontiIcon className="w-3 h-3" /> Sponti
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
      <Tag className="w-3 h-3" /> Steady
    </span>
  );
}

// ─── Sparkle animation for AI section ────────────────────────────────────────
function SparkleLoader() {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="relative">
        <Sparkles className="w-8 h-8 text-[#E8632B] animate-pulse" />
        <div className="absolute inset-0 animate-ping">
          <Sparkles className="w-8 h-8 text-[#E8632B] opacity-20" />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A2E]">Analyzing your performance data...</p>
        <p className="text-xs text-gray-400">Generating personalized recommendations</p>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyChart({ message = 'No data available for this period' }: { message?: string }) {
  return (
    <div className="h-[280px] flex flex-col items-center justify-center text-gray-400 gap-2">
      <BarChart3 className="w-10 h-10 text-gray-200" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// =============================================================================
// ─── Supabase client (stable singleton) ─────────────────────────────────────
const supabase = createClient();

// MAIN COMPONENT
// =============================================================================
export default function VendorAnalyticsPage() {
  const { user } = useAuth();
  const { canAccess } = useVendorTier();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [claims, setClaims] = useState<ClaimWithDeal[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // AI Insights
  const [aiInsights, setAiInsights] = useState<InsightsResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Table
  const [sortField, setSortField] = useState<SortField>('claims_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);

  // ─── Date filter ───────────────────────────────────────────────────────────
  const sinceDate = useMemo(() => {
    if (timeRange === 'all') return null;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }, [timeRange]);

  const previousPeriodStart = useMemo(() => {
    if (timeRange === 'all') return null;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();
  }, [timeRange]);

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);

      try {
        // Get all deals for this vendor
        const { data: dealsData } = await supabase
          .from('deals')
          .select('*')
          .eq('vendor_id', user!.id)
          .order('created_at', { ascending: false });

        const vendorDeals = dealsData || [];
        const dealIds = vendorDeals.map(d => d.id);

        // Get all claims for these deals
        const claimsQuery = supabase
          .from('claims')
          .select('*, deal:deals(*)')
          .in('deal_id', dealIds.length > 0 ? dealIds : ['__none__'])
          .order('created_at', { ascending: true });

        // Get all redemptions for this vendor
        const redemptionsQuery = supabase
          .from('redemptions')
          .select('*')
          .eq('vendor_id', user!.id)
          .order('scanned_at', { ascending: false });

        const [claimsRes, redemptionsRes] = await Promise.all([
          claimsQuery,
          redemptionsQuery,
        ]);

        setAllDeals(vendorDeals as Deal[]);
        setClaims((claimsRes.data || []) as unknown as ClaimWithDeal[]);
        setRedemptions((redemptionsRes.data || []) as Redemption[]);
      } catch (err) {
        console.error('[VendorAnalytics] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // ─── Fetch AI Insights ─────────────────────────────────────────────────────
  const fetchAIInsights = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/vendor/insights');
      if (!res.ok) throw new Error('Failed to fetch insights');
      const data = await res.json();
      setAiInsights(data);
    } catch {
      setAiError('Unable to load AI insights. We\'ll show local analysis instead.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !loading) {
      fetchAIInsights();
    }
  }, [user, loading, fetchAIInsights]);

  // ─── Filter data by time range ─────────────────────────────────────────────
  const filteredClaims = useMemo(() => {
    if (!sinceDate) return claims;
    return claims.filter(c => c.created_at >= sinceDate);
  }, [claims, sinceDate]);

  const filteredRedemptions = useMemo(() => {
    if (!sinceDate) return redemptions;
    return redemptions.filter(r => r.scanned_at >= sinceDate);
  }, [redemptions, sinceDate]);

  const filteredDeals = useMemo(() => {
    if (!sinceDate) return allDeals;
    return allDeals.filter(d => d.created_at >= sinceDate);
  }, [allDeals, sinceDate]);

  // Previous period claims for trend calculation
  const previousPeriodClaims = useMemo(() => {
    if (!previousPeriodStart || !sinceDate) return [];
    return claims.filter(c => c.created_at >= previousPeriodStart && c.created_at < sinceDate);
  }, [claims, previousPeriodStart, sinceDate]);

  const previousPeriodRedemptions = useMemo(() => {
    if (!previousPeriodStart || !sinceDate) return [];
    return redemptions.filter(r => r.scanned_at >= previousPeriodStart && r.scanned_at < sinceDate);
  }, [redemptions, previousPeriodStart, sinceDate]);

  // ─── KPI Computations ─────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const totalClaims = filteredClaims.length;
    const totalRedemptions = filteredRedemptions.length;
    const conversionRate = totalClaims > 0 ? (totalRedemptions / totalClaims) * 100 : 0;

    const totalRevenue = allDeals.reduce((sum, d) => {
      if (d.deal_type === 'sponti_coupon' && d.deposit_amount) {
        return sum + (d.deposit_amount * d.claims_count);
      }
      return sum;
    }, 0);

    const avgClaimsPerDeal = totalDeals > 0 ? totalClaims / totalDeals : 0;

    // Trend calculations
    const prevClaims = previousPeriodClaims.length;
    const prevRedemptions = previousPeriodRedemptions.length;
    const claimsTrend = prevClaims > 0 ? ((totalClaims - prevClaims) / prevClaims) * 100 : (totalClaims > 0 ? 100 : 0);
    const redemptionsTrend = prevRedemptions > 0 ? ((totalRedemptions - prevRedemptions) / prevRedemptions) * 100 : (totalRedemptions > 0 ? 100 : 0);

    return {
      totalDeals,
      totalClaims,
      totalRedemptions,
      conversionRate,
      totalRevenue,
      avgClaimsPerDeal,
      claimsTrend: timeRange === 'all' ? undefined : claimsTrend,
      redemptionsTrend: timeRange === 'all' ? undefined : redemptionsTrend,
    };
  }, [filteredDeals, filteredClaims, filteredRedemptions, allDeals, previousPeriodClaims, previousPeriodRedemptions, timeRange]);

  // ─── Chart Data: Revenue Over Time ─────────────────────────────────────────
  const revenueOverTimeData = useMemo(() => {
    const grouped: Record<string, { date: string; revenue: number; claims: number }> = {};
    filteredClaims.forEach(claim => {
      const date = new Date(claim.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = { date, revenue: 0, claims: 0 };
      grouped[date].claims += 1;
      if (claim.deal?.deal_type === 'sponti_coupon' && claim.deal?.deposit_amount) {
        grouped[date].revenue += claim.deal.deposit_amount;
      }
    });
    return Object.values(grouped);
  }, [filteredClaims]);

  // ─── Chart Data: Claims vs Redemptions per Deal ────────────────────────────
  const claimsVsRedemptionsData = useMemo(() => {
    const dealMap: Record<string, { name: string; claims: number; redemptions: number }> = {};
    allDeals.forEach(d => {
      dealMap[d.id] = {
        name: d.title.length > 18 ? d.title.slice(0, 18) + '...' : d.title,
        claims: 0,
        redemptions: 0,
      };
    });
    filteredClaims.forEach(c => {
      if (dealMap[c.deal_id]) dealMap[c.deal_id].claims += 1;
    });
    filteredRedemptions.forEach(r => {
      if (dealMap[r.deal_id]) dealMap[r.deal_id].redemptions += 1;
    });
    return Object.values(dealMap)
      .filter(d => d.claims > 0 || d.redemptions > 0)
      .sort((a, b) => b.claims - a.claims)
      .slice(0, 8);
  }, [allDeals, filteredClaims, filteredRedemptions]);

  // ─── Chart Data: Deal Type Performance ─────────────────────────────────────
  const dealTypePerformance = useMemo(() => {
    const sponti = allDeals.filter(d => d.deal_type === 'sponti_coupon');
    const steady = allDeals.filter(d => d.deal_type === 'regular');

    const spontiClaims = filteredClaims.filter(c => c.deal?.deal_type === 'sponti_coupon');
    const steadyClaims = filteredClaims.filter(c => c.deal?.deal_type === 'regular');

    const spontiRedemptions = filteredRedemptions.filter(r => sponti.some(d => d.id === r.deal_id));
    const steadyRedemptions = filteredRedemptions.filter(r => steady.some(d => d.id === r.deal_id));

    return {
      sponti: {
        deals: sponti.length,
        claims: spontiClaims.length,
        redemptions: spontiRedemptions.length,
        avgRedemptionRate: spontiClaims.length > 0 ? (spontiRedemptions.length / spontiClaims.length) * 100 : 0,
        avgRevenue: sponti.length > 0 ? sponti.reduce((s, d) => s + (d.deposit_amount || 0) * d.claims_count, 0) / sponti.length : 0,
      },
      steady: {
        deals: steady.length,
        claims: steadyClaims.length,
        redemptions: steadyRedemptions.length,
        avgRedemptionRate: steadyClaims.length > 0 ? (steadyRedemptions.length / steadyClaims.length) * 100 : 0,
        avgRevenue: steady.length > 0 ? steady.reduce((s, d) => s + (d.deal_price * d.claims_count), 0) / steady.length : 0,
      },
      chartData: [
        { metric: 'Total Claims', Sponti: spontiClaims.length, Steady: steadyClaims.length },
        { metric: 'Redemptions', Sponti: spontiRedemptions.length, Steady: steadyRedemptions.length },
        { metric: 'Avg Rate %', Sponti: Math.round(spontiClaims.length > 0 ? (spontiRedemptions.length / spontiClaims.length) * 100 : 0), Steady: Math.round(steadyClaims.length > 0 ? (steadyRedemptions.length / steadyClaims.length) * 100 : 0) },
      ],
    };
  }, [allDeals, filteredClaims, filteredRedemptions]);

  // ─── Chart Data: Hourly Heatmap ────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const hours: number[] = new Array(24).fill(0);
    filteredClaims.forEach(c => {
      const hour = new Date(c.created_at).getHours();
      hours[hour] += 1;
    });
    const maxClaims = Math.max(...hours, 1);
    return hours.map((count, hour) => ({
      hour: hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
      hourNum: hour,
      claims: count,
      intensity: count / maxClaims,
    }));
  }, [filteredClaims]);

  // ─── Chart Data: Day of Week ───────────────────────────────────────────────
  const dayOfWeekData = useMemo(() => {
    const days: number[] = new Array(7).fill(0);
    filteredClaims.forEach(c => {
      const day = new Date(c.created_at).getDay();
      days[day] += 1;
    });
    return days.map((count, i) => ({
      day: DAY_NAMES[i],
      dayFull: DAY_NAMES_FULL[i],
      claims: count,
    }));
  }, [filteredClaims]);

  // ─── Chart Data: Discount Impact ───────────────────────────────────────────
  const discountImpactData = useMemo(() => {
    // Group deals into discount buckets
    const buckets: Record<string, { discount: number; claims: number; count: number }> = {};
    allDeals.forEach(d => {
      const bucket = Math.floor(d.discount_percentage / 10) * 10;
      const key = `${bucket}%`;
      if (!buckets[key]) buckets[key] = { discount: bucket, claims: 0, count: 0 };
      buckets[key].claims += d.claims_count;
      buckets[key].count += 1;
    });
    return Object.entries(buckets)
      .map(([, data]) => ({
        range: `${data.discount}-${data.discount + 9}%`,
        discount: data.discount,
        totalClaims: data.claims,
        avgClaims: data.count > 0 ? Math.round(data.claims / data.count) : 0,
        deals: data.count,
      }))
      .sort((a, b) => a.discount - b.discount);
  }, [allDeals]);

  // ─── Chart Data: Category Performance ──────────────────────────────────────
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    allDeals.forEach(d => {
      const cat = d.category?.name || 'Uncategorized';
      cats[cat] = (cats[cat] || 0) + d.claims_count;
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [allDeals]);

  // ─── Chart Data: Conversion Funnel ─────────────────────────────────────────
  const funnelData = useMemo(() => {
    const totalViews = kpis.totalClaims * 5; // Estimate: ~5 views per claim
    return [
      { name: 'Estimated Views', value: totalViews, fill: COLORS.blue },
      { name: 'Claims', value: kpis.totalClaims, fill: COLORS.primary },
      { name: 'Redemptions', value: kpis.totalRedemptions, fill: COLORS.positive },
    ];
  }, [kpis]);

  // ─── Local Insights Generation ─────────────────────────────────────────────
  const localInsights = useMemo(() => {
    const insights: Array<{ icon: React.ElementType; label: string; value: string; color: string }> = [];

    // Best day of week
    const bestDay = [...dayOfWeekData].sort((a, b) => b.claims - a.claims)[0];
    if (bestDay && bestDay.claims > 0) {
      insights.push({
        icon: Calendar,
        label: 'Best Performing Day',
        value: `${bestDay.dayFull} (${bestDay.claims} claims)`,
        color: COLORS.primary,
      });
    }

    // Best hour
    const bestHour = [...hourlyData].sort((a, b) => b.claims - a.claims)[0];
    if (bestHour && bestHour.claims > 0) {
      insights.push({
        icon: Clock,
        label: 'Peak Hour',
        value: `${bestHour.hour} (${bestHour.claims} claims)`,
        color: COLORS.purple,
      });
    }

    // Most effective discount range
    const bestDiscount = [...discountImpactData].sort((a, b) => b.avgClaims - a.avgClaims)[0];
    if (bestDiscount && bestDiscount.avgClaims > 0) {
      insights.push({
        icon: Target,
        label: 'Most Effective Discount',
        value: `${bestDiscount.range} (avg ${bestDiscount.avgClaims} claims/deal)`,
        color: COLORS.positive,
      });
    }

    // Sponti vs Steady comparison
    const { sponti, steady } = dealTypePerformance;
    if (sponti.deals > 0 && steady.deals > 0) {
      const winner = sponti.claims > steady.claims ? 'Sponti Deals' : 'Steady Deals';
      const diff = Math.abs(sponti.claims - steady.claims);
      insights.push({
        icon: Zap,
        label: 'Deal Type Comparison',
        value: `${winner} lead by ${diff} claims`,
        color: COLORS.amber,
      });
    }

    // Top deal
    const topDeal = [...allDeals].sort((a, b) => b.claims_count - a.claims_count)[0];
    if (topDeal && topDeal.claims_count > 0) {
      insights.push({
        icon: TrendingUp,
        label: 'Top Performing Deal',
        value: `"${topDeal.title.length > 30 ? topDeal.title.slice(0, 30) + '...' : topDeal.title}" with ${topDeal.claims_count} claims`,
        color: COLORS.blue,
      });
    }

    return insights;
  }, [dayOfWeekData, hourlyData, discountImpactData, dealTypePerformance, allDeals]);

  // ─── Suggested Next Deal ───────────────────────────────────────────────────
  const suggestedDeal = useMemo(() => {
    const { sponti, steady } = dealTypePerformance;
    const recommendedType = sponti.claims >= steady.claims && sponti.deals > 0 ? 'sponti_coupon' : 'regular';

    const bestDiscount = [...discountImpactData].sort((a, b) => b.avgClaims - a.avgClaims)[0];
    const bestHour = [...hourlyData].sort((a, b) => b.claims - a.claims)[0];
    const bestDay = [...dayOfWeekData].sort((a, b) => b.claims - a.claims)[0];

    return {
      type: recommendedType === 'sponti_coupon' ? 'Sponti Deal' : 'Steady Deal',
      typeValue: recommendedType,
      discountRange: bestDiscount ? bestDiscount.range : '20-30%',
      bestTime: bestHour ? bestHour.hour : '12pm',
      bestDay: bestDay ? bestDay.dayFull : 'Saturday',
      duration: recommendedType === 'sponti_coupon' ? '24 hours' : '7 days',
    };
  }, [dealTypePerformance, discountImpactData, hourlyData, dayOfWeekData]);

  // ─── Performance Table Data ────────────────────────────────────────────────
  const tableData = useMemo(() => {
    const dealRedemptionCounts: Record<string, number> = {};
    redemptions.forEach(r => {
      dealRedemptionCounts[r.deal_id] = (dealRedemptionCounts[r.deal_id] || 0) + 1;
    });

    return allDeals.map(d => ({
      ...d,
      redemptions: dealRedemptionCounts[d.id] || 0,
      rate: d.claims_count > 0 ? ((dealRedemptionCounts[d.id] || 0) / d.claims_count) * 100 : 0,
      revenue: d.deal_type === 'sponti_coupon' && d.deposit_amount ? d.deposit_amount * d.claims_count : d.deal_price * d.claims_count,
    }));
  }, [allDeals, redemptions]);

  const sortedTableData = useMemo(() => {
    return [...tableData].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;
      switch (sortField) {
        case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
        case 'deal_type': aVal = a.deal_type; bVal = b.deal_type; break;
        case 'discount_percentage': aVal = a.discount_percentage; bVal = b.discount_percentage; break;
        case 'claims_count': aVal = a.claims_count; bVal = b.claims_count; break;
        case 'redemptions': aVal = a.redemptions; bVal = b.redemptions; break;
        case 'rate': aVal = a.rate; bVal = b.rate; break;
        case 'revenue': aVal = a.revenue; bVal = b.revenue; break;
        case 'status': aVal = a.status; bVal = b.status; break;
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [tableData, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#E8632B]" /> : <ChevronDown className="w-3 h-3 text-[#E8632B]" />;
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-[#E8632B]" />
            <BarChart3 className="w-6 h-6 text-[#E8632B] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-gray-500 mt-4">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="max-w-[1440px] mx-auto pb-12">

      {/* ─── Sticky Header + Time Range Filter ────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 -mx-4 px-4 py-4 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#E8632B] to-[#F4945E] shadow-lg shadow-orange-200">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1A1A2E]">Analytics</h1>
              <p className="text-gray-500 text-sm">Performance insights and AI-powered recommendations</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-white text-[#1A1A2E] shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <KPICard
          icon={Tag}
          iconColor={COLORS.primary}
          label="Total Deals"
          value={kpis.totalDeals}
          delay={0}
        />
        <KPICard
          icon={Users}
          iconColor={COLORS.blue}
          label="Total Claims"
          value={kpis.totalClaims}
          trend={kpis.claimsTrend}
          trendLabel={timeRange !== 'all' ? `vs prev ${timeRange}` : undefined}
          delay={50}
        />
        <KPICard
          icon={QrCode}
          iconColor={COLORS.purple}
          label="Redemptions"
          value={kpis.totalRedemptions}
          trend={kpis.redemptionsTrend}
          trendLabel={timeRange !== 'all' ? `vs prev ${timeRange}` : undefined}
          delay={100}
        />
        <KPICard
          icon={TrendingUp}
          iconColor={COLORS.positive}
          label="Conversion Rate"
          value={Math.round(kpis.conversionRate)}
          suffix="%"
          delay={150}
        />
        <KPICard
          icon={DollarSign}
          iconColor="#16a34a"
          label="Deposit Revenue"
          value={kpis.totalRevenue}
          prefix="$"
          delay={200}
        />
        <KPICard
          icon={Activity}
          iconColor={COLORS.cyan}
          label="Avg Claims/Deal"
          value={Math.round(kpis.avgClaimsPerDeal)}
          delay={250}
        />
      </div>

      {/* ─── Charts Section ───────────────────────────────────────────────── */}

      {/* Row 1: Revenue Over Time + Conversion Funnel */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <GatedSection locked={!canAccess('basic_charts')} requiredTier="pro" featureName="Revenue & Claims Over Time" description="Track your revenue trends and claim volume. Upgrade to Pro for charts.">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#1A1A2E]">Revenue & Claims Over Time</h3>
              <p className="text-xs text-gray-400 mt-0.5">Daily deposit revenue and claim volume</p>
            </div>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {timeRange === 'all' ? 'All time' : `Last ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days`}
            </span>
          </div>
          {revenueOverTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={revenueOverTimeData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.positive} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.positive} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="claimsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke={COLORS.positive} strokeWidth={2} fill="url(#revenueGradient)" name="Revenue ($)" />
                <Line yAxisId="right" type="monotone" dataKey="claims" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3, fill: COLORS.primary }} name="Claims" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
        </GatedSection>

        {/* Conversion Funnel */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">Conversion Funnel</h3>
          <p className="text-xs text-gray-400 mb-4">From views to redemptions</p>
          <div className="space-y-4">
            {funnelData.map((item, i) => {
              const maxVal = Math.max(...funnelData.map(f => f.value), 1);
              const pct = (item.value / maxVal) * 100;
              const nextItem = funnelData[i + 1];
              const convRate = nextItem && item.value > 0 ? ((nextItem.value / item.value) * 100).toFixed(1) : null;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm font-bold text-[#1A1A2E]">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: item.fill }}
                    >
                      {pct > 15 && <span className="text-white text-xs font-medium">{Math.round(pct)}%</span>}
                    </div>
                  </div>
                  {convRate && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{convRate}% conversion</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Claims vs Redemptions + Deal Type Performance */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Claims vs Redemptions */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-[#1A1A2E] mb-1">Claims vs Redemptions</h3>
          <p className="text-xs text-gray-400 mb-4">Comparison by deal</p>
          {claimsVsRedemptionsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={claimsVsRedemptionsData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="claims" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Claims" />
                <Bar dataKey="redemptions" fill={COLORS.positive} radius={[4, 4, 0, 0]} name="Redemptions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Deal Type Performance */}
        <GatedSection locked={!canAccess('basic_charts')} requiredTier="pro" featureName="Sponti vs Steady Performance" description="Compare deal types to see what drives more claims. Upgrade to Pro.">
        <div className="card p-6">
          <h3 className="text-lg font-bold text-[#1A1A2E] mb-4">Sponti vs Steady Performance</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 text-center border border-orange-100">
              <SpontiIcon className="w-6 h-6 text-[#E8632B] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#E8632B]">{dealTypePerformance.sponti.claims}</p>
              <p className="text-xs text-gray-500 mt-1">Sponti Claims</p>
              <p className="text-xs text-gray-400">{dealTypePerformance.sponti.deals} deals</p>
              <div className="mt-2 px-2 py-1 bg-white/70 rounded-lg">
                <p className="text-xs text-gray-500">{Math.round(dealTypePerformance.sponti.avgRedemptionRate)}% redeemed</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 text-center border border-indigo-100">
              <Tag className="w-6 h-6 text-[#1A1A2E] mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#1A1A2E]">{dealTypePerformance.steady.claims}</p>
              <p className="text-xs text-gray-500 mt-1">Steady Claims</p>
              <p className="text-xs text-gray-400">{dealTypePerformance.steady.deals} deals</p>
              <div className="mt-2 px-2 py-1 bg-white/70 rounded-lg">
                <p className="text-xs text-gray-500">{Math.round(dealTypePerformance.steady.avgRedemptionRate)}% redeemed</p>
              </div>
            </div>
          </div>
          {dealTypePerformance.chartData.some(d => d.Sponti > 0 || d.Steady > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dealTypePerformance.chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Sponti" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Steady" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No claims data yet" />
          )}
        </div>
        </GatedSection>
      </div>

      {/* Row 3: Hourly Heatmap + Day of Week */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly Heatmap */}
        <GatedSection locked={!canAccess('basic_charts')} requiredTier="pro" featureName="Hourly Claims Heatmap" description="See when customers claim the most. Upgrade to Pro.">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#E8632B]" />
            <h3 className="text-lg font-bold text-[#1A1A2E]">Hourly Claims Heatmap</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Best times to post your deals</p>
          {filteredClaims.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9 }}
                  stroke="#9ca3af"
                  interval={1}
                />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | undefined) => [value ?? 0, 'Claims']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Bar dataKey="claims" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.intensity > 0.7 ? COLORS.primary : entry.intensity > 0.4 ? COLORS.primaryLight : entry.intensity > 0 ? '#FED7AA' : '#F3F4F6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No hourly data available" />
          )}
          {filteredClaims.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#F3F4F6]" />
                <span className="text-xs text-gray-400">Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#FED7AA]" />
                <span className="text-xs text-gray-400">Medium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.primaryLight }} />
                <span className="text-xs text-gray-400">High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.primary }} />
                <span className="text-xs text-gray-400">Peak</span>
              </div>
            </div>
          )}
        </div>
        </GatedSection>

        {/* Day of Week Performance */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-lg font-bold text-[#1A1A2E]">Day of Week Performance</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Claims distribution by day</p>
          {filteredClaims.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | undefined) => [value ?? 0, 'Claims']}
                  labelFormatter={(label) => {
                    const labelStr = String(label);
                    const idx = DAY_NAMES.indexOf(labelStr);
                    return idx >= 0 ? DAY_NAMES_FULL[idx] : labelStr;
                  }}
                />
                <Bar dataKey="claims" radius={[6, 6, 0, 0]}>
                  {dayOfWeekData.map((entry, index) => {
                    const max = Math.max(...dayOfWeekData.map(d => d.claims), 1);
                    const intensity = entry.claims / max;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={intensity > 0.7 ? COLORS.purple : intensity > 0.4 ? '#A78BFA' : intensity > 0 ? '#C4B5FD' : '#F3F4F6'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No daily data available" />
          )}
        </div>
      </div>

      {/* Row 4: Discount Impact + Category Performance */}
      <GatedSection locked={!canAccess('advanced_analytics')} requiredTier="business" featureName="Advanced Analytics" description="Unlock discount analysis, category insights, and data tables. Upgrade to Business.">
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Discount Impact Analysis */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-[#8B5CF6]" />
            <h3 className="text-lg font-bold text-[#1A1A2E]">Discount Impact Analysis</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Does deeper discount = more claims?</p>
          {discountImpactData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={discountImpactData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="totalClaims" fill={COLORS.purple} radius={[4, 4, 0, 0]} name="Total Claims" opacity={0.8} />
                <Line yAxisId="right" type="monotone" dataKey="avgClaims" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: COLORS.primary }} name="Avg Claims/Deal" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No discount data available" />
          )}
        </div>

        {/* Category Performance */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <PieChartIcon className="w-4 h-4 text-[#06B6D4]" />
            <h3 className="text-lg font-bold text-[#1A1A2E]">Category Performance</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Claims distribution by deal category</p>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 min-w-[120px]">
                {categoryData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{entry.name}</p>
                      <p className="text-xs text-gray-400">{entry.value} claims</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart message="No category data available" />
          )}
        </div>
      </div>
      </GatedSection>

      {/* ─── AI Deal Advisor Section ──────────────────────────────────────── */}
      <GatedSection locked={!canAccess('ai_deal_advisor')} requiredTier="business" featureName="AI Deal Advisor" description="Get AI-powered insights, competitor analysis, and personalized deal recommendations. Upgrade to Business.">
      <div className="mb-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1A2E] via-[#2D2D4A] to-[#1A1A2E] p-[1px]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8632B]/20 via-transparent to-[#8B5CF6]/20 animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="relative bg-gradient-to-br from-[#1A1A2E] via-[#232340] to-[#1A1A2E] rounded-2xl p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#E8632B] to-[#F4945E] shadow-lg shadow-orange-500/20">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Deal Advisor</h2>
                  <p className="text-sm text-gray-400">Powered by data analysis of your deal performance</p>
                </div>
              </div>
              <button
                onClick={fetchAIInsights}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition-all text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {aiLoading ? (
              <SparkleLoader />
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">

                {/* Column 1: Local Data Insights */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-base font-semibold text-white">Data Insights</h3>
                  </div>
                  {localInsights.length > 0 ? (
                    localInsights.map((insight, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg mt-0.5" style={{ backgroundColor: `${insight.color}20` }}>
                            <insight.icon className="w-4 h-4" style={{ color: insight.color }} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-medium">{insight.label}</p>
                            <p className="text-sm text-white mt-0.5">{insight.value}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                      <p className="text-sm text-gray-400">Create some deals to see data insights</p>
                    </div>
                  )}
                </div>

                {/* Column 2: AI Recommendations */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <h3 className="text-base font-semibold text-white">Recommendations</h3>
                  </div>
                  {aiInsights?.recommendations && aiInsights.recommendations.length > 0 ? (
                    aiInsights.recommendations.slice(0, 4).map((rec, i) => (
                      <div
                        key={i}
                        className={`rounded-xl p-4 border transition-all hover:scale-[1.02] ${
                          rec.priority === 'high'
                            ? 'bg-red-500/10 border-red-500/20'
                            : rec.priority === 'medium'
                            ? 'bg-amber-500/10 border-amber-500/20'
                            : 'bg-blue-500/10 border-blue-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            rec.priority === 'high'
                              ? 'bg-red-500/20 text-red-400'
                              : rec.priority === 'medium'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white mb-1">{rec.title}</p>
                        <p className="text-xs text-gray-400 leading-relaxed">{rec.description}</p>
                        {rec.action && (
                          <Link href={rec.action} className="inline-flex items-center gap-1 text-xs text-[#E8632B] hover:text-[#F4945E] mt-2 font-medium">
                            Take Action <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ))
                  ) : aiError ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-xs text-amber-400 mb-1">Could not load AI recommendations</p>
                      <p className="text-xs text-gray-500">Check your local insights for data-driven suggestions.</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                      <p className="text-sm text-gray-400">Create deals to receive personalized recommendations</p>
                    </div>
                  )}

                  {/* Competitor info */}
                  {aiInsights?.competitors && (
                    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                      <p className="text-xs text-purple-300 font-semibold mb-2">Competitive Landscape</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-lg font-bold text-white">{aiInsights.competitors.count}</p>
                          <p className="text-[10px] text-gray-400">Competitors</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-white">{aiInsights.competitors.avgDiscount}%</p>
                          <p className="text-[10px] text-gray-400">Their Avg Discount</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 3: Suggested Next Deal */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[#E8632B]" />
                    <h3 className="text-base font-semibold text-white">Suggested Next Deal</h3>
                  </div>
                  <div className="bg-gradient-to-br from-[#E8632B]/10 to-[#8B5CF6]/10 rounded-xl p-5 border border-[#E8632B]/20">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Deal Type</span>
                        <DealTypeBadge type={suggestedDeal.typeValue} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Discount Range</span>
                        <span className="text-sm font-semibold text-white">{suggestedDeal.discountRange}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Best Time to Post</span>
                        <span className="text-sm font-semibold text-white">{suggestedDeal.bestTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Best Day</span>
                        <span className="text-sm font-semibold text-white">{suggestedDeal.bestDay}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Duration</span>
                        <span className="text-sm font-semibold text-white">{suggestedDeal.duration}</span>
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <p className="text-[11px] text-gray-500 mb-3">
                          Based on your historical performance, this combination has the best chance of maximizing claims.
                        </p>
                        <Link
                          href="/vendor/deals/new"
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#E8632B] to-[#F4945E] text-white font-semibold text-sm hover:shadow-lg hover:shadow-orange-500/25 transition-all hover:scale-[1.02]"
                        >
                          <Zap className="w-4 h-4" />
                          Create This Deal
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* What's Working summary */}
                  {aiInsights?.myStats?.bestDeal && (
                    <div className="mt-4 bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <p className="text-xs text-green-300 font-semibold">What&apos;s Working</p>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Your top deal &ldquo;{aiInsights.myStats.bestDeal.title.length > 35 ? aiInsights.myStats.bestDeal.title.slice(0, 35) + '...' : aiInsights.myStats.bestDeal.title}&rdquo; earned{' '}
                        <span className="text-white font-semibold">{aiInsights.myStats.bestDeal.claims_count} claims</span>{' '}
                        at {Math.round(aiInsights.myStats.bestDeal.discount_percentage)}% off.
                        {aiInsights.myStats.spontiAvgClaims > aiInsights.myStats.regularAvgClaims
                          ? ' Sponti Deals outperform Steady Deals for you.'
                          : aiInsights.myStats.regularAvgClaims > aiInsights.myStats.spontiAvgClaims
                          ? ' Steady Deals are your stronger format.'
                          : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </GatedSection>

      {/* ─── Performance Table ────────────────────────────────────────────── */}
      <GatedSection locked={!canAccess('advanced_analytics')} requiredTier="business" featureName="Deal Performance Table" description="Detailed deal-by-deal breakdown with sortable data. Upgrade to Business.">
      <div className="mb-10">
        <SectionHeader icon={TableIcon} title="Deal Performance Table" subtitle="Click column headers to sort. Click a row to expand." />
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    { field: 'title' as SortField, label: 'Deal Name', width: 'min-w-[200px]' },
                    { field: 'deal_type' as SortField, label: 'Type', width: 'min-w-[100px]' },
                    { field: 'discount_percentage' as SortField, label: 'Discount', width: 'min-w-[90px]' },
                    { field: 'claims_count' as SortField, label: 'Claims', width: 'min-w-[80px]' },
                    { field: 'redemptions' as SortField, label: 'Redeemed', width: 'min-w-[90px]' },
                    { field: 'rate' as SortField, label: 'Rate', width: 'min-w-[70px]' },
                    { field: 'revenue' as SortField, label: 'Revenue', width: 'min-w-[100px]' },
                    { field: 'status' as SortField, label: 'Status', width: 'min-w-[90px]' },
                  ].map(col => (
                    <th
                      key={col.field}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#1A1A2E] transition-colors select-none ${col.width}`}
                      onClick={() => handleSort(col.field)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.field} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedTableData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <Tag className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <p>No deals created yet</p>
                    </td>
                  </tr>
                ) : (
                  sortedTableData.map(deal => (
                    <Fragment key={deal.id}>
                      <tr
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${expandedDeal === deal.id ? 'rotate-180' : ''}`} />
                            <span className="font-medium text-[#1A1A2E] text-sm">{deal.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><DealTypeBadge type={deal.deal_type} /></td>
                        <td className="px-4 py-3.5 text-sm font-medium text-[#1A1A2E]">{Math.round(deal.discount_percentage)}%</td>
                        <td className="px-4 py-3.5 text-sm font-bold text-[#1A1A2E]">{deal.claims_count}</td>
                        <td className="px-4 py-3.5 text-sm font-medium text-gray-700">{deal.redemptions}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-semibold ${deal.rate >= 50 ? 'text-green-600' : deal.rate >= 25 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {Math.round(deal.rate)}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-[#1A1A2E]">{formatCurrency(deal.revenue)}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={deal.status} /></td>
                      </tr>
                      {expandedDeal === deal.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={8} className="px-8 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Original Price</p>
                                <p className="font-medium text-[#1A1A2E]">{formatCurrency(deal.original_price)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Deal Price</p>
                                <p className="font-medium text-[#1A1A2E]">{formatCurrency(deal.deal_price)}</p>
                              </div>
                              {deal.deposit_amount && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Deposit Amount</p>
                                  <p className="font-medium text-[#E8632B]">{formatCurrency(deal.deposit_amount)}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Max Claims</p>
                                <p className="font-medium text-[#1A1A2E]">{deal.max_claims || 'Unlimited'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Fill Rate</p>
                                <p className="font-medium text-[#1A1A2E]">
                                  {deal.max_claims ? `${Math.round((deal.claims_count / deal.max_claims) * 100)}%` : 'N/A'}
                                </p>
                                {deal.max_claims && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className="h-1.5 rounded-full bg-[#E8632B] transition-all"
                                      style={{ width: `${Math.min(100, (deal.claims_count / deal.max_claims) * 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Created</p>
                                <p className="font-medium text-[#1A1A2E]">{new Date(deal.created_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Starts</p>
                                <p className="font-medium text-[#1A1A2E]">{new Date(deal.starts_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Expires</p>
                                <p className="font-medium text-[#1A1A2E]">{new Date(deal.expires_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            {deal.description && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-400 mb-1">Description</p>
                                <p className="text-sm text-gray-600">{deal.description}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </GatedSection>
    </div>
  );
}
