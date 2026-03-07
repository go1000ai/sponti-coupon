'use client';

import { useState, useEffect, useCallback } from 'react';
import { UsersRound, Mail, Phone, Building2, Clock, Trash2, ExternalLink, Check } from 'lucide-react';

interface Prospect {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  business_name: string | null;
  source: string;
  notes: string | null;
  status: string;
  ghl_synced: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  converted: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-gray-100 text-gray-500',
};

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function AdminProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchProspects = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/prospects');
      const data = await res.json();
      setProspects(data.prospects || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/prospects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const deleteProspect = async (id: string) => {
    if (!confirm('Delete this prospect?')) return;
    await fetch('/api/admin/prospects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setProspects(prev => prev.filter(p => p.id !== id));
  };

  const filtered = filter === 'all' ? prospects : prospects.filter(p => p.status === filter);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = prospects.filter(p => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-primary-500" />
            Prospect Leads
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Captured by Olivia from visitors who showed interest but haven&apos;t signed up yet.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {prospects.length} total
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({prospects.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
              filter === s ? 'bg-gray-900 text-white' : `${STATUS_COLORS[s]} hover:opacity-80`
            }`}
          >
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading prospects...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <UsersRound className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No prospects yet. Olivia will capture them as visitors chat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{p.name || 'Unknown'}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${STATUS_COLORS[p.status]}`}>
                      {p.status}
                    </span>
                    {p.ghl_synced && (
                      <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                        <Check className="w-3 h-3" /> GHL
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {p.source.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {p.email}
                    </span>
                    {p.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {p.phone}
                      </span>
                    )}
                    {p.business_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" /> {p.business_name}
                      </span>
                    )}
                  </div>
                  {p.notes && (
                    <p className="text-xs text-gray-500 mt-1.5 italic">{p.notes}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={p.status}
                    onChange={e => updateStatus(p.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <a
                    href={`mailto:${p.email}`}
                    className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors"
                    title="Send email"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => deleteProspect(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
