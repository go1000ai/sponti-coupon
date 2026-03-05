'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Sparkles, Calendar, CheckCircle2, XCircle, Clock, Send, Eye,
  RefreshCw, Loader2, ChevronDown, ExternalLink, Edit3, Trash2,
  Zap, TrendingUp, MessageSquare, MapPin, Users, Star, Megaphone,
  Facebook, Instagram,
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
};

export default function AdminMarketingPage() {
  useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'agent'>('queue');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [editCaption, setEditCaption] = useState({ facebook: '', instagram: '' });
  const [scheduleTime, setScheduleTime] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const openPreview = (item: QueueItem) => {
    setSelectedItem(item);
    setEditCaption({
      facebook: item.caption_facebook || '',
      instagram: item.caption_instagram || '',
    });
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['queue', 'history', 'agent'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'queue' ? 'Content Queue' : tab === 'history' ? 'Post History' : 'Agent Runs'}
          </button>
        ))}
      </div>

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <>
          {/* Status Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {['', 'draft', 'approved', 'scheduled', 'posted', 'rejected', 'failed'].map(s => (
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
            <div className="space-y-3">
              {items.map(item => {
                const typeConfig = CONTENT_TYPE_CONFIG[item.content_type] || CONTENT_TYPE_CONFIG.brand_awareness;
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
                const TypeIcon = typeConfig.icon;

                return (
                  <div
                    key={item.id}
                    className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openPreview(item)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${typeConfig.color}`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900">{typeConfig.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          {item.was_edited && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600">Edited</span>
                          )}
                          <div className="flex gap-1 ml-auto">
                            {item.platforms.includes('facebook') && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                            {item.platforms.includes('instagram') && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.caption_facebook || item.caption_instagram || 'No caption'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{formatDate(item.created_at)}</span>
                          {item.scheduled_for && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(item.scheduled_for)}
                            </span>
                          )}
                          {item.deals?.title && (
                            <span className="text-orange-500">{item.deals.title}</span>
                          )}
                          {item.ai_content_score && (
                            <span>Score: {(item.ai_content_score * 100).toFixed(0)}%</span>
                          )}
                        </div>
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

              {/* Side-by-side captions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                    <Facebook className="w-4 h-4 text-blue-600" /> Facebook
                  </label>
                  <textarea
                    value={editCaption.facebook}
                    onChange={e => setEditCaption(prev => ({ ...prev, facebook: e.target.value }))}
                    className="w-full border rounded-lg p-3 text-sm min-h-[200px] focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    disabled={selectedItem.status === 'posted'}
                  />
                  <p className="text-xs text-gray-400 mt-1">{editCaption.facebook.length} chars</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                    <Instagram className="w-4 h-4 text-pink-600" /> Instagram
                  </label>
                  <textarea
                    value={editCaption.instagram}
                    onChange={e => setEditCaption(prev => ({ ...prev, instagram: e.target.value }))}
                    className="w-full border rounded-lg p-3 text-sm min-h-[200px] focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                    disabled={selectedItem.status === 'posted'}
                  />
                  <p className="text-xs text-gray-400 mt-1">{editCaption.instagram.length} chars</p>
                </div>
              </div>

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

              {/* Schedule time (for approval) */}
              {['draft', 'approved'].includes(selectedItem.status) && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Schedule for (optional)</label>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* Error message */}
              {selectedItem.error_message && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 text-sm text-red-600">
                  {selectedItem.error_message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {(editCaption.facebook !== selectedItem.caption_facebook || editCaption.instagram !== selectedItem.caption_instagram) && selectedItem.status !== 'posted' && (
                  <button
                    onClick={() => handleSaveEdit(selectedItem.id)}
                    disabled={actionLoading === selectedItem.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Save Edits
                  </button>
                )}
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
                {['draft', 'approved', 'scheduled'].includes(selectedItem.status) && (
                  <button
                    onClick={() => handlePostNow(selectedItem.id)}
                    disabled={actionLoading === selectedItem.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 ml-auto"
                  >
                    {actionLoading === selectedItem.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post Now
                  </button>
                )}
                {selectedItem.status === 'posted' && (
                  <div className="flex gap-2 ml-auto">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
