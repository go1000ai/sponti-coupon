'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Store,
  Tag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  QrCode,
  UserPlus,
  Clock,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Star,
  ClipboardList,
  Grid3X3,
  Share2,
  Facebook,
  Instagram,
  Twitter,
  Unplug,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  ImageIcon,
  Wand2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

type DateRange = 'today' | '7d' | '30d' | 'all';

interface SparklinePoint {
  date: string;
  count: number;
}

interface MrrPoint {
  date: string;
  mrr: number;
}

interface OverviewData {
  totalVendors: number;
  totalCustomers: number;
  activeDeals: number;
  mrr: number;
  tierBreakdown: Record<string, number>;
  todayActivity: {
    claims: number;
    signups: number;
    dealsCreated: number;
  };
  recentActivity: {
    id: string;
    type: 'claim' | 'redemption' | 'signup' | 'deal';
    description: string;
    timestamp: string;
  }[];
  growthMetrics: {
    vendorsThisWeek: number;
    vendorsLastWeek: number;
    customersThisWeek: number;
    customersLastWeek: number;
  };
  systemHealth: {
    expiredUncleared: number;
    pendingDeposits: number;
  };
  sparklines: {
    vendors: SparklinePoint[];
    customers: SparklinePoint[];
    claims: SparklinePoint[];
    mrr: MrrPoint[];
  };
}

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
        setDisplay(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, decimals]);
  return (
    <>
      {prefix}
      {decimals > 0 ? display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : display.toLocaleString()}
      {suffix}
    </>
  );
}

function MiniSparkline({
  data,
  dataKey,
  color,
  gradientId,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  color: string;
  gradientId: string;
}) {
  if (!data || data.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={true}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ProgressRing({
  value,
  goal,
  color,
  size = 80,
  strokeWidth = 6,
}: {
  value: number;
  goal: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(value / goal, 1);
  const offset = circumference * (1 - percent);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f0f0f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded mt-1" />
          </div>
        </div>
        <div className="h-9 w-64 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 w-16 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card p-6">
            <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="card p-6 lg:col-span-2">
          <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for the tier donut chart
function TierTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string; price: number } }> }) {
  if (!active || !payload || !payload[0]) return null;
  const item = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
      <p className="font-semibold text-gray-900 capitalize">{item.name}</p>
      <p className="text-sm text-gray-500">
        {item.value} vendor{item.value !== 1 ? 's' : ''}
      </p>
      <p className="text-sm font-medium text-green-600">
        {formatCurrency(item.value * (item.payload.price || 0))}/mo
      </p>
    </div>
  );
}

// --- Main Page ---

const TIER_CONFIG = [
  { tier: 'starter', color: '#22c55e', price: 49 },
  { tier: 'pro', color: '#f97316', price: 99 },
  { tier: 'business', color: '#3b82f6', price: 199 },
  { tier: 'enterprise', color: '#8b5cf6', price: 499 },
];

const DAILY_GOALS = { claims: 50, signups: 20, deals: 5 };

// --- Social Media Types & Constants ---

type DashTab = 'overview' | 'social';
type SocialSubTab = 'promote' | 'brand' | 'vendors' | 'posts';

interface SocialConnection {
  id: string;
  vendor_id: string | null;
  is_brand_account: boolean;
  platform: string;
  account_name: string | null;
  account_username: string | null;
  account_avatar_url: string | null;
  is_active: boolean;
  last_posted_at: string | null;
  last_error: string | null;
  connected_at: string;
  vendor_name?: string;
}

interface SocialPost {
  id: string;
  deal_id: string;
  platform: string;
  account_type: string;
  caption: string | null;
  status: string;
  platform_post_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  posted_at: string | null;
}

const TikTokIcon = () => (
  <svg className="w-4 h-4 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" />
  </svg>
);

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="w-4 h-4 text-blue-600" />,
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  twitter: <Twitter className="w-4 h-4 text-gray-800" />,
  tiktok: <TikTokIcon />,
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  tiktok: 'TikTok',
};

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');
  const [transitioning, setTransitioning] = useState(false);

  // Social tab state
  const [dashTab, setDashTab] = useState<DashTab>('overview');
  const [socialSubTab, setSocialSubTab] = useState<SocialSubTab>('promote');
  const [brandConnections, setBrandConnections] = useState<SocialConnection[]>([]);
  const [vendorConnections, setVendorConnections] = useState<SocialConnection[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialFetched, setSocialFetched] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [retryingPost, setRetryingPost] = useState<string | null>(null);

  // Promote tab state
  const [promoCaption, setPromoCaption] = useState('');
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [promoFacebook, setPromoFacebook] = useState(true);
  const [promoInstagram, setPromoInstagram] = useState(true);
  const [promoPosting, setPromoPosting] = useState(false);
  const [promoGenerating, setPromoGenerating] = useState(false);
  const [promoResult, setPromoResult] = useState<{platform: string; success: boolean; error?: string; url?: string}[] | null>(null);
  const [promoTopic, setPromoTopic] = useState('');
  const [promoCampaign, setPromoCampaign] = useState('');
  const [promoIdeas, setPromoIdeas] = useState<{title: string; caption: string; image_suggestion: string; best_time: string; target: string}[]>([]);
  const [promoLoadingIdeas, setPromoLoadingIdeas] = useState(false);

  const handleRetryPost = async (postId: string) => {
    setRetryingPost(postId);
    try {
      const res = await fetch('/api/social/retry-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json();
      if (data.success !== undefined) {
        setSocialPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? {
                  ...p,
                  status: data.result?.status || p.status,
                  error_message: data.result?.error || null,
                  retry_count: (p.retry_count || 0) + 1,
                  platform_post_url: data.result?.platform_post_url || p.platform_post_url,
                  posted_at: data.result?.status === 'posted' ? new Date().toISOString() : p.posted_at,
                }
              : p
          )
        );
      }
    } finally {
      setRetryingPost(null);
    }
  };

  const generatePromoCaption = async () => {
    if (!promoTopic.trim()) return;
    setPromoGenerating(true);
    try {
      const res = await fetch('/api/admin/social/promote', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: promoTopic, campaign: promoCampaign || undefined }),
      });
      const data = await res.json();
      if (data.caption) {
        setPromoCaption(data.caption);
      }
    } catch {
      // Silent fail
    }
    setPromoGenerating(false);
  };

  const generateCampaignIdeas = async (campaignType: string) => {
    setPromoLoadingIdeas(true);
    setPromoCampaign(campaignType);
    try {
      const res = await fetch('/api/admin/social/promote', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign: campaignType, mode: 'ideas' }),
      });
      const data = await res.json();
      if (data.ideas) {
        setPromoIdeas(data.ideas);
      }
    } catch {
      // Silent fail
    }
    setPromoLoadingIdeas(false);
  };

  const applyPostIdea = (idea: { caption: string; image_suggestion: string }) => {
    setPromoCaption(idea.caption);
    setPromoIdeas([]);
  };

  const handlePromote = async () => {
    if (!promoCaption.trim()) return;
    const platforms: string[] = [];
    if (promoFacebook) platforms.push('facebook');
    if (promoInstagram) platforms.push('instagram');
    if (platforms.length === 0) return;

    setPromoPosting(true);
    setPromoResult(null);
    try {
      const res = await fetch('/api/admin/social/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: promoCaption,
          image_url: promoImageUrl || undefined,
          platforms,
        }),
      });
      const data = await res.json();
      setPromoResult(data.results || []);
      // Refresh post history
      fetchSocialData();
    } catch {
      setPromoResult([{ platform: 'all', success: false, error: 'Network error' }]);
    }
    setPromoPosting(false);
  };

  const fetchData = useCallback(async (selectedRange: DateRange) => {
    try {
      const res = await fetch(`/api/admin/overview?range=${selectedRange}`);
      if (!res.ok) throw new Error('Failed to fetch overview data');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching overview:', err);
    } finally {
      setLoading(false);
      setTransitioning(false);
    }
  }, []);

  const fetchSocialData = useCallback(async () => {
    setSocialLoading(true);
    try {
      const [connRes, postsRes] = await Promise.all([
        fetch('/api/admin/social/connections'),
        fetch('/api/admin/social/posts?limit=50'),
      ]);
      if (connRes.ok) {
        const connData = await connRes.json();
        setBrandConnections(connData.brand || []);
        setVendorConnections(connData.vendors || []);
      }
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setSocialPosts(postsData.posts || []);
      }
    } catch {
      // Silent fail
    }
    setSocialLoading(false);
    setSocialFetched(true);
  }, []);

  const disconnectAccount = async (connectionId: string) => {
    setDisconnecting(connectionId);
    try {
      const res = await fetch('/api/social/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      if (res.ok) {
        setBrandConnections(prev => prev.filter(c => c.id !== connectionId));
        setVendorConnections(prev => prev.filter(c => c.id !== connectionId));
      }
    } catch {
      // Silent fail
    }
    setDisconnecting(null);
  };

  useEffect(() => {
    if (!user) return;
    fetchData(range);
    // Check URL for ?tab=social
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'social') {
      setDashTab('social');
    }
  }, [user, range, fetchData]);

  // Fetch social data when social tab is activated
  useEffect(() => {
    if (dashTab === 'social' && !socialFetched && !socialLoading) {
      fetchSocialData();
    }
  }, [dashTab, socialFetched, socialLoading, fetchSocialData]);

  const handleRangeChange = (newRange: DateRange) => {
    if (newRange === range) return;
    setTransitioning(true);
    setRange(newRange);
  };

  const getGrowthPercent = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'claim': return <QrCode className="w-4 h-4 text-blue-500" />;
      case 'redemption': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'signup': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'deal': return <Tag className="w-4 h-4 text-primary-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityBorder = (type: string) => {
    switch (type) {
      case 'claim': return 'border-l-blue-400';
      case 'redemption': return 'border-l-green-400';
      case 'signup': return 'border-l-blue-400';
      case 'deal': return 'border-l-primary-400';
      default: return 'border-l-gray-300';
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'claim': return { bg: 'bg-blue-50 text-blue-600', label: 'Claim' };
      case 'redemption': return { bg: 'bg-green-50 text-green-600', label: 'Redeemed' };
      case 'signup': return { bg: 'bg-blue-50 text-blue-600', label: 'Signup' };
      case 'deal': return { bg: 'bg-primary-50 text-primary-600', label: 'Deal' };
      default: return { bg: 'bg-gray-50 text-gray-500', label: type };
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const vendorGrowth = data ? getGrowthPercent(data.growthMetrics.vendorsThisWeek, data.growthMetrics.vendorsLastWeek) : 0;
  const customerGrowth = data ? getGrowthPercent(data.growthMetrics.customersThisWeek, data.growthMetrics.customersLastWeek) : 0;

  // Donut chart data
  const tierChartData = TIER_CONFIG.map(({ tier, price }) => ({
    name: tier,
    value: data?.tierBreakdown[tier] || 0,
    price,
  }));
  const tierColors = TIER_CONFIG.map((t) => t.color);

  if (loading && !data) {
    return <SkeletonDashboard />;
  }

  // Stat cards configuration
  const statCards = [
    {
      label: t('admin.dashboard.mrr'),
      value: data?.mrr || 0,
      prefix: '$',
      icon: <DollarSign className="w-5 h-5" />,
      iconBg: 'bg-green-100 text-green-600',
      badge: 'MRR',
      badgeColor: 'bg-green-50 text-green-600',
      sparklineData: data?.sparklines.mrr || [],
      sparklineKey: 'mrr',
      sparklineColor: '#22c55e',
      gradientId: 'mrrGrad',
    },
    {
      label: t('admin.dashboard.totalVendors'),
      value: data?.totalVendors || 0,
      icon: <Store className="w-5 h-5" />,
      iconBg: 'bg-blue-100 text-blue-600',
      sparklineData: data?.sparklines.vendors || [],
      sparklineKey: 'count',
      sparklineColor: '#3b82f6',
      gradientId: 'vendorsGrad',
    },
    {
      label: t('admin.dashboard.totalCustomers'),
      value: data?.totalCustomers || 0,
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-blue-100 text-blue-600',
      sparklineData: data?.sparklines.customers || [],
      sparklineKey: 'count',
      sparklineColor: '#a855f7',
      gradientId: 'customersGrad',
    },
    {
      label: t('admin.dashboard.activeDeals'),
      value: data?.activeDeals || 0,
      icon: <Tag className="w-5 h-5" />,
      iconBg: 'bg-primary-100 text-primary-600',
      sparklineData: data?.sparklines.claims || [],
      sparklineKey: 'count',
      sparklineColor: '#E8632B',
      gradientId: 'dealsGrad',
    },
  ];

  const healthItems = [
    {
      label: t('admin.dashboard.expiredDealsCleanup'),
      subtitle: t('admin.dashboard.expiredDealsSubtitle'),
      value: data?.systemHealth.expiredUncleared || 0,
      max: 20,
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: t('admin.dashboard.pendingDeposits'),
      subtitle: t('admin.dashboard.pendingDepositsSubtitle'),
      value: data?.systemHealth.pendingDeposits || 0,
      max: 30,
      icon: <DollarSign className="w-5 h-5" />,
    },
  ];

  return (
    <div className={`transition-opacity duration-300 ${transitioning ? 'opacity-40' : 'opacity-100'}`}>
      {/* Dashboard Tab Switcher */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setDashTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            dashTab === 'overview'
              ? 'border-[#E8632B] text-[#E8632B]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          {t('admin.dashboard.overview')}
        </button>
        <button
          onClick={() => setDashTab('social')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            dashTab === 'social'
              ? 'border-[#E8632B] text-[#E8632B]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Share2 className="w-4 h-4" />
          {t('admin.dashboard.socialMedia')}
        </button>
      </div>

      {/* === SOCIAL MEDIA TAB === */}
      {dashTab === 'social' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Share2 className="w-7 h-7 text-[#E8632B]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.social.title')}</h1>
                <p className="text-sm text-gray-500">{t('admin.social.manageDescription')}</p>
              </div>
            </div>
            <button onClick={fetchSocialData} className="btn-secondary flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" /> {t('admin.social.refresh')}
            </button>
          </div>

          {/* Social Sub-Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            {(['promote', 'brand', 'vendors', 'posts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSocialSubTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  socialSubTab === tab
                    ? 'border-[#E8632B] text-[#E8632B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'promote' ? t('admin.social.promote') : tab === 'brand' ? t('admin.social.brandAccounts') : tab === 'vendors' ? t('admin.social.vendorConnections') : t('admin.social.postHistory')}
                {tab === 'posts' && socialPosts.filter(p => p.status === 'failed').length > 0 && (
                  <span className="ml-1.5 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                    {socialPosts.filter(p => p.status === 'failed').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {socialLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Promote */}
              {socialSubTab === 'promote' && (
                <div className="space-y-6">
                  <p className="text-sm text-gray-500">
                    {t('admin.social.promoteDescription')}
                  </p>

                  {/* Campaign Templates */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#E8632B]" />
                      {t('admin.social.campaignTemplates')}
                    </h3>
                    <p className="text-xs text-gray-500">{t('admin.social.campaignDescription')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'founders20', label: t('admin.social.campaignFounders'), icon: '🏆' },
                        { id: 'launch', label: t('admin.social.campaignLaunch'), icon: '🚀' },
                        { id: 'vendor_recruit', label: t('admin.social.campaignVendors'), icon: '🏪' },
                        { id: 'customer_acquire', label: t('admin.social.campaignCustomers'), icon: '🛍️' },
                        { id: 'engagement', label: t('admin.social.campaignEngagement'), icon: '💬' },
                        { id: 'seasonal', label: t('admin.social.campaignSeasonal'), icon: '☀️' },
                        { id: 'testimonial', label: t('admin.social.campaignTestimonial'), icon: '⭐' },
                        { id: 'tips', label: t('admin.social.campaignTips'), icon: '💡' },
                        { id: 'behind_scenes', label: t('admin.social.campaignBehindScenes'), icon: '🎬' },
                      ].map(c => (
                        <button
                          key={c.id}
                          onClick={() => generateCampaignIdeas(c.id)}
                          disabled={promoLoadingIdeas}
                          className={`text-left p-2.5 rounded-lg border text-sm transition-all ${
                            promoCampaign === c.id ? 'border-[#E8632B] bg-orange-50 text-[#E8632B]' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          } disabled:opacity-50`}
                        >
                          <span className="mr-1.5">{c.icon}</span>{c.label}
                        </button>
                      ))}
                    </div>

                    {/* Loading Ideas */}
                    {promoLoadingIdeas && (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mr-2" />
                        <span className="text-sm text-gray-500">{t('admin.social.generatingIdeas')}</span>
                      </div>
                    )}

                    {/* Campaign Ideas */}
                    {promoIdeas.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('admin.social.postIdeas')}</h4>
                        {promoIdeas.map((idea, i) => (
                          <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{idea.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{idea.caption}</p>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  <span className="text-xs text-gray-400">📸 {idea.image_suggestion}</span>
                                  <span className="text-xs text-gray-400">⏰ {idea.best_time}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${idea.target === 'vendors' ? 'bg-orange-100 text-orange-600' : idea.target === 'customers' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                    {idea.target}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => applyPostIdea(idea)}
                                className="text-xs bg-[#E8632B] text-white px-3 py-1.5 rounded-md hover:bg-orange-700 whitespace-nowrap flex-shrink-0"
                              >
                                {t('admin.social.useThis')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Caption Generator */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-emerald-600" />
                      {t('admin.social.aiCaption')}
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoTopic}
                        onChange={(e) => setPromoTopic(e.target.value)}
                        placeholder={t('admin.social.topicPlaceholder')}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        onKeyDown={(e) => e.key === 'Enter' && generatePromoCaption()}
                      />
                      <button
                        onClick={generatePromoCaption}
                        disabled={promoGenerating || !promoTopic.trim()}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {promoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {t('admin.social.generate')}
                      </button>
                    </div>
                  </div>

                  {/* Caption Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('admin.social.captionLabel')}</label>
                    <textarea
                      value={promoCaption}
                      onChange={(e) => setPromoCaption(e.target.value)}
                      rows={4}
                      placeholder={t('admin.social.captionPlaceholder')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8632B]"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      {t('admin.social.imageUrl')}
                    </label>
                    <input
                      type="url"
                      value={promoImageUrl}
                      onChange={(e) => setPromoImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8632B]"
                    />
                    {promoImageUrl && (
                      <img src={promoImageUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                    )}
                    <p className="text-xs text-gray-400">{t('admin.social.imageNote')}</p>
                  </div>

                  {/* Platform Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">{t('admin.social.selectPlatforms')}</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promoFacebook}
                          onChange={(e) => setPromoFacebook(e.target.checked)}
                          className="rounded border-gray-300 text-[#E8632B] focus:ring-[#E8632B]"
                        />
                        <Facebook className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Facebook</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promoInstagram}
                          onChange={(e) => setPromoInstagram(e.target.checked)}
                          className="rounded border-gray-300 text-[#E8632B] focus:ring-[#E8632B]"
                        />
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">Instagram</span>
                      </label>
                    </div>
                  </div>

                  {/* Post Button */}
                  <button
                    onClick={handlePromote}
                    disabled={promoPosting || !promoCaption.trim() || (!promoFacebook && !promoInstagram)}
                    className="btn-primary flex items-center gap-2 w-full justify-center py-3"
                  >
                    {promoPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {promoPosting ? t('admin.social.posting') : t('admin.social.postNow')}
                  </button>

                  {/* Results */}
                  {promoResult && (
                    <div className="space-y-2">
                      {promoResult.map((r, i) => (
                        <div key={i} className={`flex items-center gap-2 p-3 rounded-lg text-sm ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {r.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          <span className="font-medium capitalize">{r.platform}:</span>
                          {r.success ? (
                            r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{t('admin.social.viewPost')}</a> : t('admin.social.posted')
                          ) : (
                            r.error || t('admin.social.failed')
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Brand Accounts */}
              {socialSubTab === 'brand' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">
                    {t('admin.social.brandDescription')}
                  </p>
                  {(['facebook', 'instagram', 'twitter', 'tiktok'] as const).map(platform => {
                    const conn = brandConnections.find(c => c.platform === platform);
                    return (
                      <div key={platform} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white">
                        <div className="flex items-center gap-3">
                          {PLATFORM_ICONS[platform]}
                          <div>
                            <span className="font-medium text-gray-900">{PLATFORM_LABELS[platform]}</span>
                            {conn ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-xs text-green-600">{conn.account_name || conn.account_username || t('admin.social.connected')}</span>
                                {conn.last_error && (
                                  <span className="text-xs text-red-500 ml-2">{t('admin.social.lastError')}: {conn.last_error}</span>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">{t('admin.social.notConnected')}</p>
                            )}
                          </div>
                        </div>
                        {conn ? (
                          <button
                            onClick={() => disconnectAccount(conn.id)}
                            disabled={disconnecting === conn.id}
                            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            {disconnecting === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                            {t('admin.social.disconnect')}
                          </button>
                        ) : (
                          <a
                            href={`/api/social/connect/${platform}/authorize?brand=true`}
                            className="btn-primary text-sm px-4 py-1.5"
                          >
                            {t('admin.social.connect')}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Vendor Connections */}
              {socialSubTab === 'vendors' && (
                <div>
                  {vendorConnections.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Share2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>{t('admin.social.noVendorConnections')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.vendor')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.platform')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.account')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.users.status')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.lastPost')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorConnections.map(conn => (
                            <tr key={conn.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-900">{conn.vendor_name}</td>
                              <td className="py-3 px-4">
                                <span className="flex items-center gap-1.5">
                                  {PLATFORM_ICONS[conn.platform]}
                                  {PLATFORM_LABELS[conn.platform]}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {conn.account_username ? `@${conn.account_username}` : conn.account_name || '-'}
                              </td>
                              <td className="py-3 px-4">
                                {conn.is_active ? (
                                  <span className="inline-flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-3.5 h-3.5" /> {t('common.active')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-gray-400">
                                    <XCircle className="w-3.5 h-3.5" /> {t('common.inactive')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs">
                                {conn.last_posted_at
                                  ? new Date(conn.last_posted_at).toLocaleDateString()
                                  : t('admin.social.never')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Post History */}
              {socialSubTab === 'posts' && (
                <div>
                  {socialPosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Share2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>{t('admin.social.noPosts')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.platform')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.type')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.users.status')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.caption')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.date')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.social.link')}</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-500">{t('admin.users.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {socialPosts.map(post => (
                            <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <span className="flex items-center gap-1.5">
                                  {PLATFORM_ICONS[post.platform]}
                                  {PLATFORM_LABELS[post.platform]}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  post.account_type === 'brand'
                                    ? 'bg-[#E8632B]/10 text-[#E8632B]'
                                    : 'bg-[#29ABE2]/10 text-[#29ABE2]'
                                }`}>
                                  {post.account_type}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {post.status === 'posted' && (
                                  <span className="inline-flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-3.5 h-3.5" /> {t('admin.social.posted')}
                                  </span>
                                )}
                                {post.status === 'failed' && (
                                  <span className="inline-flex items-center gap-1 text-red-600" title={post.error_message || ''}>
                                    <XCircle className="w-3.5 h-3.5" /> {t('admin.social.failed')}
                                  </span>
                                )}
                                {post.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 text-yellow-600">
                                    <Loader2 className="w-3.5 h-3.5" /> {t('admin.social.pending')}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                                {post.caption?.substring(0, 80) || '-'}
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                                {new Date(post.created_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-4">
                                {post.platform_post_url ? (
                                  <a
                                    href={post.platform_post_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#E8632B] hover:underline inline-flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> {t('admin.social.viewPost')}
                                  </a>
                                ) : post.error_message ? (
                                  <span className="text-xs text-red-500 max-w-xs truncate block" title={post.error_message}>
                                    {post.error_message.substring(0, 40)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="py-3 px-4">
                                {post.status === 'failed' && (post.retry_count || 0) < 3 ? (
                                  <button
                                    onClick={() => handleRetryPost(post.id)}
                                    disabled={retryingPost === post.id}
                                    className="text-xs text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1"
                                  >
                                    {retryingPost === post.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    )}
                                    {t('admin.social.retry')}
                                  </button>
                                ) : post.status === 'failed' && (post.retry_count || 0) >= 3 ? (
                                  <span className="text-xs text-gray-400">{t('admin.social.maxRetries')}</span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === OVERVIEW TAB === */}
      {dashTab === 'overview' && (<>

      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
            <p className="text-sm text-gray-500">{t('admin.dashboard.subtitle')}</p>
          </div>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          {([
            { key: 'today', label: t('admin.dashboard.dateRange.today') },
            { key: '7d', label: t('admin.dashboard.dateRange.sevenDays') },
            { key: '30d', label: t('admin.dashboard.dateRange.thirtyDays') },
            { key: 'all', label: t('admin.dashboard.dateRange.all') },
          ] as { key: DateRange; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleRangeChange(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                range === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stat Cards with Sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default animate-card-pop overflow-hidden"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
              {card.badge && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {card.prefix ? (
                <AnimatedValue value={card.value} prefix={card.prefix} />
              ) : (
                <AnimatedValue value={card.value} />
              )}
            </p>
            <p className="text-xs text-gray-500 mb-2">{card.label}</p>
            <div className="-mx-5 -mb-5">
              <MiniSparkline
                data={card.sparklineData as unknown as Record<string, unknown>[]}
                dataKey={card.sparklineKey}
                color={card.sparklineColor}
                gradientId={card.gradientId}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Growth Metrics with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          {
            label: t('admin.dashboard.vendorGrowth'),
            subtitle: t('admin.dashboard.weekOverWeek'),
            thisWeek: data?.growthMetrics.vendorsThisWeek || 0,
            lastWeek: data?.growthMetrics.vendorsLastWeek || 0,
            growth: vendorGrowth,
            sparkData: data?.sparklines.vendors || [],
            color: '#3b82f6',
            gradId: 'vendorGrowthGrad',
          },
          {
            label: t('admin.dashboard.customerGrowth'),
            subtitle: t('admin.dashboard.weekOverWeek'),
            thisWeek: data?.growthMetrics.customersThisWeek || 0,
            lastWeek: data?.growthMetrics.customersLastWeek || 0,
            growth: customerGrowth,
            sparkData: data?.sparklines.customers || [],
            color: '#a855f7',
            gradId: 'customerGrowthGrad',
          },
        ].map((metric, index) => (
          <div
            key={metric.label}
            className="card p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-card-pop overflow-hidden"
            style={{ animationDelay: `${400 + index * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{metric.label}</h3>
                <p className="text-xs text-gray-400">{metric.subtitle}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full ${
                metric.growth >= 0
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-500'
              }`}>
                {metric.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {metric.growth >= 0 ? '+' : ''}{metric.growth.toFixed(1)}%
              </div>
            </div>
            <div className="flex items-end gap-6 mb-3">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  <AnimatedValue value={metric.thisWeek} />
                </p>
                <p className="text-xs text-gray-400">{t('admin.dashboard.thisWeek')}</p>
              </div>
              <div>
                <p className="text-lg text-gray-400">{metric.lastWeek}</p>
                <p className="text-xs text-gray-400">{t('admin.dashboard.lastWeek')}</p>
              </div>
            </div>
            <div className="-mx-5 -mb-5">
              <MiniSparkline
                data={metric.sparkData as unknown as Record<string, unknown>[]}
                dataKey="count"
                color={metric.color}
                gradientId={metric.gradId}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Today's Activity (Progress Rings) + Tier Breakdown (Donut) */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Activity with Progress Rings */}
        <div
          className="card p-6 animate-card-pop"
          style={{ animationDelay: '600ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            {t('admin.dashboard.todayActivity')}
          </h2>
          <div className="flex items-center justify-around">
            {[
              {
                label: t('admin.dashboard.claims'),
                value: data?.todayActivity.claims || 0,
                goal: DAILY_GOALS.claims,
                color: '#3b82f6',
                icon: <QrCode className="w-4 h-4 text-blue-500" />,
              },
              {
                label: t('admin.dashboard.signups'),
                value: data?.todayActivity.signups || 0,
                goal: DAILY_GOALS.signups,
                color: '#a855f7',
                icon: <UserPlus className="w-4 h-4 text-blue-500" />,
              },
              {
                label: t('common.deals'),
                value: data?.todayActivity.dealsCreated || 0,
                goal: DAILY_GOALS.deals,
                color: '#E8632B',
                icon: <Tag className="w-4 h-4 text-primary-500" />,
              },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <ProgressRing
                  value={item.value}
                  goal={item.goal}
                  color={item.color}
                />
                <div className="flex items-center gap-1">
                  {item.icon}
                  <span className="text-xs font-medium text-gray-600">{item.label}</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  / {item.goal} goal
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Breakdown — Interactive Donut Chart */}
        <div
          className="card p-6 lg:col-span-2 animate-card-pop"
          style={{ animationDelay: '700ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('admin.dashboard.tierBreakdown')}</h2>
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={tierChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                    animationDuration={1000}
                    animationBegin={800}
                  >
                    {tierChartData.map((_, index) => (
                      <Cell key={index} fill={tierColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TierTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {TIER_CONFIG.map(({ tier, color, price }) => {
                const count = data?.tierBreakdown[tier] || 0;
                return (
                  <div key={tier} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium text-gray-900 capitalize group-hover:text-primary-500 transition-colors">
                        {tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-900">
                        <AnimatedValue value={count} />
                      </span>
                      <span className="text-xs text-gray-400 w-16 text-right">{formatCurrency(price)}/mo</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions + System Health */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div
          className="card p-6 animate-card-pop"
          style={{ animationDelay: '800ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            {t('admin.dashboard.quickActions')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/admin/deals', icon: <Plus className="w-5 h-5 text-primary-600" />, iconBg: 'bg-primary-100 group-hover:bg-primary-200', label: t('admin.dashboard.createDeal'), sub: t('admin.dashboard.newDealListing') },
              { href: '/admin/featured', icon: <Star className="w-5 h-5 text-amber-600" />, iconBg: 'bg-amber-100 group-hover:bg-amber-200', label: t('admin.dashboard.manageFeatured'), sub: t('admin.dashboard.featuredDeals') },
              { href: '/admin/claims?status=pending', icon: <ClipboardList className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-100 group-hover:bg-blue-200', label: t('admin.dashboard.pendingClaims'), sub: t('admin.dashboard.reviewClaims') },
              { href: '/admin/categories', icon: <Grid3X3 className="w-5 h-5 text-blue-600" />, iconBg: 'bg-blue-100 group-hover:bg-blue-200', label: t('admin.dashboard.manageCategories'), sub: t('admin.dashboard.dealCategories') },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-primary-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${action.iconBg}`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-400">{action.sub}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* System Health — Animated Bars */}
        <div
          className="card p-6 animate-card-pop"
          style={{ animationDelay: '900ms', animationFillMode: 'both' }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary-500" />
            {t('admin.dashboard.systemHealth')}
          </h2>
          <div className="space-y-5">
            {healthItems.map((item) => {
              const severity = item.value === 0 ? 'good' : item.value <= item.max * 0.3 ? 'warning' : 'danger';
              const barColor = severity === 'good' ? 'bg-green-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-red-500';
              const textColor = severity === 'good' ? 'text-green-600' : severity === 'warning' ? 'text-amber-600' : 'text-red-600';
              const bgColor = severity === 'good' ? 'bg-green-50' : severity === 'warning' ? 'bg-amber-50' : 'bg-red-50';
              const iconColor = severity === 'good' ? 'text-green-500' : severity === 'warning' ? 'text-amber-500' : 'text-red-500';
              const statusLabel = severity === 'good' ? t('admin.dashboard.allClear') : severity === 'warning' ? t('admin.dashboard.needsAttention') : t('admin.dashboard.critical');
              const barPercent = Math.min((item.value / item.max) * 100, 100);

              return (
                <div key={item.label} className={`p-4 rounded-xl ${bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={iconColor}>{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${textColor}`}>{item.value}</span>
                      <p className={`text-xs font-medium ${textColor}`}>{statusLabel}</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor} ${
                        severity !== 'good' ? 'animate-pulse-slow' : ''
                      }`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed — Animated Entries */}
      <div
        className="card p-6 animate-card-pop"
        style={{ animationDelay: '1000ms', animationFillMode: 'both' }}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          {t('admin.dashboard.recentActivity')}
        </h2>
        {(data?.recentActivity || []).length === 0 ? (
          <p className="text-gray-400 text-center py-8">{t('admin.dashboard.noRecentActivity')}</p>
        ) : (
          <div className="space-y-2">
            {(data?.recentActivity || []).map((item, index) => {
              const badge = getActivityBadge(item.type);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${getActivityBorder(item.type)} hover:bg-gray-50 hover:shadow-sm transition-all duration-200 animate-slide-up-fade`}
                  style={{ animationDelay: `${1100 + index * 60}ms`, animationFillMode: 'both' }}
                >
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{item.description}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </>)}
    </div>
  );
}
