'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileEdit, Plus, Trash2, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import type { Deal } from '@/lib/types/database';

interface DraftsGridProps {
  drafts: Deal[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}

/**
 * Shared Drafts grid used by both the List and Calendar deals views so the
 * Drafts tab looks and behaves identically regardless of which view you're in.
 */
export default function DraftsGrid({ drafts, onDelete, deletingId }: DraftsGridProps) {
  const router = useRouter();
  const { t } = useLanguage();

  if (drafts.length === 0) {
    return (
      <div className="card p-12 text-center">
        <FileEdit className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('vendor.calendar.noDraftsYet')}</h3>
        <p className="text-sm text-gray-400 mb-6">{t('vendor.calendar.noDraftsDesc')}</p>
        <Link
          href="/vendor/deals/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8632B] text-white rounded-xl font-medium text-sm hover:bg-[#D55A25] transition-all"
        >
          <Plus className="w-4 h-4" /> {t('vendor.deals.createDeal')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {drafts.map(draft => (
        <div
          key={draft.id}
          className="card overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
          onClick={() => router.push(`/vendor/deals/edit?id=${draft.id}`)}
        >
          {/* Image or placeholder */}
          {draft.image_url ? (
            <div className="aspect-[16/10] bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[16/10] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
              <FileEdit className="w-10 h-10 text-amber-300" />
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900 truncate">
                  {draft.title || t('vendor.calendar.untitledDraft')}
                </h3>
                {draft.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{draft.description}</p>
                )}
              </div>
              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                draft.deal_type === 'sponti_coupon'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {draft.deal_type === 'sponti_coupon' ? 'Sponti' : 'Steady'}
              </span>
            </div>

            {/* Pricing */}
            {(draft.deal_price > 0 || draft.original_price > 0) && (
              <div className="flex items-center gap-2 mt-3">
                {draft.deal_price > 0 && (
                  <span className="text-lg font-bold text-primary-500">{formatCurrency(draft.deal_price)}</span>
                )}
                {draft.original_price > 0 && (
                  <span className="text-sm text-gray-400 line-through">{formatCurrency(draft.original_price)}</span>
                )}
                {draft.discount_percentage > 0 && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    {Math.round(draft.discount_percentage)}% off
                  </span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Saved {new Date(draft.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  href={`/vendor/deals/edit?id=${draft.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                  title="Edit draft"
                >
                  <FileEdit className="w-4 h-4" />
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(draft.id); }}
                  disabled={deletingId === draft.id}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Delete draft"
                >
                  {deletingId === draft.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
