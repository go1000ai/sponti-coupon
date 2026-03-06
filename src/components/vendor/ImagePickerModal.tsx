'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VendorMedia } from '@/lib/types/database';
import {
  X, Loader2, Upload, FolderOpen, CheckCircle2, Star, GripVertical, LinkIcon,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export interface SelectedImage {
  url: string;
  isMain: boolean;
}

interface ImagePickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the full selection when user confirms. First item is the main image. */
  onConfirm: (images: SelectedImage[]) => void;
  /** Pre-selected images (first one is main). */
  initialImages?: string[];
  /** Main image URL (if different from first of initialImages). */
  initialMainImage?: string;
  /** Max total images allowed (default 11 = 1 main + 10 additional). */
  maxImages?: number;
  /** Optional vendor ID — admin can load a different vendor's media library. */
  vendorId?: string;
}

export default function ImagePickerModal({
  open,
  onClose,
  onConfirm,
  initialImages = [],
  initialMainImage,
  maxImages = 11,
  vendorId,
}: ImagePickerModalProps) {
  const { t } = useLanguage();
  const [media, setMedia] = useState<VendorMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  // Ordered list of selected image URLs
  const [selected, setSelected] = useState<string[]>([]);
  // URL of the main image
  const [mainImage, setMainImage] = useState<string>('');
  // For pasting URLs
  const [pasteUrl, setPasteUrl] = useState('');
  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Touch drag state
  const touchStartIdx = useRef<number | null>(null);
  const touchMoveClientY = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', type: 'image' });
      if (vendorId) params.set('vendor_id', vendorId);
      const res = await fetch(`/api/vendor/media?${params}`);
      const data = await res.json();
      if (res.ok) setMedia(data.media);
    } catch { /* silent */ }
    setLoading(false);
  }, [vendorId]);

  useEffect(() => {
    if (open) {
      fetchMedia();
      // Initialize from props
      const init = [...initialImages];
      if (initialMainImage && !init.includes(initialMainImage)) {
        init.unshift(initialMainImage);
      }
      setSelected(init);
      setMainImage(initialMainImage || init[0] || '');
      setError('');
      setPasteUrl('');
    }
  }, [open, fetchMedia, initialImages, initialMainImage]);

  const handleUpload = async (files: FileList) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    setUploading(true);
    setError('');
    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) { setError(t('imagePickerModal.invalidFileType')); continue; }
      if (file.size > 5 * 1024 * 1024) { setError(t('imagePickerModal.fileTooLarge')); continue; }
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'deal-images');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          setSelected(prev => {
            if (prev.length >= maxImages) return prev;
            return [...prev, data.url];
          });
          // Auto-set as main if first image
          setMainImage(prev => prev || data.url);
          fetchMedia();
        } else {
          setError(data.error || t('imagePickerModal.uploadFailed'));
        }
      } catch {
        setError(t('imagePickerModal.uploadFailed'));
      }
    }
    setUploading(false);
  };

  const toggleItem = (url: string) => {
    setSelected(prev => {
      if (prev.includes(url)) {
        const next = prev.filter(u => u !== url);
        // If we removed the main image, auto-promote first remaining
        if (mainImage === url) {
          setMainImage(next[0] || '');
        }
        return next;
      }
      if (prev.length >= maxImages) return prev;
      const next = [...prev, url];
      // Auto-set main if first
      if (!mainImage) setMainImage(url);
      return next;
    });
  };

  const setAsMain = (url: string) => {
    setMainImage(url);
  };

  const removeFromSelected = (url: string) => {
    setSelected(prev => prev.filter(u => u !== url));
    if (mainImage === url) {
      setSelected(prev => {
        setMainImage(prev.filter(u => u !== url)[0] || '');
        return prev;
      });
    }
  };

  const addPasteUrl = () => {
    const url = pasteUrl.trim();
    if (!url) return;
    if (selected.length >= maxImages) return;
    if (!selected.includes(url)) {
      setSelected(prev => [...prev, url]);
      if (!mainImage) setMainImage(url);
    }
    setPasteUrl('');
  };

  // Drag-and-drop reorder
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setSelected(prev => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Touch-based reorder for mobile
  const handleTouchStart = (idx: number) => {
    touchStartIdx.current = idx;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchMoveClientY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (idx: number) => {
    if (touchStartIdx.current !== null && touchStartIdx.current !== idx) {
      const fromIdx = touchStartIdx.current;
      setSelected(prev => {
        const next = [...prev];
        const [item] = next.splice(fromIdx, 1);
        next.splice(idx, 0, item);
        return next;
      });
    }
    touchStartIdx.current = null;
  };

  const handleConfirm = () => {
    // Build ordered result with main flag
    const result: SelectedImage[] = selected.map(url => ({
      url,
      isMain: url === mainImage,
    }));
    // Ensure main image is first
    result.sort((a, b) => (a.isMain ? -1 : b.isMain ? 1 : 0));
    onConfirm(result);
  };

  if (!open) return null;

  const libraryImages = media.filter(m => m.type === 'image');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#E8632B]" />
              {t('imagePickerModal.selectDealImages')}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('imagePickerModal.pickAndReorder')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row min-h-0">
          {/* Left panel: Library grid */}
          <div className="flex-1 p-5 overflow-y-auto border-r border-gray-100">
            {/* Upload + URL bar */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-[#E8632B] text-white rounded-lg text-sm font-medium hover:bg-[#D55A25] transition-all disabled:opacity-50 shrink-0"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {t('imagePickerModal.upload')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleUpload(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  value={pasteUrl}
                  onChange={e => setPasteUrl(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#E8632B]/30 focus:border-[#E8632B]"
                  placeholder={t('imagePickerModal.pasteImageUrl')}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPasteUrl(); } }}
                />
                <button onClick={addPasteUrl} disabled={!pasteUrl.trim()} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors shrink-0">
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2 text-red-600 text-xs">
                {error}
              </div>
            )}

            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              {t('imagePickerModal.yourLibrary', { count: String(libraryImages.length) })}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
              </div>
            ) : libraryImages.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">{t('imagePickerModal.noImagesYet')}</p>
                <p className="text-sm text-gray-400">{t('imagePickerModal.uploadOrPaste')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {libraryImages.map(item => {
                  const isSelected = selected.includes(item.url);
                  const isMain = mainImage === item.url;
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.url)}
                      className={`group relative rounded-xl overflow-hidden border-2 transition-all focus:outline-none aspect-square ${
                        isSelected
                          ? isMain
                            ? 'border-[#E8632B] ring-2 ring-[#E8632B]/40 shadow-md'
                            : 'border-[#E8632B] ring-1 ring-[#E8632B]/20'
                          : 'border-transparent hover:border-[#E8632B]/50'
                      }`}
                    >
                      <img src={item.url} alt={item.title || 'Media'} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.svg'; }} />
                      {/* Overlays */}
                      {isSelected ? (
                        <div className="absolute inset-0 bg-[#E8632B]/15 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-[#E8632B] drop-shadow-lg" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-[#E8632B]/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                      )}
                      {isMain && (
                        <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-[#E8632B] text-white font-bold">
                          <Star className="w-2.5 h-2.5 fill-white" /> MAIN
                        </span>
                      )}
                      {/* AI badge */}
                      {(item.source === 'ai_generated' || item.source === 'ai_video') && (
                        <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-[#E8632B] text-white font-medium">SC</span>
                      )}
                      {/* Selection number */}
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#E8632B] text-white text-[10px] font-bold flex items-center justify-center">
                          {selected.indexOf(item.url) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Selected images with reorder */}
          <div className="lg:w-72 p-5 overflow-y-auto bg-gray-50/50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              {t('imagePickerModal.selected', { current: String(selected.length), max: String(maxImages) })}
            </p>

            {selected.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">{t('imagePickerModal.noImagesSelectedYet')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('imagePickerModal.clickToSelect')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selected.map((url, idx) => {
                  const isMain = mainImage === url;
                  const isDragging = dragIdx === idx;
                  const isDragOver = dragOverIdx === idx;
                  return (
                    <div
                      key={url}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                      onTouchStart={() => handleTouchStart(idx)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => handleTouchEnd(idx)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                        isDragging
                          ? 'opacity-40 border-dashed border-gray-300'
                          : isDragOver
                            ? 'border-[#E8632B] bg-orange-50'
                            : isMain
                              ? 'border-[#E8632B] bg-orange-50/50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {isMain ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E8632B] uppercase">
                            <Star className="w-3 h-3 fill-[#E8632B]" /> {t('imagePickerModal.mainImage')}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setAsMain(url); }}
                            className="text-[10px] text-gray-500 hover:text-[#E8632B] font-medium transition-colors"
                          >
                            {t('imagePickerModal.setAsMain')}
                          </button>
                        )}
                        <p className="text-[9px] text-gray-400 truncate">#{idx + 1}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFromSelected(url); }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selected.length > 1 && (
              <p className="text-[10px] text-gray-400 mt-3 text-center">
                {t('imagePickerModal.dragToReorder')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {selected.length === 0
              ? t('imagePickerModal.noImagesSelectedFooter')
              : (selected.length > 1
                  ? t('imagePickerModal.imagesSelectedFooter', { count: String(selected.length) })
                  : t('imagePickerModal.imageSelectedFooter', { count: String(selected.length) }))
                + (mainImage ? ` ${t('imagePickerModal.mainSet')}` : '')}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              {t('imagePickerModal.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className="px-5 py-2.5 bg-[#E8632B] text-white rounded-lg text-sm font-medium hover:bg-[#D55A25] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('imagePickerModal.confirmSelection', { count: String(selected.length) })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
