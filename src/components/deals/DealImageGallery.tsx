'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DealImageGalleryProps {
  mainImage: string | null;
  images: string[];
  title: string;
  fallback: React.ReactNode;
}

export function DealImageGallery({ mainImage, images, title, fallback }: DealImageGalleryProps) {
  const allImages = [mainImage, ...images].filter(Boolean) as string[];
  const [activeIndex, setActiveIndex] = useState(0);

  if (allImages.length === 0) {
    return <div className="flex items-center justify-center h-64">{fallback}</div>;
  }

  if (allImages.length === 1) {
    return (
      <div className="relative h-64 sm:h-80">
        <Image src={allImages[0]} alt={title} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div className="relative h-64 sm:h-80 group">
        <Image
          src={allImages[activeIndex]}
          alt={`${title} - Image ${activeIndex + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
        />

        {/* Navigation arrows */}
        <button
          onClick={() => setActiveIndex(i => (i - 1 + allImages.length) % allImages.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveIndex(i => (i + 1) % allImages.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Image counter */}
        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
          {activeIndex + 1} / {allImages.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {allImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
              i === activeIndex ? 'border-primary-500 ring-1 ring-primary-300' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Image src={img} alt={`${title} thumbnail ${i + 1}`} fill className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
