'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import {
  ArrowLeft,
  Loader2,
  Send,
  Bot,
  User,
  Shield,
  Paperclip,
  X,
  Pencil,
  Trash2,
  Check,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Download,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';

/* ── Types ──────────────────────────── */
interface Ticket {
  id: string;
  user_id: string;
  user_email: string;
  user_role: 'vendor' | 'customer';
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'billing' | 'technical' | 'account' | 'general';
  ai_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  url: string;
  filename: string;
  size: number;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin' | 'ai';
  sender_id: string | null;
  message: string;
  attachments: Attachment[];
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const CATEGORY_OPTIONS = [
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'account', label: 'Account' },
  { value: 'general', label: 'General' },
];

/* ── Helpers ──────────────────────────── */
function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/* ── Main Page ──────────────────────────── */
export default function AdminSupportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit message
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // AI draft
  const [aiDrafting, setAiDrafting] = useState(false);

  // Control updates
  const [controlSaving, setControlSaving] = useState(false);

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Delete message dialog
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [deleteMessageLoading, setDeleteMessageLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch ticket + messages
  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/support/${id}`);
      if (!res.ok) throw new Error('Failed to fetch ticket');
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch {
      showToast('error', 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    fetchTicket();
  }, [user, id, fetchTicket]);

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    if (!user || !id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/support/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.ticket) setTicket(data.ticket);
      } catch {
        // silent
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user, id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Control Handlers ---

  const handleControlChange = async (field: string, value: string | boolean) => {
    if (!ticket) return;
    setControlSaving(true);
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setTicket(data.ticket);
      showToast('success', `${field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} updated`);
    } catch {
      showToast('error', 'Failed to update ticket');
    } finally {
      setControlSaving(false);
    }
  };

  // --- Reply Handler ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await fetch(`/api/support/${id}/attachments`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          showToast('error', err.error || 'Upload failed');
          continue;
        }
        const data = await res.json();
        setReplyAttachments(prev => [...prev, { url: data.url, filename: data.filename, size: data.size }]);
      }
    } catch {
      showToast('error', 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to send reply');

      setReplyText('');
      setReplyAttachments([]);
      showToast('success', 'Reply sent');
      fetchTicket();
    } catch {
      showToast('error', 'Failed to send reply');
    } finally {
      setReplySending(false);
    }
  };

  // --- AI Draft ---

  const handleAiDraft = async () => {
    setAiDrafting(true);
    try {
      const payload: Record<string, unknown> = { ticket_id: id, draft_only: true };
      if (replyText.trim()) {
        payload.admin_draft = replyText.trim();
      }
      const res = await fetch('/api/support/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to generate AI draft');
      const data = await res.json();
      if (data.draft) {
        setReplyText(data.draft);
        showToast('success', replyText.trim() ? 'AI improved your draft' : 'AI draft generated — review and edit before sending');
      } else {
        showToast('error', 'AI could not generate a draft');
      }
    } catch {
      showToast('error', 'Failed to generate AI draft');
    } finally {
      setAiDrafting(false);
    }
  };

  // --- Edit Message ---

  const handleEditMessage = async (messageId: string) => {
    if (!editMessageText.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/support/${id}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: editMessageText.trim() }),
      });
      if (!res.ok) throw new Error('Failed to edit message');
      setEditingMessageId(null);
      setEditMessageText('');
      showToast('success', 'Message updated');
      fetchTicket();
    } catch {
      showToast('error', 'Failed to edit message');
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete Message ---

  const handleDeleteMessage = async () => {
    if (!deleteMessageId) return;
    setDeleteMessageLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${id}/messages/${deleteMessageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete message');
      setDeleteMessageId(null);
      showToast('success', 'Message deleted');
      fetchTicket();
    } catch {
      showToast('error', 'Failed to delete message');
    } finally {
      setDeleteMessageLoading(false);
    }
  };

  // --- Delete Ticket ---

  const handleDeleteTicket = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/support/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ticket');
      showToast('success', 'Ticket deleted');
      router.push('/admin/support');
    } catch {
      showToast('error', 'Failed to delete ticket');
    } finally {
      setDeleteLoading(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Ticket not found</p>
        <button
          onClick={() => router.push('/admin/support')}
          className="mt-4 text-primary-500 hover:text-primary-600 font-medium text-sm"
        >
          Back to Support
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/support')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Support
      </button>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ──── Left Side: Conversation (2/3) ──── */}
        <div className="flex-1 lg:max-w-[66%]">
          {/* Ticket Header */}
          <div className="card p-5 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 mb-2">{ticket.subject}</h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {ticket.user_email}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ticket.user_role === 'vendor' ? 'bg-primary-50 text-primary-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {ticket.user_role === 'vendor' ? 'Vendor' : 'Customer'}
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(ticket.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {ticket.priority === 'urgent' && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-red-50 text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    Urgent
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="card p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Conversation</h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No messages yet.</p>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.sender_type === 'user';
                  const isAdmin = msg.sender_type === 'admin';
                  const isAI = msg.sender_type === 'ai';
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          isAdmin
                            ? 'bg-primary-500 text-white'
                            : isAI
                            ? 'bg-blue-50 text-gray-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {/* Sender label */}
                        <div className={`flex items-center gap-1.5 mb-1 text-xs font-medium ${
                          isAdmin ? 'text-white/80' : isAI ? 'text-blue-500' : 'text-gray-500'
                        }`}>
                          {isUser && <User className="w-3 h-3" />}
                          {isAdmin && <Shield className="w-3 h-3" />}
                          {isAI && <Bot className="w-3 h-3" />}
                          <span>
                            {isUser ? ticket.user_email : isAdmin ? 'Admin' : 'AI Assistant'}
                          </span>
                          <span className={`${isAdmin ? 'text-white/50' : 'text-gray-400'}`}>
                            {formatTimestamp(msg.created_at)}
                          </span>
                        </div>

                        {/* Message content or edit form */}
                        {isEditing ? (
                          <div className="mt-2">
                            <textarea
                              value={editMessageText}
                              onChange={(e) => setEditMessageText(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm resize-none"
                              rows={3}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleEditMessage(msg.id)}
                                disabled={editSaving}
                                className="text-xs bg-primary-500 text-white px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1"
                              >
                                {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingMessageId(null); setEditMessageText(''); }}
                                className="text-xs text-gray-500 px-3 py-1.5"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        )}

                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {msg.attachments.map((att, i) => (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                                  isAdmin
                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{att.filename}</span>
                                <span className="text-[10px] opacity-60">{formatFileSize(att.size)}</span>
                                <Download className="w-3 h-3 flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Edit/Delete actions for admin */}
                        {!isEditing && (
                          <div className={`flex items-center gap-1 mt-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                            <button
                              onClick={() => { setEditingMessageId(msg.id); setEditMessageText(msg.message); }}
                              className={`p-1 rounded transition-colors ${
                                isAdmin ? 'text-white/50 hover:text-white/80' : 'text-gray-400 hover:text-gray-600'
                              }`}
                              title="Edit message"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteMessageId(msg.id)}
                              className={`p-1 rounded transition-colors ${
                                isAdmin ? 'text-white/50 hover:text-white/80' : 'text-gray-400 hover:text-red-500'
                              }`}
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Reply Form */}
          {ticket.status !== 'closed' && (
            <div className="card p-4">
              {/* Attachment previews */}
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {replyAttachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">{att.filename}</span>
                      <button
                        onClick={() => setReplyAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="input-field resize-y"
                    rows={6}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                  />
                  <button
                    onClick={handleAiDraft}
                    disabled={aiDrafting}
                    className="p-2.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="AI Assist — draft a response"
                  >
                    {aiDrafting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Attach image"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={replySending || !replyText.trim()}
                    className="p-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                    title="Send reply (Cmd+Enter)"
                  >
                    {replySending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ──── Right Side: Controls (1/3) ──── */}
        <div className="lg:w-[34%] space-y-4">
          {/* Status */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</label>
            <select
              value={ticket.status}
              onChange={(e) => handleControlChange('status', e.target.value)}
              disabled={controlSaving}
              className="input-field text-sm"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
            <select
              value={ticket.priority}
              onChange={(e) => handleControlChange('priority', e.target.value)}
              disabled={controlSaving}
              className="input-field text-sm"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</label>
            <select
              value={ticket.category}
              onChange={(e) => handleControlChange('category', e.target.value)}
              disabled={controlSaving}
              className="input-field text-sm"
            >
              {CATEGORY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* AI Toggle */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Auto-Reply</label>
            <button
              onClick={() => handleControlChange('ai_enabled', !ticket.ai_enabled)}
              disabled={controlSaving}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${
                ticket.ai_enabled
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-50 text-gray-500'
              }`}
            >
              {ticket.ai_enabled ? (
                <ToggleRight className="w-6 h-6" />
              ) : (
                <ToggleLeft className="w-6 h-6" />
              )}
              <span className="text-sm font-medium">
                {ticket.ai_enabled ? 'Enabled' : 'Disabled'}
              </span>
              <Bot className="w-4 h-4 ml-auto" />
            </button>
          </div>

          {/* Ticket Info */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</label>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Ticket ID</span>
                <span className="text-gray-600 font-mono text-xs">{ticket.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">User</span>
                <span className="text-gray-600 truncate ml-2 max-w-[180px]">{ticket.user_email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Role</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ticket.user_role === 'vendor' ? 'bg-primary-50 text-primary-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {ticket.user_role === 'vendor' ? 'Vendor' : 'Customer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-600 text-xs">{formatDate(ticket.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Updated</span>
                <span className="text-gray-600 text-xs">{formatDate(ticket.updated_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Messages</span>
                <span className="text-gray-600 font-medium">{messages.length}</span>
              </div>
            </div>
          </div>

          {/* Delete Ticket */}
          <div className="card p-4">
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Delete Ticket Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={showDeleteDialog}
        onConfirm={handleDeleteTicket}
        onCancel={() => setShowDeleteDialog(false)}
        title="Delete Support Ticket"
        message={`Are you sure you want to delete ticket "${ticket.subject}"? This will permanently delete all messages and attachments. This action cannot be undone.`}
        confirmLabel="Delete Ticket"
        variant="danger"
        loading={deleteLoading}
      />

      {/* Delete Message Confirm Dialog */}
      <AdminConfirmDialog
        isOpen={!!deleteMessageId}
        onConfirm={handleDeleteMessage}
        onCancel={() => setDeleteMessageId(null)}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete Message"
        variant="danger"
        loading={deleteMessageLoading}
      />
    </div>
  );
}
