'use client';

import { useState, useEffect } from 'react';
import { Brain, Plus, Pencil, Trash2, X, Save, Loader2, BookOpen, Search, Store } from 'lucide-react';

interface KBEntry {
  id: string;
  vendor_id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
  updated_at: string;
  vendors?: { business_name: string } | null;
}

const CATEGORIES = ['General', 'Hours & Location', 'Products & Services', 'Pricing', 'Policies', 'FAQ'];

export default function AdminKnowledgeBasePage() {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('General');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [filterVendor, setFilterVendor] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/admin/knowledge-base');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load knowledge base entries.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const resetForm = () => {
    setQuestion('');
    setAnswer('');
    setCategory('General');
    setSelectedVendorId('');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (entry: KBEntry) => {
    setQuestion(entry.question);
    setAnswer(entry.answer);
    setCategory(entry.category);
    setSelectedVendorId(entry.vendor_id);
    setEditingId(entry.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      setMessage({ type: 'error', text: 'Both question and answer are required.' });
      return;
    }

    if (!editingId && !selectedVendorId) {
      setMessage({ type: 'error', text: 'Please select a vendor.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const isEdit = !!editingId;
      const res = await fetch('/api/admin/knowledge-base', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingId } : { vendorId: selectedVendorId }),
          question: question.trim(),
          answer: answer.trim(),
          category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: isEdit ? 'Entry updated!' : 'Entry added!' });
      resetForm();
      fetchEntries();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save entry.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge base entry?')) return;

    try {
      const res = await fetch(`/api/admin/knowledge-base?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setMessage({ type: 'success', text: 'Entry deleted.' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete entry.' });
    }
  };

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    const matchesVendor = filterVendor === 'All' || e.vendor_id === filterVendor;
    const matchesSearch = !searchQuery ||
      e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVendor && matchesSearch;
  });

  // Get unique vendors from entries for filter
  const vendorOptions = Array.from(
    new Map(
      entries
        .filter((e) => e.vendors?.business_name)
        .map((e) => [e.vendor_id, e.vendors!.business_name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary-500" />
            Knowledge Base
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage Mia&apos;s knowledge base entries for all vendors.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        )}
      </div>

      {/* Toast message */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-gray-900">
              {editingId ? 'Edit Entry' : 'New Entry'}
            </h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  className="input-field"
                  placeholder="Enter vendor ID"
                  list="vendor-list"
                />
                {vendorOptions.length > 0 && (
                  <datalist id="vendor-list">
                    {vendorOptions.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </datalist>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="input-field"
                placeholder="e.g., What are your business hours?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="input-field"
                rows={3}
                placeholder="e.g., We're open Monday to Friday, 9am to 6pm."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-2.5 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
            placeholder="Search questions and answers..."
          />
        </div>
        <select
          value={filterVendor}
          onChange={(e) => setFilterVendor(e.target.value)}
          className="input-field sm:w-56"
        >
          <option value="All">All Vendors</option>
          {vendorOptions.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm text-gray-500">
        <span>{entries.length} total entries</span>
        <span>{vendorOptions.length} vendors</span>
        {filteredEntries.length !== entries.length && (
          <span>{filteredEntries.length} shown</span>
        )}
      </div>

      {/* Entries list */}
      {filteredEntries.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">
            {entries.length === 0 ? 'No entries yet' : 'No matching entries'}
          </h3>
          <p className="text-gray-400 text-sm">
            {entries.length === 0
              ? 'Knowledge base entries will appear here once vendors add them.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="card p-4 sm:p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary-50 text-secondary-600 font-medium border border-secondary-100 inline-flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      {entry.vendors?.business_name || 'Unknown vendor'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-medium border border-primary-100">
                      {entry.category}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{entry.question}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{entry.answer}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(entry)}
                    className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
