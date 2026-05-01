'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Share2, Facebook, Instagram, Twitter, ExternalLink,
  CheckCircle, XCircle, Loader2, RotateCcw, BarChart3,
  Clock, ArrowRight, AlertCircle, Unplug, X, Eye,
  CalendarDays, LayoutGrid, Send, Save, ChevronLeft, ChevronRight,
  Heart, MessageCircle, Bookmark, ThumbsUp, Globe,
  Sparkles, Video, Image as ImageIcon, Info, ChevronDown, List, Search, Archive,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';
import { useLanguage } from '@/lib/i18n';
import { GuidedTour } from '@/components/ui/GuidedTour';
import { SOCIAL_PAGE_TOUR_STEPS } from '@/lib/constants/tour-steps';

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

const STATUS_COLORS: Record<string, string> = {
  posted: 'bg-green-500',
  failed: 'bg-red-500',
  scheduled: 'bg-blue-500',
  draft: 'bg-gray-400',
  pending: 'bg-yellow-500',
  posting: 'bg-yellow-500',
};

const TIME_RANGES = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
];

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
  scheduled_at: string | null;
  platform_post_id: string | null;
  platform_post_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  posted_at: string | null;
  deals?: { title: string; image_url: string | null; deal_type: string } | null;
}

interface DealOption {
  id: string;
  title: string;
  deal_type: string;
  image_url: string | null;
}

interface PreviewData {
  captions: Record<string, string>;
  image_url: string;
  claim_url: string;
  deal: { id: string; title: string; deal_type: string; discount_percentage: number };
  vendor: { business_name: string; city: string | null; state: string | null };
  media?: { images: string[]; videos: string[] };
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysArray(start: Date, end: Date): Date[] {
  const arr: Date[] = [];
  const dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

/* ─── Main Page ─── */
export default function VendorSocialPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { canAccess, loading: tierLoading } = useVendorTier();

  // Connections
  const [connections, setConnections] = useState<SocialConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fbPagePicker, setFbPagePicker] = useState<{ connectionId: string; pages: { id: string; name: string }[] } | null>(null);
  const [selectingPage, setSelectingPage] = useState(false);

  // Preview & Schedule
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');

  // Deal selector
  const [postTone, setPostTone] = useState('');
  const [dealViewMode, setDealViewMode] = useState<'grid' | 'list'>('grid');
  const [dealSearch, setDealSearch] = useState('');
  const [dealPageSize, setDealPageSize] = useState(8);
  const DEAL_PAGE_INCREMENT = 8;

  // Media editor (shown BEFORE generate preview)
  const [dealMedia, setDealMedia] = useState<{ deal_image: string; media: { images: string[]; videos: string[] } } | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [socialImageUrl, setSocialImageUrl] = useState('');
  const [socialVideoUrl, setSocialVideoUrl] = useState('');
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [avaPrompt, setAvaPrompt] = useState('');
  const [avaLoading, setAvaLoading] = useState(false);
  const [avaMessage, setAvaMessage] = useState('');
  const [avaSuggestion, setAvaSuggestion] = useState('');
  const [showTips, setShowTips] = useState(false);
  const [animatePrompt, setAnimatePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');
  const [videoError, setVideoError] = useState('');

  // Calendar / Bento
  const [calendarPosts, setCalendarPosts] = useState<SocialPost[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'bento'>('bento');
  const [timeRange, setTimeRange] = useState(7);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Post history — active shows last 7 days, archived shows older
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [postView, setPostView] = useState<'active' | 'archived'>('active');
  const [archivedPosts, setArchivedPosts] = useState<SocialPost[]>([]);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [loadingMoreArchived, setLoadingMoreArchived] = useState(false);
  const [archivedLoaded, setArchivedLoaded] = useState(false);

  // Draft editing — track IDs of drafts being edited so we can update them
  const [editingDraftIds, setEditingDraftIds] = useState<string[]>([]);

  const PAGE_SIZE = 20;
  const connectedPlatforms = useMemo(() => new Set(connections.map(c => c.platform)), [connections]);

  // Filtered + paginated deals for the selector
  const filteredDeals = useMemo(() => {
    if (!dealSearch.trim()) return deals;
    const q = dealSearch.toLowerCase();
    return deals.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.deal_type.toLowerCase().includes(q) ||
      (d.deal_type === 'sponti_coupon' ? 'sponti' : 'steady').includes(q)
    );
  }, [deals, dealSearch]);
  const visibleDeals = useMemo(() => filteredDeals.slice(0, dealPageSize), [filteredDeals, dealPageSize]);
  const hasMoreDeals = filteredDeals.length > dealPageSize;

  // ── Read URL params on mount ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const fbPickPage = params.get('fb_pick_page');
    const fbPagesParam = params.get('fb_pages');
    if (fbPickPage && fbPagesParam) {
      const pages = fbPagesParam.split(',').map(entry => {
        const [id, ...nameParts] = entry.split(':');
        return { id, name: decodeURIComponent(nameParts.join(':')) };
      });
      setFbPagePicker({ connectionId: fbPickPage, pages });
    }

    const connected = params.get('social_connected');
    if (connected) {
      setMessage({ type: 'success', text: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!` });
    }

    const socialError = params.get('social_error');
    if (socialError) {
      const debugInfo = params.get('debug');
      const errorMessages: Record<string, string> = {
        no_pages: 'No Facebook Pages found. Make sure your Facebook account manages at least one Page.',
        access_denied: 'You denied access. Please try again and grant the required permissions.',
        token_exchange_failed: 'Failed to exchange token with the platform. Please try again.',
        not_configured: 'Social platform not configured. Contact support.',
        db_error: 'Database error saving connection. Please try again.',
        no_instagram_business: 'No Instagram Business Account linked to your Facebook Pages.',
      };
      const baseMsg = errorMessages[socialError] || `Social connection failed: ${socialError}`;
      const fullMsg = debugInfo ? `${baseMsg}\n\nDebug: ${decodeURIComponent(debugInfo)}` : baseMsg;
      setMessage({ type: 'error', text: fullMsg });
    }

    if (fbPickPage || connected || socialError) {
      window.history.replaceState({}, '', '/vendor/social');
    }
  }, []);

  // ── Fetch data ──
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [connRes, postsRes, dealsRes] = await Promise.all([
          fetch('/api/social/connections'),
          fetch(`/api/social/posts?limit=${PAGE_SIZE}&offset=0&view=active`),
          fetch('/api/vendor/deals?status=active&limit=50'),
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

        if (dealsRes.ok) {
          const dealsData = await dealsRes.json();
          const dealsList = (dealsData.deals || dealsData || []);
          setDeals(Array.isArray(dealsList) ? dealsList.map((d: { id: string; title: string; deal_type: string; image_url: string | null }) => ({ id: d.id, title: d.title, deal_type: d.deal_type, image_url: d.image_url || null })) : []);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // ── Fetch media library when deal is selected ──
  useEffect(() => {
    if (!selectedDealId) {
      setDealMedia(null);
      setSocialImageUrl('');
      setSocialVideoUrl('');
      setMediaMode('image');
      setShowMediaPicker(false);
      setAvaPrompt('');
      setAvaMessage('');
      setAvaSuggestion('');
      setAnimatePrompt('');
      setVideoPrompt('');
      return;
    }
    let cancelled = false;
    async function fetchMedia() {
      setLoadingMedia(true);
      try {
        const res = await fetch(`/api/vendor/deal-media?deal_id=${selectedDealId}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setDealMedia(data);
          // Set deal image as default
          if (data.deal_image && !socialImageUrl) setSocialImageUrl(data.deal_image);
        }
      } finally {
        if (!cancelled) setLoadingMedia(false);
      }
    }
    fetchMedia();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDealId]);

  // ── Fetch calendar data ──
  const fetchCalendar = useCallback(async () => {
    if (!user) return;
    setLoadingCalendar(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - timeRange);
      const end = new Date();
      end.setDate(end.getDate() + timeRange);
      const res = await fetch(`/api/social/calendar?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarPosts(data.posts || []);
      }
    } finally {
      setLoadingCalendar(false);
    }
  }, [user, timeRange]);

  useEffect(() => {
    if (user && !loading) fetchCalendar();
  }, [user, loading, fetchCalendar]);

  // ── Actions ──
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/social/posts?limit=${PAGE_SIZE}&offset=${posts.length}&view=active`);
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchArchived = async () => {
    if (archivedLoaded) return;
    setLoadingMoreArchived(true);
    try {
      const res = await fetch(`/api/social/posts?limit=${PAGE_SIZE}&offset=0&view=archived`);
      if (res.ok) {
        const data = await res.json();
        setArchivedPosts(data.posts || []);
        setArchivedTotal(data.total || 0);
        setArchivedLoaded(true);
      }
    } finally {
      setLoadingMoreArchived(false);
    }
  };

  const loadMoreArchived = async () => {
    setLoadingMoreArchived(true);
    try {
      const res = await fetch(`/api/social/posts?limit=${PAGE_SIZE}&offset=${archivedPosts.length}&view=archived`);
      if (res.ok) {
        const data = await res.json();
        setArchivedPosts(prev => [...prev, ...(data.posts || [])]);
      }
    } finally {
      setLoadingMoreArchived(false);
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
              ? { ...p, status: data.result?.status || p.status, error_message: data.result?.error || null, retry_count: (p.retry_count || 0) + 1, platform_post_url: data.result?.platform_post_url || p.platform_post_url, posted_at: data.result?.status === 'posted' ? new Date().toISOString() : p.posted_at }
              : p
          )
        );
      }
    } finally {
      setRetrying(null);
    }
  };

  const disconnectSocial = async (connectionId: string, platform: string) => {
    if (!confirm(`Disconnect ${platform}? Future deals won't auto-post to this account.`)) return;
    setDisconnecting(connectionId);
    try {
      const res = await fetch('/api/social/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      if (res.ok) {
        setConnections(prev => prev.filter(c => c.id !== connectionId));
        setMessage({ type: 'success', text: `${platform} disconnected.` });
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect. Try again.' });
      }
    } finally {
      setDisconnecting(null);
    }
  };

  const selectFbPage = async (pageId: string) => {
    if (!fbPagePicker) return;
    setSelectingPage(true);
    try {
      const res = await fetch('/api/social/select-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: fbPagePicker.connectionId, page_id: pageId }),
      });
      if (res.ok) {
        setFbPagePicker(null);
        setMessage({ type: 'success', text: 'Facebook Page connected!' });
        const connRes = await fetch('/api/social/connections');
        if (connRes.ok) {
          const connData = await connRes.json();
          setConnections(connData.vendor || []);
        }
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to select page.' });
      }
    } finally {
      setSelectingPage(false);
    }
  };

  // ── Preview — generates captions using already-selected media + tone ──
  const generatePreview = async () => {
    if (!selectedDealId) return;
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await fetch('/api/social/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: selectedDealId, tone: postTone || undefined }),
      });
      if (res.ok) {
        const data: PreviewData = await res.json();
        setPreview(data);
        setEditedCaptions({ ...data.captions });
        setEditingPlatform(null);
        // Don't override socialImageUrl if already set by the media editor
        if (!socialImageUrl) setSocialImageUrl(data.image_url || '');
        // Merge media from preview into dealMedia if not already loaded
        if (data.media && !dealMedia) {
          setDealMedia({ deal_image: data.image_url || '', media: data.media });
        }
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to generate preview' });
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  // ── Schedule / Post ──
  const handleAction = async (action: 'post_now' | 'schedule' | 'draft') => {
    if (!preview) return;
    setScheduling(true);
    try {
      const activePlatforms = Array.from(connectedPlatforms);
      const body: Record<string, unknown> = {
        deal_id: preview.deal.id,
        platforms: activePlatforms,
        captions: editedCaptions,
        action,
      };
      if (action === 'schedule' && scheduleDate) {
        body.scheduled_at = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      }
      if (socialImageUrl && socialImageUrl !== preview.image_url) body.image_url = socialImageUrl;
      if (socialVideoUrl) body.video_url = socialVideoUrl;

      const res = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // If we were editing drafts, delete the old draft records (new ones were created)
        if (editingDraftIds.length > 0) {
          await Promise.all(
            editingDraftIds.map(id =>
              fetch('/api/social/schedule', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: id, action: 'cancel' }),
              }).catch(() => {})
            )
          );
          setEditingDraftIds([]);
        }
        const labels = { post_now: 'Posts sent!', schedule: 'Posts scheduled!', draft: 'Saved as draft.' };
        setMessage({ type: 'success', text: labels[action] });
        setPreview(null);
        setSelectedDealId('');
        fetchCalendar();
        // Refresh post history
        const postsRes = await fetch(`/api/social/posts?limit=${PAGE_SIZE}&offset=0&view=active`);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
          setTotal(postsData.total || 0);
        }
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to process' });
      }
    } finally {
      setScheduling(false);
    }
  };

  // ── Helper: get selected deal title ──
  const selectedDealTitle = useMemo(() => {
    const d = deals.find(d => d.id === selectedDealId);
    return d?.title || preview?.deal?.title || '';
  }, [deals, selectedDealId, preview]);

  // ── Ava AI functions ──
  const askAva = async () => {
    if (!avaPrompt.trim()) return;
    setAvaLoading(true);
    setAvaSuggestion('');
    setAvaMessage('');
    try {
      const res = await fetch('/api/vendor/ava-social-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: avaPrompt, deal_title: selectedDealTitle, media_mode: mediaMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvaSuggestion(data.suggestion || '');
        setAvaMessage(data.message || '');
      } else {
        setAvaMessage('Ava couldn\'t process that. Try rephrasing.');
      }
    } finally { setAvaLoading(false); }
  };

  const generateAvaImage = async (prompt: string) => {
    setAvaLoading(true);
    setAvaMessage('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_prompt: prompt, title: selectedDealTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setSocialImageUrl(data.url);
        setMediaMode('image');
        setSocialVideoUrl('');
        setAvaMessage('Image generated! It\'s now set as your social post image.');
        setShowMediaPicker(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setAvaMessage(err.error || 'Image generation failed.');
      }
    } finally { setAvaLoading(false); }
  };

  const generateAvaVideo = async (prompt: string) => {
    setAvaLoading(true);
    setAvaMessage('');
    setVideoError('');
    try {
      const startRes = await fetch('/api/vendor/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: socialImageUrl || dealMedia?.deal_image || '', title: selectedDealTitle, video_prompt: prompt, aspect_ratio: '9:16' }),
      });
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        setAvaMessage(err.error || 'Video generation failed to start.');
        setAvaLoading(false);
        return;
      }
      const { operation_name } = await startRes.json();
      setAvaMessage('Ava is creating your video... This may take 1-3 minutes.');
      for (let i = 0; i < 36; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollRes = await fetch('/api/vendor/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation_name }),
        });
        if (pollRes.ok) {
          const data = await pollRes.json();
          if (data.url) {
            setSocialVideoUrl(data.url);
            setMediaMode('video');
            setAvaMessage('Video created! It\'s now set for your social post.');
            setShowMediaPicker(false);
            setAvaLoading(false);
            return;
          }
          if (data.operation_name) continue;
        }
      }
      setAvaMessage('Video generation timed out. Try again.');
    } catch {
      setAvaMessage('Video generation failed.');
    } finally { setAvaLoading(false); }
  };

  // ── Generate video from deal image ──
  const generateVideoFromImage = async (prompt: string) => {
    const imageUrl = socialImageUrl || dealMedia?.deal_image || '';
    if (!imageUrl) {
      setVideoError(locale === 'es' ? 'No hay imagen disponible para crear el video' : 'No image available to create video');
      return;
    }
    setVideoGenerating(true);
    setVideoProgress(locale === 'es' ? 'Iniciando generación de video...' : 'Starting video generation...');
    setVideoError('');
    try {
      const startRes = await fetch('/api/vendor/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, title: selectedDealTitle, video_prompt: prompt, aspect_ratio: '9:16' }),
      });
      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        setVideoError(err.error || (locale === 'es' ? 'No se pudo iniciar la generación' : 'Failed to start generation'));
        setVideoGenerating(false);
        setVideoProgress('');
        return;
      }
      const { operation_name } = await startRes.json();
      setVideoProgress(locale === 'es' ? 'Ava está creando tu video... (1-3 min)' : 'Ava is creating your video... (1-3 min)');
      for (let i = 0; i < 36; i++) {
        await new Promise(r => setTimeout(r, 5000));
        setVideoProgress(locale === 'es' ? `Generando video... ${Math.min(Math.round((i + 1) * 100 / 36), 99)}%` : `Generating video... ${Math.min(Math.round((i + 1) * 100 / 36), 99)}%`);
        const pollRes = await fetch('/api/vendor/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation_name }),
        });
        if (pollRes.ok) {
          const data = await pollRes.json();
          if (data.url) {
            setSocialVideoUrl(data.url);
            setMediaMode('video');
            setVideoProgress('');
            setVideoPrompt('');
            setMessage({ type: 'success', text: locale === 'es' ? '¡Video creado!' : 'Video created!' });
            setVideoGenerating(false);
            return;
          }
          if (data.operation_name) continue;
        }
      }
      setVideoProgress('');
      setVideoError(locale === 'es' ? 'La generación de video tardó demasiado. Intenta de nuevo.' : 'Video generation timed out. Try again.');
    } catch {
      setVideoProgress('');
      setVideoError(locale === 'es' ? 'Error al generar el video' : 'Video generation failed');
    } finally { setVideoGenerating(false); }
  };

  // ── Load a draft back into the editor ──
  const loadDraft = async (draftPost: SocialPost) => {
    // Find all drafts for the same deal (there may be one per platform)
    const relatedDrafts = posts.filter(p => p.deal_id === draftPost.deal_id && p.status === 'draft');
    setEditingDraftIds(relatedDrafts.map(d => d.id));

    // Set the deal and generate a preview
    setSelectedDealId(draftPost.deal_id);
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await fetch('/api/social/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: draftPost.deal_id }),
      });
      if (res.ok) {
        const data: PreviewData = await res.json();
        setPreview(data);
        // Pre-fill captions from drafts (override AI-generated)
        const draftCaptions: Record<string, string> = { ...data.captions };
        relatedDrafts.forEach(d => {
          if (d.caption) draftCaptions[d.platform] = d.caption;
        });
        setEditedCaptions(draftCaptions);
        setEditingPlatform(null);
        // Set media from draft
        const firstDraft = relatedDrafts[0];
        if (firstDraft?.image_url) setSocialImageUrl(firstDraft.image_url);
        else if (!socialImageUrl) setSocialImageUrl(data.image_url || '');
      }
    } finally {
      setLoadingPreview(false);
      // Scroll to top of preview section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Delete a post (works for both active and archived views) ──
  const deletePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId) || archivedPosts.find(p => p.id === postId);
    const isPosted = post?.status === 'posted';
    const msg = isPosted
      ? (locale === 'es' ? '¿Eliminar este post? También se eliminará de la plataforma (Facebook/Instagram).' : 'Delete this post? It will also be deleted from the platform (Facebook/Instagram).')
      : (locale === 'es' ? '¿Eliminar este post?' : 'Delete this post?');
    if (!confirm(msg)) return;
    try {
      const removeFromState = () => {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setTotal(prev => prev - 1);
        setArchivedPosts(prev => prev.filter(p => p.id !== postId));
        setArchivedTotal(prev => prev - 1);
        fetchCalendar();
      };
      if (isPosted) {
        // Delete from platform + DB via dedicated endpoint
        const res = await fetch(`/api/social/posts/${postId}`, { method: 'DELETE' });
        if (res.ok) removeFromState();
      } else {
        // Cancel draft/scheduled/pending via schedule endpoint
        const res = await fetch('/api/social/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId, action: 'cancel' }),
        });
        if (res.ok) removeFromState();
      }
    } catch { /* noop */ }
  };

  // ── Calendar data grouped by date ──
  const postsByDate = useMemo(() => {
    const map = new Map<string, SocialPost[]>();
    calendarPosts.forEach(p => {
      const dateStr = p.scheduled_at || p.posted_at || p.created_at;
      const key = getDateKey(dateStr);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [calendarPosts]);

  // Stats
  const totalPosts = total;
  const postedCount = posts.filter(p => p.status === 'posted').length;
  const failedCount = posts.filter(p => p.status === 'failed').length;
  const scheduledCount = calendarPosts.filter(p => p.status === 'scheduled').length;
  const successRate = totalPosts > 0 ? Math.round((postedCount / posts.length) * 100) : 0;
  const lastPosted = posts.find(p => p.status === 'posted')?.posted_at;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <GuidedTour tourKey="social-page" steps={SOCIAL_PAGE_TOUR_STEPS} />
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Share2 className="w-7 h-7 text-[#E8632B]" />
        <h1 className="text-2xl font-bold text-gray-900">{t('vendor.social.title')}</h1>
      </div>
      <p className="text-gray-500 mb-4">
        Track your social media posts and manage connections. When you publish a deal, it gets automatically posted with AI-generated captions.
      </p>

      {message && (
        <div className={`mb-6 p-3 rounded-lg flex items-start justify-between text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="whitespace-pre-line">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70 flex-shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
        </div>
      )}

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
            <div data-tour="social-connections" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {PLATFORMS.map(({ key, label, icon, iconColor, bgColor, borderColor, connectUrl, available }) => {
                const conn = connections.find(c => c.platform === key);
                const isConnected = !!conn;
                return (
                  <div key={key} className={`p-4 rounded-xl border ${isConnected ? `${borderColor} ${bgColor}` : !available ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-gray-50'} transition-all`}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className={isConnected ? iconColor : 'text-gray-400'}>{icon}</span>
                      <span className="font-medium text-gray-900 text-sm">{label}</span>
                    </div>
                    {!available ? (
                      <span className="text-xs text-gray-400 font-medium">Coming Soon</span>
                    ) : isConnected ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <span className="text-xs text-green-600 truncate">
                            {conn.account_username ? `@${conn.account_username}` : conn.account_name || 'Connected'}
                          </span>
                        </div>
                        <button onClick={() => disconnectSocial(conn.id, label)} disabled={disconnecting === conn.id} className="text-gray-400 hover:text-red-500 transition-colors" title="Disconnect">
                          {disconnecting === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <a href={connectUrl} className="inline-flex items-center gap-1 text-xs text-[#E8632B] hover:text-orange-700 font-medium">
                        Connect <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Preview & Schedule Section ── */}
            {connectedPlatforms.size > 0 && (
              <div className="card p-5 mb-8 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-[#E8632B]" />
                  <h2 className="font-semibold text-gray-900">Create & Preview Post</h2>
                </div>

                {/* Editing draft banner */}
                {editingDraftIds.length > 0 && preview && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-4">
                    <span className="text-sm text-amber-800 font-medium">Editing draft — make changes and post, schedule, or save again.</span>
                    <button onClick={() => { setEditingDraftIds([]); setPreview(null); setSelectedDealId(''); }} className="text-xs text-amber-600 hover:text-amber-800 font-medium">Cancel</button>
                  </div>
                )}

                {/* Step 1: Deal selector */}
                <div data-tour="social-deal-select" className="mb-4 space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8632B] text-white text-[10px] font-bold mr-1.5">1</span>
                        {locale === 'es' ? 'Paso 1: Selecciona un deal' : 'Step 1: Select a Deal'}
                        {deals.length > 0 && <span className="text-xs text-gray-400 font-normal ml-1.5">({filteredDeals.length})</span>}
                      </p>
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button onClick={() => setDealViewMode('grid')} className={`p-1.5 rounded-md transition-all ${dealViewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title={locale === 'es' ? 'Vista cuadrícula' : 'Grid view'}>
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDealViewMode('list')} className={`p-1.5 rounded-md transition-all ${dealViewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`} title={locale === 'es' ? 'Vista lista' : 'List view'}>
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {deals.length > 4 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={dealSearch}
                          onChange={e => { setDealSearch(e.target.value); setDealPageSize(DEAL_PAGE_INCREMENT); }}
                          placeholder={locale === 'es' ? 'Buscar por nombre, tipo...' : 'Search by name, type...'}
                          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent placeholder-gray-400"
                        />
                        {dealSearch && (
                          <button onClick={() => { setDealSearch(''); setDealPageSize(DEAL_PAGE_INCREMENT); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {dealViewMode === 'grid' ? (
                    <div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {visibleDeals.map(d => (
                          <button
                            key={d.id}
                            onClick={() => { setSelectedDealId(d.id); setEditingDraftIds([]); setPreview(null); }}
                            className={`relative group rounded-xl overflow-hidden border-2 transition-all text-left ${
                              selectedDealId === d.id
                                ? 'border-[#E8632B] ring-2 ring-orange-200 shadow-md'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="aspect-[4/3] bg-gray-100 relative">
                              {d.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={d.image_url} alt={d.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                              )}
                              <span className={`absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                                d.deal_type === 'sponti_coupon' ? 'bg-[#E8632B]' : 'bg-[#29ABE2]'
                              }`}>
                                {d.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}
                              </span>
                              {selectedDealId === d.id && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#E8632B] rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">{d.title}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {filteredDeals.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">
                          {dealSearch
                            ? (locale === 'es' ? `No se encontraron deals para "${dealSearch}"` : `No deals found for "${dealSearch}"`)
                            : (locale === 'es' ? 'No hay deals activos' : 'No active deals')}
                        </p>
                      )}
                      {hasMoreDeals && (
                        <button
                          onClick={() => setDealPageSize(prev => prev + DEAL_PAGE_INCREMENT)}
                          className="mt-3 w-full py-2 text-sm text-[#E8632B] hover:text-orange-700 font-medium border border-gray-200 rounded-lg hover:bg-orange-50/50 transition-colors"
                        >
                          {locale === 'es'
                            ? `Ver más (${filteredDeals.length - dealPageSize} restantes)`
                            : `Load more (${filteredDeals.length - dealPageSize} remaining)`}
                        </button>
                      )}
                    </div>
                  ) : (
                    <select
                      value={selectedDealId}
                      onChange={e => { setSelectedDealId(e.target.value); setEditingDraftIds([]); setPreview(null); }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent"
                    >
                      <option value="">{locale === 'es' ? 'Selecciona un deal...' : 'Select a deal...'}</option>
                      {filteredDeals.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 2: Choose media + tone (shown when deal is selected, BEFORE Generate Preview) */}
                {selectedDealId && (
                  <div data-tour="social-media-section" className="mb-4 space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm font-medium text-gray-700">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8632B] text-white text-[10px] font-bold mr-1.5">2</span>
                      {locale === 'es' ? 'Paso 2: Elige tu multimedia y estilo' : 'Step 2: Choose Your Media & Style'}
                    </p>

                    {loadingMedia ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">{locale === 'es' ? 'Cargando biblioteca...' : 'Loading media library...'}</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Post / Reel toggle */}
                        <div data-tour="social-post-reel" className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">{locale === 'es' ? '¿Qué quieres crear?' : 'What do you want to create?'}</span>
                          <div className="flex bg-white rounded-lg p-0.5 border border-gray-200">
                            <button onClick={() => setMediaMode('image')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${mediaMode === 'image' ? 'bg-[#E8632B] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                              <ImageIcon className="w-3.5 h-3.5 inline mr-1" />{locale === 'es' ? 'Post' : 'Post'}
                            </button>
                            <button onClick={() => setMediaMode('video')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${mediaMode === 'video' ? 'bg-[#E8632B] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                              <Video className="w-3.5 h-3.5 inline mr-1" />{locale === 'es' ? 'Reel' : 'Reel'}
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400 -mt-1">
                          {mediaMode === 'image'
                            ? (locale === 'es' ? 'Publicación con imagen en Facebook e Instagram' : 'Image post on Facebook & Instagram')
                            : (locale === 'es' ? 'Video vertical (9:16) para Instagram Reels y Facebook Reels' : 'Vertical video (9:16) for Instagram Reels & Facebook Reels')}
                        </p>

                        {/* Current media thumbnail */}
                        <div className="flex items-start gap-3">
                          <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 relative">
                            {mediaMode === 'video' && socialVideoUrl ? (
                              <video src={socialVideoUrl} className="w-full h-full object-cover" muted />
                            ) : mediaMode === 'video' && !socialVideoUrl ? (
                              <>
                                {(socialImageUrl || dealMedia?.deal_image) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={socialImageUrl || dealMedia?.deal_image || ''} alt="" className="w-full h-full object-cover opacity-50" />
                                ) : (
                                  <div className="w-full h-full bg-gray-200" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                  <Video className="w-6 h-6 text-white" />
                                </div>
                              </>
                            ) : (socialImageUrl || dealMedia?.deal_image) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={socialImageUrl || dealMedia?.deal_image || ''} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-6 h-6" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {mediaMode === 'video' && !socialVideoUrl ? (
                              <>
                                <p className="text-xs font-medium text-orange-600 mb-0.5">{locale === 'es' ? 'No hay Reel aún' : 'No Reel yet'}</p>
                                <p className="text-[11px] text-gray-400">{locale === 'es' ? 'Crea uno abajo o elige de la biblioteca' : 'Create one below or pick from library'}</p>
                              </>
                            ) : mediaMode === 'video' && socialVideoUrl ? (
                              <p className="text-xs text-green-600 font-medium mb-1">{locale === 'es' ? 'Reel listo para publicar' : 'Reel ready to post'}</p>
                            ) : (
                              <p className="text-xs text-gray-500 mb-1">{locale === 'es' ? 'Imagen actual para tu post' : 'Current image for your post'}</p>
                            )}
                            <button onClick={() => setShowMediaPicker(!showMediaPicker)} className="text-xs text-[#E8632B] hover:text-orange-700 font-medium">
                              {showMediaPicker ? (locale === 'es' ? 'Ocultar biblioteca' : 'Hide library') : (locale === 'es' ? 'Elegir de la biblioteca' : 'Choose from library')}
                            </button>
                          </div>
                        </div>

                        {/* Media library picker */}
                        {showMediaPicker && (
                          <div className="space-y-2">
                            <div className="overflow-x-auto pb-1">
                              <div className="flex gap-2 min-w-min">
                                {mediaMode === 'image' ? (
                                  (dealMedia?.media?.images || []).length > 0 ? (dealMedia?.media?.images || []).map((url, i) => (
                                    <button key={i} onClick={() => { setSocialImageUrl(url); setSocialVideoUrl(''); setShowMediaPicker(false); }} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${socialImageUrl === url ? 'border-[#E8632B] ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'}`}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                  )) : <p className="text-xs text-gray-400 py-2">{locale === 'es' ? 'No hay imágenes en la biblioteca' : 'No images in library'}</p>
                                ) : (
                                  (dealMedia?.media?.videos || []).length > 0 ? (dealMedia?.media?.videos || []).map((url, i) => (
                                    <button key={i} onClick={() => { setSocialVideoUrl(url); setMediaMode('video'); setShowMediaPicker(false); }} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all relative ${socialVideoUrl === url ? 'border-[#E8632B] ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'}`}>
                                      <video src={url} className="w-full h-full object-cover" muted />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Video className="w-4 h-4 text-white" /></div>
                                    </button>
                                  )) : <p className="text-xs text-gray-400 py-2">{locale === 'es' ? 'No hay videos en la biblioteca' : 'No videos in library'}</p>
                                )}
                              </div>
                            </div>
                            {/* Upload image */}
                            {mediaMode === 'image' && (
                              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#E8632B] hover:bg-orange-50/50 transition-colors">
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500">{locale === 'es' ? 'Subir una imagen' : 'Upload an image'}</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                      const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                      if (res.ok) {
                                        const data = await res.json();
                                        setSocialImageUrl(data.url);
                                        setSocialVideoUrl('');
                                        setShowMediaPicker(false);
                                        setMessage({ type: 'success', text: locale === 'es' ? 'Imagen subida' : 'Image uploaded' });
                                      } else {
                                        const err = await res.json().catch(() => ({}));
                                        setMessage({ type: 'error', text: err.error || (locale === 'es' ? 'Error al subir' : 'Upload failed') });
                                      }
                                    } catch {
                                      setMessage({ type: 'error', text: locale === 'es' ? 'Error al subir' : 'Upload failed' });
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}

                        {/* Video: generating progress */}
                        {mediaMode === 'video' && videoGenerating && (
                          <div className="border-2 border-orange-300 rounded-xl bg-orange-50 p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#E8632B] flex items-center justify-center flex-shrink-0 animate-pulse">
                                <Video className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">{locale === 'es' ? 'Creando tu Reel...' : 'Creating your Reel...'}</p>
                                <p className="text-xs text-gray-500">{videoProgress || (locale === 'es' ? 'Esto puede tomar 30-60 segundos' : 'This may take 30-60 seconds')}</p>
                              </div>
                            </div>
                            <div className="w-full bg-orange-200 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-[#E8632B] h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                            </div>
                          </div>
                        )}

                        {/* Video: ready — preview player + regenerate */}
                        {mediaMode === 'video' && socialVideoUrl && !videoGenerating && (
                          <div className="space-y-3">
                            {/* Video preview player */}
                            <div className="border border-green-200 rounded-xl bg-green-50/50 overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-green-200/50">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <p className="text-sm font-medium text-green-800">{locale === 'es' ? 'Reel listo — Vista previa' : 'Reel ready — Preview'}</p>
                                </div>
                                <button onClick={() => { setSocialVideoUrl(''); }} className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0" title={locale === 'es' ? 'Eliminar' : 'Remove'}>
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="aspect-[9/16] max-h-[360px] bg-black mx-auto">
                                <video
                                  src={socialVideoUrl}
                                  className="w-full h-full object-contain"
                                  controls
                                  autoPlay
                                  loop
                                  playsInline
                                />
                              </div>
                              <div className="px-3 py-2 text-center">
                                <p className="text-xs text-green-600">{locale === 'es' ? 'Reel en Instagram / Video en Facebook' : 'Reel on Instagram / Video on Facebook'}</p>
                              </div>
                            </div>

                            {/* Not happy? Regenerate */}
                            <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                              <p className="text-xs font-medium text-gray-600">{locale === 'es' ? '¿No te gusta? Genera otro:' : 'Not happy? Generate another:'}</p>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={animatePrompt}
                                  onChange={e => setAnimatePrompt(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && generateVideoFromImage(animatePrompt || `Professional promotional video for ${selectedDealTitle}`)}
                                  placeholder={locale === 'es' ? 'Describir otro estilo de video...' : 'Describe a different video style...'}
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent placeholder-gray-400"
                                />
                                <button
                                  onClick={() => { setSocialVideoUrl(''); generateVideoFromImage(animatePrompt || `Professional promotional video for ${selectedDealTitle}`); }}
                                  className="px-3 py-2 text-sm text-[#E8632B] border border-[#E8632B] rounded-lg font-medium hover:bg-orange-50 flex-shrink-0 inline-flex items-center gap-1.5"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  {locale === 'es' ? 'Regenerar' : 'Regenerate'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Video: create — two options */}
                        {mediaMode === 'video' && !socialVideoUrl && !videoGenerating && (
                          <div className="border border-orange-200 rounded-xl bg-white p-4 space-y-3">
                            <p className="text-sm font-semibold text-gray-900">{locale === 'es' ? 'Crear tu Reel' : 'Create your Reel'}</p>
                            {/* Option 1: Animate image with a prompt */}
                            <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100 space-y-2.5">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                  {(socialImageUrl || dealMedia?.deal_image) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={socialImageUrl || dealMedia?.deal_image || ''} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800">{locale === 'es' ? 'Animar tu imagen' : 'Animate your image'}</p>
                                  <p className="text-[11px] text-gray-400">{locale === 'es' ? 'Convierte tu imagen en un Reel vertical' : 'Turn your image into a vertical Reel'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={animatePrompt}
                                  onChange={e => setAnimatePrompt(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && generateVideoFromImage(animatePrompt || `Cinematic animated promotional video for ${selectedDealTitle}`)}
                                  placeholder={locale === 'es' ? 'Ej: "zoom lento al producto con música suave"' : 'E.g. "slow zoom on product with soft music"'}
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent placeholder-gray-400 bg-white"
                                />
                                <button
                                  onClick={() => generateVideoFromImage(animatePrompt || `Cinematic animated promotional video for ${selectedDealTitle}`)}
                                  className="px-3 py-2 bg-[#E8632B] text-white rounded-lg text-xs font-medium hover:bg-orange-700 flex-shrink-0 inline-flex items-center gap-1.5"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  {locale === 'es' ? 'Animar' : 'Animate'}
                                </button>
                              </div>
                            </div>
                            {/* Option 2: Create a brand new video with Ava */}
                            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                <p className="text-xs font-medium text-gray-800">{locale === 'es' ? 'Crear un Reel nuevo (Ava AI)' : 'Create a new Reel (Ava AI)'}</p>
                              </div>
                              <p className="text-[11px] text-gray-400">{locale === 'es' ? 'No tienes video? Ava crea un Reel desde cero con tu prompt' : "Don't have a video? Ava creates a Reel from scratch with your prompt"}</p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={videoPrompt}
                                  onChange={e => setVideoPrompt(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && videoPrompt.trim() && generateVideoFromImage(videoPrompt)}
                                  placeholder={locale === 'es' ? 'Ej: "video con música latina y zoom al producto"' : 'E.g. "video with latin music and zoom on product"'}
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder-gray-400"
                                />
                                <button
                                  onClick={() => { if (videoPrompt.trim()) generateVideoFromImage(videoPrompt); }}
                                  disabled={!videoPrompt.trim()}
                                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 flex-shrink-0 inline-flex items-center gap-1.5"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  {locale === 'es' ? 'Crear' : 'Create'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Inline video error — shown right where the action happened */}
                        {videoError && !videoGenerating && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-red-700">{videoError}</p>
                            </div>
                            <button onClick={() => setVideoError('')} className="text-red-400 hover:text-red-600 flex-shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Ava AI Assistant */}
                        <div data-tour="social-ava" className="border border-emerald-200 rounded-xl bg-emerald-50/50 p-3 space-y-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-800">{locale === 'es' ? 'Pregúntale a Ava' : 'Ask Ava'}</span>
                            <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                          </div>
                          <div className="flex gap-2">
                            <input type="text" value={avaPrompt} onChange={e => setAvaPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && !avaLoading && askAva()}
                              placeholder={mediaMode === 'video' ? (locale === 'es' ? 'Describe el Reel que quieres crear...' : 'Describe the Reel you want to create...') : (locale === 'es' ? 'Describe la imagen que quieres crear...' : 'Describe the image you want to create...')}
                              className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder-gray-400" />
                            <button onClick={askAva} disabled={avaLoading || !avaPrompt.trim()} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex-shrink-0 inline-flex items-center gap-1.5">
                              {avaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              {locale === 'es' ? 'Preguntar' : 'Ask'}
                            </button>
                          </div>
                          {avaMessage && <div className="text-sm text-emerald-800 bg-emerald-100/60 rounded-lg p-2.5"><span className="font-medium">Ava:</span> {avaMessage}</div>}
                          {avaSuggestion && (
                            <div className="space-y-2">
                              <div className="text-xs text-gray-600 bg-white rounded-lg p-2.5 border border-emerald-100 font-mono">{avaSuggestion}</div>
                              <div className="flex gap-2">
                                {mediaMode === 'image' ? (
                                  <button onClick={() => generateAvaImage(avaSuggestion)} disabled={avaLoading} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                                    {avaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                    {locale === 'es' ? 'Generar Imagen' : 'Generate Image'}
                                  </button>
                                ) : (
                                  <button onClick={() => generateAvaVideo(avaSuggestion)} disabled={avaLoading} className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
                                    {avaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                                    {locale === 'es' ? 'Generar Reel' : 'Generate Reel'}
                                  </button>
                                )}
                                <button onClick={() => { setAvaSuggestion(''); setAvaMessage(''); }} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          )}
                          <button onClick={() => setShowTips(!showTips)} className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium w-full">
                            <Info className="w-3.5 h-3.5" />
                            {locale === 'es' ? 'Tips para mejores resultados' : 'Tips for better results'}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTips ? 'rotate-180' : ''}`} />
                          </button>
                          {showTips && (
                            <div className="text-xs text-gray-600 bg-white rounded-lg p-3 border border-emerald-100 space-y-2">
                              {mediaMode === 'video' ? (
                                <>
                                  <p className="font-semibold text-emerald-800 text-[11px] uppercase tracking-wide">{locale === 'es' ? 'Tips para Videos' : 'Video Tips'}</p>
                                  <ul className="space-y-1.5 list-disc pl-3.5">
                                    <li>{locale === 'es' ? 'Especifica la música: "música electrónica animada" o "guitarra acústica tranquila"' : 'Specify music: "upbeat electronic music" or "calm acoustic guitar"'}</li>
                                    <li>{locale === 'es' ? 'Describe el ritmo: "rápido con cortes rápidos" o "revelación cinematográfica lenta"' : 'Describe pacing: "fast-paced with quick cuts" or "slow cinematic reveal"'}</li>
                                    <li>{locale === 'es' ? 'Define el ambiente: "enérgico y divertido" o "profesional y limpio"' : 'Set the mood: "energetic and fun" or "professional and clean"'}</li>
                                    <li>{locale === 'es' ? 'Menciona transiciones: "zoom suave al producto" o "fundido entre escenas"' : 'Mention transitions: "smooth zoom-in on product" or "fade between scenes"'}</li>
                                    <li>{locale === 'es' ? 'Ángulos de cámara: "primer plano de la comida" o "toma amplia del local"' : 'Include camera angles: "close-up of food details" or "wide shot of venue"'}</li>
                                    <li>{locale === 'es' ? 'Referencia el estilo: "vertical tipo TikTok" o "comercial cinematográfico"' : 'Reference style: "TikTok-style vertical" or "cinematic commercial"'}</li>
                                    <li className="font-medium text-emerald-700">{locale === 'es' ? '¡Sé específico! Evita prompts vagos como "haz un video cool"' : 'Be specific! Avoid vague prompts like "make a cool video"'}</li>
                                  </ul>
                                </>
                              ) : (
                                <>
                                  <p className="font-semibold text-emerald-800 text-[11px] uppercase tracking-wide">{locale === 'es' ? 'Tips para Imágenes' : 'Image Tips'}</p>
                                  <ul className="space-y-1.5 list-disc pl-3.5">
                                    <li>{locale === 'es' ? 'Describe la iluminación: "hora dorada cálida" o "iluminación de estudio brillante"' : 'Describe lighting: "warm golden hour" or "bright studio lighting"'}</li>
                                    <li>{locale === 'es' ? 'Composición: "vista cenital (flat-lay)" o "poca profundidad de campo"' : 'Set composition: "overhead flat-lay" or "eye-level with shallow depth of field"'}</li>
                                    <li>{locale === 'es' ? 'Estilo: "fondo blanco minimalista" o "fotografía callejera vibrante"' : 'Mention style: "minimalist with white background" or "vibrant street photography"'}</li>
                                    <li>{locale === 'es' ? 'Sin texto: Ava crea imágenes sin textos superpuestos' : 'No text: Ava generates images without text overlays'}</li>
                                  </ul>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tone / Style */}
                        <div data-tour="social-tone">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {locale === 'es' ? 'Tono / Estilo de los captions' : 'Caption tone / style'}
                          </label>
                          <select
                            value={postTone}
                            onChange={e => setPostTone(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent bg-white"
                          >
                            <option value="">{locale === 'es' ? 'Automático (amigable y emocionante)' : 'Auto (friendly & exciting)'}</option>
                            <option value="friendly and casual">{locale === 'es' ? 'Amigable y casual' : 'Friendly & casual'}</option>
                            <option value="professional and polished">{locale === 'es' ? 'Profesional y pulido' : 'Professional & polished'}</option>
                            <option value="fun and playful">{locale === 'es' ? 'Divertido y juguetón' : 'Fun & playful'}</option>
                            <option value="urgent and exciting">{locale === 'es' ? 'Urgente y emocionante' : 'Urgent & exciting'}</option>
                            <option value="luxurious and exclusive">{locale === 'es' ? 'Lujoso y exclusivo' : 'Luxurious & exclusive'}</option>
                            <option value="warm and community-focused">{locale === 'es' ? 'Cálido y comunitario' : 'Warm & community-focused'}</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Generate Preview button (Step 3) */}
                    <div data-tour="social-generate" className="pt-2">
                      <button
                        onClick={generatePreview}
                        disabled={!selectedDealId || loadingPreview}
                        className="w-full px-4 py-3 bg-[#E8632B] text-white rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                      >
                        {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-[10px] font-bold mr-0.5">3</span>
                        {locale === 'es' ? 'Paso 3: Generar Vista Previa' : 'Step 3: Generate Preview'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview Mockups + Actions (shown after Generate Preview) */}
                {preview && (() => {
                  const displayImg = socialImageUrl || preview.image_url;
                  const displayVid = socialVideoUrl;
                  const isVideo = mediaMode === 'video' && displayVid;
                  return (
                  <div className="space-y-4">
                    {/* Platform Mockups */}
                    <div data-tour="social-mockups" className="space-y-4">
                      {/* Facebook Mockup */}
                      {connectedPlatforms.has('facebook') && (
                        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto">
                          <div className="flex items-center gap-2.5 p-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {preview.vendor?.business_name?.charAt(0) || 'S'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{preview.vendor?.business_name || 'SpontiCoupon'}</p>
                              <p className="text-[11px] text-gray-500">Sponsored · <Globe className="w-3 h-3 inline" /></p>
                            </div>
                          </div>
                          <div className="px-3 pb-2">
                            {editingPlatform === 'facebook' ? (
                              <textarea
                                value={editedCaptions.facebook || ''}
                                onChange={e => setEditedCaptions(prev => ({ ...prev, facebook: e.target.value }))}
                                rows={4}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none"
                              />
                            ) : (
                              <p className="text-sm text-gray-900 whitespace-pre-line line-clamp-4">{editedCaptions.facebook || ''}</p>
                            )}
                            <button onClick={() => setEditingPlatform(editingPlatform === 'facebook' ? null : 'facebook')} className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium">
                              {editingPlatform === 'facebook' ? 'Done' : 'Edit caption'}
                            </button>
                          </div>
                          {(isVideo || displayImg) && (
                            <div className={`${isVideo ? 'aspect-[9/16] max-h-[480px]' : 'aspect-video'} bg-gray-100 relative`}>
                              {isVideo ? (
                                <>
                                  <video src={displayVid} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">VIDEO</div>
                                </>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={displayImg} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          )}
                          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-around text-gray-500 text-xs">
                            <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> Like</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Comment</span>
                            <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> Share</span>
                          </div>
                        </div>
                      )}

                      {/* Instagram Mockup */}
                      {connectedPlatforms.has('instagram') && (
                        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto">
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-[2px] flex-shrink-0">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-900">
                                  {preview.vendor?.business_name?.charAt(0) || 'S'}
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</p>
                            </div>
                            <span className="text-gray-400 tracking-widest font-bold">···</span>
                          </div>
                          {(isVideo || displayImg) && (
                            <div className={`${isVideo ? 'aspect-[9/16] max-h-[480px]' : 'aspect-square'} bg-gray-100 relative`}>
                              {isVideo ? (
                                <>
                                  <video src={displayVid} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"><Video className="w-3 h-3" /> Reel</div>
                                </>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={displayImg} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <div className="flex items-center gap-4">
                              <Heart className="w-5 h-5 text-gray-800" />
                              <MessageCircle className="w-5 h-5 text-gray-800" />
                              <Send className="w-5 h-5 text-gray-800" />
                            </div>
                            <Bookmark className="w-5 h-5 text-gray-800" />
                          </div>
                          <div className="px-3 pb-3">
                            {editingPlatform === 'instagram' ? (
                              <textarea
                                value={editedCaptions.instagram || ''}
                                onChange={e => setEditedCaptions(prev => ({ ...prev, instagram: e.target.value }))}
                                rows={4}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none"
                              />
                            ) : (
                              <p className="text-sm text-gray-900">
                                <span className="font-semibold">{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</span>{' '}
                                <span className="whitespace-pre-line line-clamp-3">{editedCaptions.instagram || ''}</span>
                              </p>
                            )}
                            <button onClick={() => setEditingPlatform(editingPlatform === 'instagram' ? null : 'instagram')} className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium">
                              {editingPlatform === 'instagram' ? 'Done' : 'Edit caption'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* X/Twitter Mockup */}
                      {connectedPlatforms.has('twitter') && (
                        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto p-3">
                          <div className="flex gap-2.5">
                            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {preview.vendor?.business_name?.charAt(0) || 'S'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold text-gray-900 truncate">{preview.vendor?.business_name || 'SpontiCoupon'}</span>
                                <span className="text-sm text-gray-500 truncate">@{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</span>
                              </div>
                              {editingPlatform === 'twitter' ? (
                                <textarea
                                  value={editedCaptions.twitter || ''}
                                  onChange={e => setEditedCaptions(prev => ({ ...prev, twitter: e.target.value }))}
                                  rows={3}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none mt-1"
                                />
                              ) : (
                                <p className="text-sm text-gray-900 whitespace-pre-line mt-1 line-clamp-3">{editedCaptions.twitter || ''}</p>
                              )}
                              <button onClick={() => setEditingPlatform(editingPlatform === 'twitter' ? null : 'twitter')} className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium">
                                {editingPlatform === 'twitter' ? 'Done' : 'Edit'}
                              </button>
                              {(isVideo || displayImg) && (
                                <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 relative">
                                  {isVideo ? (
                                    <video src={displayVid} className="w-full aspect-video object-cover" muted loop autoPlay playsInline />
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={displayImg} alt="" className="w-full aspect-video object-cover" />
                                  )}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-2 text-gray-400">
                                <MessageCircle className="w-4 h-4" />
                                <RotateCcw className="w-4 h-4" />
                                <Heart className="w-4 h-4" />
                                <Share2 className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TikTok Mockup */}
                      {connectedPlatforms.has('tiktok') && (
                        <div className="border border-gray-300 rounded-lg bg-black overflow-hidden max-w-md mx-auto">
                          {(isVideo || displayImg) && (
                            <div className="aspect-[9/16] max-h-[300px] bg-gray-900 relative">
                              {isVideo ? (
                                <video src={displayVid} className="w-full h-full object-cover opacity-80" muted loop autoPlay playsInline />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={displayImg} alt="" className="w-full h-full object-cover opacity-80" />
                              )}
                              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-white text-sm font-semibold">@{preview.vendor?.business_name?.toLowerCase().replace(/\s+/g, '') || 'sponticoupon'}</span>
                                </div>
                                {editingPlatform === 'tiktok' ? (
                                  <textarea
                                    value={editedCaptions.tiktok || ''}
                                    onChange={e => setEditedCaptions(prev => ({ ...prev, tiktok: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-white/20 text-white rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-[#E8632B] resize-none placeholder-white/50"
                                  />
                                ) : (
                                  <p className="text-white text-xs line-clamp-2">{editedCaptions.tiktok || ''}</p>
                                )}
                                <button onClick={() => setEditingPlatform(editingPlatform === 'tiktok' ? null : 'tiktok')} className="text-xs text-orange-400 mt-1 font-medium">
                                  {editingPlatform === 'tiktok' ? 'Done' : 'Edit caption'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons — stacked for mobile */}
                    <div data-tour="social-actions" className="space-y-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleAction('post_now')}
                        disabled={scheduling}
                        className="w-full px-4 py-2.5 bg-[#E8632B] text-white rounded-xl text-sm font-medium hover:bg-orange-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                      >
                        {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Post Now
                      </button>

                      {/* Schedule row */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex gap-2 flex-1">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={e => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent"
                          />
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={e => setScheduleTime(e.target.value)}
                            className="w-[100px] border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8632B] focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => handleAction('schedule')}
                          disabled={scheduling || !scheduleDate}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        >
                          {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                          Schedule
                        </button>
                      </div>

                      <button
                        onClick={() => handleAction('draft')}
                        disabled={scheduling}
                        className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Draft
                      </button>
                    </div>
                  </div>
                  );
                })()}

                {!preview && !loadingPreview && !selectedDealId && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {locale === 'es'
                      ? 'Selecciona un deal para comenzar a crear tu publicación.'
                      : 'Select a deal to start creating your social post.'}
                  </p>
                )}
              </div>
            )}

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
                {failedCount > 0 && <p className="text-xs text-red-500 mt-0.5">{failedCount} failed</p>}
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">Scheduled</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{scheduledCount}</p>
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

            {/* ── Calendar / Bento View ── */}
            <div data-tour="social-calendar" className="card overflow-hidden mb-8 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Content Calendar</h2>
                <div className="flex items-center gap-3">
                  {/* Time range filter */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {TIME_RANGES.map(r => (
                      <button
                        key={r.days}
                        onClick={() => setTimeRange(r.days)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === r.days ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {/* View toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('bento')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'bento' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Grid view"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      title="Calendar view"
                    >
                      <CalendarDays className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {loadingCalendar ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : viewMode === 'bento' ? (
                <BentoGrid postsByDate={postsByDate} timeRange={timeRange} />
              ) : (
                <WeeklyCalendar postsByDate={postsByDate} timeRange={timeRange} />
              )}
            </div>

            {/* ── Post History ── */}
            <div className="card overflow-hidden border border-gray-200 rounded-xl">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Post History</h2>
                  <span className="text-xs text-gray-400">
                    {postView === 'active' ? `${posts.length} of ${total}` : `${archivedPosts.length} of ${archivedTotal}`}
                  </span>
                </div>
                {/* Active / Archived tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setPostView('active')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                      postView === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Recent (7 days)
                  </button>
                  <button
                    onClick={() => { setPostView('archived'); fetchArchived(); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                      postView === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" /> Archived
                  </button>
                </div>
              </div>

              {/* Active posts view */}
              {postView === 'active' && (
                <>
                  {posts.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No recent posts</h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-4">
                        When you publish a deal, it will be automatically posted to your connected social accounts with AI-generated captions.
                      </p>
                      {connectedPlatforms.size === 0 && (
                        <p className="text-sm text-gray-500">Connect a platform above to get started.</p>
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
                                <td className="py-3 px-4 text-gray-700 max-w-[140px] truncate">{post.deals?.title || '\u2014'}</td>
                                <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{post.caption?.substring(0, 80) || '\u2014'}</td>
                                <td className="py-3 px-4"><StatusBadge status={post.status} error={post.error_message} scheduledAt={post.scheduled_at} /></td>
                                <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">{timeAgo(post.created_at)}</td>
                                <td className="py-3 px-4"><PostActions post={post} retrying={retrying} onRetry={handleRetry} onEditDraft={loadDraft} onDelete={deletePost} /></td>
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
                                <span className="text-sm font-medium text-gray-700">{PLATFORM_LABELS[post.platform]}</span>
                              </span>
                              <StatusBadge status={post.status} error={post.error_message} scheduledAt={post.scheduled_at} />
                            </div>
                            {post.deals?.title && <p className="text-sm text-gray-700 font-medium truncate">{post.deals.title}</p>}
                            <p className="text-xs text-gray-500 line-clamp-2">{post.caption}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                              <PostActions post={post} retrying={retrying} onRetry={handleRetry} onEditDraft={loadDraft} onDelete={deletePost} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {posts.length < total && (
                        <div className="p-4 text-center border-t border-gray-100">
                          <button onClick={loadMore} disabled={loadingMore} className="text-sm font-medium text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1">
                            {loadingMore ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</> : <>Load more</>}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Archived posts view */}
              {postView === 'archived' && (
                <>
                  {loadingMoreArchived && archivedPosts.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : archivedPosts.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No archived posts</h3>
                      <p className="text-gray-500 max-w-md mx-auto">Posts older than 7 days will appear here.</p>
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
                            {archivedPosts.map(post => (
                              <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <span className="flex items-center gap-1.5">
                                    {PLATFORM_ICONS[post.platform]}
                                    <span className="text-gray-700">{PLATFORM_LABELS[post.platform]}</span>
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-700 max-w-[140px] truncate">{post.deals?.title || '\u2014'}</td>
                                <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate">{post.caption?.substring(0, 80) || '\u2014'}</td>
                                <td className="py-3 px-4"><StatusBadge status={post.status} error={post.error_message} scheduledAt={post.scheduled_at} /></td>
                                <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">{timeAgo(post.created_at)}</td>
                                <td className="py-3 px-4"><PostActions post={post} retrying={retrying} onRetry={handleRetry} onDelete={deletePost} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile card list */}
                      <div className="sm:hidden divide-y divide-gray-100">
                        {archivedPosts.map(post => (
                          <div key={post.id} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                {PLATFORM_ICONS[post.platform]}
                                <span className="text-sm font-medium text-gray-700">{PLATFORM_LABELS[post.platform]}</span>
                              </span>
                              <StatusBadge status={post.status} error={post.error_message} scheduledAt={post.scheduled_at} />
                            </div>
                            {post.deals?.title && <p className="text-sm text-gray-700 font-medium truncate">{post.deals.title}</p>}
                            <p className="text-xs text-gray-500 line-clamp-2">{post.caption}</p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                              <PostActions post={post} retrying={retrying} onRetry={handleRetry} onDelete={deletePost} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {archivedPosts.length < archivedTotal && (
                        <div className="p-4 text-center border-t border-gray-100">
                          <button onClick={loadMoreArchived} disabled={loadingMoreArchived} className="text-sm font-medium text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1">
                            {loadingMoreArchived ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</> : <>Load more</>}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </GatedSection>

      {/* Facebook Page Picker Modal */}
      {fbPagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Select a Facebook Page</h3>
              <button onClick={() => setFbPagePicker(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Choose which page to connect for auto-posting:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {fbPagePicker.pages.map(page => (
                <button
                  key={page.id}
                  onClick={() => selectFbPage(page.id)}
                  disabled={selectingPage}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">{page.name}</span>
                  </div>
                  {selectingPage ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <ArrowRight className="w-4 h-4 text-gray-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Bento Grid Component ─── */
function BentoGrid({ postsByDate, timeRange }: { postsByDate: Map<string, SocialPost[]>; timeRange: number }) {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - Math.floor(timeRange / 2));
  const endDate = new Date();
  endDate.setDate(today.getDate() + Math.ceil(timeRange / 2));
  const days = getDaysArray(startDate, endDate);

  // Group into weeks of 7
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="p-4">
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-2 mb-2">
          {week.map(day => {
            const key = getDateKey(day.toISOString());
            const dayPosts = postsByDate.get(key) || [];
            const isToday = getDateKey(new Date().toISOString()) === key;

            return (
              <div
                key={key}
                className={`min-h-[90px] p-2 rounded-lg border transition-all ${isToday ? 'border-[#E8632B] bg-orange-50/50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-[#E8632B]' : 'text-gray-500'}`}>
                  {formatDate(day.toISOString())}
                </div>
                {dayPosts.length > 0 ? (
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map(p => (
                      <div key={p.id} className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[p.status] || 'bg-gray-300'}`} />
                        <span className="text-[10px] text-gray-600 truncate">{PLATFORM_LABELS[p.platform]}</span>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{dayPosts.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-300 mt-2">No posts</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        {Object.entries({ posted: 'Posted', scheduled: 'Scheduled', draft: 'Draft', failed: 'Failed' }).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Weekly Calendar Component ─── */
function WeeklyCalendar({ postsByDate, timeRange }: { postsByDate: Map<string, SocialPost[]>; timeRange: number }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const startOfWeek = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day + (weekOffset * 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return getDaysArray(startOfWeek, new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000));
  }, [startOfWeek]);

  const maxWeeks = Math.ceil(timeRange / 7);

  return (
    <div className="p-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(prev => Math.max(prev - 1, -maxWeeks))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {formatDateFull(weekDays[0].toISOString())} — {formatDateFull(weekDays[6].toISOString())}
        </span>
        <button
          onClick={() => setWeekOffset(prev => Math.min(prev + 1, maxWeeks))}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs font-medium text-gray-400 text-center">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const key = getDateKey(day.toISOString());
          const dayPosts = postsByDate.get(key) || [];
          const isToday = getDateKey(new Date().toISOString()) === key;

          return (
            <div
              key={key}
              className={`min-h-[120px] p-2.5 rounded-xl border transition-all ${isToday ? 'border-[#E8632B] bg-orange-50/30 shadow-sm' : 'border-gray-200 bg-white'}`}
            >
              <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-[#E8632B]' : 'text-gray-700'}`}>
                {day.getDate()}
              </div>
              {dayPosts.length > 0 ? (
                <div className="space-y-1.5">
                  {dayPosts.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5 group">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[p.status] || 'bg-gray-300'}`} />
                      <span className="text-[11px] text-gray-600 truncate flex-1">
                        {PLATFORM_LABELS[p.platform]}
                      </span>
                      {p.platform_post_url && (
                        <a href={p.platform_post_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-gray-300 mt-4 text-center">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatusBadge({ status, error, scheduledAt }: { status: string; error: string | null; scheduledAt?: string | null }) {
  switch (status) {
    case 'posted':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Posted</span>;
    case 'failed':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full" title={error || ''}><XCircle className="w-3 h-3" /> Failed</span>;
    case 'scheduled':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full"><CalendarDays className="w-3 h-3" /> {scheduledAt ? formatDate(scheduledAt) : 'Scheduled'}</span>;
    case 'draft':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full"><Save className="w-3 h-3" /> Draft</span>;
    case 'pending':
    case 'posting':
      return <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full"><Loader2 className="w-3 h-3 animate-spin" /> Pending</span>;
    default:
      return <span className="text-xs text-gray-400">{status}</span>;
  }
}

function PostActions({ post, retrying, onRetry, onEditDraft, onDelete }: { post: SocialPost; retrying: string | null; onRetry: (id: string) => void; onEditDraft?: (post: SocialPost) => void; onDelete?: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      {post.platform_post_url && (
        <a href={post.platform_post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5" /> View
        </a>
      )}
      {post.status === 'draft' && onEditDraft && (
        <button onClick={() => onEditDraft(post)} className="text-xs text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Edit
        </button>
      )}
      {(post.status === 'draft' || post.status === 'pending' || post.status === 'failed' || post.status === 'posted') && onDelete && (
        <button onClick={() => onDelete(post.id)} className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Delete
        </button>
      )}
      {post.status === 'failed' && (post.retry_count || 0) < 3 && (
        <button onClick={() => onRetry(post.id)} disabled={retrying === post.id} className="text-xs text-[#E8632B] hover:text-orange-700 inline-flex items-center gap-1">
          {retrying === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Retry
        </button>
      )}
      {post.status === 'failed' && (post.retry_count || 0) >= 3 && (
        <span className="text-xs text-gray-400 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Max retries</span>
      )}
    </div>
  );
}
