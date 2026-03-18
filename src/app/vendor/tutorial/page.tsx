'use client';

import { useState } from 'react';
import { Play, RotateCcw, Clock, GraduationCap } from 'lucide-react';
import { VideoModal } from '@/components/vendor/VideoModal';

export default function TutorialPage() {
  const [activeVideo, setActiveVideo] = useState<'onboarding' | 'tutorial' | null>(null);

  const restartTour = () => {
    // Clear all Joyride tour keys so they replay
    const keys = Object.keys(localStorage).filter(k => k.startsWith('joyride_'));
    keys.forEach(k => localStorage.removeItem(k));
    // Also clear the onboarding video flag
    const onboardingKeys = Object.keys(localStorage).filter(k => k.startsWith('sponti_onboarding_seen_'));
    onboardingKeys.forEach(k => localStorage.removeItem(k));
    window.location.href = '/vendor/dashboard';
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tutorial & Getting Started</h1>
        <p className="text-gray-500">Watch the videos below to learn how to use SpontiCoupon, or restart the interactive guided tour.</p>
      </div>

      {/* Video Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Quick Start */}
        <button
          onClick={() => setActiveVideo('onboarding')}
          className="card p-0 overflow-hidden hover:shadow-xl transition-all group text-left"
        >
          <div className="relative min-h-[200px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/videos/onboarding-thumb.jpg" alt="Quick Start" className="w-full h-full object-cover absolute inset-0" />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Clock className="w-4 h-4" />
                1:14
              </div>
            </div>
          </div>
          <div className="p-5">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Quick Start</h3>
            <p className="text-sm text-gray-500">3 steps to get your first deal live — import from your website, set up payments, and publish.</p>
          </div>
        </button>

        {/* Full Tutorial */}
        <button
          onClick={() => setActiveVideo('tutorial')}
          className="card p-0 overflow-hidden hover:shadow-xl transition-all group text-left"
        >
          <div className="relative min-h-[200px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/videos/tutorial-thumb.jpg" alt="Full Tutorial" className="w-full h-full object-cover absolute inset-0" />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Clock className="w-4 h-4" />
                3:50
              </div>
            </div>
          </div>
          <div className="p-5">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Full Platform Tutorial</h3>
            <p className="text-sm text-gray-500">Complete walkthrough — website import, Ava AI, deal types, analytics, social posting, and loyalty programs.</p>
          </div>
        </button>
      </div>

      {/* Restart Tour */}
      <div className="card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-sky-600 rounded-xl p-3 text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Interactive Guided Tour</h3>
            <p className="text-sm text-gray-500">Step-by-step walkthrough that highlights each feature on your dashboard.</p>
          </div>
        </div>
        <button
          onClick={restartTour}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4" />
          Restart Tour
        </button>
      </div>

      {/* Video Modals */}
      <VideoModal
        src="/videos/onboarding-video.mp4"
        title="Quick Start — 3 Steps to Your First Deal"
        open={activeVideo === 'onboarding'}
        onClose={() => setActiveVideo(null)}
      />
      <VideoModal
        src="/videos/tutorial-video.mp4"
        title="SpontiCoupon Platform Tutorial"
        open={activeVideo === 'tutorial'}
        onClose={() => setActiveVideo(null)}
      />
    </div>
  );
}
