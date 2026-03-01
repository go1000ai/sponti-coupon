'use client';

import {
  Share2, Facebook, Instagram, Twitter, Clock,
} from 'lucide-react';

const TikTokIcon = () => (
  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z" />
  </svg>
);

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: <Facebook className="w-5 h-5 text-gray-400" />, desc: 'Auto-post deals to your Facebook Page' },
  { key: 'instagram', label: 'Instagram', icon: <Instagram className="w-5 h-5 text-gray-400" />, desc: 'Share deals to Instagram with AI captions' },
  { key: 'twitter', label: 'X (Twitter)', icon: <Twitter className="w-5 h-5 text-gray-400" />, desc: 'Tweet deals with image and link' },
  { key: 'tiktok', label: 'TikTok', icon: <TikTokIcon />, desc: 'Share deals as photo posts' },
] as const;

export default function VendorSocialPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Share2 className="w-7 h-7 text-[#E8632B]" />
        <h1 className="text-2xl font-bold text-gray-900">Social Auto-Post</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Connect your social accounts and every new deal you publish will be automatically posted with an AI-generated caption.
      </p>

      {/* Coming Soon Banner */}
      <div className="rounded-2xl border-2 border-dashed border-[#E8632B]/30 bg-[#E8632B]/5 p-8 text-center mb-8">
        <Clock className="w-12 h-12 text-[#E8632B] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Social auto-posting is being set up. Soon you&apos;ll be able to connect your social media accounts
          and have every new deal automatically posted with AI-generated captions.
        </p>
      </div>

      {/* Preview of platforms (greyed out) */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Supported Platforms</h2>
      <div className="space-y-3 mb-10">
        {PLATFORMS.map(({ key, label, icon, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                {icon}
              </div>
              <div>
                <span className="font-medium text-gray-500">{label}</span>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-200 px-3 py-1.5 rounded-lg">
              Coming Soon
            </span>
          </div>
        ))}
      </div>

      {/* How it will work */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="font-medium text-gray-900 mb-2 text-sm">How it will work</p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-500">
          <li>Connect your Facebook, Instagram, X, or TikTok account</li>
          <li>Publish a new deal from your dashboard</li>
          <li>AI generates a tailored caption for each platform</li>
          <li>The deal is posted to all connected accounts automatically</li>
        </ol>
      </div>
    </div>
  );
}
