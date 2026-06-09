'use client';

import { useState } from 'react';
import Link from 'next/link';

const COPY = {
  en: {
    toggle: 'English',
    badge: 'Founding Vendor Offer · Only 15 Spots',
    titlePre: 'Get ',
    titleHi: '3 months free',
    subPre: 'Full Business plan · ',
    subStrong: 'No credit card',
    subPost: ' · Keep 100% of sales',
    caption: 'Point your phone camera here to sign up',
    qr: '/founding-vendor-qr.svg',
    alt: 'Scan to sign up for SpontiCoupon',
    href: '/founding-vendor',
  },
  es: {
    toggle: 'Español',
    badge: 'Oferta de Vendedor Fundador · Solo 15 Lugares',
    titlePre: 'Obtén ',
    titleHi: '3 meses gratis',
    subPre: 'Plan Business completo · ',
    subStrong: 'Sin tarjeta de crédito',
    subPost: ' · Conserva el 100% de las ventas',
    caption: 'Apunta la cámara de tu teléfono aquí para registrarte',
    qr: '/founding-vendor-qr-es.svg',
    alt: 'Escanea para registrarte en SpontiCoupon',
    href: '/founding-vendor?lang=es',
  },
} as const;

export default function QrContent() {
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const c = COPY[lang];

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-6 py-12 text-center">
      {/* Language toggle — flip before showing to the vendor */}
      <div className="inline-flex items-center rounded-full border border-primary-200 bg-white/80 backdrop-blur p-1 mb-6 shadow-sm">
        {(['en', 'es'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`px-5 py-1.5 rounded-full text-sm font-bold transition-colors ${
              lang === l ? 'bg-primary-500 text-white shadow' : 'text-gray-600 hover:text-primary-600'
            }`}
          >
            {COPY[l].toggle}
          </button>
        ))}
      </div>

      <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-6">
        {c.badge}
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-3">
        {c.titlePre}<span className="text-primary-600">{c.titleHi}</span>
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        {c.subPre}<strong className="text-gray-900">{c.subStrong}</strong>{c.subPost}
      </p>

      <div className="bg-white rounded-3xl shadow-2xl border border-white/70 p-6 sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.qr} alt={c.alt} className="w-60 h-60 sm:w-72 sm:h-72" />
      </div>

      <p className="text-base text-gray-500 mt-6">{c.caption}</p>
      <Link href={c.href} className="text-primary-600 font-bold mt-1 hover:underline">
        sponticoupon.com/founding-vendor
      </Link>
    </div>
  );
}
