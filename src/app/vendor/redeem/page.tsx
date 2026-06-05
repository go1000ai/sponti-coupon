'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScanLine, Delete, Loader2, CheckCircle2, XCircle, LogOut, UserCog,
  Star, Sparkles, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  getActiveMember, setActiveMember, clearKiosk, isKioskActive,
  type ActiveMember,
} from '@/lib/redeem-members/kiosk';

interface Member { id: string; name: string; active: boolean; }
interface LoyaltyAward { program_name: string; earned: string; current: string; }
interface RedeemResult {
  success: boolean;
  error?: string;
  customer?: { name: string; email: string };
  deal?: { title: string; deal_price: number; original_price: number };
  loyalty_awards?: LoyaltyAward[];
  remaining_balance?: number;
}

export default function RedeemKioskPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [active, setActive] = useState<ActiveMember | null>(null);
  const [picking, setPicking] = useState<Member | null>(null); // member awaiting PIN
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Redeem console
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  // Exit modal
  const [showExit, setShowExit] = useState(false);
  const [exitPw, setExitPw] = useState('');
  const [exitError, setExitError] = useState('');
  const [exiting, setExiting] = useState(false);

  useEffect(() => { setActive(getActiveMember()); }, []);

  useEffect(() => {
    fetch('/api/vendor/redeem-members')
      .then((r) => r.json())
      .then((d) => setMembers((d.members || []).filter((m: Member) => m.active)))
      .catch(() => {});
  }, []);

  // ── PIN entry ──
  const submitPin = useCallback(async (member: Member, value: string) => {
    setVerifying(true);
    setPinError('');
    try {
      const res = await fetch('/api/vendor/redeem-members/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id, pin: value }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const m = { id: data.member.id, name: data.member.name };
        setActiveMember(m);
        setActive(m);
        setPicking(null);
        setPin('');
      } else {
        setPinError(data.error || 'Incorrect PIN');
        setPin('');
      }
    } catch {
      setPinError('Network error');
      setPin('');
    }
    setVerifying(false);
  }, []);

  const pressDigit = (d: string) => {
    if (!picking || verifying) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setPinError('');
    if (next.length === 4) submitPin(picking, next);
  };

  const switchUser = () => {
    setActiveMember(null);
    setActive(null);
    setResult(null);
    setCode('');
    setPin('');
    setPicking(null);
  };

  // ── Redeem ──
  const doRedeem = async () => {
    if (code.length !== 6) return;
    setRedeeming(true);
    setResult(null);
    try {
      const res = await fetch(`/api/redeem/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redeem_member_id: active?.id }),
      });
      const data = await res.json();
      setResult(res.ok ? { success: true, ...data } : { success: false, error: data.error || 'Redemption failed' });
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    }
    setRedeeming(false);
  };

  const resetRedeem = () => { setCode(''); setResult(null); };

  // ── Exit kiosk (owner password) ──
  const confirmExit = async () => {
    setExiting(true);
    setExitError('');
    try {
      const res = await fetch('/api/vendor/verify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: exitPw }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        clearKiosk();
        router.replace('/vendor/dashboard');
      } else {
        setExitError(data.error || 'Incorrect password');
      }
    } catch {
      setExitError('Network error');
    }
    setExiting(false);
  };

  const kioskOn = typeof window !== 'undefined' && isKioskActive();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-900 text-white">
        <div className="flex items-center gap-2 font-bold">
          <ScanLine className="w-5 h-5 text-primary-400" /> Redeem Mode
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <>
              <span className="text-sm text-white/70 hidden sm:inline">Signed in: <span className="font-semibold text-white">{active.name}</span></span>
              <button onClick={switchUser} className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                <UserCog className="w-3.5 h-3.5" /> Switch
              </button>
            </>
          )}
          {kioskOn && (
            <button onClick={() => { setShowExit(true); setExitPw(''); setExitError(''); }} className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Exit
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md">
          {/* ── No active member: pick + PIN ── */}
          {!active ? (
            !picking ? (
              <div className="card p-6">
                <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Who&apos;s redeeming?</h1>
                <p className="text-sm text-gray-500 text-center mb-5">Select your name to continue.</p>
                {members.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6">No redeem members set up yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setPicking(m); setPin(''); setPinError(''); }}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50/40 transition-all"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary-600">{m.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-6">
                <button onClick={() => { setPicking(null); setPin(''); setPinError(''); }} className="text-sm text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 mb-3">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h1 className="text-xl font-bold text-gray-900 text-center">Enter PIN</h1>
                <p className="text-sm text-gray-500 text-center mb-5">{picking.name}</p>

                {/* PIN dots */}
                <div className="flex justify-center gap-3 mb-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-colors ${i < pin.length ? 'bg-primary-500' : 'bg-gray-200'}`} />
                  ))}
                </div>
                <div className="h-5 text-center mb-3">
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 inline" /> : pinError && <span className="text-xs text-red-500 font-medium">{pinError}</span>}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2.5">
                  {['1','2','3','4','5','6','7','8','9'].map((d) => (
                    <button key={d} onClick={() => pressDigit(d)} disabled={verifying}
                      className="py-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-2xl font-bold text-gray-800 transition-colors disabled:opacity-50">
                      {d}
                    </button>
                  ))}
                  <div />
                  <button onClick={() => pressDigit('0')} disabled={verifying}
                    className="py-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-2xl font-bold text-gray-800 transition-colors disabled:opacity-50">0</button>
                  <button onClick={() => { setPin((p) => p.slice(0, -1)); setPinError(''); }} disabled={verifying}
                    className="py-4 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors disabled:opacity-50">
                    <Delete className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )
          ) : result ? (
            /* ── Redeem result ── */
            <div className="card p-6 text-center">
              {result.success ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-9 h-9 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Redeemed!</h2>
                  {result.deal && <p className="text-sm text-gray-600 mt-1">{result.deal.title}</p>}
                  {result.customer?.name && <p className="text-xs text-gray-400 mt-0.5">{result.customer.name}</p>}
                  {result.deal && (
                    <p className="text-lg font-bold text-primary-500 mt-2">{formatCurrency(result.deal.deal_price)}</p>
                  )}
                  {result.remaining_balance != null && result.remaining_balance > 0 && (
                    <p className="text-sm text-amber-600 font-semibold mt-1">Collect balance: {formatCurrency(result.remaining_balance)}</p>
                  )}
                  {result.loyalty_awards && result.loyalty_awards.length > 0 && (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-left">
                      {result.loyalty_awards.map((a, i) => (
                        <p key={i} className="text-xs text-emerald-700 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5" /> <span className="font-semibold">+{a.earned}</span> · {a.current} ({a.program_name})
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-9 h-9 text-red-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Couldn&apos;t redeem</h2>
                  <p className="text-sm text-gray-500 mt-1">{result.error}</p>
                </>
              )}
              <button onClick={resetRedeem} className="btn-primary w-full mt-5">Redeem another</button>
            </div>
          ) : (
            /* ── Redeem console (code entry) ── */
            <div className="card p-6">
              <div className="flex items-center gap-2 justify-center text-emerald-600 text-xs font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" /> {active.name}
              </div>
              <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Enter redemption code</h1>
              <p className="text-sm text-gray-500 text-center mb-5">Type the customer&apos;s 6-digit code.</p>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoFocus
                placeholder="------"
                className="w-full text-center text-3xl font-extrabold tracking-[0.4em] py-4 rounded-xl border-2 border-gray-200 focus:border-primary-400 outline-none mb-4"
              />
              <button
                onClick={doRedeem}
                disabled={code.length !== 6 || redeeming}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Redeem
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exit modal */}
      {showExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowExit(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">Exit Redeem Mode</h3>
            <p className="text-sm text-gray-500 mb-4">Enter the owner account password to unlock the full dashboard.</p>
            <input
              type="password"
              value={exitPw}
              onChange={(e) => setExitPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmExit()}
              placeholder="Account password"
              className="input-field mb-2"
              autoFocus
            />
            {exitError && <p className="text-xs text-red-500 mb-2">{exitError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowExit(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm">Cancel</button>
              <button onClick={confirmExit} disabled={exiting || !exitPw} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {exiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
