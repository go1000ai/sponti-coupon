'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';
import type { VendorMedia } from '@/lib/types/database';
import {
  ImagePlus, Upload, Sparkles, Trash2, Copy, RefreshCw, Loader2,
  CheckCircle2, X, Film, Image as ImageIcon, FolderOpen, Wand2,
} from 'lucide-react';

type TypeFilter = 'all' | 'image' | 'video';

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [media, setMedia] = useState<VendorMedia[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [imageTitle, setImageTitle] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const LIMIT = 30;

  const fetchMedia = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: LIMIT.toString() });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/vendor/media?${params}`);
      const data = await res.json();
      if (res.ok) {
        setMedia(data.media);
        setTotal(data.total);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user, page, typeFilter]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'deal-images');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        await fetchMedia();
      } else {
        const data = await res.json();
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const handleAiGenerate = async () => {
    if (!customPrompt.trim() && !imageTitle.trim()) {
      setError('Please enter a prompt or title for the image.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: imageTitle || customPrompt,
          description: '',
          custom_prompt: customPrompt || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomPrompt('');
        setImageTitle('');
        setShowGenerate(false);
        await fetchMedia();
      } else {
        setError(data.error || 'Failed to generate image');
      }
    } catch {
      setError('Failed to generate image. Please try again.');
    }
    setGenerating(false);
  };

  const handleRegenerate = async (item: VendorMedia) => {
    if (!item.ai_prompt) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/vendor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title || 'Regenerated image',
          custom_prompt: item.ai_prompt,
        }),
      });
      if (res.ok) {
        await fetchMedia();
      } else {
        const data = await res.json();
        setError(data.error || 'Regeneration failed');
      }
    } catch {
      setError('Regeneration failed. Please try again.');
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/vendor/media?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia(prev => prev.filter(m => m.id !== id));
        setTotal(prev => prev - 1);
      }
    } catch { /* silent */ }
    setDeleting(null);
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'ai_generated': return 'SpontiCoupon';
      case 'ai_video': return 'SpontiCoupon';
      case 'upload': return 'Uploaded';
      case 'url': return 'URL';
      default: return source;
    }
  };

  const sourceBadgeClass = (source: string) => {
    switch (source) {
      case 'ai_generated': return 'bg-orange-50 text-[#E8632B]';
      case 'ai_video': return 'bg-orange-50 text-[#E8632B]';
      case 'upload': return 'bg-green-50 text-green-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary-500 flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
              <ImagePlus className="w-6 h-6 text-white" />
            </div>
            Media Library
          </h1>
          <p className="text-gray-500 mt-1">Manage your images and videos. Pick from library when creating deals.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGenerate(!showGenerate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Wand2 className="w-4 h-4" /> AI Generate
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E8632B] text-white rounded-xl font-medium text-sm hover:bg-[#D55A25] transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </div>
      </div>

      {/* AI Generate Panel */}
      {showGenerate && (
        <GatedSection loading={tierLoading} locked={!canAccess('ai_deal_assistant')} requiredTier="business" featureName="AI Image Generation" description="Generate images with AI. Upgrade to Business.">
        <div className="card p-6 mb-6 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <h3 className="font-bold text-violet-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Generate Image with AI
          </h3>
          <div className="space-y-3">
            <input
              value={imageTitle}
              onChange={e => setImageTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-violet-200 bg-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Image title (e.g., 'Sushi Platter Special')"
            />
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-violet-200 bg-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
              rows={2}
              placeholder="Describe the image you want (e.g., 'A cozy Italian restaurant with warm lighting, a table set for two with pasta and wine')"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAiGenerate}
                disabled={generating || (!customPrompt.trim() && !imageTitle.trim())}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm disabled:opacity-50 transition-all"
              >
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate</>}
              </button>
              <button onClick={() => setShowGenerate(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          </div>
        </div>
        </GatedSection>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <X className="w-4 h-4 cursor-pointer" onClick={() => setError('')} />
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'image', 'video'] as TypeFilter[]).map(t => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              typeFilter === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'all' && <FolderOpen className="w-3.5 h-3.5" />}
            {t === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
            {t === 'video' && <Film className="w-3.5 h-3.5" />}
            {t === 'all' ? 'All' : t === 'image' ? 'Images' : 'Videos'}
            {t === 'all' && <span className="text-xs text-gray-400 ml-1">({total})</span>}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
        </div>
      ) : media.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No media yet</h3>
          <p className="text-sm text-gray-400 mb-6">Upload images or generate them with AI to build your library.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E8632B] text-white rounded-xl font-medium text-sm"
            >
              <Upload className="w-4 h-4" /> Upload Image
            </button>
            <button
              onClick={() => setShowGenerate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium text-sm"
            >
              <Wand2 className="w-4 h-4" /> AI Generate
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.map(item => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-all">
              {/* Thumbnail */}
              {item.type === 'image' ? (
                <div className="aspect-square bg-gray-50">
                  <img src={item.url} alt={item.title || 'Media'} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-gray-900">
                  <video src={item.url} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2">
                    <Film className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleCopy(item.url, item.id)}
                  className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Copy URL"
                >
                  {copied === item.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                {item.source === 'ai_generated' && item.ai_prompt && (
                  <button
                    onClick={() => handleRegenerate(item)}
                    disabled={generating}
                    className="p-2 bg-white rounded-lg text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="p-2 bg-white rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Meta */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-700 truncate">{item.title || item.filename || 'Untitled'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1.5 font-medium ${sourceBadgeClass(item.source)}`}>
                  {sourceLabel(item.source)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                page === p ? 'bg-[#E8632B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
