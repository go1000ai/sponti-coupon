'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import {
  Wand2,
  ImageIcon,
  Video,
  Tags,
  MessageSquare,
  Heart,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const aiTools = [
  {
    title: 'AI Deal Generator',
    description: 'Generate compelling deal descriptions, titles, and pricing suggestions for any vendor.',
    icon: Wand2,
    color: 'from-purple-500 to-indigo-500',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
    href: '/admin/deals',
    status: 'active' as const,
  },
  {
    title: 'AI Image Generator',
    description: 'Create professional deal images using AI. Perfect for vendors without photos.',
    icon: ImageIcon,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    iconColor: 'text-pink-600',
    href: '/admin/media',
    status: 'active' as const,
  },
  {
    title: 'AI Video Generator',
    description: 'Transform deal images into engaging promotional videos using Nano Banana 2 + Veo 3.1.',
    icon: Video,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
    href: '/admin/media',
    status: 'active' as const,
  },
  {
    title: 'AI Search Tags',
    description: 'Generate search-optimized tags for deals to improve discoverability.',
    icon: Tags,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    href: '/admin/deals',
    status: 'active' as const,
  },
  {
    title: 'AI Review Responder',
    description: 'Draft professional responses to customer reviews on behalf of vendors.',
    icon: MessageSquare,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    href: '/admin/reviews',
    status: 'active' as const,
  },
  {
    title: 'AI Recommendations',
    description: 'View and tune the AI-powered deal recommendation engine for customers.',
    icon: Heart,
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    href: '/admin/recommendations',
    status: 'active' as const,
  },
];

export default function AdminAIToolsPage() {
  const { user, role, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">AI Tools</h1>
            <p className="text-sm text-gray-500">AI-powered features for the platform</p>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium text-white/80">Powered by AI</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Platform AI Suite</h2>
          <p className="text-white/80 max-w-2xl">
            Access all AI-powered tools from one place. Generate content, images, videos, and intelligent recommendations for your vendors and customers.
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.title}
              href={tool.href}
              className="group card overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              {/* Gradient top */}
              <div className={`h-1.5 bg-gradient-to-r ${tool.color}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${tool.bgColor}`}>
                    <Icon className={`w-6 h-6 ${tool.iconColor}`} />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-green-50 text-green-600">
                    Active
                  </span>
                </div>
                <h3 className="font-semibold text-secondary-500 mb-1 group-hover:text-primary-500 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{tool.description}</p>
                <div className="flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:gap-2 transition-all">
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
