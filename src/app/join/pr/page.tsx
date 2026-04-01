'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Gift, Check, Loader2, MapPin, Phone, Mail, Building2,
  ArrowRight, Star, BarChart2, Share2, Tag, Clock, Zap,
} from 'lucide-react';

const PROMO_CODE = 'PUERTORICO6';
const FREE_MONTHS = 6;
const TIER_VALUE = 99;

const CATEGORIES = [
  { value: 'restaurant', en: 'Restaurant', es: 'Restaurante' },
  { value: 'salon', en: 'Salon & Beauty', es: 'Salón y Belleza' },
  { value: 'fitness', en: 'Fitness & Gym', es: 'Fitness y Gimnasio' },
  { value: 'wellness', en: 'Wellness & Spa', es: 'Bienestar y Spa' },
  { value: 'cafe', en: 'Cafe & Coffee', es: 'Café' },
  { value: 'retail', en: 'Retail & Shopping', es: 'Tienda y Compras' },
  { value: 'entertainment', en: 'Entertainment', es: 'Entretenimiento' },
  { value: 'automotive', en: 'Automotive', es: 'Automotriz' },
  { value: 'photography', en: 'Photography', es: 'Fotografía' },
  { value: 'other', en: 'Other', es: 'Otro' },
];

const VALUE_PROPS = [
  { icon: <Tag className="w-5 h-5" />, en: '0% Commission — Keep 100%', es: '0% Comisión — Quédate con el 100%' },
  { icon: <Star className="w-5 h-5" />, en: 'Up to 45 Active Deals', es: 'Hasta 45 Ofertas Activas' },
  { icon: <BarChart2 className="w-5 h-5" />, en: 'Analytics Dashboard', es: 'Panel de Analíticas' },
  { icon: <Share2 className="w-5 h-5" />, en: 'Auto Social Media Posts', es: 'Publicaciones Automáticas' },
  { icon: <Clock className="w-5 h-5" />, en: 'Flash & Steady Deals', es: 'Ofertas Flash y Permanentes' },
  { icon: <Zap className="w-5 h-5" />, en: 'QR Code Redemption', es: 'Canje por Código QR' },
];

type Lang = 'en' | 'es';

export default function PuertoRicoJoinPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [form, setForm] = useState({
    businessName: '', email: '', password: '', confirmPassword: '',
    phone: '', address: '', city: '', state: 'PR', zip: '', category: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const t = (en: string, es: string) => lang === 'es' ? es : en;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError(t('Password must be at least 6 characters', 'La contraseña debe tener al menos 6 caracteres'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('Passwords do not match', 'Las contraseñas no coinciden'));
      return;
    }
    if (!form.businessName.trim() || !form.email.trim()) {
      setError(t('Business name and email are required', 'Nombre del negocio y correo son requeridos'));
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const appUrl = window.location.origin;

      // Build redirect URL with all vendor data
      const params = new URLSearchParams({
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

      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?${params.toString()}`,
          data: {
            account_type: 'vendor',
            business_name: form.businessName,
            promo: PROMO_CODE,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError(t(
            'This email is already registered. Please log in instead.',
            'Este correo ya está registrado. Por favor inicia sesión.',
          ));
        } else {
          setError(signUpError.message);
        }
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError(t('Something went wrong. Please try again.', 'Algo salió mal. Inténtalo de nuevo.'));
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('Check Your Email!', '¡Revisa Tu Correo!')}
          </h2>
          <p className="text-gray-500 mb-4">
            {t(
              `We sent a confirmation link to ${form.email}. Click it to activate your free account.`,
              `Enviamos un enlace de confirmación a ${form.email}. Haz clic para activar tu cuenta gratis.`,
            )}
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-700 font-medium">
              {t(
                'After confirming, you\'ll be taken to your vendor dashboard to start creating deals.',
                'Después de confirmar, irás a tu panel de vendedor para comenzar a crear ofertas.',
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            lang === 'en'
              ? 'bg-white text-gray-900'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang('es')}
          className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            lang === 'es'
              ? 'bg-white text-gray-900'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
        >
          ES
        </button>
      </div>

      {/* Hero */}
      <div className="pt-12 pb-8 px-4 text-center">
        <Image src="/logo.png" alt="SpontiCoupon" width={200} height={60} className="mx-auto mb-6 brightness-110" />

        <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 mb-4">
          <Gift className="w-4 h-4 text-green-400" />
          <span className="text-green-300 text-sm font-bold uppercase tracking-wide">
            {t('Limited Offer', 'Oferta Limitada')}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 leading-tight">
          {t(`${FREE_MONTHS} Months`, `${FREE_MONTHS} Meses`)}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-orange-400">FREE</span>
        </h1>
        <p className="text-xl text-gray-300 font-medium mb-2">
          {t('No Credit Card Required', 'Sin Tarjeta de Crédito')}
        </p>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          {t(
            `Pro plan ($${TIER_VALUE}/mo value) — completely free for ${FREE_MONTHS} months. Start posting deals today.`,
            `Plan Pro ($${TIER_VALUE}/mes de valor) — completamente gratis por ${FREE_MONTHS} meses. Comienza a publicar ofertas hoy.`,
          )}
        </p>
      </div>

      {/* Value Props */}
      <div className="max-w-lg mx-auto px-4 mb-8">
        <div className="grid grid-cols-2 gap-2">
          {VALUE_PROPS.map((prop, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
              <div className="text-primary-400 shrink-0">{prop.icon}</div>
              <span className="text-white text-xs font-medium">{lang === 'es' ? prop.es : prop.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signup Form */}
      <div className="max-w-lg mx-auto px-4 pb-12">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-orange-500 px-6 py-4">
            <h2 className="text-white font-bold text-lg">
              {t('Sign Up — It\'s Free', 'Regístrate — Es Gratis')}
            </h2>
            <p className="text-white/80 text-sm">
              {t('Start creating deals in minutes', 'Comienza a crear ofertas en minutos')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-3.5 h-3.5 inline mr-1" />
                {t('Business Name', 'Nombre del Negocio')} <span className="text-red-500">*</span>
              </label>
              <input
                name="businessName"
                type="text"
                value={form.businessName}
                onChange={handleChange}
                className="input-field"
                placeholder={t('Your Business Name', 'Nombre de tu Negocio')}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-3.5 h-3.5 inline mr-1" />
                {t('Email', 'Correo Electrónico')} <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@business.com"
                required
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Password', 'Contraseña')} <span className="text-red-500">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="6+ characters"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Confirm', 'Confirmar')} <span className="text-red-500">*</span>
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Repeat"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1" />
                {t('Phone', 'Teléfono')}
              </label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="(787) 555-1234"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                {t('Street Address', 'Dirección')}
              </label>
              <input
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                className="input-field"
                placeholder="123 Calle Principal"
              />
            </div>

            {/* City / State / Zip */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('City', 'Ciudad')}</label>
                <input name="city" type="text" value={form.city} onChange={handleChange} className="input-field" placeholder="San Juan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('State', 'Estado')}</label>
                <input name="state" type="text" value={form.state} onChange={handleChange} className="input-field" placeholder="PR" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input name="zip" type="text" value={form.zip} onChange={handleChange} className="input-field" placeholder="00901" />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('Business Category', 'Categoría del Negocio')}
              </label>
              <select name="category" value={form.category} onChange={handleChange} className="input-field">
                <option value="">{t('Select Category', 'Seleccionar Categoría')}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {lang === 'es' ? cat.es : cat.en}
                  </option>
                ))}
              </select>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-400 leading-relaxed">
              {t(
                'By signing up, you agree to our Terms of Service and Vendor Terms. After your free period ends, you can subscribe to continue or your deals will be paused.',
                'Al registrarte, aceptas nuestros Términos de Servicio y Términos de Vendedor. Después de tu período gratis, puedes suscribirte para continuar o tus ofertas serán pausadas.',
              )}
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-primary-500 to-orange-500 hover:from-primary-600 hover:to-orange-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-primary-500/25 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t('Creating Account...', 'Creando Cuenta...')}</>
              ) : (
                <>{t('Start Free — No Card Needed', 'Comienza Gratis — Sin Tarjeta')} <ArrowRight className="w-5 h-5" /></>
              )}
            </button>

            <p className="text-center text-xs text-gray-400">
              {t(
                `$${TIER_VALUE}/mo value free for ${FREE_MONTHS} months. Cancel anytime.`,
                `$${TIER_VALUE}/mes de valor gratis por ${FREE_MONTHS} meses. Cancela cuando quieras.`,
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
