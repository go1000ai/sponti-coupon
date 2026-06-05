import { Play, Clock } from 'lucide-react';

interface TutorialThumbProps {
  /** Cover image (a clean frame pulled from the tutorial video). */
  image: string;
  /** Video length, e.g. "2:56". */
  duration: string;
  alt?: string;
}

/**
 * Video-thumbnail for tutorial cards: a real cover frame from the video with a
 * play button and duration. A light scrim keeps the play button legible without
 * hiding the image.
 */
export function TutorialThumb({ image, duration, alt = '' }: TutorialThumbProps) {
  return (
    <div className="relative aspect-video overflow-hidden bg-gray-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur-sm transition-transform group-hover:scale-110">
          <Play className="ml-1 h-7 w-7 text-white" />
        </div>
      </div>

      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white/90">
        <Clock className="h-3 w-3" /> {duration}
      </div>
    </div>
  );
}
