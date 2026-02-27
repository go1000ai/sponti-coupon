'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Plus, Star, Trash2, Pencil, Check, X,
  ToggleLeft, ToggleRight, Loader2, AlertCircle, Wallet,
  Clock, CheckCircle2, Zap, Smartphone,
} from 'lucide-react';
import { PAYMENT_PROCESSORS, PROCESSOR_LIST } from '@/lib/constants/payment-processors';
import type { PaymentProcessorType } from '@/lib/constants/payment-processors';
import type { VendorPaymentMethod } from '@/lib/types/database';
import StripeConnectBanner from '@/components/vendor/StripeConnectBanner';
import { formatCurrency } from '@/lib/utils';

export default function VendorPaymentsPage() {
  const [methods, setMethods] = useState<VendorPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProcessorType, setNewProcessorType] = useState<PaymentProcessorType>('stripe');
  const [newPaymentLink, setNewPaymentLink] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLink, setEditLink] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');

  // Pending manual payments
  interface PendingClaim {
    id: string;
    created_at: string;
    payment_tier: string;
    deal?: { title: string; deal_price: number; deposit_amount: number | null };
    customer?: { email: string; first_name: string | null; last_name: string | null };
  }
  const [pendingPayments, setPendingPayments] = useState<PendingClaim[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/payment-methods');
      const data = await res.json();
      if (data.methods) setMethods(data.methods);
    } catch {
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor/pending-payments');
      const data = await res.json();
      if (data.claims) setPendingPayments(data.claims);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchMethods();
    fetchPendingPayments();
  }, [fetchMethods, fetchPendingPayments]);

  const handleConfirmPayment = async (claimId: string) => {
    setConfirmingId(claimId);
    try {
      const res = await fetch('/api/vendor/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccessMessage('Payment confirmed! QR code sent to customer.');
      fetchPendingPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm payment');
    } finally {
      setConfirmingId(null);
    }
  };

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentLink.trim()) {
      setError('Payment link is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/vendor/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processor_type: newProcessorType,
          payment_link: newPaymentLink,
          display_name: newDisplayName || PAYMENT_PROCESSORS[newProcessorType].name,
          is_primary: methods.length === 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddForm(false);
      setNewPaymentLink('');
      setNewDisplayName('');
      showSuccessMessage(`${PAYMENT_PROCESSORS[newProcessorType].name} payment method added!`);
      fetchMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_primary: true }),
      });
      if (!res.ok) throw new Error('Failed to update');
      showSuccessMessage('Primary payment method updated!');
      fetchMethods();
    } catch {
      setError('Failed to set primary method');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      showSuccessMessage(currentActive ? 'Payment method disabled' : 'Payment method enabled');
      fetchMethods();
    } catch {
      setError('Failed to toggle method');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          payment_link: editLink,
          display_name: editDisplayName,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditingId(null);
      showSuccessMessage('Payment method updated!');
      fetchMethods();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/vendor/payment-methods?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      showSuccessMessage('Payment method removed');
      fetchMethods();
    } catch {
      setError('Failed to remove payment method');
    } finally {
      setSaving(false);
    }
  };

  const getProcessorIcon = (type: PaymentProcessorType) => {
    const processor = PAYMENT_PROCESSORS[type];
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
        style={{ backgroundColor: processor.color }}
      >
        {processor.name.charAt(0)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary-500 flex items-center gap-3">
            <Wallet className="w-7 h-7 text-primary-500" />
            Payment Methods
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage how customers pay deposits directly to you
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Method
        </button>
      </div>

      {/* Stripe Connect Banner */}
      <StripeConnectBanner />

      {/* Info banner */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary-700">How it works</p>
            <p className="text-sm text-primary-600 mt-0.5">
              <span className="font-medium">Integrated</span> (Stripe Connect) — automated payments with the exact deal price. Customers pay through secure checkout.
              <br />
              <span className="font-medium">Manual</span> (Venmo, Zelle, Cash App) — customers see your payment info and send payment directly. You confirm receipt to release the deal.
              <br />
              <span className="font-medium">Link</span> (Static payment links) — customers are redirected to your existing Stripe/Square/PayPal checkout link.
              <br />
              <span className="font-medium mt-1 block">SpontiCoupon never touches your money — it goes directly to you.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-green-700 text-sm animate-fade-in">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="card p-6 mb-6 border-primary-200 ring-1 ring-primary-100">
          <h3 className="font-semibold text-secondary-500 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary-500" />
            Add Payment Method
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            {/* Processor selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Processor</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PROCESSOR_LIST.map(([key, processor]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setNewProcessorType(key)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      newProcessorType === key
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: processor.color }}
                    >
                      {processor.name.charAt(0)}
                    </div>
                    <span className="text-[10px] font-medium text-gray-600">{processor.name}</span>
                  </button>
                ))}
              </div>
              {PAYMENT_PROCESSORS[newProcessorType].supportedTiers.includes('manual') && (
                <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span>{PAYMENT_PROCESSORS[newProcessorType].name} uses manual payment confirmation. Customers will send payment directly to you, and you&apos;ll confirm receipt from this page.</span>
                </div>
              )}
            </div>

            {/* Payment link / info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {PAYMENT_PROCESSORS[newProcessorType].supportsDeposit
                  ? `${PAYMENT_PROCESSORS[newProcessorType].name} Payment Link`
                  : `${PAYMENT_PROCESSORS[newProcessorType].name} Info`}
              </label>
              <input
                type="text"
                value={newPaymentLink}
                onChange={e => setNewPaymentLink(e.target.value)}
                className="input-field"
                placeholder={PAYMENT_PROCESSORS[newProcessorType].placeholder}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                {PAYMENT_PROCESSORS[newProcessorType].helpText}
              </p>
            </div>

            {/* Display name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name (optional)</label>
              <input
                type="text"
                value={newDisplayName}
                onChange={e => setNewDisplayName(e.target.value)}
                className="input-field"
                placeholder={`e.g., My ${PAYMENT_PROCESSORS[newProcessorType].name}`}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewPaymentLink('');
                  setNewDisplayName('');
                  setError('');
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Adding...' : 'Add Payment Method'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Methods List */}
      {methods.length === 0 && !showAddForm ? (
        <div className="card p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-2">No payment methods yet</h3>
          <p className="text-sm text-gray-400 mb-6">
            Add a payment method so customers can pay deposits directly to you when claiming Sponti Coupons.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Your First Payment Method
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map(method => {
            const processor = PAYMENT_PROCESSORS[method.processor_type as PaymentProcessorType];
            const isEditing = editingId === method.id;

            return (
              <div
                key={method.id}
                className={`card p-5 transition-all duration-200 ${
                  method.is_primary ? 'ring-2 ring-primary-200 border-primary-200' : ''
                } ${!method.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Processor icon */}
                  {getProcessorIcon(method.processor_type as PaymentProcessorType)}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={e => setEditDisplayName(e.target.value)}
                          className="input-field text-sm"
                          placeholder="Display name"
                        />
                        <input
                          type="text"
                          value={editLink}
                          onChange={e => setEditLink(e.target.value)}
                          className="input-field text-sm"
                          placeholder={processor?.placeholder}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(method.id)}
                            disabled={saving}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                          >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn-outline text-xs px-3 py-1.5"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-secondary-500 text-sm">
                            {method.display_name || processor?.name}
                          </h3>
                          {method.is_primary && (
                            <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Star className="w-3 h-3 fill-primary-500" />
                              PRIMARY
                            </span>
                          )}
                          {method.payment_tier === 'integrated' && (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Zap className="w-3 h-3" />
                              INTEGRATED
                            </span>
                          )}
                          {method.payment_tier === 'manual' && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Smartphone className="w-3 h-3" />
                              MANUAL
                            </span>
                          )}
                          {method.payment_tier === 'link' && (
                            <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              LINK
                            </span>
                          )}
                          {!method.is_active && (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              DISABLED
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{method.payment_link}</p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {processor?.name} &middot; Added {new Date(method.created_at).toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      {!method.is_primary && method.is_active && method.payment_tier !== 'integrated' && (
                        <button
                          onClick={() => handleSetPrimary(method.id)}
                          disabled={saving}
                          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Set as primary"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(method.id);
                          setEditLink(method.payment_link);
                          setEditDisplayName(method.display_name || '');
                        }}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(method.id, method.is_active)}
                        disabled={saving}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={method.is_active ? 'Disable' : 'Enable'}
                      >
                        {method.is_active ? (
                          <ToggleRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(method.id, method.display_name || processor?.name || 'method')}
                        disabled={saving}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Manual Payments */}
      {pendingPayments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-secondary-500 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Manual Payments
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingPayments.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendingPayments.map(claim => (
              <div key={claim.id} className="card p-5 border-amber-200 bg-amber-50/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-secondary-500 text-sm">
                      {claim.deal?.title || 'Deal'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {claim.customer?.first_name
                        ? `${claim.customer.first_name} ${claim.customer.last_name || ''}`
                        : claim.customer?.email || 'Customer'}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-bold text-primary-500">
                        {formatCurrency(claim.deal?.deposit_amount || claim.deal?.deal_price || 0)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Claimed {new Date(claim.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConfirmPayment(claim.id)}
                    disabled={confirmingId === claim.id}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shrink-0"
                  >
                    {confirmingId === claim.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {confirmingId === claim.id ? 'Confirming...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
