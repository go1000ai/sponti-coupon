'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Globe,
  Store,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface Vendor {
  id: string;
  business_name: string;
}

interface ScrapedDeal {
  title: string;
  description: string;
  original_price?: number;
  discount_price?: number;
  discount_percentage?: number;
  image_url?: string;
}

interface ScrapeResult {
  business_name?: string;
  description?: string;
  deals: ScrapedDeal[];
}

export default function AdminWebsiteImportPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [url, setUrl] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetch('/api/admin/vendors')
      .then(res => res.json())
      .then(data => setVendors(data.vendors || []))
      .catch(() => {});
  }, [user, role]);

  const handleScrape = async () => {
    if (!selectedVendor) {
      setError('Please select a vendor first.');
      return;
    }
    if (!url.trim()) {
      setError('Please enter a website URL.');
      return;
    }

    setScraping(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/vendor/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), vendor_id: selectedVendor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scraping failed');
      setResult(data);
      showToast('Website scraped successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scraping failed');
    } finally {
      setScraping(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.business_name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-secondary-500">Website Import</h1>
            <p className="text-sm text-gray-500">Import deals from vendor websites</p>
          </div>
        </div>
      </div>

      {/* Import Form */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Vendor</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={vendorSearch}
                onChange={e => setVendorSearch(e.target.value)}
                className="input-field pl-10 mb-2"
              />
            </div>
            <select
              value={selectedVendor}
              onChange={e => setSelectedVendor(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Choose a vendor...</option>
              {filteredVendors.map(v => (
                <option key={v.id} value={v.id}>{v.business_name}</option>
              ))}
            </select>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={e => { setUrl(e.target.value); setError(null); }}
                className="input-field pl-10"
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={scraping || !selectedVendor || !url.trim()}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {scraping ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scraping...</>
              ) : (
                <><ExternalLink className="w-4 h-4" /> Import from Website</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.business_name && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Business Info</h3>
              <p className="font-medium text-secondary-500">{result.business_name}</p>
              {result.description && <p className="text-sm text-gray-500 mt-1">{result.description}</p>}
            </div>
          )}

          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Scraped Deals ({result.deals?.length || 0})
              </h3>
            </div>
            {result.deals && result.deals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.deals.map((deal, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4">
                    {deal.image_url && (
                      <img src={deal.image_url} alt={deal.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                    )}
                    <h4 className="font-medium text-secondary-500 text-sm">{deal.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{deal.description}</p>
                    {deal.discount_percentage && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                        {deal.discount_percentage}% off
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No deals found on this website.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
