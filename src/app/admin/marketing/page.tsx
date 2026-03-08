'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Sparkles, CheckCircle2, XCircle, Clock, Send,
  RefreshCw, Loader2, Edit3, PenLine, ChevronDown, ChevronUp, ImageIcon,
  Zap, TrendingUp, MessageSquare, MapPin, Users, Star, Megaphone,
  Facebook, Instagram, Calendar as CalendarIcon, Eye, EyeOff, ArrowRight,
  Trash2, Archive, Copy, Film, ImagePlus,
  ThumbsUp, MessageCircle, Share2, Heart, Bookmark, Globe,
} from 'lucide-react';

interface QueueItem {
  id: string;
  content_type: string;
  platforms: string[];
  caption_facebook: string | null;
  caption_instagram: string | null;
  hashtags: string[];
  image_url: string | null;
  deal_id: string | null;
  vendor_id: string | null;
  ai_reasoning: string | null;
  ai_content_score: number | null;
  target_audience: string | null;
  language: string;
  scheduled_for: string | null;
  status: string;
  admin_notes: string | null;
  was_edited: boolean;
  facebook_post_url: string | null;
  instagram_post_url: string | null;
  error_message: string | null;
  created_at: string;
  posted_at: string | null;
  deals?: { title: string; image_url: string | null } | null;
  vendors?: { business_name: string } | null;
}

interface AgentRun {
  id: string;
  run_id: string;
  run_type: string;
  deals_analyzed: number;
  promotions_generated: number;
  brand_content_generated: number;
  auto_posted: number;
  queued_for_approval: number;
  errors: string[] | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

const CONTENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  deal_promotion: { label: 'Deal Promotion', icon: Zap, color: 'text-orange-600 bg-orange-50' },
  deal_roundup: { label: 'Deal Roundup', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
  brand_awareness: { label: 'Brand Awareness', icon: Megaphone, color: 'text-orange-600 bg-orange-50' },
  engagement: { label: 'Engagement', icon: MessageSquare, color: 'text-green-600 bg-green-50' },
  local_tip: { label: 'Local Tip', icon: MapPin, color: 'text-teal-600 bg-teal-50' },
  trending_topic: { label: 'Trending', icon: TrendingUp, color: 'text-red-600 bg-red-50' },
  vendor_spotlight: { label: 'Vendor Spotlight', icon: Star, color: 'text-amber-600 bg-amber-50' },
  testimonial: { label: 'Testimonial', icon: Users, color: 'text-blue-600 bg-blue-50' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  posting: { label: 'Posting...', color: 'bg-yellow-100 text-yellow-700' },
  posted: { label: 'Posted', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', color: 'bg-gray-200 text-gray-500' },
};

export default function AdminMarketingPage() {
  useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'agent' | 'calendar'>('queue');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [editCaption, setEditCaption] = useState({ facebook: '', instagram: '' });
  const [scheduleTime, setScheduleTime] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createInstructions, setCreateInstructions] = useState('');
  const [createContentType, setCreateContentType] = useState('brand_awareness');
  const [createImageUrl, setCreateImageUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [generateImage, setGenerateImage] = useState(true);
  const [generateVideo, setGenerateVideo] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [editingCaption, setEditingCaption] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [imagePromptInput, setImagePromptInput] = useState('');
  const [avaSuggestions, setAvaSuggestions] = useState<{type: string; idea: string; why: string; hook: string}[]>([]);
  const [avaLoading, setAvaLoading] = useState(false);
  const [avaLoaded, setAvaLoaded] = useState(false);
  const [avaVisible, setAvaVisible] = useState(true);

  const fetchAvaSuggestions = useCallback(async () => {
    setAvaLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/ava-suggest');
      const data = await res.json();
      if (data.suggestions) setAvaSuggestions(data.suggestions);
    } catch { /* ignore */ }
    setAvaLoading(false);
    setAvaLoaded(true);
  }, []);

  const AVA_TYPE_MAP: Record<string, string> = {
    hook: 'brand_awareness',
    engagement: 'engagement',
    social_proof: 'testimonial',
    urgency: 'brand_awareness',
    educational: 'local_tip',
    behind_scenes: 'brand_awareness',
  };

  const AVA_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    hook: { label: 'Hook', color: 'bg-emerald-100 text-emerald-700' },
    engagement: { label: 'Engagement', color: 'bg-green-100 text-green-700' },
    social_proof: { label: 'Social Proof', color: 'bg-teal-100 text-teal-700' },
    urgency: { label: 'Urgency', color: 'bg-amber-100 text-amber-700' },
    educational: { label: 'Educational', color: 'bg-cyan-100 text-cyan-700' },
    behind_scenes: { label: 'Behind the Scenes', color: 'bg-lime-100 text-lime-700' },
  };

  const handleCreatePost = async () => {
    if (!createInstructions.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/marketing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: createInstructions,
          content_type: createContentType,
          image_url: createImageUrl || undefined,
          generate_image: generateImage,
          generate_video: generateVideo,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setCreateError(data.error);
      } else {
        setCreateInstructions('');
        setCreateImageUrl('');
        setShowCreate(false);
        await fetchItems();
      }
    } catch {
      setCreateError('Failed to create post');
    }
    setCreating(false);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/admin/marketing?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [statusFilter]);

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/admin/marketing/runs');
    const data = await res.json();
    setRuns(data.runs || []);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchRuns();
  }, [fetchItems, fetchRuns]);

  useEffect(() => {
    if (!avaLoaded) fetchAvaSuggestions();
  }, [avaLoaded, fetchAvaSuggestions]);

  const handleGenerate = async (runType = 'manual') => {
    setGenerating(true);
    try {
      await fetch('/api/admin/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runType }),
      });
      await fetchItems();
      await fetchRuns();
    } catch (err) {
      console.error('Generate error:', err);
    }
    setGenerating(false);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    await fetch(`/api/admin/marketing/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_for: scheduleTime || undefined }),
    });
    setSelectedItem(null);
    setScheduleTime('');
    await fetchItems();
    setActionLoading(null);
  };

  const handleReject = async (id: string, notes = '') => {
    setActionLoading(id);
    await fetch(`/api/admin/marketing/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    setSelectedItem(null);
    await fetchItems();
    setActionLoading(null);
  };

  const handlePostNow = async (id: string) => {
    setActionLoading(id);
    await fetch(`/api/admin/marketing/${id}/post-now`, { method: 'POST' });
    setSelectedItem(null);
    await fetchItems();
    setActionLoading(null);
  };

  const handleSaveEdit = async (id: string) => {
    setActionLoading(id);
    await fetch('/api/admin/marketing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        caption_facebook: editCaption.facebook,
        caption_instagram: editCaption.instagram,
      }),
    });
    await fetchItems();
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setActionLoading(id);
    const res = await fetch('/api/admin/marketing', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      setSelectedItem(null);
    }
    await fetchItems();
    setActionLoading(null);
  };

  const handleArchive = async (id: string) => {
    setActionLoading(id);
    await fetch('/api/admin/marketing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'archived' }),
    });
    setSelectedItem(null);
    await fetchItems();
    setActionLoading(null);
  };

  const handleReschedule = async (id: string) => {
    if (!scheduleTime) return;
    setActionLoading(id);
    await fetch('/api/admin/marketing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, scheduled_for: new Date(scheduleTime).toISOString(), status: 'scheduled' }),
    });
    setSelectedItem(null);
    setScheduleTime('');
    await fetchItems();
    setActionLoading(null);
  };

  const handleDuplicate = async (item: QueueItem) => {
    setCreating(true);
    const res = await fetch('/api/admin/marketing/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instructions: `Rewrite this post with a fresh angle:\n\nFacebook: ${item.caption_facebook}\n\nInstagram: ${item.caption_instagram}`,
        content_type: item.content_type,
        image_url: item.image_url || undefined,
      }),
    });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else {
      setSelectedItem(null);
      await fetchItems();
    }
    setCreating(false);
  };

  const handleRegenerateImage = async (item: QueueItem) => {
    setRegeneratingImage(true);
    try {
      // Use custom prompt if provided, otherwise derive from caption
      const prompt = imagePromptInput.trim() || `Professional promotional image for a social media post about: ${item.caption_facebook?.substring(0, 200)}`;
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_prompt: prompt }),
      });
      const data = await res.json();
      if (data.url) {
        // Update the queue item with new image
        await fetch('/api/admin/marketing', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, image_url: data.url }),
        });
        setImagePromptInput('');
        await fetchItems();
        // Update selected item in place
        setSelectedItem(prev => prev ? { ...prev, image_url: data.url } : null);
      } else {
        alert(data.error || 'Failed to generate image');
      }
    } catch {
      alert('Failed to regenerate image');
    }
    setRegeneratingImage(false);
  };

  const handleGenerateVideoFromModal = async (item: QueueItem) => {
    if (!item.image_url) {
      alert('Generate an image first — video needs a source image.');
      return;
    }
    setGeneratingVideo(true);
    try {
      const prompt = imagePromptInput.trim() || `Professional marketing video: smooth camera movement, engaging transitions, warm inviting atmosphere. Based on: ${item.caption_facebook?.substring(0, 150)}`;
      const res = await fetch('/api/vendor/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: item.image_url,
          video_prompt: prompt,
          aspect_ratio: '9:16',
        }),
      });
      const data = await res.json();
      if (data.status === 'processing') {
        alert(`Video generation started! Operation: ${data.operation_name}\n\nThis takes 1-3 minutes. Check back shortly.`);
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Failed to start video generation');
    }
    setGeneratingVideo(false);
  };

  const openPreview = (item: QueueItem) => {
    setSelectedItem(item);
    setEditCaption({
      facebook: item.caption_facebook || '',
      instagram: item.caption_instagram || '',
    });
    setEditingCaption(false);
    setPreviewPlatform('facebook');
    setImagePromptInput('');
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            Marketing Agent
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered social media content for Facebook & Instagram</p>
        </div>
        <button
          onClick={() => handleGenerate()}
          disabled={generating}
          className="btn-primary flex items-center gap-2"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Generating...' : 'Generate Content'}
        </button>
      </div>

      {/* Ava's Suggestions Section */}
      <div className="mb-6">
        <button
          onClick={() => setAvaVisible(!avaVisible)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl hover:border-emerald-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 rounded-lg p-2">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Ava&apos;s Marketing Suggestions</p>
              <p className="text-xs text-gray-500">AI-powered post ideas tailored for today</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchAvaSuggestions(); }}
              className="p-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
              title="Refresh suggestions"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 ${avaLoading ? 'animate-spin' : ''}`} />
            </button>
            {avaVisible ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
          </div>
        </button>

        {avaVisible && (
          <div className="mt-2">
            {avaLoading && !avaSuggestions.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-gray-50 rounded w-full mb-2" />
                    <div className="h-8 bg-emerald-50 rounded w-28 mt-3" />
                  </div>
                ))}
              </div>
            ) : avaSuggestions.length === 0 ? (
              <div className="text-center py-8 bg-white border border-gray-200 rounded-xl">
                <Sparkles className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No suggestions loaded yet</p>
                <button
                  onClick={fetchAvaSuggestions}
                  className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {avaSuggestions.map((s, idx) => {
                  const typeLabel = AVA_TYPE_LABELS[s.type] || { label: s.type, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={idx} className="bg-white border border-emerald-100 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeLabel.color}`}>
                          {typeLabel.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 font-medium mb-2">{s.idea}</p>
                      <div className="bg-emerald-50 rounded-lg p-2.5 mb-2">
                        <p className="text-xs text-emerald-700 font-medium mb-0.5">Hook:</p>
                        <p className="text-sm text-emerald-900 italic">&ldquo;{s.hook}&rdquo;</p>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        <span className="font-medium text-gray-600">Why this works:</span> {s.why}
                      </p>
                      <button
                        onClick={() => {
                          setCreateInstructions(s.idea + '\n\nHook/opening line: ' + s.hook);
                          setCreateContentType(AVA_TYPE_MAP[s.type] || 'brand_awareness');
                          setShowCreate(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" />
                        Create this post
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Post Section */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl hover:border-orange-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-[#E8632B] rounded-lg p-2">
              <PenLine className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Create a Post</p>
              <p className="text-xs text-gray-500">Tell the AI exactly what you want to promote about SpontiCoupon</p>
            </div>
          </div>
          {showCreate ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showCreate && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            {/* Instructions */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                What do you want to post? Be specific.
              </label>
              <textarea
                value={createInstructions}
                onChange={(e) => setCreateInstructions(e.target.value)}
                rows={4}
                placeholder={'Examples:\n• "Announce our Founders 20 special — first 20 vendors get $29/month for life. Only 7 spots left. Create urgency."\n• "Post about how SpontiCoupon helps restaurants fill empty seats during slow hours."\n• "Ask our followers what local deals they\'d love to see on SpontiCoupon. Make it engaging."'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8632B] focus:border-[#E8632B] placeholder:text-gray-400"
              />
            </div>

            {/* Content Type & Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Post Type</label>
                <select
                  value={createContentType}
                  onChange={(e) => setCreateContentType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8632B]"
                >
                  <option value="brand_awareness">Brand Awareness</option>
                  <option value="engagement">Engagement / Question</option>
                  <option value="vendor_spotlight">Vendor Spotlight</option>
                  <option value="testimonial">Testimonial / Social Proof</option>
                  <option value="local_tip">Local Tip</option>
                  <option value="trending_topic">Trending / Seasonal</option>
                  <option value="deal_roundup">Deal Roundup</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Image URL (optional)
                </label>
                <input
                  type="url"
                  value={createImageUrl}
                  onChange={(e) => setCreateImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8632B]"
                />
              </div>
            </div>

            {/* AI Media Generation */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">AI Media Generation</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={`flex items-center gap-3 flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  generateImage ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={generateImage}
                    onChange={(e) => setGenerateImage(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`p-2 rounded-lg ${generateImage ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                    <ImagePlus className={`w-4 h-4 ${generateImage ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${generateImage ? 'text-emerald-800' : 'text-gray-600'}`}>Generate Image</p>
                    <p className="text-xs text-gray-400">AI creates a matching image</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  generateVideo ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={generateVideo}
                    onChange={(e) => setGenerateVideo(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`p-2 rounded-lg ${generateVideo ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                    <Film className={`w-4 h-4 ${generateVideo ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${generateVideo ? 'text-emerald-800' : 'text-gray-600'}`}>Generate Video</p>
                    <p className="text-xs text-gray-400">AI creates a Reel/video (9:16)</p>
                  </div>
                </label>
              </div>
              {createImageUrl && generateImage && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                  You provided an image URL — AI image generation will be skipped, your URL will be used.
                </p>
              )}
            </div>

            {createError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{createError}</div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreatePost}
              disabled={creating || !createInstructions.trim()}
              className="btn-primary flex items-center gap-2 w-full justify-center py-3"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {generateImage ? 'Generating captions + image...' : 'Generating captions...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Post {generateImage ? '(Captions + Image)' : '(Captions only)'}
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              AI generates platform-specific captions{generateImage ? ' and a matching image' : ''}{generateVideo ? ' + starts video generation' : ''}. You can edit everything before posting.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['queue', 'history', 'agent', 'calendar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'calendar' && <CalendarIcon className="w-3.5 h-3.5" />}
            {tab === 'queue' ? 'Content Queue' : tab === 'history' ? 'Post History' : tab === 'agent' ? 'Agent Runs' : 'Calendar'}
          </button>
        ))}
      </div>

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <>
          {/* Status Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {['', 'draft', 'approved', 'scheduled', 'posted', 'rejected', 'failed', 'archived'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
            <button onClick={fetchItems} className="ml-auto text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No content yet</p>
              <p className="text-sm text-gray-400 mt-1">Click &quot;Generate Content&quot; to create AI-powered posts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(item => {
                const typeConfig = CONTENT_TYPE_CONFIG[item.content_type] || CONTENT_TYPE_CONFIG.brand_awareness;
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                const TypeIcon = typeConfig.icon;

                return (
                  <div
                    key={item.id}
                    className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
                    onClick={() => openPreview(item)}
                  >
                    {/* Image thumbnail */}
                    {item.image_url ? (
                      <div className="aspect-video bg-gray-100 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 flex gap-1">
                          {item.platforms.includes('facebook') && (
                            <div className="bg-white/90 rounded-full p-1"><Facebook className="w-3 h-3 text-blue-600" /></div>
                          )}
                          {item.platforms.includes('instagram') && (
                            <div className="bg-white/90 rounded-full p-1"><Instagram className="w-3 h-3 text-pink-600" /></div>
                          )}
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-12 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                          <div className={`rounded p-1 ${typeConfig.color}`}>
                            <TypeIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex gap-1">
                            {item.platforms.includes('facebook') && <Facebook className="w-3 h-3 text-blue-600" />}
                            {item.platforms.includes('instagram') && <Instagram className="w-3 h-3 text-pink-600" />}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    )}
                    {/* Content */}
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium text-xs text-gray-900">{typeConfig.label}</span>
                        {item.was_edited && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-600">Edited</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3 flex-1">
                        {item.caption_facebook || item.caption_instagram || 'No caption'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                        <span>{formatDate(item.created_at)}</span>
                        {item.scheduled_for && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(item.scheduled_for)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Post History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {items.filter(i => i.status === 'posted').length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Send className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No posts yet</p>
            </div>
          ) : (
            items.filter(i => i.status === 'posted').map(item => (
              <div key={item.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{CONTENT_TYPE_CONFIG[item.content_type]?.label}</span>
                    <span className="text-xs text-gray-400 ml-2">{item.posted_at ? formatDate(item.posted_at) : ''}</span>
                  </div>
                  <div className="flex gap-2">
                    {item.facebook_post_url && (
                      <a href={item.facebook_post_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                        <Facebook className="w-3 h-3" /> View
                      </a>
                    )}
                    {item.instagram_post_url && (
                      <a href={item.instagram_post_url} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline text-xs flex items-center gap-1">
                        <Instagram className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.caption_facebook || item.caption_instagram}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Agent Runs Tab */}
      {activeTab === 'agent' && (
        <div className="space-y-3">
          <div className="flex gap-2 mb-4">
            {['morning', 'afternoon', 'evening'].map(type => (
              <button
                key={type}
                onClick={() => handleGenerate(type)}
                disabled={generating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Run {type}
              </button>
            ))}
          </div>

          {runs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <RefreshCw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No agent runs yet</p>
            </div>
          ) : (
            runs.map(run => (
              <div key={run.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{run.run_id}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{run.run_type}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : 'Running...'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="font-bold text-gray-900">{run.deals_analyzed}</p>
                    <p className="text-gray-400">Analyzed</p>
                  </div>
                  <div className="bg-orange-50 rounded p-2 text-center">
                    <p className="font-bold text-orange-600">{run.promotions_generated}</p>
                    <p className="text-gray-400">Promotions</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <p className="font-bold text-blue-600">{run.brand_content_generated}</p>
                    <p className="text-gray-400">Brand</p>
                  </div>
                  <div className="bg-green-50 rounded p-2 text-center">
                    <p className="font-bold text-green-600">{run.auto_posted}</p>
                    <p className="text-gray-400">Posted</p>
                  </div>
                  <div className="bg-amber-50 rounded p-2 text-center">
                    <p className="font-bold text-amber-600">{run.queued_for_approval}</p>
                    <p className="text-gray-400">Queued</p>
                  </div>
                </div>
                {run.errors?.length ? (
                  <div className="mt-2 text-xs text-red-500 bg-red-50 rounded p-2">
                    {run.errors.join('; ')}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div>
          {/* Unscheduled drafts */}
          {items.filter(i => !i.scheduled_for && ['draft', 'approved'].includes(i.status)).length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Unscheduled Posts</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {items.filter(i => !i.scheduled_for && ['draft', 'approved'].includes(i.status)).map(item => (
                  <div
                    key={item.id}
                    onClick={() => openPreview(item)}
                    className="flex-shrink-0 w-48 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all"
                  >
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${CONTENT_TYPE_CONFIG[item.content_type]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {CONTENT_TYPE_CONFIG[item.content_type]?.label || item.content_type}
                    </span>
                    <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{item.caption_facebook?.substring(0, 80) || 'No caption'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 14 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - date.getDay() + 1 + i);
              const dateStr = date.toISOString().slice(0, 10);
              const isToday = new Date().toISOString().slice(0, 10) === dateStr;
              const dayPosts = items.filter(item =>
                item.scheduled_for && item.scheduled_for.slice(0, 10) === dateStr
              );
              const postedPosts = items.filter(item =>
                item.posted_at && item.posted_at.slice(0, 10) === dateStr && item.status === 'posted'
              );
              const allDayPosts = [...dayPosts, ...postedPosts.filter(p => !dayPosts.find(d => d.id === p.id))];

              return (
                <div
                  key={dateStr}
                  className={`min-h-[120px] rounded-lg border p-2 ${
                    isToday ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-medium ${isToday ? 'text-emerald-700' : 'text-gray-500'}`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-xs ${isToday ? 'bg-emerald-600 text-white px-1.5 py-0.5 rounded-full' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {allDayPosts.map(post => {
                      const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
                      return (
                        <div
                          key={post.id}
                          onClick={() => openPreview(post)}
                          className="p-1.5 rounded border border-gray-100 bg-white cursor-pointer hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-1">
                            {post.platforms.includes('facebook') && <Facebook className="w-2.5 h-2.5 text-blue-600" />}
                            {post.platforms.includes('instagram') && <Instagram className="w-2.5 h-2.5 text-pink-500" />}
                            <span className={`text-[10px] px-1 py-0.5 rounded ${statusCfg.color}`}>{statusCfg.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{post.caption_facebook?.substring(0, 50) || ''}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview/Edit Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {CONTENT_TYPE_CONFIG[selectedItem.content_type]?.label || selectedItem.content_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedItem.status]?.color}`}>
                    {STATUS_CONFIG[selectedItem.status]?.label}
                  </span>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              {/* AI Reasoning */}
              {selectedItem.ai_reasoning && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" /> AI Strategy
                  </p>
                  <p className="text-gray-600">{selectedItem.ai_reasoning}</p>
                  {selectedItem.target_audience && (
                    <p className="text-gray-400 mt-1">Target: {selectedItem.target_audience}</p>
                  )}
                </div>
              )}

              {/* Platform Mockup Toggle */}
              <div className="flex gap-1 mb-3 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setPreviewPlatform('facebook')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    previewPlatform === 'facebook' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Facebook className="w-4 h-4" /> Facebook
                </button>
                <button
                  onClick={() => setPreviewPlatform('instagram')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    previewPlatform === 'instagram' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Instagram className="w-4 h-4" /> Instagram
                </button>
              </div>

              {/* Facebook Mockup */}
              {previewPlatform === 'facebook' && (
                <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto mb-4">
                  {/* Header */}
                  <div className="flex items-center gap-2.5 p-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8632B] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      S
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">SpontiCoupon</p>
                      <p className="text-[11px] text-gray-500">Sponsored · <Globe className="w-3 h-3 inline" /></p>
                    </div>
                  </div>
                  {/* Caption */}
                  <div className="px-3 pb-2">
                    {editingCaption && selectedItem.status !== 'posted' ? (
                      <textarea
                        value={editCaption.facebook}
                        onChange={e => setEditCaption(prev => ({ ...prev, facebook: e.target.value }))}
                        rows={5}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 whitespace-pre-line">{editCaption.facebook}</p>
                    )}
                    {selectedItem.status !== 'posted' && (
                      <button
                        onClick={() => setEditingCaption(!editingCaption)}
                        className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium"
                      >
                        {editingCaption ? 'Done' : 'Edit caption'}
                      </button>
                    )}
                    <span className="text-xs text-gray-400 ml-2">{editCaption.facebook.length} chars</span>
                  </div>
                  {/* Image */}
                  {selectedItem.image_url && (
                    <div className="aspect-video bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedItem.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* Actions bar */}
                  <div className="px-3 py-2.5 border-t border-gray-200 flex items-center justify-around text-gray-500 text-xs">
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> Like</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Comment</span>
                    <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" /> Share</span>
                  </div>
                </div>
              )}

              {/* Instagram Mockup */}
              {previewPlatform === 'instagram' && (
                <div className="border border-gray-300 rounded-lg bg-white overflow-hidden max-w-md mx-auto mb-4">
                  {/* Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 p-[2px] flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-900">
                          S
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">sponticoupon</p>
                    </div>
                    <span className="text-gray-400 tracking-widest font-bold">···</span>
                  </div>
                  {/* Image */}
                  {selectedItem.image_url && (
                    <div className="aspect-square bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedItem.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* Action icons */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-4">
                      <Heart className="w-5 h-5 text-gray-800" />
                      <MessageCircle className="w-5 h-5 text-gray-800" />
                      <Send className="w-5 h-5 text-gray-800" />
                    </div>
                    <Bookmark className="w-5 h-5 text-gray-800" />
                  </div>
                  {/* Caption */}
                  <div className="px-3 pb-3">
                    {editingCaption && selectedItem.status !== 'posted' ? (
                      <textarea
                        value={editCaption.instagram}
                        onChange={e => setEditCaption(prev => ({ ...prev, instagram: e.target.value }))}
                        rows={5}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-[#E8632B] resize-none"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">sponticoupon</span>{' '}
                        <span className="whitespace-pre-line">{editCaption.instagram}</span>
                      </p>
                    )}
                    {selectedItem.status !== 'posted' && (
                      <button
                        onClick={() => setEditingCaption(!editingCaption)}
                        className="text-xs text-[#E8632B] hover:text-orange-700 mt-1 font-medium"
                      >
                        {editingCaption ? 'Done' : 'Edit caption'}
                      </button>
                    )}
                    <span className="text-xs text-gray-400 ml-2">{editCaption.instagram.length} chars</span>
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {selectedItem.hashtags?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Hashtags</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.hashtags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Regenerate Image / Generate Video */}
              {selectedItem.status !== 'posted' && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> AI Media Tools
                  </p>
                  <div>
                    <input
                      type="text"
                      value={imagePromptInput}
                      onChange={e => setImagePromptInput(e.target.value)}
                      placeholder="Custom prompt (optional) — e.g. 'Warm restaurant scene with happy customers'"
                      className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 bg-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRegenerateImage(selectedItem)}
                      disabled={regeneratingImage}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      {regeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                      {selectedItem.image_url ? 'Regenerate Image' : 'Generate Image'}
                    </button>
                    <button
                      onClick={() => handleGenerateVideoFromModal(selectedItem)}
                      disabled={generatingVideo || !selectedItem.image_url}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
                      Generate Video
                    </button>
                  </div>
                  {!selectedItem.image_url && (
                    <p className="text-xs text-emerald-600">Generate an image first to enable video creation.</p>
                  )}
                </div>
              )}

              {/* Schedule / Reschedule */}
              {['draft', 'approved', 'scheduled'].includes(selectedItem.status) && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    {selectedItem.scheduled_for ? 'Reschedule' : 'Schedule for (optional)'}
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm flex-1"
                    />
                    {selectedItem.scheduled_for && scheduleTime && (
                      <button
                        onClick={() => handleReschedule(selectedItem.id)}
                        disabled={actionLoading === selectedItem.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        <Clock className="w-3.5 h-3.5" /> Reschedule
                      </button>
                    )}
                  </div>
                  {selectedItem.scheduled_for && (
                    <p className="text-xs text-gray-400 mt-1">
                      Currently scheduled: {formatDate(selectedItem.scheduled_for)}
                    </p>
                  )}
                </div>
              )}

              {/* Image URL */}
              {selectedItem.status !== 'posted' && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Image URL
                  </label>
                  <input
                    type="url"
                    defaultValue={selectedItem.image_url || ''}
                    onBlur={async (e) => {
                      const newUrl = e.target.value;
                      if (newUrl !== (selectedItem.image_url || '')) {
                        await fetch('/api/admin/marketing', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: selectedItem.id, image_url: newUrl || null }),
                        });
                        await fetchItems();
                      }
                    }}
                    placeholder="https://..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                  />
                </div>
              )}

              {/* Error message */}
              {selectedItem.error_message && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-red-600">
                  {selectedItem.error_message}
                </div>
              )}

              {/* Primary Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {/* Save edits */}
                {(editCaption.facebook !== selectedItem.caption_facebook || editCaption.instagram !== selectedItem.caption_instagram) && selectedItem.status !== 'posted' && (
                  <button
                    onClick={() => handleSaveEdit(selectedItem.id)}
                    disabled={actionLoading === selectedItem.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Save Edits
                  </button>
                )}

                {/* Approve & Reject (drafts) */}
                {selectedItem.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedItem.id)}
                      disabled={actionLoading === selectedItem.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      {actionLoading === selectedItem.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {scheduleTime ? 'Approve & Schedule' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(selectedItem.id)}
                      disabled={actionLoading === selectedItem.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}

                {/* Post Now */}
                {['draft', 'approved', 'scheduled'].includes(selectedItem.status) && (
                  <button
                    onClick={() => handlePostNow(selectedItem.id)}
                    disabled={actionLoading === selectedItem.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                  >
                    {actionLoading === selectedItem.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post Now
                  </button>
                )}

                {/* View links for posted items */}
                {selectedItem.status === 'posted' && (
                  <>
                    {selectedItem.facebook_post_url && (
                      <a href={selectedItem.facebook_post_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">
                        <Facebook className="w-3.5 h-3.5" /> View on Facebook
                      </a>
                    )}
                    {selectedItem.instagram_post_url && (
                      <a href={selectedItem.instagram_post_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 bg-pink-50 text-pink-600 rounded-lg text-sm font-medium hover:bg-pink-100">
                        <Instagram className="w-3.5 h-3.5" /> View on Instagram
                      </a>
                    )}
                  </>
                )}

                {/* Spacer to push secondary actions right */}
                <div className="flex-1" />

                {/* Duplicate */}
                <button
                  onClick={() => handleDuplicate(selectedItem)}
                  disabled={creating}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 border border-gray-200"
                  title="Duplicate with AI rewrite"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  Duplicate
                </button>

                {/* Archive */}
                {selectedItem.status !== 'archived' && (
                  <button
                    onClick={() => handleArchive(selectedItem.id)}
                    disabled={actionLoading === selectedItem.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 border border-gray-200"
                    title="Archive this post"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                )}

                {/* Delete */}
                {selectedItem.status !== 'posted' && selectedItem.status !== 'posting' && (
                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    disabled={actionLoading === selectedItem.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
