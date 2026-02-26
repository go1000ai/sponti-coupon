'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { User, MapPin, Bell, Mail, Save, Check, Navigation, Play, RotateCcw } from 'lucide-react';
import type { Customer } from '@/lib/types/database';

export default function DashboardSettingsPage() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tourAutoStart, setTourAutoStart] = useState(true);
  const [tourMessage, setTourMessage] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    state: '',
    zip: '',
    email_digest_opt_in: true,
  });

  useEffect(() => {
    try {
      const autoStart = localStorage.getItem('sponti_tour_auto_start');
      setTourAutoStart(autoStart !== 'false');
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCustomer(data);
          setForm({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            email_digest_opt_in: data.email_digest_opt_in,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from('customers')
      .update(form)
      .eq('id', user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-secondary-500 mb-8">Account Settings</h1>

      <div className="card p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input value={customer?.email || ''} disabled className="input-field bg-gray-50 text-gray-500" />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="input-field"
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <input
              value={form.zip}
              onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
              className="input-field"
            />
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="font-semibold text-secondary-500 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Notification Preferences
          </h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.email_digest_opt_in}
              onChange={e => setForm(f => ({ ...f, email_digest_opt_in: e.target.checked }))}
              className="w-5 h-5 text-primary-500 rounded border-gray-300 focus:ring-primary-500"
            />
            <div>
              <p className="font-medium text-secondary-500 flex items-center gap-1">
                <Mail className="w-4 h-4" /> Daily Deal Digest
              </p>
              <p className="text-sm text-gray-500">Receive top deals in your area every morning at 8am</p>
            </div>
          </label>
        </div>

        {/* Guided Tour */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="font-semibold text-secondary-500 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5" /> Guided Tour
          </h3>

          <div className="space-y-5">
            {/* Auto-start toggle */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tourAutoStart}
                onChange={(e) => {
                  setTourAutoStart(e.target.checked);
                  localStorage.setItem('sponti_tour_auto_start', String(e.target.checked));
                  if (!e.target.checked) {
                    localStorage.setItem('sponti_tour_customer_dashboard_done', 'true');
                  } else {
                    localStorage.removeItem('sponti_tour_customer_dashboard_done');
                  }
                }}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Show tour on login</p>
                <p className="text-xs text-gray-400">Automatically show the guided dashboard tour when you log in</p>
              </div>
            </label>

            {/* Restart tour */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Restart Tour</p>
              <p className="text-xs text-gray-400 mb-3">Replay the dashboard walkthrough to see all features explained step by step.</p>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('sponti_tour_customer_dashboard_done');
                  setTourMessage('Tour will start when you visit the dashboard!');
                  setTimeout(() => setTourMessage(''), 3000);
                  window.location.href = '/dashboard';
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-orange-400 rounded-xl hover:from-primary-600 hover:to-orange-500 transition-all shadow-sm"
              >
                <Play className="w-4 h-4" />
                Start Tour Now
              </button>
            </div>

            {/* Reset all tours */}
            <div className="pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const keys = Object.keys(localStorage).filter(k => k.startsWith('sponti_tour_'));
                  keys.forEach(k => localStorage.removeItem(k));
                  localStorage.setItem('sponti_tour_auto_start', 'true');
                  setTourAutoStart(true);
                  setTourMessage('All tours have been reset.');
                  setTimeout(() => setTourMessage(''), 3000);
                }}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-500 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset all tours
              </button>
            </div>

            {tourMessage && (
              <p className="text-sm text-green-600 font-medium">{tourMessage}</p>
            )}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saved ? <><Check className="w-4 h-4" /> Saved!</> :
           saving ? 'Saving...' :
           <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
