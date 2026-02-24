'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import {
  MapPin, Plus, Pencil, Trash2, Loader2, Save, X,
  Building2, Phone, AlertCircle, CheckCircle2,
} from 'lucide-react';
import type { VendorLocation } from '@/lib/types/database';

interface LocationForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const emptyForm: LocationForm = { name: '', address: '', city: '', state: '', zip: '', phone: '' };

export default function LocationsPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasAccess = canAccess('multi_location');

  useEffect(() => {
    if (!user) return;
    fetchLocations();
  }, [user]);

  async function fetchLocations() {
    try {
      const res = await fetch('/api/vendor/locations');
      const data = await res.json();
      setLocations(data.locations || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAdd = async () => {
    if (!form.name || !form.address || !form.city || !form.state || !form.zip) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vendor/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setLocations(prev => [...prev, data.location]);
        setForm(emptyForm);
        setShowAddForm(false);
        setMessage({ type: 'success', text: 'Location added!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to add location.' });
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vendor/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setLocations(prev => prev.map(l => l.id === editingId ? data.location : l));
        setEditingId(null);
        setForm(emptyForm);
        setMessage({ type: 'success', text: 'Location updated!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update location.' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/vendor/locations?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLocations(prev => prev.filter(l => l.id !== id));
        setMessage({ type: 'success', text: 'Location deleted.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete location.' });
    }
  };

  const startEdit = (loc: VendorLocation) => {
    setEditingId(loc.id);
    setShowAddForm(false);
    setForm({
      name: loc.name,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      phone: loc.phone || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setForm(emptyForm);
  };

  if (tierLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <UpgradePrompt
        requiredTier="business"
        featureName="Multi-Location Support"
        description="Manage multiple business locations, assign deals per location, and track performance by location."
        mode="full-page"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MapPin className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-3xl font-bold text-secondary-500">Locations</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your business locations</p>
          </div>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); setForm(emptyForm); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="card p-6 mb-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-500">{editingId ? 'Edit Location' : 'New Location'}</h3>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="e.g., Downtown Branch" required />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
              <input name="address" value={form.address} onChange={handleChange} className="input-field" placeholder="123 Main Street" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input name="city" value={form.city} onChange={handleChange} className="input-field" placeholder="City" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input name="state" value={form.state} onChange={handleChange} className="input-field" placeholder="FL" required maxLength={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                <input name="zip" value={form.zip} onChange={handleChange} className="input-field" placeholder="33101" required />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="input-field" placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={cancelEdit} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Update' : 'Add Location'}
            </button>
          </div>
        </div>
      )}

      {/* Locations List */}
      {locations.length === 0 && !showAddForm ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">No Locations Yet</h3>
          <p className="text-sm text-gray-400 mb-4">Add your business locations to manage deals per location.</p>
          <button
            onClick={() => { setShowAddForm(true); setForm(emptyForm); }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Your First Location
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map((loc) => (
            <div key={loc.id} className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="bg-primary-50 rounded-xl p-3">
                  <MapPin className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-500">{loc.name}</h3>
                  <p className="text-sm text-gray-500">{loc.address}, {loc.city}, {loc.state} {loc.zip}</p>
                  {loc.phone && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {loc.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(loc)} className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(loc.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
