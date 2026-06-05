'use client';

import { useState } from 'react';
import { RotateCcw, GraduationCap } from 'lucide-react';
import { VideoModal } from '@/components/vendor/VideoModal';
import { TutorialThumb } from '@/components/vendor/TutorialThumb';

export default function TutorialPage() {
  const [activeVideo, setActiveVideo] = useState<'onboarding' | 'tutorial' | 'redemption' | 'loyalty' | null>(null);

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
          <TutorialThumb image="/videos/onboarding-thumb.jpg" alt="Quick Start" duration="1:14" />
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
          <TutorialThumb image="/videos/tutorial-thumb.jpg" alt="Full Tutorial" duration="3:50" />
          <div className="p-5">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Full Platform Tutorial</h3>
            <p className="text-sm text-gray-500">Complete walkthrough — website import, Ava AI, deal types, analytics, social posting, and loyalty programs.</p>
          </div>
        </button>

        {/* Customer Payments & Redemption */}
        <button
          onClick={() => setActiveVideo('redemption')}
          className="card p-0 overflow-hidden hover:shadow-xl transition-all group text-left"
        >
          <TutorialThumb image="/videos/customer-redemption-thumb.jpg" alt="Customer Payments & Redemption" duration="2:56" />
          <div className="p-5">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Customer Payments &amp; Redemption</h3>
            <p className="text-sm text-gray-500">How customers claim and pay — full payment, a deposit, or in person — and how every dollar reaches you. SpontiCoupon never holds the money.</p>
          </div>
        </button>

        {/* Loyalty Programs */}
        <button
          onClick={() => setActiveVideo('loyalty')}
          className="card p-0 overflow-hidden hover:shadow-xl transition-all group text-left"
        >
          <TutorialThumb image="/videos/loyalty-program-thumb.jpg" alt="Loyalty Programs" duration="2:01" />
          <div className="p-5">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Loyalty Programs</h3>
            <p className="text-sm text-gray-500">Turn one-time deal-hunters into regulars with punch cards or points — built in and free on Pro &amp; Business.</p>
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
      <VideoModal
        src="/videos/customer-redemption-tutorial.mp4"
        title="How Customers Pay & Redeem Deals"
        open={activeVideo === 'redemption'}
        onClose={() => setActiveVideo(null)}
      />
      <VideoModal
        src="/videos/loyalty-program-tutorial.mp4"
        title="Loyalty Programs — Keep Customers Coming Back"
        open={activeVideo === 'loyalty'}
        onClose={() => setActiveVideo(null)}
      />
    </div>
  );
}
