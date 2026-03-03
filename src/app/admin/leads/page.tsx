'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  MapPin, Phone, Globe, Star, Download, Search,
  Plus, Trash2, Loader2, ExternalLink, Target,
  CheckCircle2, Users, TrendingUp, UserCheck,
} from 'lucide-react';

type LeadStatus =
  | 'not_contacted'
  | 'contacted'
  | 'interested'
  | 'signed_up'
  | 'not_interested';

interface SearchResult {
  place_id: string;
  business_name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number;
  city: string;
  state: string;
  category: string;
}

interface VendorLead {
  id: string;
  business_name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  place_id: string | null;
  on_groupon: boolean;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  'Restaurants',
  'Spas & Salons',
  'Gyms & Fitness',
  'Entertainment',
  'Auto Services',
  'Retail Shops',
  'Medical & Dental',
  'Real Estate',
  'Hotels & Resorts',
  'Tour & Activities',
];

const STATUS_CONFIG: Record<LeadStatus, { label: string; bg: string; text: string }> = {
  not_contacted:  { label: 'Not Contacted',  bg: 'bg-gray-100',   text: 'text-gray-700'  },
  contacted:      { label: 'Contacted',       bg: 'bg-blue-100',   text: 'text-blue-700'  },
  interested:     { label: 'Interested',      bg: 'bg-amber-100',  text: 'text-amber-700' },
  signed_up:      { label: 'Signed Up',       bg: 'bg-green-100',  text: 'text-green-700' },
  not_interested: { label: 'Not Interested',  bg: 'bg-red-100',    text: 'text-red-700'   },
};

export default function AdminLeadsPage() {
  const { user, role, loading: authLoading } = useAuth();

  // Search state
  const [category, setCategory]         = useState('Restaurants');
  const [location, setLocation]         = useState('Orlando, FL');
  const [searching, setSearching]       = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [nextOffset, setNextOffset]     = useState<number | null>(null);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [searchError, setSearchError]   = useState<string | null>(null);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());

  // Saved leads state
  const [leads, setLeads]               = useState<VendorLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [savingId, setSavingId]         = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load saved leads
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leads');
      const data = await res.json();
      const fetched: VendorLead[] = data.leads || [];
      setLeads(fetched);
      setSavedPlaceIds(new Set(
        fetched.filter((l) => l.place_id).map((l) => l.place_id as string)
      ));
    } catch {
      showToast('Failed to load saved leads', 'error');
    } finally {
      setLeadsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchLeads();
  }, [user, role, fetchLeads]);

  // Search
  const handleSearch = async () => {
    if (!category || !location.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setNextOffset(null);
    try {
      const params = new URLSearchParams({ category, location: location.trim(), offset: '0' });
      const res  = await fetch(`/api/admin/leads/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setSearchResults(data.results || []);
      setNextOffset(data.next_offset ?? null);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Load more results using offset pagination
  const handleLoadMore = async () => {
    if (nextOffset === null) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ category, location, offset: String(nextOffset) });
      const res  = await fetch(`/api/admin/leads/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load more');
      setSearchResults((prev) => [...prev, ...(data.results || [])]);
      setNextOffset(data.next_offset ?? null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load more', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Save a search result as a lead
  const handleSaveLead = async (result: SearchResult) => {
    setSavingId(result.place_id);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (res.status === 409) { showToast('Already saved', 'error'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      showToast('Lead saved!', 'success');
      setSavedPlaceIds((prev) => new Set([...prev, result.place_id]));
      setLeads((prev) => [data.lead, ...prev]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Update status / on_groupon / notes
  const handleUpdateLead = async (id: string, fields: Partial<VendorLead>) => {
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data.lead } : l));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  // Delete a lead
  const handleDeleteLead = async (id: string, placeId: string | null) => {
    if (!confirm('Delete this lead?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (placeId) {
        setSavedPlaceIds((prev) => { const s = new Set(prev); s.delete(placeId); return s; });
      }
      showToast('Lead removed', 'success');
    } catch {
      showToast('Failed to delete lead', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => window.open('/api/admin/leads/export', '_blank');

  const handleGrouponCheck = (result: SearchResult) => {
    const q = encodeURIComponent(`${result.business_name} ${result.city} groupon`);
    window.open(`https://www.google.com/search?q=${q}`, '_blank');
  };

  const stats = {
    total:      leads.length,
    contacted:  leads.filter((l) => l.status === 'contacted').length,
    interested: leads.filter((l) => l.status === 'interested').length,
    signed_up:  leads.filter((l) => l.status === 'signed_up').length,
  };

  if (authLoading || leadsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Leads</h1>
            <p className="text-sm text-gray-500">Find and track local businesses to pitch SpontiCoupon</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={leads.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-40"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Total Leads</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500">Contacted</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.contacted}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500">Interested</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.interested}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500">Signed Up</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.signed_up}</p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Find Businesses</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="City, State (e.g. Orlando, FL)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !location.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-[120px]"
          >
            {searching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
            ) : (
              <><Search className="w-4 h-4" /> Search</>
            )}
          </button>
        </div>
        {searchError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{searchError}</p>
        )}
        {searchResults.length > 0 && !searching && (
          <p className="mt-3 text-xs text-gray-500">
            Found <span className="font-semibold text-gray-700">{searchResults.length}</span> businesses
            {nextOffset !== null ? ' — more available below' : ''}
          </p>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Search Results
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {searchResults.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {searchResults.map((result) => {
              const isSaved   = savedPlaceIds.has(result.place_id);
              const isSaving  = savingId === result.place_id;
              return (
                <div key={result.place_id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{result.business_name}</h3>
                    {result.rating && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-600">{result.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({result.review_count})</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 mb-3">
                    {result.address && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                        <span>{result.address}</span>
                      </div>
                    )}
                    {result.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <a href={`tel:${result.phone}`} className="hover:text-orange-600 transition-colors">{result.phone}</a>
                      </div>
                    )}
                    {result.website && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Globe className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <a href={result.website} target="_blank" rel="noopener noreferrer"
                          className="hover:text-orange-600 transition-colors truncate max-w-[200px]">
                          {result.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGrouponCheck(result)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Check Groupon
                    </button>
                    <div className="flex-1" />
                    {isSaved ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSaveLead(result)}
                        disabled={isSaving}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Save Lead
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {nextOffset !== null && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full mt-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading more results...</>
              ) : (
                'Load More Results'
              )}
            </button>
          )}
        </div>
      )}

      {/* Saved Leads Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Saved Leads
            {leads.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {leads.length}
              </span>
            )}
          </h2>
          {leads.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No leads saved yet. Search for businesses above and click Save Lead.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Groupon</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => {
                  const statusCfg = STATUS_CONFIG[lead.status];
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Business */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{lead.business_name}</p>
                        {lead.category && (
                          <span className="text-xs text-gray-400">{lead.category}</span>
                        )}
                        {lead.rating && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-gray-500">{lead.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{lead.city}{lead.state ? `, ${lead.state}` : ''}</p>
                        {lead.address && (
                          <p className="text-xs text-gray-400 max-w-[160px] truncate" title={lead.address}>{lead.address}</p>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-orange-600 transition-colors mb-1">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </a>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors">
                            <Globe className="w-3 h-3" />
                            <span className="max-w-[120px] truncate">
                              {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </span>
                          </a>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLead(lead.id, { status: e.target.value as LeadStatus })}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer appearance-none ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                            <option key={val} value={val}>{cfg.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Groupon toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleUpdateLead(lead.id, { on_groupon: !lead.on_groupon })}
                          className={`text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                            lead.on_groupon
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {lead.on_groupon ? 'Yes' : 'No'}
                        </button>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editingNotes[lead.id] ?? (lead.notes || '')}
                          onChange={(e) => setEditingNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                          onBlur={() => {
                            const val = editingNotes[lead.id];
                            if (val !== undefined && val !== (lead.notes || '')) {
                              handleUpdateLead(lead.id, { notes: val });
                            }
                          }}
                          placeholder="Add notes..."
                          className="w-full min-w-[140px] text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteLead(lead.id, lead.place_id)}
                          disabled={deletingId === lead.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
                          title="Delete lead"
                        >
                          {deletingId === lead.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
