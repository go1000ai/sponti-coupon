'use client';

import { Headphones } from 'lucide-react';
import type { SupportTicket, SupportTicketStatus, SupportTicketPriority, SupportTicketCategory } from '@/lib/types/database';

interface Props {
  tickets: SupportTicket[];
  loading: boolean;
  onSelectTicket: (ticket: SupportTicket) => void;
  showUserInfo?: boolean;
}

const statusConfig: Record<SupportTicketStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', className: 'bg-gray-100 text-gray-600' },
  closed: { label: 'Closed', className: 'bg-red-100 text-red-700' },
};

const priorityConfig: Record<SupportTicketPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
};

const categoryConfig: Record<SupportTicketCategory, { label: string; className: string }> = {
  billing: { label: 'Billing', className: 'bg-purple-100 text-purple-700' },
  technical: { label: 'Technical', className: 'bg-blue-100 text-blue-700' },
  account: { label: 'Account', className: 'bg-green-100 text-green-700' },
  general: { label: 'General', className: 'bg-gray-100 text-gray-600' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function SupportTicketList({ tickets, loading, onSelectTicket, showUserInfo = false }: Props) {
  const columnCount = showUserInfo ? 7 : 5;

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-secondary-500">Subject</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary-500">Category</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-secondary-500">Priority</th>
                {showUserInfo && (
                  <>
                    <th className="px-4 py-3 text-left font-semibold text-secondary-500">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-secondary-500">Role</th>
                  </>
                )}
                <th className="px-4 py-3 text-left font-semibold text-secondary-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={columnCount} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Headphones className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-secondary-500 mb-1">No tickets found</h3>
        <p className="text-sm text-gray-500">
          {showUserInfo
            ? 'No support tickets match your current filters.'
            : 'You haven\'t created any support tickets yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-secondary-500">Subject</th>
              <th className="px-4 py-3 text-left font-semibold text-secondary-500">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-secondary-500">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-secondary-500">Priority</th>
              {showUserInfo && (
                <>
                  <th className="px-4 py-3 text-left font-semibold text-secondary-500">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-secondary-500">Role</th>
                </>
              )}
              <th className="px-4 py-3 text-left font-semibold text-secondary-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((ticket) => {
              const status = statusConfig[ticket.status];
              const priority = priorityConfig[ticket.priority];
              const category = categoryConfig[ticket.category];

              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-secondary-500 line-clamp-1">
                      {ticket.subject}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${category.className}`}>
                      {category.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.className}`}>
                      {priority.label}
                    </span>
                  </td>
                  {showUserInfo && (
                    <>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                        {ticket.user_email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ticket.user_role === 'vendor'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ticket.user_role}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(ticket.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
