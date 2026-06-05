'use client';

import Link from 'next/link';
import { List, CalendarDays, Plus, Tag, FileEdit } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

type DealsView = 'list' | 'calendar';
type DealsTab = 'deals' | 'drafts';

interface DealsNavHeaderProps {
  /** Which List/Calendar view is currently active (drives the toggle highlight). */
  view: DealsView;
  /**
   * Whether to render the My Deals / Drafts tab switcher. The list view shows
   * it (drafts live there); the calendar view hides it (drafts are never on the
   * calendar — only active and scheduled deals are). Defaults to true.
   */
  showTabs?: boolean;
  /** Which tab (My Deals vs Drafts) is currently active. Required when showTabs. */
  activeTab?: DealsTab;
  onTabChange?: (tab: DealsTab) => void;
  draftCount?: number;
}

/**
 * Shared header for the vendor Deals pages so the List and Calendar views show
 * an identical shell: title + List/Calendar toggle (next to the title) + New
 * Deal button. The list view additionally shows a My Deals / Drafts tab
 * switcher. Both pages render this, so the chrome can't drift between them again.
 */
export default function DealsNavHeader({
  view,
  showTabs = true,
  activeTab = 'deals',
  onTabChange,
  draftCount = 0,
}: DealsNavHeaderProps) {
  const { t } = useLanguage();

  const toggleBase =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors';
  const toggleActive = 'bg-white text-gray-900 shadow-sm';
  const toggleInactive = 'text-gray-500 hover:text-gray-900';

  const tabBase =
    'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all';
  const tabActive = 'bg-white text-gray-900 shadow-sm';
  const tabInactive = 'text-gray-500 hover:text-gray-700';

  // Preserve the active tab when flipping List <-> Calendar.
  const tabQuery = activeTab === 'drafts' ? '?tab=drafts' : '';

  return (
    <>
      {/* Title + List/Calendar toggle + New Deal */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('vendor.deals.title')}</h1>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <Link
              href={`/vendor/deals${tabQuery}`}
              className={`${toggleBase} ${view === 'list' ? toggleActive : toggleInactive}`}
              title={t('vendor.deals.listView')}
            >
              <List className="w-3.5 h-3.5" /> {t('vendor.deals.listView')}
            </Link>
            <Link
              href={`/vendor/deals/calendar${tabQuery}`}
              className={`${toggleBase} ${view === 'calendar' ? toggleActive : toggleInactive}`}
              title={t('vendor.deals.calendarView')}
            >
              <CalendarDays className="w-3.5 h-3.5" /> {t('vendor.deals.calendarView')}
            </Link>
          </div>
        </div>
        <Link href="/vendor/deals/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('vendor.deals.newDeal')}
        </Link>
      </div>

      {/* My Deals / Drafts tabs (list view only) */}
      {showTabs && (
        <div className="flex items-center mb-6">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => onTabChange?.('deals')}
              className={`${tabBase} ${activeTab === 'deals' ? tabActive : tabInactive}`}
            >
              <Tag className="w-4 h-4" /> {t('vendor.deals.title')}
            </button>
            <button
              onClick={() => onTabChange?.('drafts')}
              className={`${tabBase} ${activeTab === 'drafts' ? tabActive : tabInactive}`}
            >
              <FileEdit className="w-4 h-4" /> {t('vendor.calendar.drafts')}
              {draftCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  {draftCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
