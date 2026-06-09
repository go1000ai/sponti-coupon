'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Mail, Lock, Phone, MapPin, Building2, CheckCircle, Gift, Sparkles, Store,
  Tag, Megaphone, DollarSign, Zap, Clock, ArrowRight, CheckCircle2, Star,
  Flame, ShieldCheck, HeartHandshake, Users,
} from 'lucide-react';
import { QualificationWizard, type WizardAnswers, formatAnswersForNotes } from '@/components/founding-vendor/QualificationWizard';

const PROMO_CODE = 'FOUNDING15';
const MAX_SPOTS = 15;
// Social-proof floor: never show below this number of claimed spots until real count surpasses it.
const DISPLAY_FLOOR = 7;

interface SpotStatus {
  used: number;
  max: number;
  remaining: number;
  full: boolean;
}

const BENEFITS = [
  { icon: Tag, title: '150 deals/mo', desc: '50 Sponti + 100 Steady' },
  { icon: Megaphone, title: 'We post to social', desc: 'Our FB + IG, every deal' },
  { icon: DollarSign, title: 'Zero commissions', desc: 'Keep 100% of every sale' },
  { icon: Zap, title: 'Full Business plan', desc: 'Same access as $199/mo' },
  { icon: ShieldCheck, title: 'No credit card', desc: 'Not at signup. Period.' },
  { icon: Star, title: '20% off forever', desc: 'If you stay after trial' },
];

export default function FoundingVendorPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SpotStatus | null>(null);
  const [animatedUsed, setAnimatedUsed] = useState(0);
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    businessName: '', phone: '',
    address: '', city: '', state: '', zip: '',
    category: '', isOnlineBusiness: false,
  });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [qualified, setQualified] = useState(false);
  const [wizardAnswers, setWizardAnswers] = useState<WizardAnswers>({});
  const blobsRef = useRef<HTMLDivElement>(null);

  // Fetch live spot count
  useEffect(() => {
    fetch('/api/auth/founding-vendor/status')
      .then(r => r.json())
      .then((d: SpotStatus) => setStatus(d))
      .catch(() => setStatus({ used: 0, max: MAX_SPOTS, remaining: MAX_SPOTS, full: false }));
  }, []);

  // Animated count-up for the "X of 15" number
  useEffect(() => {
    if (!status) return;
    const target = Math.max(status.used, DISPLAY_FLOOR);
    if (target === 0) { setAnimatedUsed(0); return; }
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedUsed(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  // Parallax on background blobs
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (blobsRef.current) {
          blobsRef.current.style.transform = `translate3d(0, ${window.scrollY * 0.35}px, 0)`;
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!form.businessName.trim()) return setError('Business name is required');
    if (!form.isOnlineBusiness && (!form.address.trim() || !form.city.trim() || !form.state.trim() || !form.zip.trim())) {
      return setError('Business address is required for physical locations');
    }
    if (!agree) return setError('Please agree to the Vendor Terms');

    setLoading(true);
    const supabase = createClient();

    const callbackParams = new URLSearchParams({
      type: 'vendor',
      promo: PROMO_CODE,
      businessName: form.businessName,
      phone: form.phone,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      category: form.category,
    });
    if (form.isOnlineBusiness) callbackParams.set('businessType', 'online');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const redirectTo = `${baseUrl}/auth/callback?${callbackParams.toString()}`;

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          account_type: 'vendor',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          promo: PROMO_CODE,
          business_name: form.businessName,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          category: form.category,
          business_type: form.isOnlineBusiness ? 'online' : 'physical',
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Fire-and-forget: also record the lead with wizard answers attached
    // so /admin/prospects + GHL get full context, separate from the vendor account.
    fetch('/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        name: form.businessName,
        phone: form.phone,
        business_name: form.businessName,
        source: 'founding_vendor_wizard_qualified',
        notes: `Qualified at /founding-vendor wizard. Answers: ${formatAnswersForNotes(wizardAnswers)}`,
      }),
    }).catch(() => {});

    if (data.session) router.push('/vendor/dashboard?welcome=true');
    else if (data.user && !data.session) {
      setShowConfirmation(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setLoading(false);
  };

  // ─── Success state ────────────────────────────────────────────────────
  if (showConfirmation) {
    return (
      <div className="relative min-h-[80vh] overflow-hidden">
        <AnimatedBackground />
        <div className="relative flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center bg-white/90 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/60">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-2xl opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-5 shadow-xl">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">You&rsquo;re almost in!</h1>
            <p className="text-gray-600 mb-1">We sent a confirmation link to</p>
            <p className="text-lg font-bold text-primary-600 mb-6">{form.email}</p>
            <div className="bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-100 rounded-2xl p-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                Click the link to activate your <strong>Founding Vendor</strong> account.
                Your 3 free months start the moment you confirm. No credit card needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Sold-out state ───────────────────────────────────────────────────
  if (status?.full) {
    return (
      <div className="relative min-h-[80vh] overflow-hidden">
        <AnimatedBackground />
        <div className="relative flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center bg-white/90 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/60">
            <div className="inline-flex bg-gradient-to-br from-primary-500 to-orange-500 rounded-full p-5 mb-6 shadow-xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">All 15 founding spots are claimed</h1>
            <p className="text-gray-600 mb-6">
              You can still get in &mdash; and lock in <strong className="text-primary-600">20% off forever</strong>
              {' '}as one of our first 200 vendors.
            </p>
            <Link href="/pricing" className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
              See Pricing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rawUsed = status?.used ?? 0;
  const used = Math.max(rawUsed, DISPLAY_FLOOR);
  const remaining = MAX_SPOTS - used;
  const progressPct = Math.min(100, Math.round((used / MAX_SPOTS) * 100));

  // ─── Main page ────────────────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden">
      <div ref={blobsRef} className="absolute inset-0 -z-10 will-change-transform">
        <BgInner />
      </div>

      {/* Scarcity ticker */}
      <div className="relative bg-gray-900 text-white py-2.5 text-center text-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/20 to-primary-500/0 animate-shimmer" />
        <div className="relative flex items-center justify-center gap-2 px-4">
          <Flame className="w-4 h-4 text-primary-400 animate-pulse" />
          <span className="font-bold text-primary-300">
            Only {remaining} of {MAX_SPOTS} founding spots left
          </span>
          <span className="hidden sm:inline text-gray-400">&middot; 3 months free &middot; no credit card</span>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">

          {/* ── LEFT: pitch ────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-8">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-primary-200/80 rounded-full px-4 py-1.5 shadow-sm animate-fade-up">
              <div className="relative">
                <Sparkles className="w-4 h-4 text-primary-500" />
                <div className="absolute inset-0 bg-primary-400 rounded-full blur opacity-50 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                Founding Vendor Offer
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.02] text-gray-900 tracking-tight animate-fade-up" style={{ animationDelay: '100ms' }}>
              3 months <span className="relative inline-block">
                <span className="gradient-text">free</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M2 8 Q 50 2, 100 6 T 198 6" stroke="url(#g1)" strokeWidth="4" fill="none" strokeLinecap="round" />
                  <defs><linearGradient id="g1"><stop offset="0%" stopColor="#E8632B" /><stop offset="100%" stopColor="#FF8F65" /></linearGradient></defs>
                </svg>
              </span>.
              <br />
              <span className="text-gray-900">No credit </span>
              <span className="gradient-text">card</span>.
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-xl leading-relaxed animate-fade-up" style={{ animationDelay: '200ms' }}>
              We&rsquo;re launching with <strong className="text-gray-900">15 founding vendors</strong>.
              Full Business-plan access for 90 days. Walk away anytime &mdash; no card, no risk.
            </p>

            {/* Live progress card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/70 shadow-xl max-w-xl animate-fade-up" style={{ animationDelay: '300ms' }}>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Founding spots</p>
                  <p className="text-3xl font-extrabold text-gray-900">
                    <span className="tabular-nums">{animatedUsed}</span>
                    <span className="text-gray-400 text-xl"> / {MAX_SPOTS}</span>
                    <span className="text-base font-bold text-primary-600 ml-2">claimed</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-xs font-bold border border-primary-200">
                  <Clock className="w-3.5 h-3.5" />
                  Limited
                </div>
              </div>
              {/* Animated progress bar */}
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 via-orange-500 to-amber-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPct}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Spots usually fill in under 2 weeks
              </p>
            </div>

            {/* Benefit grid */}
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
              {BENEFITS.map((b, i) => (
                <div
                  key={b.title}
                  className="group flex items-start gap-3 bg-white/80 backdrop-blur rounded-xl p-4 border border-white/70 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:bg-white transition-all duration-300 animate-fade-up"
                  style={{ animationDelay: `${i * 60 + 400}ms` }}
                >
                  <div className="shrink-0 bg-gradient-to-br from-primary-500 to-orange-500 rounded-lg p-2 text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <b.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{b.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 pt-4 border-t border-gray-200/60 animate-fade-up" style={{ animationDelay: '900ms' }}>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancel anytime</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Keep 100% of sales</div>
            </div>
          </div>

          {/* ── RIGHT: We're on your team ─────────────────────────────── */}
          <div className="lg:col-span-2 lg:sticky lg:top-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-7 border border-white/70 shadow-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="shrink-0 bg-gradient-to-br from-primary-500 to-orange-500 rounded-xl p-2 text-white shadow-md">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">We&rsquo;re on your team</h2>
              </div>
              <p className="text-gray-600 mb-3 leading-relaxed">
                You run your business &mdash; we&rsquo;ll bring you the customers. Our job is to market you
                and get more people through your door.
              </p>
              <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-3.5 py-1.5 mb-5 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                At no charge to you &mdash; for 3 months
              </div>
              <ul className="space-y-3">
                {[
                  { icon: Megaphone, title: 'We market your business for you', desc: 'Every deal you post, we promote to local customers on our Facebook & Instagram.' },
                  { icon: Store, title: 'We get more people in the door', desc: 'Flash deals create urgency that fills your slow days and quiet hours.' },
                  { icon: Sparkles, title: 'We build your deals with you', desc: 'Our AI helps you create and price offers — no guesswork, no extra work.' },
                  { icon: Users, title: 'A real person in your corner', desc: 'We set you up personally and check in to keep it working for you.' },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 bg-primary-50 text-primary-600 rounded-lg p-1.5 border border-primary-100">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Bottom: full-width questionnaire / sign-up ─────────────────── */}
        <div className="mt-10 lg:mt-16 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-br from-primary-400 via-orange-400 to-amber-300 rounded-3xl blur-xl opacity-40 animate-pulse pointer-events-none" />

            {!qualified ? (
                <QualificationWizard
                  onQualified={(answers) => {
                    setWizardAnswers(answers);
                    setQualified(true);
                  }}
                />
              ) : (
              <div className="relative max-w-2xl mx-auto w-full bg-white rounded-3xl shadow-2xl border border-white/80 overflow-hidden">
                {/* Gradient header */}
                <div className="relative bg-gradient-to-br from-primary-500 via-orange-500 to-amber-500 px-6 py-5 text-white overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur rounded-xl p-2">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-lg leading-tight">You qualify &mdash; claim your spot</h2>
                      <p className="text-xs text-white/90">Takes under 60 seconds &middot; no payment</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
                  {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 animate-fade-up">
                      {error}
                    </div>
                  )}

                  <Field label="Business Name" required>
                    <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input name="businessName" value={form.businessName} onChange={handleChange} className="input-field pl-10" placeholder="Your business" required />
                  </Field>

                  <Field label="Email">
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field pl-10" placeholder="you@business.com" required />
                  </Field>

                  <Field label="Phone">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input name="phone" value={form.phone} onChange={handleChange} className="input-field pl-10" placeholder="(555) 555-5555" />
                  </Field>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={form.isOnlineBusiness}
                      onChange={e => setForm(prev => ({ ...prev, isOnlineBusiness: e.target.checked, ...(e.target.checked ? { address: '', city: '', state: '', zip: '' } : {}) }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">Online-only business</span>
                      <p className="text-xs text-gray-500">No storefront &middot; nationwide reach</p>
                    </div>
                  </label>

                  {!form.isOnlineBusiness && (
                    <>
                      <Field label="Business Address" required>
                        <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input name="address" value={form.address} onChange={handleChange} className="input-field pl-10" placeholder="123 Main St" required />
                      </Field>
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="City" required>
                          <input name="city" value={form.city} onChange={handleChange} className="input-field" placeholder="Orlando" required />
                        </Field>
                        <Field label="State" required>
                          <input name="state" value={form.state} onChange={handleChange} className="input-field" placeholder="FL" required />
                        </Field>
                        <Field label="Zip" required>
                          <input name="zip" value={form.zip} onChange={handleChange} className="input-field" placeholder="32801" required />
                        </Field>
                      </div>
                    </>
                  )}

                  <Field label="Category">
                    <select name="category" value={form.category} onChange={handleChange} className="input-field">
                      <option value="">Select category</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="salon">Salon &amp; Beauty</option>
                      <option value="fitness">Fitness &amp; Gym</option>
                      <option value="wellness">Wellness &amp; Spa</option>
                      <option value="cafe">Café &amp; Coffee</option>
                      <option value="retail">Retail &amp; Shopping</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="automotive">Automotive</option>
                      <option value="photography">Photography</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>

                  <Field label="Password">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input name="password" type="password" value={form.password} onChange={handleChange} className="input-field pl-10" placeholder="At least 6 characters" required />
                  </Field>

                  <Field label="Confirm Password">
                    <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field pl-10" placeholder="Repeat password" required />
                  </Field>

                  <label className="flex items-start gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={e => setAgree(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 shrink-0"
                    />
                    <span className="text-[11px] text-gray-500 leading-relaxed">
                      I agree to the{' '}
                      <Link href="/vendor-terms" target="_blank" className="text-primary-600 hover:underline font-semibold">Vendor Terms</Link>
                      {' '}and{' '}
                      <Link href="/terms" target="_blank" className="text-primary-600 hover:underline font-semibold">Terms of Service</Link>.
                      My 3 free months end automatically &mdash; no auto-charge, no card on file.
                    </span>
                  </label>

                  {/* CTA */}
                  <button
                    type="submit"
                    disabled={loading || !agree}
                    className="group relative w-full overflow-hidden bg-gradient-to-r from-primary-500 via-orange-500 to-primary-500 bg-[length:200%_100%] hover:bg-right text-white font-extrabold py-4 rounded-xl shadow-lg shadow-primary-300/50 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                  >
                    <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity" />
                    <span className="relative flex items-center justify-center gap-2 text-base">
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          Claim My 3 Free Months
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>

                  <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5 pt-1">
                    <Store className="w-3 h-3" /> No credit card &middot; cancel anytime &middot; full Business plan
                  </p>
                </form>
              </div>
              )}
            </div>

            {qualified && (
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary-600 font-bold hover:underline">Sign in</Link>
              </p>
            )}
          </div>
        </div>

      {/* Bottom marquee */}
      <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-6 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm">
          <Stat value="$0" label="Credit card needed" />
          <Stat value="0%" label="Commissions" highlight />
          <Stat value="100%" label="Of sales you keep" />
          <Stat value="90 days" label="Free trial" />
          <Stat value="20% off" label="Forever (Pro/Business)" highlight />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function BgInner() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50" />
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-primary-300 rounded-full blur-3xl opacity-40 animate-blob" />
      <div className="absolute top-1/3 -right-40 w-[32rem] h-[32rem] bg-amber-300 rounded-full blur-3xl opacity-35 animate-blob-delay-2" />
      <div className="absolute bottom-0 left-1/4 w-[36rem] h-[36rem] bg-orange-300 rounded-full blur-3xl opacity-30 animate-blob-delay-4" />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-rose-200 rounded-full blur-3xl opacity-30 animate-blob-delay-3" />
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        .animate-blob { animation: blob 18s ease-in-out infinite; }
        .animate-blob-delay-2 { animation: blob 22s ease-in-out infinite; animation-delay: -4s; }
        .animate-blob-delay-3 { animation: blob 20s ease-in-out infinite; animation-delay: -8s; }
        .animate-blob-delay-4 { animation: blob 26s ease-in-out infinite; animation-delay: -12s; }
      `}</style>
    </>
  );
}

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <BgInner />
    </div>
  );
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-primary-500">*</span>}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function Stat({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`text-2xl sm:text-3xl font-extrabold ${highlight ? 'text-primary-400' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
