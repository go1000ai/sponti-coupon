'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Image as ImageIcon,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  CheckCircle2,
  Film,
  FolderOpen,
  HardDrive,
  FileVideo,
  FileImage,
  ExternalLink,
} from 'lucide-react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

interface MediaItem {
  id: string;
  vendor_id: string;
  type: string;
  url: string;
  title: string | null;
  filename: string | null;
  source: string;
  ai_prompt: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  vendor_name: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTotalStorage(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminMediaPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/media?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch media');

      const data = await res.json();
      setMedia(data.media || []);
    } catch {
      showToast('Failed to load media', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchMedia();
  }, [user, role, fetchMedia]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/media?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete media');
      }
      showToast('Media deleted successfully', 'success');
      setDeleteTarget(null);
      fetchMedia();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete media', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    showToast('URL copied to clipboard', 'success');
    setTimeout(() => setCopied(null), 2000);
  };

  // Stats
  const stats = useMemo(() => {
    const totalFiles = media.length;
    const totalStorage = media.reduce((sum, m) => sum + (m.file_size || 0), 0);
    const imagesCount = media.filter((m) => m.type === 'image').length;
    const videosCount = media.filter((m) => m.type === 'video').length;
    return { totalFiles, totalStorage, imagesCount, videosCount };
  }, [media]);

  // Source badge helpers
  const sourceLabel = (source: string) => {
    switch (source) {
      case 'ai_generated': return 'AI Generated';
      case 'ai_video': return 'AI Video';
      case 'upload': return 'Uploaded';
      case 'url': return 'URL';
      default: return source;
    }
  };

  const sourceBadgeClass = (source: string) => {
    switch (source) {
      case 'ai_generated': return 'bg-orange-50 text-[#E8632B]';
      case 'ai_video': return 'bg-violet-50 text-violet-600';
      case 'upload': return 'bg-green-50 text-green-600';
      case 'url': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const typeBadgeClass = (type: string) => {
    switch (type) {
      case 'image': return 'bg-indigo-50 text-indigo-600';
      case 'video': return 'bg-purple-50 text-purple-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Media Library</h1>
            <p className="text-sm text-gray-500">{stats.totalFiles} total files</p>
          </div>
        </div>
        <button
          onClick={fetchMedia}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="flex justify-center mb-2">
            <FolderOpen className="w-6 h-6 text-primary-500" />
          </div>
          <p className="text-2xl font-bold text-secondary-500">{stats.totalFiles}</p>
          <p className="text-xs text-gray-400 mt-1">Total Files</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex justify-center mb-2">
            <HardDrive className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-secondary-500">{formatTotalStorage(stats.totalStorage)}</p>
          <p className="text-xs text-gray-400 mt-1">Total Storage</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex justify-center mb-2">
            <FileImage className="w-6 h-6 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-secondary-500">{stats.imagesCount}</p>
          <p className="text-xs text-gray-400 mt-1">Images</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex justify-center mb-2">
            <FileVideo className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-secondary-500">{stats.videosCount}</p>
          <p className="text-xs text-gray-400 mt-1">Videos</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, filename, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading media...
          </div>
        </div>
      ) : media.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No media found</h3>
          <p className="text-sm text-gray-400">Adjust your search or wait for vendors to upload media.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="group relative card overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Thumbnail */}
              {item.type === 'image' ? (
                <div className="aspect-video bg-gray-50 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.title || item.filename || 'Media'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
                  <Film className="w-12 h-12 text-gray-500" />
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/80 text-white font-medium">
                      <Film className="w-3 h-3" />
                      Video
                    </span>
                  </div>
                </div>
              )}

              {/* Hover Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                   style={{ height: '56.25%' }}>
                <button
                  onClick={() => handleCopy(item.url, item.id)}
                  className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Copy URL"
                >
                  {copied === item.id ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setDeleteTarget(item)}
                  className="p-2 bg-white rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-secondary-500 truncate">
                  {item.title || item.filename || 'Untitled'}
                </p>
                <p className="text-xs text-primary-500 font-medium truncate mt-0.5">
                  {item.vendor_name}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Type badge */}
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${typeBadgeClass(item.type)}`}>
                    {item.type === 'image' ? <FileImage className="w-3 h-3" /> : <FileVideo className="w-3 h-3" />}
                    {item.type === 'image' ? 'Image' : 'Video'}
                  </span>
                  {/* Source badge */}
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${sourceBadgeClass(item.source)}`}>
                    {sourceLabel(item.source)}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
                  <span>{formatFileSize(item.file_size)}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Media"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.title || deleteTarget.filename || 'this file'}" from ${deleteTarget.vendor_name}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Media"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
