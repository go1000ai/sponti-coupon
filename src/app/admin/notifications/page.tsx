'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminModal from '@/components/admin/AdminModal';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminPagination from '@/components/admin/AdminPagination';
import {
  Bell,
  Send,
  Trash2,
  Filter,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  customer_id: string;
  vendor_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  channel: string;
  created_at: string;
  customer_name: string;
}

interface CustomerOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

const NOTIFICATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'deal_claimed', label: 'Deal Claimed' },
  { value: 'deal_expiring', label: 'Deal Expiring' },
  { value: 'review_request', label: 'Review Request' },
  { value: 'deal_near_you', label: 'Deal Near You' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'points_earned', label: 'Points Earned' },
  { value: 'loyalty_reward', label: 'Loyalty Reward' },
];

const CHANNELS = [
  { value: '', label: 'All Channels' },
  { value: 'in_app', label: 'In-App' },
  { value: 'push', label: 'Push' },
  { value: 'email', label: 'Email' },
];

const TYPE_COLORS: Record<string, string> = {
  deal_claimed: 'bg-green-50 text-green-700',
  deal_expiring: 'bg-yellow-50 text-yellow-700',
  review_request: 'bg-blue-50 text-blue-700',
  deal_near_you: 'bg-purple-50 text-purple-700',
  welcome: 'bg-indigo-50 text-indigo-700',
  points_earned: 'bg-orange-50 text-orange-700',
  loyalty_reward: 'bg-pink-50 text-pink-700',
};

const CHANNEL_COLORS: Record<string, string> = {
  in_app: 'bg-cyan-50 text-cyan-700',
  push: 'bg-violet-50 text-violet-700',
  email: 'bg-rose-50 text-rose-700',
};

const PAGE_SIZE = 20;

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  // Send modal state
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [broadcastAll, setBroadcastAll] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerOption[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const [sendForm, setSendForm] = useState({
    type: 'welcome',
    title: '',
    message: '',
    channel: 'in_app',
  });

  // Delete confirm state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNotification, setDeletingNotification] = useState<Notification | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('pageSize', String(PAGE_SIZE));
      if (filterType) params.set('type', filterType);
      if (filterChannel) params.set('channel', filterChannel);

      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch {
      console.error('Error fetching notifications');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterType, filterChannel]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchNotifications();
  }, [user, fetchNotifications]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterChannel]);

  // Fetch customers when send modal opens
  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await fetch('/api/admin/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      console.error('Error fetching customers');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  // Filter customers by search term and exclude already-selected
  const selectedIds = new Set(selectedCustomers.map((c) => c.id));
  const filteredCustomers = customers.filter((c) => {
    if (selectedIds.has(c.id)) return false;
    if (!customerSearch.trim()) return true;
    const searchLower = customerSearch.toLowerCase();
    const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').toLowerCase();
    return fullName.includes(searchLower) || c.email.toLowerCase().includes(searchLower);
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectCustomer(customer: CustomerOption) {
    setSelectedCustomers((prev) => [...prev, customer]);
    setCustomerSearch('');
  }

  function removeSelectedCustomer(customerId: string) {
    setSelectedCustomers((prev) => prev.filter((c) => c.id !== customerId));
  }

  function openSendModal() {
    setSendForm({ type: 'welcome', title: '', message: '', channel: 'in_app' });
    setSendError('');
    setSendSuccess('');
    setBroadcastAll(false);
    setCustomerSearch('');
    setSelectedCustomers([]);
    setShowCustomerDropdown(false);
    setSendModalOpen(true);
    fetchCustomers();
  }

  function closeSendModal() {
    setSendModalOpen(false);
    setSendError('');
    setSendSuccess('');
  }

  async function handleSendSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSendLoading(true);
    setSendError('');
    setSendSuccess('');

    try {
      const payload: Record<string, unknown> = {
        type: sendForm.type,
        title: sendForm.title,
        message: sendForm.message,
        channel: sendForm.channel,
      };

      if (!broadcastAll && selectedCustomers.length > 0) {
        payload.customer_ids = selectedCustomers.map((c) => c.id);
      }

      if (!broadcastAll && selectedCustomers.length === 0) {
        setSendError('Please select at least one customer or check "Send to All Customers"');
        setSendLoading(false);
        return;
      }

      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send notification');
      }

      const data = await res.json();
      setSendSuccess(`Notification sent to ${data.count} customer${data.count !== 1 ? 's' : ''}`);

      // Refresh the list
      fetchNotifications();

      // Close modal after a delay
      setTimeout(() => {
        closeSendModal();
      }, 1500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSendLoading(false);
    }
  }

  // Delete handlers
  function openDeleteDialog(notification: Notification) {
    setDeletingNotification(notification);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setDeletingNotification(null);
  }

  async function handleDeleteConfirm() {
    if (!deletingNotification) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/notifications/${deletingNotification.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete notification');
      }

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== deletingNotification.id));
      setTotal((prev) => prev - 1);
      closeDeleteDialog();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
    }
  }

  function formatTypeName(type: string) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatChannelName(channel: string) {
    if (channel === 'in_app') return 'In-App';
    return channel.charAt(0).toUpperCase() + channel.slice(1);
  }

  function truncateText(text: string, maxLength: number) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Notification Management</h1>
            <p className="text-sm text-gray-500">{total} total notifications</p>
          </div>
        </div>
        <button
          onClick={openSendModal}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Send className="w-4 h-4" />
          Send Notification
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filters:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input-field w-auto min-w-[160px]"
          >
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-semibold text-sm text-gray-500">Customer</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Type</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Title</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Message</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Channel</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Read</th>
                <th className="p-4 font-semibold text-sm text-gray-500">Date</th>
                <th className="p-4 font-semibold text-sm text-gray-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No notifications found.
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-secondary-500">
                        {notification.customer_name}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          TYPE_COLORS[notification.type] || 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {formatTypeName(notification.type)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-secondary-500">
                      {notification.title}
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-[200px]">
                      {truncateText(notification.message, 60)}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          CHANNEL_COLORS[notification.channel] || 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {formatChannelName(notification.channel)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {notification.read ? (
                        <CheckCircle className="w-4 h-4 text-green-500 inline-block" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-300 inline-block" />
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => openDeleteDialog(notification)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Send Notification Modal */}
      <AdminModal isOpen={sendModalOpen} onClose={closeSendModal} title="Send Notification" size="lg">
        <form onSubmit={handleSendSubmit} className="space-y-4">
          {sendError && (
            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
              {sendError}
            </div>
          )}
          {sendSuccess && (
            <div className="p-3 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
              {sendSuccess}
            </div>
          )}

          {/* Broadcast toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="broadcast-all"
              checked={broadcastAll}
              onChange={(e) => setBroadcastAll(e.target.checked)}
              className="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
            />
            <label htmlFor="broadcast-all" className="text-sm font-medium text-gray-700">
              Send to All Customers (broadcast)
            </label>
          </div>

          {/* Customer selector */}
          {!broadcastAll && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customers
                {selectedCustomers.length > 0 && (
                  <span className="ml-2 text-xs text-primary-500 font-normal">
                    {selectedCustomers.length} selected
                  </span>
                )}
              </label>
              {customersLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading customers...
                </div>
              ) : (
                <div ref={customerSearchRef} className="relative">
                  {/* Selected customer chips */}
                  {selectedCustomers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedCustomers.map((c) => {
                        const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email;
                        return (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => removeSelectedCustomer(c.id)}
                              className="hover:text-primary-900 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="input-field pl-9"
                      placeholder="Search by name or email..."
                    />
                  </div>
                  {/* Dropdown results */}
                  {showCustomerDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          {customerSearch.trim() ? 'No customers found' : 'All customers selected'}
                        </div>
                      ) : (
                        filteredCustomers.map((c) => {
                          const displayName = [c.first_name, c.last_name].filter(Boolean).join(' ');
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectCustomer(c)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors text-gray-700"
                            >
                              <div className="font-medium">{displayName || c.email}</div>
                              {displayName && (
                                <div className="text-xs text-gray-400">{c.email}</div>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={sendForm.type}
                onChange={(e) => setSendForm((prev) => ({ ...prev, type: e.target.value }))}
                className="input-field"
              >
                {NOTIFICATION_TYPES.filter((t) => t.value !== '').map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select
                value={sendForm.channel}
                onChange={(e) => setSendForm((prev) => ({ ...prev, channel: e.target.value }))}
                className="input-field"
              >
                {CHANNELS.filter((c) => c.value !== '').map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={sendForm.title}
              onChange={(e) => setSendForm((prev) => ({ ...prev, title: e.target.value }))}
              className="input-field"
              placeholder="Notification title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={sendForm.message}
              onChange={(e) => setSendForm((prev) => ({ ...prev, message: e.target.value }))}
              className="input-field min-h-[100px] resize-y"
              placeholder="Notification message..."
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={closeSendModal}
              disabled={sendLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {sendLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {broadcastAll ? 'Broadcast to All' : `Send to ${selectedCustomers.length} Customer${selectedCustomers.length !== 1 ? 's' : ''}`}
                </>
              )}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteDialog}
        title="Delete Notification"
        message={
          deletingNotification
            ? `Are you sure you want to delete the notification "${deletingNotification.title}" sent to ${deletingNotification.customer_name}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Notification"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
