'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { MiaChatbot } from '@/components/support/MiaChatbot';
import {
  Headphones,
  Loader2,
  ChevronRight,
  Clock,
  Send,
  Paperclip,
  X,
  ArrowLeft,
  Bot,
  User,
  Shield,
  Image as ImageIcon,
  Download,
  AlertCircle,
  TicketIcon,
} from 'lucide-react';

/* ── Types ──────────────────────────── */
interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
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

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical' },
  { value: 'account', label: 'Account' },
];

/* ── Helpers ──────────────────────────── */
function getStatusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Open' },
    in_progress: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'In Progress' },
    resolved: { bg: 'bg-green-50', text: 'text-green-600', label: 'Resolved' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Closed' },
  };
  const s = map[status] || map.open;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function getCategoryBadge(category: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    billing: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Billing' },
    technical: { bg: 'bg-cyan-50', text: 'text-cyan-600', label: 'Technical' },
    account: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Account' },
    general: { bg: 'bg-gray-50', text: 'text-gray-500', label: 'General' },
  };
  const c = map[category] || map.general;
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/* ── New Ticket Modal ──────────────────────────── */
function NewTicketModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { subject: string; category: string; message: string; attachments?: Attachment[] }) => Promise<void>;
}) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!subject.trim()) { setError('Subject is required'); return; }
    if (!message.trim()) { setError('Message is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        subject: subject.trim(),
        category,
        message: message.trim(),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      // Reset form
      setSubject('');
      setCategory('general');
      setMessage('');
      setAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">New Support Ticket</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
              placeholder="Brief description of your issue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-field resize-none"
              rows={5}
              placeholder="Describe your issue in detail..."
            />
          </div>

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg text-xs text-gray-600">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                  <button
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Ticket Detail View ──────────────────────────── */
function TicketDetailView({
  ticketId,
  onBack,
}: {
  ticketId: string;
  onBack: () => void;
}) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch {
      showToast('error', 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/support/${ticketId}`);
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.ticket) setTicket(data.ticket);
      } catch {
        // silent
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [ticketId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await fetch(`/api/support/${ticketId}/attachments`, {
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
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          attachments: replyAttachments.length > 0 ? replyAttachments : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }
      setReplyText('');
      setReplyAttachments([]);
      showToast('success', 'Reply sent');
      fetchTicket();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setReplySending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ticket not found</p>
        <button onClick={onBack} className="mt-3 text-primary-500 text-sm font-medium">Go back</button>
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

      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tickets
      </button>

      {/* Ticket header */}
      <div className="card p-5 mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2">{ticket.subject}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {getStatusBadge(ticket.status)}
          {getCategoryBadge(ticket.category)}
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Created {formatTimeAgo(ticket.created_at)}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="card p-5 mb-4">
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No messages yet.</p>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender_type === 'user';
              const isAdmin = msg.sender_type === 'admin';
              const isAI = msg.sender_type === 'ai';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? 'bg-primary-500 text-white'
                        : isAI
                        ? 'bg-blue-50 text-gray-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {/* Sender label */}
                    <div className={`flex items-center gap-1.5 mb-1 text-xs font-medium ${
                      isUser ? 'text-white/80' : isAI ? 'text-blue-500' : 'text-gray-500'
                    }`}>
                      {isUser && <User className="w-3 h-3" />}
                      {isAdmin && <Shield className="w-3 h-3" />}
                      {isAI && <Bot className="w-3 h-3" />}
                      <span>{isUser ? 'You' : isAdmin ? 'Support Team' : 'AI Assistant'}</span>
                      <span className={`${isUser ? 'text-white/50' : 'text-gray-400'}`}>
                        {formatTimestamp(msg.created_at)}
                      </span>
                    </div>

                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>

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
                              isUser
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
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply Form */}
      {ticket.status !== 'closed' ? (
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
                className="input-field resize-none"
                rows={3}
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
                title="Send reply"
              >
                {replySending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 text-center text-sm text-gray-400">
          This ticket is closed. You can create a new ticket if you need further assistance.
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────── */
export default function CustomerSupportPage() {
  const { user, loading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);

  // Scroll to top once content has loaded (not during loading spinner)
  useEffect(() => {
    if (!authLoading && !loading) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
      });
    }
  }, [authLoading, loading]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const scrollToTickets = () => {
    setShowNewTicket(true);
    ticketSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/support');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTickets();
  }, [user, fetchTickets]);

  const handleCreateTicket = async (data: { subject: string; category: string; message: string; attachments?: Attachment[] }) => {
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create ticket');
    }
    setShowNewTicket(false);
    showToast('success', 'Ticket created successfully');
    fetchTickets();
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  // Show ticket detail if one is selected
  if (selectedTicketId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <TicketDetailView
          ticketId={selectedTicketId}
          onBack={() => { setSelectedTicketId(null); fetchTickets(); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Headphones className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support & Help</h1>
          <p className="text-sm text-gray-500">Chat with Mia or open a support ticket</p>
        </div>
      </div>

      {/* Mia Chatbot */}
      <MiaChatbot onOpenTicket={scrollToTickets} />

      {/* Divider — Need more help? */}
      <div ref={ticketSectionRef} className="my-8">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative bg-gray-50 px-4">
            <span className="text-sm text-gray-400">Need more help?</span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowNewTicket(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-colors shadow-sm"
          >
            <TicketIcon className="w-4 h-4" />
            Open Support Ticket
          </button>
          <p className="text-xs text-gray-400 mt-2">Our team will respond within 24 hours</p>
        </div>
      </div>

      {/* Ticket List */}
      {tickets.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Your Tickets</h2>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="card p-4 w-full text-left hover:shadow-md transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-500 transition-colors">
                        {ticket.subject}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(ticket.status)}
                      {getCategoryBadge(ticket.category)}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatTimeAgo(ticket.updated_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={showNewTicket}
        onClose={() => setShowNewTicket(false)}
        onSubmit={handleCreateTicket}
      />
    </div>
  );
}
