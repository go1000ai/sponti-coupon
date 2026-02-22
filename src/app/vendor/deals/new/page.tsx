'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency, formatPercentage, calculateDiscount } from '@/lib/utils';
import { Tag, AlertCircle, ArrowLeft, Info } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import Link from 'next/link';
import type { Deal } from '@/lib/types/database';

export default function NewDealPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dealType, setDealType] = useState<'regular' | 'sponti_coupon'>('regular');
  const [regularDeal, setRegularDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    original_price: '',
    deal_price: '',
    deposit_amount: '',
    max_claims: '',
    duration_hours: '24',
    duration_days: '7',
  });

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // Fetch active regular deal for benchmark
    supabase
      .from('deals')
      .select('*')
      .eq('vendor_id', user.id)
      .eq('deal_type', 'regular')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRegularDeal(data));
  }, [user]);

  const discount = form.original_price && form.deal_price
    ? calculateDiscount(parseFloat(form.original_price), parseFloat(form.deal_price))
    : 0;

  const regularDiscount = regularDeal
    ? calculateDiscount(regularDeal.original_price, regularDeal.deal_price)
    : 0;

  const meetsMinDiscount = dealType === 'sponti_coupon'
    ? discount - regularDiscount >= 10
    : true;

  const requiredMinDiscount = regularDiscount + 10;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const now = new Date();
    const startsAt = now.toISOString();
    let expiresAt: string;

    if (dealType === 'sponti_coupon') {
      const hours = parseInt(form.duration_hours) || 24;
      expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    } else {
      const days = parseInt(form.duration_days) || 7;
      expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_type: dealType,
          title: form.title,
          description: form.description,
          original_price: parseFloat(form.original_price),
          deal_price: parseFloat(form.deal_price),
          deposit_amount: dealType === 'sponti_coupon' ? parseFloat(form.deposit_amount) : null,
          max_claims: form.max_claims ? parseInt(form.max_claims) : null,
          starts_at: startsAt,
          expires_at: expiresAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push('/vendor/deals');
    } catch {
      setError('Failed to create deal. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/vendor/deals" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      <h1 className="text-3xl font-bold text-secondary-500 mb-8">Create New Deal</h1>

      {/* Deal Type Selector */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setDealType('regular')}
          className={`card p-6 text-left transition-all ${dealType === 'regular' ? 'ring-2 ring-secondary-500 shadow-lg' : 'hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gray-100 rounded-lg p-2">
              <Tag className="w-6 h-6 text-secondary-500" />
            </div>
            <h3 className="font-bold text-secondary-500">Regular Deal</h3>
          </div>
          <p className="text-sm text-gray-500">Standard discount lasting 1-30 days. No deposit required. Sets your baseline discount.</p>
        </button>

        <button
          type="button"
          onClick={() => setDealType('sponti_coupon')}
          className={`card p-6 text-left transition-all ${dealType === 'sponti_coupon' ? 'ring-2 ring-primary-500 shadow-lg' : 'hover:shadow-md'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary-50 rounded-lg p-2">
              <SpontiIcon className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-bold text-primary-500">Sponti Coupon</h3>
          </div>
          <p className="text-sm text-gray-500">Flash deal up to 24 hours. Requires deposit. Must beat your Regular Deal by 10%+.</p>
        </button>
      </div>

      {/* Sponti Coupon Warning */}
      {dealType === 'sponti_coupon' && !regularDeal && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700">Active Regular Deal Required</p>
            <p className="text-sm text-amber-600 mt-1">
              You must have an active Regular Deal before posting a Sponti Coupon.
              <Link href="/vendor/deals/new" className="underline ml-1" onClick={() => setDealType('regular')}>
                Create a Regular Deal first
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Benchmark Info for Sponti */}
      {dealType === 'sponti_coupon' && regularDeal && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-700">Benchmark: {regularDeal.title}</p>
            <p className="text-sm text-blue-600 mt-1">
              Your Regular Deal is {formatPercentage(regularDiscount)} off.
              Your Sponti Coupon must offer at least {formatPercentage(requiredMinDiscount)} off (10+ points better).
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deal Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., 50% Off All Entrees Tonight Only!"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
            className="input-field min-h-[100px]"
            placeholder="Describe your deal..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                name="original_price"
                type="number"
                step="0.01"
                min="0"
                value={form.original_price}
                onChange={handleChange}
                className="input-field pl-8"
                placeholder="100.00"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deal Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                name="deal_price"
                type="number"
                step="0.01"
                min="0"
                value={form.deal_price}
                onChange={handleChange}
                className="input-field pl-8"
                placeholder="50.00"
                required
              />
            </div>
          </div>
        </div>

        {/* Discount Preview */}
        {discount > 0 && (
          <div className={`p-4 rounded-lg ${
            dealType === 'sponti_coupon' && !meetsMinDiscount
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Calculated Discount:</span>
              <span className={`text-2xl font-bold ${
                dealType === 'sponti_coupon' && !meetsMinDiscount
                  ? 'text-red-500'
                  : 'text-green-600'
              }`}>
                {formatPercentage(discount)} OFF
              </span>
            </div>
            {dealType === 'sponti_coupon' && !meetsMinDiscount && (
              <p className="text-sm text-red-600 mt-2">
                Need at least {formatPercentage(requiredMinDiscount)} off.
                Savings: {formatCurrency(parseFloat(form.original_price) - parseFloat(form.deal_price))}
              </p>
            )}
          </div>
        )}

        {/* Sponti-specific fields */}
        {dealType === 'sponti_coupon' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Deposit Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">$</span>
                <input
                  name="deposit_amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.deposit_amount}
                  onChange={handleChange}
                  className="input-field pl-8"
                  placeholder="10.00"
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Customer pays this directly to you. Non-refundable if not redeemed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours, max 24)</label>
              <input
                name="duration_hours"
                type="number"
                min="1"
                max="24"
                value={form.duration_hours}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </>
        )}

        {dealType === 'regular' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days, 1-30)</label>
            <input
              name="duration_days"
              type="number"
              min="1"
              max="30"
              value={form.duration_days}
              onChange={handleChange}
              className="input-field"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Claims (optional)</label>
          <input
            name="max_claims"
            type="number"
            min="1"
            value={form.max_claims}
            onChange={handleChange}
            className="input-field"
            placeholder="Leave empty for unlimited"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (dealType === 'sponti_coupon' && (!regularDeal || !meetsMinDiscount))}
          className="btn-primary w-full text-lg py-4"
        >
          {loading ? 'Publishing...' : dealType === 'sponti_coupon' ? 'Publish Sponti Coupon' : 'Publish Regular Deal'}
        </button>
      </form>
    </div>
  );
}
