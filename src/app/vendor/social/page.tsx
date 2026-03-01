'use client';

import { useEffect, useState } from 'react';
import {
  Share2, Facebook, Instagram, Twitter, ExternalLink,
  CheckCircle, XCircle, Loader2, RotateCcw, BarChart3,
  Clock, ArrowRight, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';

/* ─── Platform config ─── */
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className || 'w-5 h-5'} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" />
  </svg>
);

const PLATFORMS = [
  { key: 'facebook' as const, label: 'Facebook', icon: <Facebook className="w-5 h-5" />, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', connectUrl: '/api/social/connect/facebook/authorize', available: true },
  { key: 'instagram' as const, label: 'Instagram', icon: <Instagram className="w-5 h-5" />, iconColor: 'text-pink-500', bgColor: 'bg-pink-50', borderColor: 'border-pink-200', connectUrl: '/api/social/connect/instagram/authorize', available: true },
  { key: 'twitter' as const, label: 'X (Twitter)', icon: <Twitter className="w-5 h-5" />, iconColor: 'text-gray-800', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', connectUrl: '/api/social/connect/twitter/authorize', available: false },
  { key: 'tiktok' as const, label: 'TikTok', icon: <TikTokIcon className="w-5 h-5" />, iconColor: 'text-gray-800', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', connectUrl: '/api/social/connect/tiktok/authorize', available: false },
] as const;

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <Facebook className="w-4 h-4 text-blue-600" />,
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  twitter: <Twitter className="w-4 h-4 text-gray-800" />,
  tiktok: <TikTokIcon className="w-4 h-4 text-gray-800" />,
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X',
  tiktok: 'TikTok',
};

/* ─── Types ─── */
interface SocialConnectionItem {
  id: string;
  platform: string;
  account_name: string | null;
  account_username: string | null;
  is_active: boolean;
  last_posted_at: string | null;
  last_error: string | null;
}

interface SocialPost {
  id: string;
  deal_id: string;
  platform: string;
  account_type: string;
  caption: string | null;
  image_url: string | null;
  claim_url: string | null;
  status: string;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  posted_at: string | null;
  deals?: { title: string; image_url: string | null } | null;
}

/* ─── Helpers ─── */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ─── Main Page ─── */
export default function VendorSocialPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();

  const [connections, setConnections] = useState<SocialConnectionItem[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [connRes, postsRes] = await Promise.all([
          fetch('/api/social/connections'),
          fetch(`/api/social/posts?limit=${PAGE_SIZE}&offset=0`),
        ]);

        if (connRes.ok) {
          const connData = await connRes.json();
          setConnections(connData.vendor || []);
        }

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
          setTotal(postsData.total || 0);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/social/posts?limit=${PAGE_SIZE}&offset=${posts.length}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRetry = async (postId: string) => {
    setRetrying(postId);
    try {
      const res = await fetch('/api/social/retry-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json();
      if (data.success !== undefined) {
        setPosts(prev =>
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
      setRetrying(null);
    }
  };

  // Stats
  const totalPosts = total;
  const postedCount = posts.filter(p => p.status === 'posted').length;
  const failedCount = posts.filter(p => p.status === 'failed').length;
  const successRate = totalPosts > 0 ? Math.round((postedCount / posts.length) * 100) : 0;
  const lastPosted = posts.find(p => p.status === 'posted')?.posted_at;

  const connectedPlatforms = new Set(connections.map(c => c.platform));

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Share2 className="w-7 h-7 text-[#E8632B]" />
        <h1 className="text-2xl font-bold text-gray-900">Social Auto-Post</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Track your social media posts and manage connections. When you publish a deal, it gets automatically posted with AI-generated captions.
      </p>

      <GatedSection
        loading={tierLoading}
        locked={!canAccess('social_auto_post')}
        requiredTier="pro"
        featureName="Social Auto-Post"
        description="Auto-post new deals to Facebook, Instagram, X, and TikTok. Available on Pro plan and above."
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading social data...</span>
          </div>
        ) : (
          <>
            {/* ── Connection Status Bar ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {PLATFORMS.map(({ key, label, icon, iconColor, bgColor, borderColor, connectUrl, available }) => {
                const conn = connections.find(c => c.platform === key);
                const isConnected = !!conn;

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-xl border ${isConnected ? `${borderColor} ${bgColor}` : !available ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-gray-50'} transition-all`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className={isConnected ? iconColor : 'text-gray-400'}>{icon}</span>
                      <span className="font-medium text-gray-900 text-sm">{label}</span>
                    </div>
                    {!available ? (
                      <span className="text-xs text-gray-400 font-medium">Coming Soon</span>
                    ) : isConnected ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-600 truncate">
                          {conn.account_username ? `@${conn.account_username}` : conn.account_name || 'Connected'}
                        </span>
                      </div>
                    ) : (
                      <a
                        href={connectUrl}
                        className="inline-flex items-center gap-1 text-xs text-[#E8632B] hover:text-orange-700 font-medium"
                      >
                        Connect <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-[#E8632B]" />
                  <span className="text-xs text-gray-500 font-medium">Total Posts</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500 font-medium">Success Rate</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {totalPosts > 0 ? `${successRate}%` : '\u2014'}
                </p>
                {failedCount > 0 && (
                  <p className="text-xs text-red-500 mt-0.5">{failedCount} failed</p>
                )}
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-[#29ABE2]" />
                  <span className="text-xs text-gray-500 font-medium">Last Posted</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {lastPosted ? timeAgo(lastPosted) : '\u2014'}
                </p>
              </div>
            </div>

            {/* ── Post History ── */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Post History</h2>
                <span className="text-xs text-gray-400">{posts.length} of {total}</span>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-4">
                    When you publish a deal, it will be automatically posted to your connected social accounts with AI-generated captions.
                  </p>
                  {connectedPlatforms.size === 0 && (
                    <a
                      href="/vendor/settings"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#E8632B] hover:text-orange-700"
                    >
                      Connect your accounts in Settings <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/50">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Platform</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Deal</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Caption</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map(post => (
                          <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <span className="flex items-center gap-1.5">
                                {PLATFORM_ICONS[post.platform]}
                                <span className="text-gray-700">{PLATFORM_LABELS[post.platform]}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700 max-w-[140px] truncate">
                              {post.deals?.title || '\u2014'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">
                              {post.caption?.substring(0, 80) || '\u2014'}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={post.status} error={post.error_message} />
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                              {timeAgo(post.created_at)}
                            </td>
                            <td className="py-3 px-4">
                              <PostActions
                                post={post}
                                retrying={retrying}
                                onRetry={handleRetry}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {posts.map(post => (
                      <div key={post.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {PLATFORM_ICONS[post.platform]}
                            <span className="text-sm font-medium text-gray-700">
                              {PLATFORM_LABELS[post.platform]}
                            </span>
                          </span>
                          <StatusBadge status={post.status} error={post.error_message} />
                        </div>
                        {post.deals?.title && (
                          <p className="text-sm text-gray-700 font-medium truncate">{post.deals.title}</p>
                        )}
                        <p className="text-xs text-gray-500 line-clamp-2">{post.caption}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                          <PostActions post={post} retrying={retrying} onRetry={handleRetry} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load more */}
                  {posts.length < total && (
                    <div className="p-4 text-center border-t border-gray-100">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="text-sm font-medium text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1"
                      >
                        {loadingMore ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
                        ) : (
                          <>Load more posts</>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </GatedSection>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatusBadge({ status, error }: { status: string; error: string | null }) {
  switch (status) {
    case 'posted':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" /> Posted
        </span>
      );
    case 'failed':
      return (
        <span
          className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full"
          title={error || ''}
        >
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    case 'pending':
    case 'posting':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" /> Pending
        </span>
      );
    default:
      return <span className="text-xs text-gray-400">{status}</span>;
  }
}

function PostActions({
  post,
  retrying,
  onRetry,
}: {
  post: SocialPost;
  retrying: string | null;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {post.platform_post_url && (
        <a
          href={post.platform_post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" /> View
        </a>
      )}
      {post.status === 'failed' && (post.retry_count || 0) < 3 && (
        <button
          onClick={() => onRetry(post.id)}
          disabled={retrying === post.id}
          className="text-xs text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1"
        >
          {retrying === post.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          Retry
        </button>
      )}
      {post.status === 'failed' && (post.retry_count || 0) >= 3 && (
        <span className="text-xs text-gray-400 inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Max retries
        </span>
      )}
    </div>
  );
}
