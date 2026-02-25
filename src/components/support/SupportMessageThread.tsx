'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, User, ShieldCheck, Pencil, Trash2, Check, X, ImageIcon } from 'lucide-react';
import type { SupportMessage, SupportMessageSenderType } from '@/lib/types/database';

interface Props {
  messages: SupportMessage[];
  isAdmin?: boolean;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

const senderConfig: Record<SupportMessageSenderType, { label: string; icon: typeof User; containerClass: string; bubbleClass: string; align: 'left' | 'right' }> = {
  user: {
    label: 'You',
    icon: User,
    containerClass: 'justify-start',
    bubbleClass: 'bg-gray-100 text-secondary-500',
    align: 'left',
  },
  admin: {
    label: 'Support Team',
    icon: ShieldCheck,
    containerClass: 'justify-end',
    bubbleClass: 'bg-primary-500 text-white',
    align: 'right',
  },
  ai: {
    label: 'AI Assistant',
    icon: Bot,
    containerClass: 'justify-start',
    bubbleClass: 'bg-blue-50 text-secondary-500 border border-blue-200',
    align: 'left',
  },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function MessageBubble({
  msg,
  isAdmin,
  onEdit,
  onDelete,
}: {
  msg: SupportMessage;
  isAdmin?: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
}) {
  const config = senderConfig[msg.sender_type];
  const Icon = config.icon;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.message);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== msg.message && onEdit) {
      onEdit(msg.id, trimmed);
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(msg.message);
    setEditing(false);
  };

  return (
    <div className={`flex ${config.containerClass} group`}>
      <div className={`max-w-[75%] ${config.align === 'right' ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender label + timestamp */}
        <div className={`flex items-center gap-1.5 mb-1 ${config.align === 'right' ? 'flex-row-reverse' : ''}`}>
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">{config.label}</span>
          <span className="text-xs text-gray-400">{formatRelativeTime(msg.created_at)}</span>
        </div>

        {/* Bubble */}
        <div className={`relative rounded-xl px-4 py-2.5 text-sm leading-relaxed ${config.bubbleClass}`}>
          {editing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                className="w-full bg-white text-secondary-500 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={2}
              />
              <div className="flex items-center gap-1.5 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-green-500 hover:text-green-600 rounded transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
          )}

          {/* Admin hover actions */}
          {isAdmin && !editing && (
            <div className={`absolute top-1 ${config.align === 'right' ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
              {onEdit && (
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 text-gray-400 hover:text-blue-500 rounded hover:bg-gray-100 transition-colors"
                  title="Edit message"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(msg.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Attachments */}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className={`flex flex-wrap gap-2 mt-2 ${config.align === 'right' ? 'justify-end' : 'justify-start'}`}>
            {msg.attachments.map((attachment, i) => (
              <a
                key={i}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-20 h-20 rounded-lg border border-gray-200 overflow-hidden hover:opacity-80 transition-opacity bg-gray-50"
              >
                {attachment.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={attachment.url}
                    alt={attachment.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1">
                    <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-[9px] text-gray-500 text-center truncate w-full px-1">
                      {attachment.filename}
                    </span>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupportMessageThread({ messages, isAdmin, onEditMessage, onDeleteMessage }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevCountRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">No messages yet. Start the conversation below.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          isAdmin={isAdmin}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
        />
      ))}
    </div>
  );
}
