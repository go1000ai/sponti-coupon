'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  CheckCheck,
  Filter,
} from 'lucide-react';
import type { Claim, Deal } from '@/lib/types/database';

type NotificationKind = 'expiring' | 'active' | 'redeemed' | 'expired';
type FilterTab = 'all' | 'expiring' | 'redeemed' | 'expired';

interface GeneratedNotification {
  id: string;
  kind: NotificationKind;
  message: string;
  icon: React.ReactNode;
  iconBg: string;
  timestamp: Date;
  read: boolean;
  claimId: string;
}

function getClaimStatus(claim: Claim): 'redeemed' | 'expired' | 'active' {
  if (claim.redeemed) return 'redeemed';
  if (new Date(claim.expires_at) < new Date()) return 'expired';
  return 'active';
}

function getHoursUntilExpiry(expiresAt: string): number {
  return (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/claims');
      const data = await response.json();
      setClaims(data.claims || []);
    } catch {
      setClaims([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchClaims();
  }, [user, fetchClaims]);

  // Generate notifications from claims data
  const notifications: GeneratedNotification[] = useMemo(() => {
    const items: GeneratedNotification[] = [];

    claims.forEach((claim) => {
      const deal = claim.deal;
      if (!deal) return;

      const status = getClaimStatus(claim);
      const vendorName = (deal.vendor as Deal['vendor'])?.business_name || 'a vendor';
      const savings = deal.original_price - deal.deal_price;

      if (status === 'active') {
        const hoursLeft = getHoursUntilExpiry(claim.expires_at);

        if (hoursLeft > 0 && hoursLeft < 2) {
          // Expiring soon
          const minsLeft = Math.round(hoursLeft * 60);
          const timeStr = minsLeft >= 60
            ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m`
            : `${minsLeft}m`;
          items.push({
            id: `expiring-${claim.id}`,
            kind: 'expiring',
            message: `Your coupon for ${deal.title} expires in ${timeStr}!`,
            icon: <AlertTriangle className="w-5 h-5" />,
            iconBg: 'bg-amber-100 text-amber-600',
            timestamp: new Date(),
            read: false,
            claimId: claim.id,
          });
        } else if (hoursLeft > 0) {
          // Active and ready
          items.push({
            id: `active-${claim.id}`,
            kind: 'active',
            message: `Your coupon for ${deal.title} is ready to redeem`,
            icon: <CheckCircle2 className="w-5 h-5" />,
            iconBg: 'bg-green-100 text-green-600',
            timestamp: new Date(claim.created_at),
            read: false,
            claimId: claim.id,
          });
        }
      } else if (status === 'redeemed') {
        items.push({
          id: `redeemed-${claim.id}`,
          kind: 'redeemed',
          message: `You saved ${formatCurrency(savings)} at ${vendorName}!`,
          icon: <CheckCircle2 className="w-5 h-5" />,
          iconBg: 'bg-emerald-100 text-emerald-600',
          timestamp: claim.redeemed_at ? new Date(claim.redeemed_at) : new Date(claim.created_at),
          read: true,
          claimId: claim.id,
        });
      } else if (status === 'expired') {
        items.push({
          id: `expired-${claim.id}`,
          kind: 'expired',
          message: `Your coupon for ${deal.title} has expired`,
          icon: <XCircle className="w-5 h-5" />,
          iconBg: 'bg-red-100 text-red-500',
          timestamp: new Date(claim.expires_at),
          read: true,
          claimId: claim.id,
        });
      }
    });

    // Sort by timestamp, newest first
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return items;
  }, [claims]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => n.kind === filter);
  }, [notifications, filter]);

  const unreadCount = notifications.filter(
    (n) => !n.read && !readIds.has(n.id)
  ).length;

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expiring', label: 'Expiring' },
    { key: 'redeemed', label: 'Redeemed' },
    { key: 'expired', label: 'Expired' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary-500">
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">
            Stay updated on your deals and savings
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors px-3 py-2 rounded-lg hover:bg-primary-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {filteredNotifications.length > 0 ? (
        <div className="card divide-y divide-gray-50">
          {filteredNotifications.map((notification) => {
            const isRead = notification.read || readIds.has(notification.id);
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 md:p-5 transition-colors ${
                  !isRead ? 'bg-primary-50/30' : ''
                }`}
              >
                {/* Icon */}
                <div
                  className={`rounded-full p-2.5 flex-shrink-0 ${notification.iconBg}`}
                >
                  {notification.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      !isRead
                        ? 'font-semibold text-secondary-500'
                        : 'text-gray-600'
                    }`}
                  >
                    {notification.kind === 'expiring' && (
                      <span className="mr-1">&#9888;&#65039;</span>
                    )}
                    {notification.kind === 'redeemed' && (
                      <span className="mr-1">&#127881;</span>
                    )}
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(notification.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Unread indicator */}
                {!isRead && (
                  <div className="flex-shrink-0 mt-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-500">
            {filter === 'all'
              ? 'No notifications yet'
              : `No ${filter} notifications`}
          </h3>
          <p className="text-gray-400 mt-1">
            {filter === 'all'
              ? 'Claim a deal to get started!'
              : 'Check back later or try a different filter.'}
          </p>
        </div>
      )}

      {/* Summary */}
      {notifications.length > 0 && (
        <div className="text-center text-sm text-gray-400 pb-4">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}{' '}
          {unreadCount > 0 && (
            <span className="text-primary-500 font-medium">
              ({unreadCount} unread)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
