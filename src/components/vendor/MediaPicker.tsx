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
  onSelectMultiple?: (urls: string[]) => void;
  multiple?: boolean;
  type?: 'image' | 'video' | 'all';
}

export default function MediaPicker({ open, onClose, onSelect, onSelectMultiple, multiple = false, type = 'image' }: MediaPickerProps) {
  const [media, setMedia] = useState<VendorMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    if (open) {
      fetchMedia();
      setSelected(new Set());
    }
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
        if (multiple) {
          // In multi mode, add to selection and refresh library
          setSelected(prev => new Set(prev).add(data.url));
          fetchMedia();
        } else {
          onSelect(data.url);
        }
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed.');
    }
    setUploading(false);
  };

  const toggleItem = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleAddSelected = () => {
    if (onSelectMultiple) {
      onSelectMultiple(Array.from(selected));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#E8632B]" />
            {multiple ? 'Select Images' : 'Pick from Library'}
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
              multiple={multiple}
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                if (multiple) {
                  Array.from(files).forEach(f => handleUpload(f));
                } else {
                  if (files[0]) handleUpload(files[0]);
                }
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-select hint */}
        {multiple && !loading && media.length > 0 && (
          <div className="mx-5 mt-3 text-xs text-gray-500">
            Tap images to select them, then press &quot;Add Selected&quot;
          </div>
        )}

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
              {media.map(item => {
                const isSelected = multiple && selected.has(item.url);
                return (
                  <button
                    key={item.id}
                    onClick={() => multiple ? toggleItem(item.url) : onSelect(item.url)}
                    className={`group relative rounded-xl overflow-hidden border-2 transition-all focus:outline-none ${
                      isSelected
                        ? 'border-[#E8632B] ring-2 ring-[#E8632B]/30'
                        : 'border-transparent hover:border-[#E8632B]'
                    }`}
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
                    {/* Selected / hover overlay */}
                    {isSelected ? (
                      <div className="absolute inset-0 bg-[#E8632B]/20 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-[#E8632B] drop-shadow-lg" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-[#E8632B]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    )}
                    {/* Source badge */}
                    {(item.source === 'ai_generated' || item.source === 'ai_video') && (
                      <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-[#E8632B] text-white font-medium">SC</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Add Selected button (multi mode only) */}
        {multiple && (
          <div className="border-t p-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {selected.size === 0 ? 'No images selected' : `${selected.size} image${selected.size > 1 ? 's' : ''} selected`}
            </p>
            <button
              onClick={handleAddSelected}
              disabled={selected.size === 0}
              className="px-5 py-2.5 bg-[#E8632B] text-white rounded-lg text-sm font-medium hover:bg-[#D55A25] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Selected ({selected.size})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
