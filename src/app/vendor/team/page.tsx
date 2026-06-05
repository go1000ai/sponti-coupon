'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import {
  Users, Pencil, Trash2, Loader2, Save, X, KeyRound, Smartphone, Monitor,
  AlertCircle, CheckCircle2, UserPlus, ScanLine, ShieldCheck, LogIn, Power,
} from 'lucide-react';
import type { WorkerPermissions } from '@/lib/types/database';
import { startKiosk } from '@/lib/redeem-members/kiosk';

interface Worker {
  id: string;
  name: string;
  email: string;
  permissions: WorkerPermissions;
  status: 'active' | 'disabled';
  created_at: string;
}
interface RedeemMember {
  id: string;
  name: string;
  active: boolean;
  last_used_at: string | null;
}

const FEATURES: { key: keyof WorkerPermissions; label: string; desc: string }[] = [
  { key: 'loyalty', label: 'Manage loyalty', desc: 'Adjust loyalty programs & points' },
  { key: 'deals', label: 'Create & edit deals', desc: 'Make and edit deals' },
  { key: 'analytics', label: 'Analytics & revenue', desc: 'View sales & reports' },
  { key: 'appointments', label: 'Appointments', desc: 'Confirm/cancel bookings' },
];

const emptyPerms: WorkerPermissions = { redeem: true, loyalty: false, deals: false, analytics: false, appointments: false };

export default function MembersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const hasAccess = canAccess('team_access');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Worker accounts
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showWorkerForm, setShowWorkerForm] = useState(false);
  const [editWorkerId, setEditWorkerId] = useState<string | null>(null);
  const [wName, setWName] = useState('');
  const [wEmail, setWEmail] = useState('');
  const [wPassword, setWPassword] = useState('');
  const [wPerms, setWPerms] = useState<WorkerPermissions>(emptyPerms);
  const [savingWorker, setSavingWorker] = useState(false);

  // Counter PIN members
  const [members, setMembers] = useState<RedeemMember[]>([]);
  const [showPinForm, setShowPinForm] = useState(false);
  const [editPinId, setEditPinId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/vendor/workers').then((r) => r.json()).then((d) => setWorkers(d.workers || [])).catch(() => {}),
      fetch('/api/vendor/redeem-members').then((r) => r.json()).then((d) => setMembers(d.members || [])).catch(() => {}),
    ]).then(() => setLoading(false));
  }, [user]);

  const flash = (type: 'success' | 'error', text: string) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 3500); };

  // ── Workers ──
  const resetWorkerForm = () => { setShowWorkerForm(false); setEditWorkerId(null); setWName(''); setWEmail(''); setWPassword(''); setWPerms(emptyPerms); };

  const saveWorker = async () => {
    if (!wName.trim()) return flash('error', 'Enter a name.');
    if (!editWorkerId && (!wEmail.trim() || wPassword.length < 8)) return flash('error', 'Email and a password (8+ chars) are required.');
    if (editWorkerId && wPassword && wPassword.length < 8) return flash('error', 'New password must be 8+ characters.');
    setSavingWorker(true);
    try {
      const res = await fetch('/api/vendor/workers', {
        method: editWorkerId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editWorkerId
          ? { id: editWorkerId, name: wName.trim(), permissions: wPerms, ...(wPassword ? { password: wPassword } : {}) }
          : { name: wName.trim(), email: wEmail.trim(), password: wPassword, permissions: wPerms }),
      });
      const data = await res.json();
      if (res.ok) {
        flash('success', editWorkerId ? 'Worker updated.' : 'Worker account created.');
        resetWorkerForm();
        const d = await fetch('/api/vendor/workers').then((r) => r.json());
        setWorkers(d.workers || []);
      } else flash('error', data.error || 'Could not save worker.');
    } catch { flash('error', 'Network error.'); }
    setSavingWorker(false);
  };

  const editWorker = (w: Worker) => {
    setEditWorkerId(w.id); setShowWorkerForm(true); setWName(w.name); setWEmail(w.email); setWPassword('');
    setWPerms({ ...emptyPerms, ...w.permissions, redeem: true });
  };

  const toggleWorkerStatus = async (w: Worker) => {
    const status = w.status === 'active' ? 'disabled' : 'active';
    const res = await fetch('/api/vendor/workers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id, status }) });
    if (res.ok) setWorkers((prev) => prev.map((x) => x.id === w.id ? { ...x, status } : x));
  };

  const deleteWorker = async (id: string) => {
    if (!confirm('Delete this worker login? They will no longer be able to sign in.')) return;
    const res = await fetch(`/api/vendor/workers?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setWorkers((prev) => prev.filter((w) => w.id !== id)); flash('success', 'Worker removed.'); }
  };

  // ── Counter PINs ──
  const resetPinForm = () => { setShowPinForm(false); setEditPinId(null); setPName(''); setPin(''); setPin2(''); };

  const savePin = async () => {
    if (!pName.trim()) return flash('error', 'Enter a name.');
    const changing = pin.length > 0 || !editPinId;
    if (changing) {
      if (!/^\d{4}$/.test(pin)) return flash('error', 'PIN must be 4 digits.');
      if (pin !== pin2) return flash('error', 'PINs do not match.');
    }
    setSavingPin(true);
    try {
      const res = await fetch('/api/vendor/redeem-members', {
        method: editPinId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(editPinId ? { id: editPinId } : {}), name: pName.trim(), ...(changing ? { pin } : {}) }),
      });
      const data = await res.json();
      if (res.ok) {
        flash('success', editPinId ? 'PIN member updated.' : 'PIN member added.');
        resetPinForm();
        const d = await fetch('/api/vendor/redeem-members').then((r) => r.json());
        setMembers(d.members || []);
      } else flash('error', data.error || 'Could not save.');
    } catch { flash('error', 'Network error.'); }
    setSavingPin(false);
  };

  const deletePin = async (id: string) => {
    if (!confirm('Remove this PIN member?')) return;
    const res = await fetch(`/api/vendor/redeem-members?id=${id}`, { method: 'DELETE' });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const startRedeemMode = () => { startKiosk(); router.push('/vendor/redeem'); };

  if (loading || tierLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  if (!hasAccess) {
    return (
      <UpgradePrompt
        requiredTier="business"
        featureName="Team Members"
        description="Add staff who can redeem coupons (and more) — either with their own login on any device, or a quick 4-digit PIN on your counter device."
        mode="full-page"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><Users className="w-5 h-5 text-primary-500" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500 text-sm">Let staff redeem coupons — pick the method that fits your setup.</p>
        </div>
      </div>

      {message && (
        <div className={`my-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}
        </div>
      )}

      {/* ── Explanation: two options ── */}
      <div className="grid md:grid-cols-2 gap-4 my-5">
        <div className="rounded-xl border-2 border-primary-100 bg-primary-50/30 p-4">
          <div className="flex items-center gap-2 mb-1.5"><Smartphone className="w-5 h-5 text-primary-500" /><h3 className="font-bold text-gray-900">Worker Login</h3></div>
          <p className="text-sm text-gray-600 mb-2">Staff get their <span className="font-semibold">own email & password</span> and sign in on <span className="font-semibold">any device</span> (their phone or yours). You choose exactly which features they can use. Their access never depends on you staying logged in.</p>
          <p className="text-xs text-gray-500"><span className="font-semibold">Best when:</span> staff use their own phones, or you want per-person control & accountability.</p>
        </div>
        <div className="rounded-xl border-2 border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2 mb-1.5"><Monitor className="w-5 h-5 text-gray-500" /><h3 className="font-bold text-gray-900">Counter PIN</h3></div>
          <p className="text-sm text-gray-600 mb-2">On a <span className="font-semibold">shared device at your counter</span> (already logged into your account), staff tap their name and enter a <span className="font-semibold">4-digit PIN</span>. No separate logins. The device stays signed in until you exit redeem mode.</p>
          <p className="text-xs text-gray-500"><span className="font-semibold">Best when:</span> one tablet/computer at the front desk, shared by the team.</p>
        </div>
      </div>

      {/* ════ WORKER LOGINS ════ */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><LogIn className="w-4 h-4 text-primary-500" /> Worker Logins</h2>
        </div>

        {showWorkerForm ? (
          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editWorkerId ? 'Edit Worker' : 'New Worker Login'}</h3>
              <button onClick={resetWorkerForm} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input value={wName} onChange={(e) => setWName(e.target.value)} className="input-field" placeholder="e.g. Maria Lopez" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email {editWorkerId && <span className="text-gray-400">(can&apos;t change)</span>}</label>
                  <input value={wEmail} onChange={(e) => setWEmail(e.target.value)} disabled={!!editWorkerId} className="input-field disabled:bg-gray-50 disabled:text-gray-400" placeholder="maria@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editWorkerId ? 'Reset password (optional)' : 'Temporary password'}</label>
                <input value={wPassword} onChange={(e) => setWPassword(e.target.value)} type="text" className="input-field" placeholder="At least 8 characters" />
                <p className="text-xs text-gray-400 mt-1">You set this and give it to the worker; they can change it later.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">What can they do?</p>
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-500"><ShieldCheck className="w-4 h-4 text-green-500" /> Redeem coupons <span className="text-xs">(always on — loyalty is awarded automatically)</span></div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {FEATURES.map((f) => (
                    <label key={f.key} className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${wPerms[f.key] ? 'border-primary-300 bg-primary-50/40' : 'border-gray-200'}`}>
                      <input type="checkbox" checked={wPerms[f.key]} onChange={(e) => setWPerms((p) => ({ ...p, [f.key]: e.target.checked }))} className="mt-0.5 w-4 h-4 text-primary-500 rounded" />
                      <span><span className="block text-sm font-medium text-gray-800">{f.label}</span><span className="block text-xs text-gray-400">{f.desc}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={saveWorker} disabled={savingWorker} className="btn-primary w-full flex items-center justify-center gap-2">
                {savingWorker ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editWorkerId ? 'Save Changes' : 'Create Worker'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => { resetWorkerForm(); setShowWorkerForm(true); }} className="w-full mb-4 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors inline-flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Worker Login
          </button>
        )}

        {workers.length > 0 && (
          <div className="space-y-2">
            {workers.map((w) => {
              const granted = FEATURES.filter((f) => w.permissions?.[f.key]).map((f) => f.label);
              return (
                <div key={w.id} className={`card p-4 flex items-center gap-3 ${w.status === 'disabled' ? 'opacity-60' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0"><span className="text-sm font-bold text-primary-600">{w.name.charAt(0).toUpperCase()}</span></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{w.name} {w.status === 'disabled' && <span className="text-xs text-gray-400">(disabled)</span>}</p>
                    <p className="text-xs text-gray-400 truncate">{w.email}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Redeem{granted.length ? ` · ${granted.join(' · ')}` : ' only'}</p>
                  </div>
                  <button onClick={() => toggleWorkerStatus(w)} className="p-2 text-gray-400 hover:text-amber-500" title={w.status === 'active' ? 'Disable' : 'Enable'}><Power className="w-4 h-4" /></button>
                  <button onClick={() => editWorker(w)} className="p-2 text-gray-400 hover:text-primary-500" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteWorker(w.id)} className="p-2 text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ════ COUNTER PINS ════ */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><KeyRound className="w-4 h-4 text-gray-500" /> Counter PINs</h2>
          {members.some((m) => m.active) && (
            <button onClick={startRedeemMode} className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-orange-500 hover:from-primary-600 hover:to-orange-600 text-white font-bold px-4 py-2 rounded-xl shadow-lg shadow-primary-200/50 transition-all text-sm">
              <ScanLine className="w-4 h-4" /> Start Redeem Mode
            </button>
          )}
        </div>

        {showPinForm ? (
          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editPinId ? 'Edit PIN Member' : 'Add PIN Member'}</h3>
              <button onClick={resetPinForm} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input value={pName} onChange={(e) => setPName(e.target.value)} className="input-field" placeholder="e.g. Jose" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{editPinId ? 'New PIN (optional)' : '4-digit PIN'}</label><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" className="input-field tracking-[0.5em] text-center" placeholder="••••" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label><input value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" className="input-field tracking-[0.5em] text-center" placeholder="••••" /></div>
              </div>
              <button onClick={savePin} disabled={savingPin} className="btn-primary w-full flex items-center justify-center gap-2">{savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{editPinId ? 'Save' : 'Add PIN Member'}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { resetPinForm(); setShowPinForm(true); }} className="w-full mb-4 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors inline-flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" /> Add PIN Member
          </button>
        )}

        {members.length > 0 && (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><span className="text-sm font-bold text-gray-600">{m.name.charAt(0).toUpperCase()}</span></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p><p className="text-xs text-gray-400">PIN ••••{m.last_used_at ? ` · last used ${new Date(m.last_used_at).toLocaleDateString()}` : ''}</p></div>
                <button onClick={() => { setEditPinId(m.id); setShowPinForm(true); setPName(m.name); setPin(''); setPin2(''); }} className="p-2 text-gray-400 hover:text-primary-500"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => deletePin(m.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
