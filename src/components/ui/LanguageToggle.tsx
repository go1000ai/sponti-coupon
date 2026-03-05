'use client';

import { useLanguage } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${className}`}
      aria-label={locale === 'en' ? 'Cambiar a Español' : 'Switch to English'}
      title={locale === 'en' ? 'Español' : 'English'}
    >
      <Globe className="w-4 h-4" />
      <span className="font-semibold">{locale === 'en' ? 'ES' : 'EN'}</span>
    </button>
  );
}
