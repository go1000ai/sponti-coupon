'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Tag, ArrowRight } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { Deal } from '@/lib/types/database';

interface SearchAutocompleteProps {
  variant?: 'hero' | 'page';
}

export function SearchAutocomplete({ variant = 'hero' }: SearchAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [results, setResults] = useState<Deal[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const router = useRouter();

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: '5', search: searchQuery });
        if (cityQuery) params.set('city', cityQuery);
        const res = await fetch(`/api/deals?${params.toString()}`);
        const data = await res.json();
        setResults(data.deals || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, cityQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (cityQuery) params.set('city', cityQuery);
    router.push(`/deals?${params.toString()}`);
  };

  const isHero = variant === 'hero';

  return (
    <div ref={dropdownRef} className="relative">
      <form onSubmit={handleSearch}>
        <div className={`flex flex-col sm:flex-row gap-2 ${
          isHero
            ? 'bg-white rounded-2xl p-2 shadow-2xl shadow-black/20'
            : 'bg-white rounded-xl p-1.5 shadow-lg border border-gray-200'
        }`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Search deals, restaurants, spas..."
              className={`w-full pl-10 pr-3 py-3 rounded-xl text-secondary-500 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
                isHero ? 'text-sm' : 'text-sm'
              }`}
            />
          </div>
          <div className="relative sm:w-36">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={cityQuery}
              onChange={e => setCityQuery(e.target.value)}
              placeholder="City or ZIP"
              className="w-full pl-10 pr-3 py-3 rounded-xl text-secondary-500 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:scale-105 transition-transform duration-200 shrink-0"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className={`absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 ${
          isHero ? 'mx-2' : ''
        }`}>
          {loading ? (
            <div className="p-4 text-center">
              <div className="inline-block w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <>
              {results.map(deal => {
                const isSponti = deal.deal_type === 'sponti_coupon';
                return (
                  <button
                    key={deal.id}
                    onClick={() => {
                      setShowDropdown(false);
                      router.push(`/deals/${deal.id}`);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                      isSponti ? 'bg-primary-100' : 'bg-secondary-50'
                    }`}>
                      {isSponti ? (
                        <SpontiIcon className="w-5 h-5 text-primary-500" />
                      ) : (
                        <Tag className="w-5 h-5 text-secondary-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary-500 truncate">{deal.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {deal.vendor?.business_name}
                        {deal.vendor?.city && ` · ${deal.vendor.city}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary-500">{formatCurrency(deal.deal_price)}</p>
                      <p className="text-[10px] text-green-500 font-medium">{formatPercentage(deal.discount_percentage)} off</p>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={handleSearch}
                className="w-full flex items-center justify-center gap-2 p-3 text-sm font-semibold text-primary-500 hover:bg-primary-50 transition-colors"
              >
                See all results for &quot;{searchQuery}&quot; <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-400">No deals found for &quot;{searchQuery}&quot;</p>
              <p className="text-xs text-gray-300 mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
