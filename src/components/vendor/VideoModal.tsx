'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
  src: string;
  title: string;
  open: boolean;
  onClose: () => void;
}

export function VideoModal({ src, title, open, onClose }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors flex items-center gap-2 text-sm"
        >
          Close <X className="w-5 h-5" />
        </button>
        <div className="rounded-2xl overflow-hidden shadow-2xl bg-black">
          <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            className="w-full"
            title={title}
          />
        </div>
        <p className="text-center text-white/60 text-sm mt-3">{title}</p>
      </div>
    </div>
  );
}
