'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import {
  Palette, Save, Loader2, Eye, AlertCircle, CheckCircle2,
  Globe, Image as ImageIcon, Upload, X, Link as LinkIcon,
} from 'lucide-react';
import type { VendorBranding } from '@/lib/types/database';

const DEFAULT_BRANDING: VendorBranding = {
  primary_color: '#E8632B',
  secondary_color: '#1A1A2E',
  accent_color: '#22C55E',
  custom_logo_url: '',
  custom_domain: '',
  hide_sponticoupon_branding: false,
};

export default function BrandingPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VendorBranding>(DEFAULT_BRANDING);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const hasAccess = canAccess('custom_branding');

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('vendors')
      .select('branding')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.branding) {
          setForm({ ...DEFAULT_BRANDING, ...data.branding });
        }
        setLoading(false);
      });
  }, [user]);

  // ── Image Upload Handler ─────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Invalid file type. Please upload JPG, PNG, WebP, or GIF.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File too large. Maximum size is 5MB.' });
      return;
    }

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'vendor-assets');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
        setUploadPreview(null);
        setUploading(false);
        return;
      }

      setForm(prev => ({ ...prev, custom_logo_url: data.url }));
      setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
      setUploadPreview(null);
    }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const removeLogo = () => {
    setForm(prev => ({ ...prev, custom_logo_url: '' }));
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('vendors')
        .update({ branding: form })
        .eq('id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Branding saved!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save branding settings.' });
    }
    setSaving(false);
  };

  if (tierLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <UpgradePrompt
        requiredTier="enterprise"
        featureName="Custom Branding"
        description="Customize colors, add your logo to deal pages, and use a custom domain for a fully branded experience."
        mode="full-page"
      />
    );
  }

  const logoPreviewSrc = uploadPreview || form.custom_logo_url;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Palette className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Branding</h1>
          <p className="text-gray-500 text-sm mt-1">Customize the look and feel of your deal pages</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Brand Colors */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-500" /> Brand Colors
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color || '#E8632B'}
                  onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={form.primary_color || '#E8632B'}
                  onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="input-field flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.secondary_color || '#1A1A2E'}
                  onChange={e => setForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={form.secondary_color || '#1A1A2E'}
                  onChange={e => setForm(prev => ({ ...prev, secondary_color: e.target.value }))}
                  className="input-field flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.accent_color || '#22C55E'}
                  onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                  className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                />
                <input
                  type="text"
                  value={form.accent_color || '#22C55E'}
                  onChange={e => setForm(prev => ({ ...prev, accent_color: e.target.value }))}
                  className="input-field flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><Eye className="w-3 h-3" /> Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: form.primary_color }} />
              <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: form.secondary_color }} />
              <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: form.accent_color }} />
              <div className="flex-1 h-10 rounded-lg" style={{ background: `linear-gradient(to right, ${form.primary_color}, ${form.secondary_color})` }} />
            </div>
          </div>
        </div>

        {/* Custom Logo — Upload + URL */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary-500" /> Custom Logo for Deal Pages
          </h3>
          <p className="text-sm text-gray-500 mb-4">This logo will appear on your customer-facing deal pages instead of the SpontiCoupon logo.</p>

          {/* Toggle: Upload / URL */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setLogoMode('upload')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                logoMode === 'upload'
                  ? 'bg-primary-50 text-primary-600 border border-primary-200'
                  : 'text-gray-500 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => setLogoMode('url')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                logoMode === 'url'
                  ? 'bg-primary-50 text-primary-600 border border-primary-200'
                  : 'text-gray-500 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <LinkIcon className="w-4 h-4" /> Paste URL
            </button>
          </div>

          {/* Current logo preview with remove option */}
          {logoPreviewSrc && (
            <div className="mb-4 relative inline-block">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreviewSrc}
                  alt="Custom logo preview"
                  className="h-16 w-auto max-w-[240px] object-contain"
                />
              </div>
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Upload Mode: Drag & Drop */}
          {logoMode === 'upload' && !logoPreviewSrc && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                  <p className="text-sm text-gray-500">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className={`rounded-full p-3 ${dragActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Upload className={`w-6 h-6 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {dragActive ? 'Drop your logo here' : 'Drag & drop your logo here'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      or <span className="text-primary-500 font-medium">click to browse</span> &middot; JPG, PNG, WebP, GIF &middot; Max 5MB
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={uploading}
              />
            </div>
          )}

          {/* URL Mode */}
          {logoMode === 'url' && !logoPreviewSrc && (
            <div>
              <input
                type="url"
                value={form.custom_logo_url || ''}
                onChange={e => setForm(prev => ({ ...prev, custom_logo_url: e.target.value }))}
                className="input-field"
                placeholder="https://yourbusiness.com/logo.png"
              />
              <p className="text-xs text-gray-400 mt-1.5">Enter a direct link to your logo image</p>
            </div>
          )}

          {/* Replace button when logo exists */}
          {logoPreviewSrc && !uploading && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-sm text-primary-500 font-medium cursor-pointer hover:underline flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" /> Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
              <span className="text-xs text-gray-300">|</span>
              <button
                type="button"
                onClick={removeLogo}
                className="text-sm text-red-500 font-medium hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}
        </div>

        {/* Custom Domain */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-500" /> Custom Domain
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Use your own domain for deal pages (e.g., deals.yourbusiness.com). Contact support for DNS setup assistance.
          </p>
          <input
            type="text"
            value={form.custom_domain || ''}
            onChange={e => setForm(prev => ({ ...prev, custom_domain: e.target.value }))}
            className="input-field"
            placeholder="deals.yourbusiness.com"
          />
        </div>

        {/* Hide SpontiCoupon Branding */}
        <div className="card p-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <h3 className="font-bold text-gray-900">Hide SpontiCoupon Branding</h3>
              <p className="text-sm text-gray-500 mt-0.5">Remove &quot;Powered by SpontiCoupon&quot; from your deal pages</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={form.hide_sponticoupon_branding || false}
                onChange={e => setForm(prev => ({ ...prev, hide_sponticoupon_branding: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                form.hide_sponticoupon_branding ? 'bg-primary-500' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ${
                  form.hide_sponticoupon_branding ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`} />
              </div>
            </div>
          </label>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Branding
        </button>
      </div>
    </div>
  );
}
