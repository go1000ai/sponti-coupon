'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatPercentage, calculateDiscount } from '@/lib/utils';
import { ArrowLeft, Save, Loader2, AlertCircle, Tag, Lock } from 'lucide-react';
import { SpontiIcon } from '@/components/ui/SpontiIcon';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import type { Deal } from '@/lib/types/database';

export default function EditDealPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>}>
      <EditDealPageInner />
    </Suspense>
  );
}

function EditDealPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('id');

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    original_price: '',
    deal_price: '',
    deposit_amount: '',
    max_claims: '',
    image_url: '',
  });

  useEffect(() => {
    if (!dealId || !user) return;

    async function fetchDeal() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .eq('vendor_id', user!.id)
        .single();

      if (error || !data) {
        setError('Deal not found or you do not have permission to edit it.');
        setLoading(false);
        return;
      }

      setDeal(data);
      setForm({
        title: data.title || '',
        description: data.description || '',
        original_price: data.original_price.toString(),
        deal_price: data.deal_price.toString(),
        deposit_amount: data.deposit_amount?.toString() || '',
        max_claims: data.max_claims?.toString() || '',
        image_url: data.image_url || '',
      });
      setLoading(false);
    }

    fetchDeal();
  }, [dealId, user]);

  const discount = form.original_price && form.deal_price
    ? calculateDiscount(parseFloat(form.original_price), parseFloat(form.deal_price))
    : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal || !user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    const supabase = createClient();

    const originalPrice = parseFloat(form.original_price);
    const dealPrice = parseFloat(form.deal_price);
    const discountPercentage = calculateDiscount(originalPrice, dealPrice);

    const updates: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      original_price: originalPrice,
      deal_price: dealPrice,
      discount_percentage: discountPercentage,
      max_claims: form.max_claims ? parseInt(form.max_claims) : null,
      image_url: form.image_url || null,
    };

    if (deal.deal_type === 'sponti_coupon' && form.deposit_amount) {
      updates.deposit_amount = parseFloat(form.deposit_amount);
    }

    const { error: updateError } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', deal.id)
      .eq('vendor_id', user.id);

    if (updateError) {
      setError('Failed to save changes: ' + updateError.message);
    } else {
      setSuccess('Deal updated successfully!');
      setTimeout(() => router.push('/vendor/deals'), 1500);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/vendor/deals" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-secondary-500">Deal Not Found</h2>
          <p className="text-gray-500 mt-2">{error || 'The deal you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const isLocked = deal.claims_count > 0;

  if (isLocked) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/vendor/deals" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
        <div className="card p-8 text-center">
          <Lock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-secondary-500">Deal Locked</h2>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            This deal has <strong>{deal.claims_count} claim{deal.claims_count > 1 ? 's' : ''}</strong> and can no longer be edited to ensure fairness to customers who already claimed it.
          </p>
          <p className="text-gray-400 text-sm mt-3">
            You can pause or expire this deal from the deals list, then create a new one with updated details.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/vendor/deals" className="btn-outline">
              Back to Deals
            </Link>
            <Link href="/vendor/deals/new" className="btn-primary">
              Create New Deal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/vendor/deals" className="inline-flex items-center gap-1 text-gray-500 hover:text-primary-500 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className={`rounded-lg p-2 ${deal.deal_type === 'sponti_coupon' ? 'bg-primary-50' : 'bg-gray-100'}`}>
          {deal.deal_type === 'sponti_coupon' ? (
            <SpontiIcon className="w-6 h-6 text-primary-500" />
          ) : (
            <Tag className="w-6 h-6 text-secondary-500" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-secondary-500">Edit Deal</h1>
          <p className="text-sm text-gray-500">
            {deal.deal_type === 'sponti_coupon' ? 'Sponti Coupon' : 'Steady Deal'} &middot;
            Status: <span className={`font-medium ${deal.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>{deal.status}</span>
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg border border-green-200 mb-6">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-200 mb-6 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="card p-8 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Deal Title *</label>
            <AIAssistButton
              type="deal_title"
              context={{
                current_text: form.title,
                deal_type: deal?.deal_type || 'regular',
                description: form.description,
              }}
              onResult={(text) => setForm(prev => ({ ...prev, title: text }))}
              label="Ava Rewrite"
            />
          </div>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <AIAssistButton
              type="deal_description"
              context={{
                current_text: form.description,
                deal_type: deal?.deal_type || 'regular',
                title: form.title,
                original_price: form.original_price,
                deal_price: form.deal_price,
              }}
              onResult={(text) => setForm(prev => ({ ...prev, description: text }))}
              label="Ava Rewrite"
            />
          </div>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input-field min-h-[100px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
          <div className="flex gap-2">
            <input
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              className="input-field flex-1"
              placeholder="https://images.unsplash.com/..."
            />
            {form.image_url && (
              <div className="w-16 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
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
                required
              />
            </div>
          </div>
        </div>

        {/* Discount Preview */}
        {discount > 0 && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Calculated Discount:</span>
              <span className="text-2xl font-bold text-green-600">
                {formatPercentage(discount)} OFF
              </span>
            </div>
          </div>
        )}

        {/* Deposit Amount */}
        {deal.deal_type === 'sponti_coupon' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Deposit Amount</label>
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
              />
            </div>

            {/* Vendor deposit control notice */}
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">You control the deposit</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                You decide whether to require a deposit, the full amount, or no payment upfront.
                Deposits help reduce no-shows and secure customer commitment.
                SpontiCoupon does not guarantee customer attendance — the deposit is your tool to protect against no-shows.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Claims</label>
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

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Note:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-600">
            <li>Deal type (Regular/Sponti) cannot be changed after creation</li>
            <li>Expiration date cannot be changed after creation</li>
            <li>Current claims: {deal.claims_count}</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" /> Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
}
