'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Facebook,
  Instagram,
  Twitter,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Plus,
} from 'lucide-react';

type BrandConnection = {
  id: string;
  platform: string;
  account_name: string | null;
  account_username: string | null;
  account_avatar_url: string | null;
  is_active: boolean;
  last_posted_at: string | null;
  last_error: string | null;
  connected_at: string;
};

type Deal = {
  id: string;
  title: string;
  status: string;
  image_url: string | null;
  vendor_id: string;
  created_at: string;
  expires_at: string;
  vendor?: { business_name?: string | null } | null;
};

type SocialPost = {
  id: string;
  deal_id: string | null;
  connection_id: string;
  platform: string;
  account_type: string;
  status: string;
  error_message: string | null;
  posted_at: string | null;
  platform_post_url: string | null;
  created_at: string;
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
};

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X / Twitter',
};

export default function AdminSocialPage() {
  const [loading, setLoading] = useState(true);
  const [brandConnections, setBrandConnections] = useState<BrandConnection[]>([]);
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [recentPosts, setRecentPosts] = useState<SocialPost[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/social/overview', { cache: 'no-store' });
      if (!res.ok) {
        showToast('err', 'Failed to load dashboard');
        return;
      }
      const data = await res.json();
      setBrandConnections(data.brandConnections || []);
      setRecentDeals(data.recentDeals || []);
      setRecentPosts(data.recentPosts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const postDeal = async (dealId: string) => {
    setBusyId(`deal:${dealId}`);
    try {
      const res = await fetch('/api/admin/social/post-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast('err', err.error || 'Post failed');
      } else {
        showToast('ok', 'Posted to brand accounts. Refreshing…');
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const retryPost = async (postId: string) => {
    setBusyId(`post:${postId}`);
    try {
      const res = await fetch(`/api/admin/social/retry-post/${postId}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast('err', err.error || 'Retry failed');
      } else {
        showToast('ok', 'Retry triggered. Refreshing…');
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  // Build a per-deal status map: dealId -> { facebook?: status, instagram?: status, ... }
  const dealPostStatus: Record<string, Record<string, string>> = {};
  for (const post of recentPosts) {
    if (!post.deal_id) continue;
    if (!dealPostStatus[post.deal_id]) dealPostStatus[post.deal_id] = {};
    // Last status per platform wins (recentPosts is desc)
    if (!dealPostStatus[post.deal_id][post.platform]) {
      dealPostStatus[post.deal_id][post.platform] = post.status;
    }
  }

  // Selected deal for modal
  const selectedDeal = selectedDealId ? recentDeals.find((d) => d.id === selectedDealId) : null;
  const selectedDealPosts = selectedDealId
    ? recentPosts.filter((p) => p.deal_id === selectedDealId)
    : [];
  const selectedHasPosted = selectedDealPosts.some((p) => p.status === 'posted');

  return (
    <div>
      <div>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Social Media</h1>
          <p className="text-gray-600 mt-1">
            Auto-promote vendor deals on SpontiCoupon&rsquo;s Facebook &amp; Instagram.
          </p>
        </header>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
              toast.kind === 'ok'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Brand connections panel */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Brand accounts</h2>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brandConnections.map((conn) => (
              <div
                key={conn.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 flex-shrink-0">
                  {PLATFORM_ICON[conn.platform] || <Send className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {conn.account_name || PLATFORM_LABEL[conn.platform] || conn.platform}
                    </p>
                    {conn.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{conn.platform}</p>
                  {conn.last_posted_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last post: {new Date(conn.last_posted_at).toLocaleString()}
                    </p>
                  )}
                  {conn.last_error && (
                    <p className="text-xs text-red-600 mt-1 line-clamp-2 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {conn.last_error}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <a
              href="/api/social/connect/facebook/authorize?brand=true"
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 flex items-center justify-center gap-2 text-sm text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Connect / reconnect Facebook
            </a>
          </div>
        </section>

        {/* Recent deals — bento grid */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent deals</h2>
            <p className="text-xs text-gray-500">Click a card for post details</p>
          </div>
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">Loading…</div>
          ) : recentDeals.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">No deals yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {recentDeals.map((deal) => {
                const statuses = dealPostStatus[deal.id] || {};
                return (
                  <button
                    key={deal.id}
                    onClick={() => setSelectedDealId(deal.id)}
                    className="group bg-white rounded-lg border border-gray-200 overflow-hidden text-left hover:border-primary-500 hover:shadow-lg transition-all flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                      {deal.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={deal.image_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {brandConnections.map((conn) => {
                          const s = statuses[conn.platform];
                          const cls =
                            s === 'posted'
                              ? 'bg-green-500 text-white'
                              : s === 'failed'
                              ? 'bg-red-500 text-white'
                              : !s
                              ? 'bg-white/80 text-gray-400'
                              : 'bg-yellow-500 text-white';
                          return (
                            <span
                              key={conn.id}
                              title={s ? `${s} on ${conn.platform}` : `Not posted to ${conn.platform}`}
                              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${cls}`}
                            >
                              {PLATFORM_ICON[conn.platform]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <p className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug">
                        {deal.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {deal.vendor?.business_name || 'Unknown vendor'}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">
                        {deal.status}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent posts */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Post history</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Platform</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">When</th>
                  <th className="text-left px-4 py-2 font-medium">Link</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No posts yet.
                    </td>
                  </tr>
                ) : (
                  recentPosts.map((post) => (
                    <tr key={post.id}>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 capitalize">
                          {PLATFORM_ICON[post.platform]}
                          {post.platform}
                        </span>
                      </td>
                      <td className="px-4 py-2 capitalize text-gray-600">{post.account_type}</td>
                      <td className="px-4 py-2">
                        {post.status === 'posted' && (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Posted
                          </span>
                        )}
                        {post.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                        {post.status !== 'posted' && post.status !== 'failed' && (
                          <span className="inline-flex items-center gap-1 text-yellow-700">
                            <Clock className="w-3.5 h-3.5" /> {post.status}
                          </span>
                        )}
                        {post.error_message && (
                          <p className="text-xs text-red-600 mt-0.5 max-w-xs truncate">
                            {post.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(post.posted_at || post.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {post.platform_post_url ? (
                          <a
                            href={post.platform_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {post.status === 'failed' && (
                          <button
                            onClick={() => retryPost(post.id)}
                            disabled={busyId === `post:${post.id}`}
                            className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-primary-600 disabled:opacity-50"
                          >
                            {busyId === `post:${post.id}` ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Deal detail modal */}
      {selectedDealId && selectedDeal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedDealId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/9] bg-gray-100 overflow-hidden relative">
              {selectedDeal.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedDeal.image_url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => setSelectedDealId(null)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md"
              >
                <XCircle className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900">{selectedDeal.title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedDeal.vendor?.business_name || 'Unknown vendor'} ·{' '}
                <span className="capitalize">{selectedDeal.status}</span>
              </p>

              <div className="mt-5 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Post status by platform</h4>
                {brandConnections.map((conn) => {
                  const post = selectedDealPosts.find((p) => p.platform === conn.platform);
                  return (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          {PLATFORM_ICON[conn.platform]}
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize text-gray-900">
                            {conn.account_name || PLATFORM_LABEL[conn.platform] || conn.platform}
                          </p>
                          {!post && <p className="text-xs text-gray-500">Never posted</p>}
                          {post && post.status === 'posted' && (
                            <p className="text-xs text-green-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Posted {post.posted_at && new Date(post.posted_at).toLocaleString()}
                            </p>
                          )}
                          {post && post.status === 'failed' && (
                            <p className="text-xs text-red-700 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Failed
                              {post.error_message ? ' — ' + post.error_message : ''}
                            </p>
                          )}
                          {post && post.status !== 'posted' && post.status !== 'failed' && (
                            <p className="text-xs text-yellow-700 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {post.status}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {post && post.platform_post_url && (
                          <a
                            href={post.platform_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {post && post.status === 'failed' && (
                          <button
                            onClick={() => retryPost(post.id)}
                            disabled={busyId === `post:${post.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${busyId === `post:${post.id}` ? 'animate-spin' : ''}`} />
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => postDeal(selectedDeal.id)}
                disabled={busyId === `deal:${selectedDeal.id}`}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className={`w-5 h-5 ${busyId === `deal:${selectedDeal.id}` ? 'animate-pulse' : ''}`} />
                {selectedHasPosted ? 'Re-post to all brand accounts' : 'Post to all brand accounts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
