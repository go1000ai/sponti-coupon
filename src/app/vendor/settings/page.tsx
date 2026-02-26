'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Settings, Save, Loader2, Building2, Globe, Clock, Bell,
  Instagram, Facebook, Twitter, MapPin, Phone, Mail,
  Link as LinkIcon, Star, ChevronDown, ChevronUp, Camera,
  ExternalLink, Bot, AlertTriangle, Info,
} from 'lucide-react';
import { AIAssistButton } from '@/components/ui/AIAssistButton';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { GatedSection } from '@/components/vendor/UpgradePrompt';
import type { Vendor, VendorSocialLinks, BusinessHours, BusinessHoursDay, VendorNotificationPreferences, AutoResponseSettings, AutoResponseTone } from '@/lib/types/database';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_HOURS: BusinessHoursDay = { open: '09:00', close: '17:00', closed: false };

// Generate time options in 30-minute intervals (12-hour format display, 24-hour value)
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
})();

const DEFAULT_NOTIFICATIONS: VendorNotificationPreferences = {
  email_new_claims: true,
  email_redemptions: true,
  email_reviews: true,
  email_digest: true,
};

type SettingsSection = 'business' | 'social' | 'hours' | 'notifications' | 'auto_response';

const DEFAULT_AUTO_RESPONSE: AutoResponseSettings = {
  enabled: false,
  tone: 'professional',
  delay_hours: 24,
  include_negative: false,
};

const TONE_OPTIONS: { value: AutoResponseTone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Polished, courteous, and business-appropriate' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm and personable, like talking to a neighbor' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed and conversational, brief and natural' },
  { value: 'grateful', label: 'Grateful', desc: 'Deeply appreciative and heartfelt' },
  { value: 'empathetic', label: 'Empathetic', desc: 'Emotionally connected, validates feelings' },
];

const DELAY_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 4, label: '4 hours' },
  { value: 6, label: '6 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
];

export default function VendorSettingsPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>('business');

  // Business info form
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    category: '',
    description: '',
    website: '',
  });

  // Social media form
  const [socialForm, setSocialForm] = useState<VendorSocialLinks>({
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: '',
    yelp: '',
    google_business: '',
  });

  // Business hours form
  const [hoursForm, setHoursForm] = useState<BusinessHours>(() => {
    const hours: BusinessHours = {};
    DAYS_OF_WEEK.forEach(day => {
      hours[day] = { ...DEFAULT_HOURS };
    });
    return hours;
  });

  // Notification preferences
  const [notifForm, setNotifForm] = useState<VendorNotificationPreferences>(DEFAULT_NOTIFICATIONS);

  // AI Auto-Response settings
  const [autoResponseForm, setAutoResponseForm] = useState<AutoResponseSettings>(DEFAULT_AUTO_RESPONSE);

  // Custom category state
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function fetchVendor() {
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (data) {
        setVendor(data);
        setBusinessForm({
          business_name: data.business_name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          category: data.category || '',
          description: data.description || '',
          website: data.website || '',
        });
        // Check if the saved category is a custom one
        const presetCategories = [
          'Restaurants', 'Beauty & Spa', 'Health & Fitness', 'Entertainment',
          'Shopping', 'Travel', 'Automotive', 'Home Services', 'Education',
          'Technology', 'Food & Drink', 'Nightlife', 'Wellness', 'Pets', 'Photography',
        ];
        if (data.category && !presetCategories.includes(data.category)) {
          setIsCustomCategory(true);
        }
        setSocialForm({
          instagram: data.social_links?.instagram || '',
          facebook: data.social_links?.facebook || '',
          tiktok: data.social_links?.tiktok || '',
          twitter: data.social_links?.twitter || '',
          yelp: data.social_links?.yelp || '',
          google_business: data.social_links?.google_business || '',
        });
        if (data.business_hours && Object.keys(data.business_hours).length > 0) {
          setHoursForm(data.business_hours);
        }
        if (data.notification_preferences) {
          setNotifForm({
            ...DEFAULT_NOTIFICATIONS,
            ...data.notification_preferences,
          });
          // Load auto-response settings from notification_preferences
          if (data.notification_preferences.auto_response) {
            setAutoResponseForm({
              ...DEFAULT_AUTO_RESPONSE,
              ...data.notification_preferences.auto_response,
            });
          }
        }
      }
      setLoading(false);
    }

    fetchVendor();
  }, [user]);

  const toggleSection = (section: SettingsSection) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBusinessForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (platform: keyof VendorSocialLinks, value: string) => {
    setSocialForm(prev => ({ ...prev, [platform]: value }));
  };

  const handleHoursChange = (day: DayOfWeek, field: keyof BusinessHoursDay, value: string | boolean) => {
    setHoursForm(prev => ({
      ...prev,
      [day]: {
        ...prev[day] || DEFAULT_HOURS,
        [field]: value,
      },
    }));
  };

  const handleNotifChange = (key: keyof VendorNotificationPreferences, value: boolean) => {
    setNotifForm(prev => ({ ...prev, [key]: value }));
  };

  const copyHoursToAll = (sourceDay: DayOfWeek) => {
    const source = hoursForm[sourceDay] || DEFAULT_HOURS;
    setHoursForm(() => {
      const newHours: BusinessHours = {};
      DAYS_OF_WEEK.forEach(day => {
        newHours[day] = { ...source };
      });
      return newHours;
    });
  };

  const handleImageUpload = async (type: 'logo' | 'cover', file: File) => {
    if (!user) return;
    const setter = type === 'logo' ? setUploadingLogo : setUploadingCover;
    setter(true);

    try {
      // Upload via server API to bypass RLS storage policies
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'vendor-assets');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const publicUrl = data.url;
      const updateField = type === 'logo' ? 'logo_url' : 'cover_url';
      const supabase = createClient();
      await supabase
        .from('vendors')
        .update({ [updateField]: publicUrl })
        .eq('id', user.id);

      setVendor(prev => prev ? { ...prev, [updateField]: publicUrl } : prev);
      setMessage({ type: 'success', text: `${type === 'logo' ? 'Logo' : 'Cover photo'} updated!` });
    } catch {
      setMessage({ type: 'error', text: `Failed to upload ${type}. Please try again.` });
    } finally {
      setter(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required address fields
    if (!businessForm.address?.trim() || !businessForm.city?.trim() || !businessForm.state?.trim() || !businessForm.zip?.trim()) {
      setMessage({ type: 'error', text: 'Business address is required (street address, city, state, and ZIP code).' });
      return;
    }

    setSaving(true);
    setMessage(null);

    // Clean social links — remove empty strings
    const cleanedSocial: VendorSocialLinks = {};
    Object.entries(socialForm).forEach(([key, val]) => {
      if (val && val.trim()) {
        cleanedSocial[key as keyof VendorSocialLinks] = val.trim();
      }
    });

    const supabase = createClient();
    const { error } = await supabase
      .from('vendors')
      .update({
        business_name: businessForm.business_name,
        email: businessForm.email,
        phone: businessForm.phone || null,
        address: businessForm.address,
        city: businessForm.city,
        state: businessForm.state,
        zip: businessForm.zip,
        category: businessForm.category || null,
        description: businessForm.description || null,
        website: businessForm.website || null,
        social_links: cleanedSocial,
        business_hours: hoursForm,
        notification_preferences: {
          ...notifForm,
          auto_response: autoResponseForm,
        },
      })
      .eq('id', user.id);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } else {
      // Auto-geocode the address after saving
      try {
        await fetch('/api/vendor/geocode', { method: 'POST' });
      } catch {
        // Geocoding failure is non-blocking
      }
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-primary-500" />
        <div>
          <h1 className="text-3xl font-bold text-secondary-500">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your business profile and preferences</p>
        </div>
      </div>

      {/* Subscription Badge + Rating */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {vendor?.subscription_tier && (
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-lg font-bold text-secondary-500 capitalize">
                {vendor.subscription_tier} Plan
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              vendor.subscription_status === 'active' ? 'bg-green-50 text-green-600' :
              vendor.subscription_status === 'trialing' ? 'bg-blue-50 text-blue-600' :
              vendor.subscription_status === 'past_due' ? 'bg-yellow-50 text-yellow-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {vendor.subscription_status === 'active' ? 'Active' :
               vendor.subscription_status === 'trialing' ? 'Trial' :
               vendor.subscription_status === 'past_due' ? 'Past Due' :
               vendor.subscription_status || 'N/A'}
            </span>
          </div>
        )}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Rating</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(vendor?.avg_rating || 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-bold text-secondary-500">
                {vendor?.avg_rating ? Number(vendor.avg_rating).toFixed(1) : '0.0'}
              </span>
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {vendor?.total_reviews || 0} review{(vendor?.total_reviews || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Logo & Cover Upload */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-bold text-secondary-500 border-b border-gray-100 pb-3 mb-4">
          Branding
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Business Logo</p>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {vendor?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div>
                <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2">
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('logo', file);
                    }}
                    disabled={uploadingLogo}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG. Max 2MB</p>
              </div>
            </div>
          </div>
          {/* Cover */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Cover Photo</p>
            <div className="flex items-center gap-4">
              <div className="w-32 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {vendor?.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vendor.cover_url} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div>
                <label className="btn-secondary text-sm cursor-pointer inline-flex items-center gap-2">
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploadingCover ? 'Uploading...' : 'Upload Cover'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('cover', file);
                    }}
                    disabled={uploadingCover}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">Wide image recommended</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* ===== BUSINESS INFORMATION ===== */}
        <div className="card mb-4 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('business')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-bold text-secondary-500">Business Information</h2>
            </div>
            {expandedSection === 'business' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {expandedSection === 'business' && (
            <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">
              <div>
                <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  value={businessForm.business_name}
                  onChange={handleBusinessChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    About Your Business
                  </label>
                  <AIAssistButton
                    type="business_description"
                    context={{ current_text: businessForm.description }}
                    onResult={(text) => setBusinessForm(prev => ({ ...prev, description: text }))}
                    label="Write with AI"
                  />
                </div>
                <textarea
                  id="description"
                  name="description"
                  value={businessForm.description}
                  onChange={handleBusinessChange}
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Tell customers about your business, what makes you special, what they can expect..."
                  rows={4}
                />
                <p className="text-xs text-gray-400 mt-1">{businessForm.description.length}/500 characters</p>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={isCustomCategory ? '__custom__' : businessForm.category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                      setBusinessForm(prev => ({ ...prev, category: '' }));
                    } else {
                      setIsCustomCategory(false);
                      setBusinessForm(prev => ({ ...prev, category: e.target.value }));
                    }
                  }}
                  className="input-field"
                >
                  <option value="">Select a category</option>
                  <option value="Restaurants">Restaurants</option>
                  <option value="Beauty & Spa">Beauty &amp; Spa</option>
                  <option value="Health & Fitness">Health &amp; Fitness</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Travel">Travel</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Home Services">Home Services</option>
                  <option value="Education">Education</option>
                  <option value="Technology">Technology</option>
                  <option value="Food & Drink">Food &amp; Drink</option>
                  <option value="Nightlife">Nightlife</option>
                  <option value="Wellness">Wellness</option>
                  <option value="Pets">Pets</option>
                  <option value="Photography">Photography</option>
                  <option value="__custom__">Custom category...</option>
                </select>
                {isCustomCategory && (
                  <input
                    type="text"
                    value={businessForm.category}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, category: e.target.value }))}
                    className="input-field mt-2"
                    placeholder="Type your custom category (e.g. Dog Grooming, Tattoo Studio)"
                    autoFocus
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" /> Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={businessForm.email}
                    onChange={handleBusinessChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" /> Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={businessForm.phone}
                    onChange={handleBusinessChange}
                    className="input-field"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" /> Website
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={businessForm.website}
                  onChange={handleBusinessChange}
                  className="input-field"
                  placeholder="https://www.yourbusiness.com"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" /> Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={businessForm.address}
                  onChange={handleBusinessChange}
                  className="input-field"
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                  <input id="city" name="city" type="text" value={businessForm.city} onChange={handleBusinessChange} className="input-field" required />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                  <input id="state" name="state" type="text" value={businessForm.state} onChange={handleBusinessChange} className="input-field" placeholder="FL" required />
                </div>
                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">Zip Code <span className="text-red-500">*</span></label>
                  <input id="zip" name="zip" type="text" value={businessForm.zip} onChange={handleBusinessChange} className="input-field" placeholder="33101" required />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== SOCIAL MEDIA ===== */}
        <div className="card mb-4 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('social')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LinkIcon className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-bold text-secondary-500">Social Media</h2>
            </div>
            {expandedSection === 'social' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {expandedSection === 'social' && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500">Add your social media links so customers can find and follow you.</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Instagram className="w-4 h-4 inline mr-1" /> Instagram
                </label>
                <input
                  type="url"
                  value={socialForm.instagram || ''}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  className="input-field"
                  placeholder="https://instagram.com/yourbusiness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Facebook className="w-4 h-4 inline mr-1" /> Facebook
                </label>
                <input
                  type="url"
                  value={socialForm.facebook || ''}
                  onChange={(e) => handleSocialChange('facebook', e.target.value)}
                  className="input-field"
                  placeholder="https://facebook.com/yourbusiness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z"/></svg>
                  TikTok
                </label>
                <input
                  type="url"
                  value={socialForm.tiktok || ''}
                  onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                  className="input-field"
                  placeholder="https://tiktok.com/@yourbusiness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Twitter className="w-4 h-4 inline mr-1" /> X (Twitter)
                </label>
                <input
                  type="url"
                  value={socialForm.twitter || ''}
                  onChange={(e) => handleSocialChange('twitter', e.target.value)}
                  className="input-field"
                  placeholder="https://x.com/yourbusiness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Star className="w-4 h-4 inline mr-1" /> Yelp
                </label>
                <input
                  type="url"
                  value={socialForm.yelp || ''}
                  onChange={(e) => handleSocialChange('yelp', e.target.value)}
                  className="input-field"
                  placeholder="https://yelp.com/biz/yourbusiness"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ExternalLink className="w-4 h-4 inline mr-1" /> Google Business Profile
                </label>
                <input
                  type="url"
                  value={socialForm.google_business || ''}
                  onChange={(e) => handleSocialChange('google_business', e.target.value)}
                  className="input-field"
                  placeholder="https://g.page/yourbusiness"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== BUSINESS HOURS ===== */}
        <div className="card mb-4 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('hours')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-secondary-500">Business Hours</h2>
            </div>
            {expandedSection === 'hours' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {expandedSection === 'hours' && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500 mb-4">Set your business hours so customers know when to visit.</p>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => {
                  const dayHours = hoursForm[day] || DEFAULT_HOURS;
                  return (
                    <div key={day} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                      <div className="w-24 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700">{DAY_LABELS[day]}</span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={!dayHours.closed}
                          onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">{dayHours.closed ? 'Closed' : 'Open'}</span>
                      </label>

                      {!dayHours.closed && (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={dayHours.open}
                            onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                            className="input-field text-sm !py-1.5 !px-2 w-[140px]"
                          >
                            {TIME_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-gray-400 text-sm">to</span>
                          <select
                            value={dayHours.close}
                            onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                            className="input-field text-sm !py-1.5 !px-2 w-[140px]"
                          >
                            {TIME_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {day === 'monday' && !dayHours.closed && (
                        <button
                          type="button"
                          onClick={() => copyHoursToAll('monday')}
                          className="text-xs text-primary-500 hover:underline whitespace-nowrap"
                        >
                          Apply to all
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===== NOTIFICATIONS ===== */}
        <div className="card mb-6 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('notifications')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-secondary-500">Notification Preferences</h2>
            </div>
            {expandedSection === 'notifications' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {expandedSection === 'notifications' && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
              {[
                { key: 'email_new_claims' as const, label: 'New Claims', desc: 'Get notified when someone claims your deal' },
                { key: 'email_redemptions' as const, label: 'Redemptions', desc: 'Get notified when a coupon is redeemed' },
                { key: 'email_reviews' as const, label: 'New Reviews', desc: 'Get notified when a customer leaves a review' },
                { key: 'email_digest' as const, label: 'Weekly Digest', desc: 'Receive a weekly summary of your deal performance' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm[key]}
                    onChange={(e) => handleNotifChange(key, e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ===== AI AUTO-RESPONSE ===== */}
        <div className="card mb-6 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('auto_response')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-purple-500" />
              <div className="text-left">
                <h2 className="text-lg font-bold text-secondary-500">AI Auto-Response</h2>
                <p className="text-xs text-gray-400 mt-0.5">Automatically reply to customer reviews with AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {autoResponseForm.enabled && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-600 rounded-full">Active</span>
              )}
              {expandedSection === 'auto_response' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </button>

          {expandedSection === 'auto_response' && (
            <div className="px-6 pb-6 border-t border-gray-100 pt-4">
              <GatedSection loading={tierLoading} locked={!canAccess('ai_deal_assistant')} requiredTier="business" featureName="AI Auto-Response" description="Let AI automatically respond to customer reviews. Available on Business plan and above.">
                <div className="space-y-6">
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-secondary-500">Enable Auto-Response</p>
                      <p className="text-sm text-gray-500 mt-0.5">AI will automatically reply to new reviews after a delay</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoResponseForm.enabled}
                        onChange={(e) => setAutoResponseForm(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>

                  {/* Tone Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Response Tone</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TONE_OPTIONS.map(({ value, label, desc }) => (
                        <label
                          key={value}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            autoResponseForm.tone === value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="auto_response_tone"
                            value={value}
                            checked={autoResponseForm.tone === value}
                            onChange={() => setAutoResponseForm(prev => ({ ...prev, tone: value }))}
                            className="mt-0.5 text-purple-500 focus:ring-purple-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-secondary-500">{label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Delay Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Response Delay
                    </label>
                    <p className="text-xs text-gray-400 mb-2">How long to wait before auto-responding (gives you time to reply manually)</p>
                    <select
                      value={autoResponseForm.delay_hours}
                      onChange={(e) => setAutoResponseForm(prev => ({ ...prev, delay_hours: parseInt(e.target.value) }))}
                      className="input-field max-w-xs"
                    >
                      {DELAY_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Negative Review Toggle */}
                  <div className={`p-4 rounded-xl border-2 ${autoResponseForm.include_negative ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoResponseForm.include_negative}
                        onChange={(e) => setAutoResponseForm(prev => ({ ...prev, include_negative: e.target.checked }))}
                        className="mt-0.5 w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-secondary-500">Auto-respond to negative reviews</p>
                        <p className="text-xs text-gray-500 mt-0.5">Include 1-2 star reviews in auto-responses</p>
                        {autoResponseForm.include_negative && (
                          <div className="flex items-start gap-2 mt-2 text-xs text-amber-700 bg-amber-100 rounded-lg p-2">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>Negative reviews may need a more personal touch. Consider responding manually to 1-2 star reviews.</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Custom Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Instructions <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <p className="text-xs text-gray-400 mb-2">Add business-specific instructions for the AI (e.g., &quot;Always mention our loyalty program&quot;)</p>
                    <textarea
                      value={autoResponseForm.custom_instructions || ''}
                      onChange={(e) => setAutoResponseForm(prev => ({ ...prev, custom_instructions: e.target.value }))}
                      className="input-field min-h-[80px] resize-y text-sm"
                      placeholder="e.g., Always thank them by name, mention our 10% return discount, invite them to follow us on Instagram..."
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1">{(autoResponseForm.custom_instructions || '').length}/500</p>
                  </div>

                  {/* How it works info box */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">How it works</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-blue-600">
                        <li>When a new review comes in, a timer starts based on your delay setting</li>
                        <li>If you reply manually before the timer, the auto-response is cancelled</li>
                        <li>AI generates a reply using your chosen tone and custom instructions</li>
                        <li>Auto-replies are marked with a badge so you can see which are AI-generated</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </GatedSection>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end sticky bottom-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 shadow-lg"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
