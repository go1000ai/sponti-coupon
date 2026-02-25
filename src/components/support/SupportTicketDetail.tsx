'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Bot,
} from 'lucide-react';
import type {
  SupportTicket,
  SupportMessage,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
} from '@/lib/types/database';
import SupportMessageThread from './SupportMessageThread';
import SupportReplyForm from './SupportReplyForm';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

interface Props {
  ticketId: string;
  isAdmin?: boolean;
  apiBasePath: string;
  onBack?: () => void;
  onTicketDeleted?: () => void;
}

const statusOptions: { value: SupportTicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const priorityOptions: { value: SupportTicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusBadge: Record<SupportTicketStatus, string> = {
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-gray-100 text-gray-600',
  closed: 'bg-red-100 text-red-700',
};

const priorityBadge: Record<SupportTicketPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const categoryBadge: Record<SupportTicketCategory, string> = {
  billing: 'bg-purple-100 text-purple-700',
  technical: 'bg-blue-100 text-blue-700',
  account: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-600',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SupportTicketDetail({
  ticketId,
  isAdmin = false,
  apiBasePath,
  onBack,
  onTicketDeleted,
}: Props) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTicket = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBasePath}/${ticketId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load ticket');
      }
      const data = await res.json();
      setTicket(data.ticket || data);
      setMessages(data.messages || data.ticket?.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, ticketId]);

  // Initial fetch
  useEffect(() => {
    fetchTicket(true);
  }, [fetchTicket]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTicket(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  // Admin: update ticket field
  const updateTicketField = async (field: string, value: string | boolean) => {
    if (!ticket) return;
    setUpdating(true);
    try {
      const res = await fetch(`${apiBasePath}/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update ticket');
      }
      const data = await res.json();
      setTicket(data.ticket || { ...ticket, [field]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setUpdating(false);
    }
  };

  // Send reply
  const handleReply = async (message: string, files: File[]) => {
    const formData = new FormData();
    formData.append('message', message);
    if (isAdmin) {
      formData.append('sender_type', 'admin');
    }
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await fetch(`${apiBasePath}/${ticketId}/messages`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to send reply');
    }

    // Refresh to get the new message
    await fetchTicket(false);
  };

  // Admin: edit message
  const handleEditMessage = async (messageId: string, newText: string) => {
    try {
      const res = await fetch(`${apiBasePath}/${ticketId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newText }),
      });
      if (!res.ok) throw new Error('Failed to edit message');
      await fetchTicket(false);
    } catch {
      setError('Failed to edit message');
    }
  };

  // Admin: delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`${apiBasePath}/${ticketId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete message');
      await fetchTicket(false);
    } catch {
      setError('Failed to delete message');
    }
  };

  // Admin: delete ticket
  const handleDeleteTicket = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${apiBasePath}/${ticketId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete ticket');
      }
      setDeleteConfirm(false);
      onTicketDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket');
      setDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[600px]">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading ticket...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !ticket) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[600px]">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={() => fetchTicket(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const isClosed = ticket.status === 'closed';

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          {/* Top row: back button + actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-lg font-bold text-secondary-500 line-clamp-1">
                {ticket.subject}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchTicket(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {isAdmin && (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[ticket.status]}`}>
              {statusOptions.find((s) => s.value === ticket.status)?.label || ticket.status}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge[ticket.priority]}`}>
              {priorityOptions.find((p) => p.value === ticket.priority)?.label || ticket.priority}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryBadge[ticket.category]}`}>
              {ticket.category}
            </span>
            {ticket.ai_enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Bot className="w-3 h-3" />
                AI Enabled
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              Created {formatDate(ticket.created_at)}
            </span>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
              {/* Status */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-500">Status:</label>
                <select
                  value={ticket.status}
                  onChange={(e) => updateTicketField('status', e.target.value)}
                  disabled={updating}
                  className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white disabled:opacity-50"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-500">Priority:</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => updateTicketField('priority', e.target.value)}
                  disabled={updating}
                  className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white disabled:opacity-50"
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Toggle */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-gray-500">AI Replies:</label>
                <button
                  onClick={() => updateTicketField('ai_enabled', !ticket.ai_enabled)}
                  disabled={updating}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                    ticket.ai_enabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      ticket.ai_enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {updating && (
                <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <SupportMessageThread
          messages={messages}
          isAdmin={isAdmin}
          onEditMessage={isAdmin ? handleEditMessage : undefined}
          onDeleteMessage={isAdmin ? handleDeleteMessage : undefined}
        />

        {/* Reply form */}
        <SupportReplyForm
          onSubmit={handleReply}
          disabled={isClosed}
          placeholder={isClosed ? 'This ticket is closed.' : 'Type your reply...'}
        />
      </div>

      {/* Delete confirmation dialog */}
      <AdminConfirmDialog
        isOpen={deleteConfirm}
        onConfirm={handleDeleteTicket}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Ticket"
        message={`Are you sure you want to delete ticket "${ticket.subject}"? This will permanently remove the ticket and all its messages. This action cannot be undone.`}
        confirmLabel="Delete Ticket"
        variant="danger"
        loading={deleteLoading}
      />
    </>
  );
}
