'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, X, ImageOff } from 'lucide-react';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

function SafeImage({ src, alt, fill, className, priority, onError }: {
  src: string; alt: string; fill?: boolean; className?: string; priority?: boolean;
  onError?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${fill ? 'absolute inset-0' : 'w-full h-full'}`}>
        <ImageOff className="w-8 h-8 text-gray-300" />
      </div>
    );
  }

  // Use regular img for /media/ paths to avoid Next.js image optimization issues
  if (src.startsWith('/media/')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`${className || ''} ${fill ? 'absolute inset-0 w-full h-full' : ''}`}
        onError={() => { setFailed(true); onError?.(); }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      priority={priority}
      onError={() => { setFailed(true); onError?.(); }}
    />
  );
}

interface DealImageGalleryProps {
  mainImage: string | null;
  images: string[];
  videoUrls?: string[];
  title: string;
  fallback: React.ReactNode;
}

function getVideoEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;

  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) return url;

  return null;
}

function getVideoThumbnail(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  return null;
}

export function DealImageGallery({ mainImage, images, videoUrls = [], title, fallback }: DealImageGalleryProps) {
  const allMedia: MediaItem[] = [];

  // Deduplicate images (main image may also appear in image_urls)
  const seen = new Set<string>();
  [mainImage, ...images].filter(Boolean).forEach(url => {
    const u = url as string;
    if (!seen.has(u)) { seen.add(u); allMedia.push({ type: 'image', url: u }); }
  });

  videoUrls.forEach(url => {
    allMedia.push({ type: 'video', url, thumbnail: getVideoThumbnail(url) || undefined });
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const touchStartX = useRef<number | null>(null);

  if (allMedia.length === 0) {
    return <div className="flex items-center justify-center h-64">{fallback}</div>;
  }

  const current = allMedia[activeIndex];

  const goNext = () => setActiveIndex(i => (i + 1) % allMedia.length);
  const goPrev = () => setActiveIndex(i => (i - 1 + allMedia.length) % allMedia.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  if (allMedia.length === 1 && allMedia[0].type === 'image') {
    return (
      <div className="relative h-72 sm:h-96">
        <SafeImage src={allMedia[0].url} alt={title} fill className="object-cover" priority />
      </div>
    );
  }

  return (
    <div>
      {/* Main media view */}
      <div
        className="relative h-72 sm:h-96 group"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {current.type === 'image' ? (
          <SafeImage
            src={current.url}
            alt={`${title} - Image ${activeIndex + 1}`}
            fill
            className="object-cover transition-opacity duration-300"
            priority={activeIndex === 0}
          />
        ) : (
          <div
            className="relative w-full h-full cursor-pointer"
            onClick={() => setShowVideoModal(true)}
          >
            {current.thumbnail ? (
              <SafeImage src={current.thumbnail} alt={`${title} - Video`} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <Play className="w-16 h-16 text-white/60" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                <Play className="w-8 h-8 text-gray-900 ml-1" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-medium">
            {activeIndex + 1} / {allMedia.length}
          </div>
        )}

        {/* Video badge */}
        {current.type === 'video' && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
            <Play className="w-3 h-3" fill="white" /> VIDEO
          </div>
        )}
      </div>

      {/* Thumbnails row */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 px-4 sm:px-6 py-3 overflow-x-auto bg-white border-b border-gray-100">
          {allMedia.map((media, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                i === activeIndex ? 'border-primary-500 ring-1 ring-primary-300 scale-105' : 'border-gray-200 opacity-60 hover:opacity-100'
              }`}
            >
              {media.type === 'image' ? (
                <SafeImage src={media.url} alt={`${title} thumbnail ${i + 1}`} fill className="object-cover" />
              ) : media.thumbnail ? (
                <>
                  <SafeImage src={media.thumbnail} alt="Video thumbnail" fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white" fill="white" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" fill="white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && current.type === 'video' && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowVideoModal(false)}>
          <button
            onClick={() => setShowVideoModal(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-50"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-full max-w-4xl aspect-video" onClick={e => e.stopPropagation()}>
            {current.url.match(/\.(mp4|webm|ogg)(\?|$)/i) ? (
              <video src={current.url} controls autoPlay className="w-full h-full rounded-lg" />
            ) : (
              <iframe
                src={getVideoEmbedUrl(current.url) || current.url}
                className="w-full h-full rounded-lg"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
