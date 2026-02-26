'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VendorMedia } from '@/lib/types/database';
import {
  X, Loader2, Upload, Film, FolderOpen, CheckCircle2,
} from 'lucide-react';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  type?: 'image' | 'video' | 'all';
}

export default function MediaPicker({ open, onClose, onSelect, type = 'image' }: MediaPickerProps) {
  const [media, setMedia] = useState<VendorMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (type !== 'all') params.set('type', type);
      const res = await fetch(`/api/vendor/media?${params}`);
      const data = await res.json();
      if (res.ok) setMedia(data.media);
    } catch { /* silent */ }
    setLoading(false);
  }, [type]);

  useEffect(() => {
    if (open) fetchMedia();
  }, [open, fetchMedia]);

  const handleUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB).');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'deal-images');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        // Select the just-uploaded image immediately
        onSelect(data.url);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed.');
    }
    setUploading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#E8632B]" />
            Pick from Library
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-[#E8632B] text-white rounded-lg text-sm font-medium hover:bg-[#D55A25] transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload New
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mt-3 bg-red-50 border border-red-200 rounded-lg p-2 text-red-600 text-xs">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 mb-1">No media in your library yet.</p>
              <p className="text-sm text-gray-400">Upload an image to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {media.map(item => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.url)}
                  className="group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-[#E8632B] transition-all focus:outline-none focus:border-[#E8632B]"
                >
                  {item.type === 'image' ? (
                    <div className="aspect-square bg-gray-50">
                      <img src={item.url} alt={item.title || 'Media'} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-900 relative">
                      <video src={item.url} className="w-full h-full object-cover" />
                      <Film className="absolute top-1 left-1 w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#E8632B]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                  {/* Source badge */}
                  {(item.source === 'ai_generated' || item.source === 'ai_video') && (
                    <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-[#E8632B] text-white font-medium">SC</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
