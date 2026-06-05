'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import {
  Users, Pencil, Trash2, Loader2, Save, X, KeyRound,
  AlertCircle, CheckCircle2, UserPlus, ScanLine, ShieldCheck,
} from 'lucide-react';
import { startKiosk } from '@/lib/redeem-members/kiosk';

interface RedeemMember {
  id: string;
  name: string;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function RedeemMembersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const [members, setMembers] = useState<RedeemMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasAccess = canAccess('team_access');

  useEffect(() => {
    if (!user) return;
    fetchMembers().then(() => setLoading(false));
  }, [user]);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/vendor/redeem-members');
      const data = await res.json();
      setMembers(data.members || []);
    } catch { /* ignore */ }
  }

  const resetForm = () => { setShowForm(false); setEditingId(null); setName(''); setPin(''); setPin2(''); };

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSave = async () => {
    if (!name.trim()) return flash('error', 'Enter a name.');
    // PIN required when creating; optional (leave blank to keep) when editing.
    const changingPin = pin.length > 0 || !editingId;
    if (changingPin) {
      if (!/^\d{4}$/.test(pin)) return flash('error', 'PIN must be exactly 4 digits.');
      if (pin !== pin2) return flash('error', 'PINs do not match.');
    }
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/redeem-members', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: name.trim(),
          ...(changingPin ? { pin } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        flash('success', editingId ? 'Member updated.' : 'Redeem member added.');
        resetForm();
        fetchMembers();
      } else {
        flash('error', data.error || 'Could not save.');
      }
    } catch {
      flash('error', 'Network error. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this redeem member?')) return;
    try {
      const res = await fetch(`/api/vendor/redeem-members?id=${id}`, { method: 'DELETE' });
      if (res.ok) { setMembers((prev) => prev.filter((m) => m.id !== id)); flash('success', 'Member removed.'); }
    } catch { flash('error', 'Could not remove member.'); }
  };

  const startEdit = (m: RedeemMember) => {
    setEditingId(m.id); setShowForm(true); setName(m.name); setPin(''); setPin2('');
  };

  const startRedeemMode = () => {
    startKiosk();
    router.push('/vendor/redeem');
  };

  if (loading || tierLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (!hasAccess) {
    return (
      <UpgradePrompt
        requiredTier="business"
        featureName="Redeem Members"
        description="Add named staff who can redeem coupons (and award loyalty) using a 4-digit PIN on your device — without access to the rest of your dashboard."
        mode="full-page"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Redeem Members</h1>
            <p className="text-gray-500 text-sm">Staff who can redeem coupons with a PIN — nothing else.</p>
          </div>
        </div>
        {members.some((m) => m.active) && (
          <button
            onClick={startRedeemMode}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-orange-500 hover:from-primary-600 hover:to-orange-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-primary-200/50 transition-all"
          >
            <ScanLine className="w-4 h-4" /> Start Redeem Mode
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Tap <span className="font-semibold">Start Redeem Mode</span> to lock this device to a redeem-only screen.
          Staff pick their name and enter their PIN to redeem coupons (loyalty is awarded automatically).
          Exiting requires your account password.
        </p>
      </div>

      {/* Add / Edit form */}
      {showForm ? (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">{editingId ? 'Edit Member' : 'Add Redeem Member'}</h3>
            <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Maria" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingId ? 'New PIN (optional)' : '4-digit PIN'}
                </label>
                <input
                  value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric" type="password" autoComplete="off"
                  className="input-field tracking-[0.5em] text-center" placeholder="••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                <input
                  value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric" type="password" autoComplete="off"
                  className="input-field tracking-[0.5em] text-center" placeholder="••••"
                />
              </div>
            </div>
            {editingId && <p className="text-xs text-gray-400">Leave PIN blank to keep the current one.</p>}
            <button
              onClick={handleSave} disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full mb-6 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors inline-flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add Redeem Member
        </button>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <div className="card p-10 text-center">
          <KeyRound className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No redeem members yet</p>
          <p className="text-sm text-gray-400 mt-1">Add staff so they can redeem coupons with a PIN.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary-600">{m.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-400">
                  PIN ••••{m.last_used_at ? ` · last used ${new Date(m.last_used_at).toLocaleDateString()}` : ' · never used'}
                </p>
              </div>
              <button onClick={() => startEdit(m)} className="p-2 text-gray-400 hover:text-primary-500" title="Edit"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(m.id)} className="p-2 text-gray-400 hover:text-red-500" title="Remove"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
