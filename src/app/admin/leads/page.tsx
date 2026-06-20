'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import {
  MapPin, Phone, Globe, Star, Download, Search,
  Plus, Trash2, Loader2, ExternalLink, Target,
  CheckCircle2, Users, TrendingUp, UserCheck, RefreshCw, Mail, Send, X,
  ClipboardList, Navigation, PhoneCall, MessageSquare, Copy, Sparkles,
} from 'lucide-react';

type LeadStatus =
  | 'not_contacted'
  | 'contacted'
  | 'visited'
  | 'visited_follow_up'
  | 'visited_interested'
  | 'cold_email_sent'
  | 'email_sent'
  | 'interested'
  | 'signed_up'
  | 'not_interested'
  | 'follow_up'
  | 'no_answer';

interface SearchResult {
  place_id: string;
  business_name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number;
  city: string;
  state: string;
  category: string;
}

interface VendorLead {
  id: string;
  business_name: string;
  contact_name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  email_sent_at: string | null;
  category: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  rating: number | null;
  review_count: number | null;
  place_id: string | null;
  on_groupon: boolean;
  visited: boolean;
  visited_at: string | null;
  status: LeadStatus;
  notes: string | null;
  deal_offer: string | null;
  original_price: number | null;
  deal_price: number | null;
  deal_type: string | null;
  payment_method: string | null;
  created_at: string;
}

const EMPTY_MANUAL_LEAD = {
  business_name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  category: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  deal_offer: '',
  original_price: '',
  deal_price: '',
  deal_type: '',
  payment_method: '',
  notes: '',
};

const CATEGORIES = [
  'Restaurants',
  'Spas & Salons',
  'Gyms & Fitness',
  'Entertainment',
  'Auto Services',
  'Retail Shops',
  'Medical & Dental',
  'Real Estate',
  'Hotels & Resorts',
  'Tour & Activities',
];

// ──────────────────────────────────────────────────────────────
// Cold-call helper content (shown in the Call Script popup)
// ──────────────────────────────────────────────────────────────
const SPONTI_PHONE = '(321) 335-0773';
const SPONTI_TEL   = '+13213350773';
const SPONTI_SITE  = 'sponticoupon.com';
const PROMO_CODE   = 'FOUNDING15';

const CALL_CHECKLIST = [
  'Business name',
  'Contact name (who you’re speaking with)',
  'Email (this becomes their login)',
  'Phone',
  'Category',
  'Website (Ava builds the deal from this)',
  'Address, city, state, zip',
  'The offer (e.g. BOGO wings, $50 massage for $30)',
  'Original price + deal price',
  'Flash (Sponti) or ongoing (Steady)?',
  'How customers pay them (Venmo / Zelle / Cash App / card)',
];

const CALL_REBUTTALS: { objection: string; response: string }[] = [
  {
    objection: '"How much does it cost?"',
    response: 'Honestly? Nothing right now. First three months are free and I don’t even take a card. If you like it after that it’s about fifty bucks a month, and you can bail anytime. I’d rather just show you it works first.',
  },
  {
    objection: '"Do you take a cut of my sales?"',
    response: 'Nope, not a penny. That’s kind of the whole point — Groupon takes like half, we take nothing. Whatever a customer pays, it’s all yours.',
  },
  {
    objection: '"I already use Groupon / another site."',
    response: 'Yeah? Then you already know deals bring people in. Only thing is they’re taking a big chunk of every sale. Run us next to ’em — it’s free, so it costs you nothing to see which one actually does better.',
  },
  {
    objection: '"I’m too busy / don’t have time to set it up."',
    response: 'That’s exactly why I do it all for you. You don’t touch a thing — I just need your email and a couple quick details and I’ll build it out. Five minutes, tops.',
  },
  {
    objection: '"What’s the catch — why free?"',
    response: 'No catch, I promise. We’re new and I’m just trying to get good local spots on here. I’d rather earn it than charge you for something you haven’t seen work yet.',
  },
  {
    objection: '"How do customers pay me?"',
    response: 'Straight to you — Venmo, Zelle, cash, card, whatever you already use. We never touch your money. We’re literally just sending you customers.',
  },
  {
    objection: '"Just send me some info / an email."',
    response: 'For sure — what’s a good email? And hey, while I’ve got you a sec, let me grab a couple quick things so I can have a sample deal ready when you open it.',
  },
  {
    objection: '"I need to think about it / ask my partner."',
    response: 'Totally fair. Tell you what — since it’s free and there’s no card, let me just set it up so you can actually see it, and you decide after. No pressure either way.',
  },
];

// Default opening line — standard for every call. Editable per call.
function buildOpener(): string {
  return `"Hey, this is Heriberto with SpontiCoupon. I see you offer deals online and was wondering if we can offer your deals on our platform — for free."`;
}

// Two pitch-email templates. Warm is the benchmark; cold is identical EXCEPT the opening.
// WARM = you spoke to them (greets {Name}, references the call).
// COLD = first touch, no name (greets the business, opens with "I came across you").
function buildPitch(type: 'cold' | 'warm', businessName: string): { subject: string; body: string } {
  const rest = `We're a new Orlando deals platform. You list a deal, locals find it and come in. Unlike Groupon, we take zero commission, so you keep 100% — you get paid directly by the customer, we never touch your funds.

And we're not about a one-and-done deal. Every customer you get is your customer, and we help you keep them coming back — built-in loyalty points and digital punch cards so a first visit turns into a regular. We're not just sending you traffic, we're helping you retain it. Think of us as a partner in growing your business, not another coupon site.

We're new, so we're offering it free to get a bunch of local partners on the platform, and then we start promoting hard. That's it. First 3 months free, no credit card, and I'll set it up for you.

If we don't bring you customers, there's no obligation — you don't have to continue. Either way, I appreciate the chance to help you grow.

If you're in, just send me your business name and website (or a deal you'd like to feature) and I'll build your page and send you the live link to look over. No commitment — if you love it, we keep it up.

Talk soon,
Heriberto`;

  const opening = type === 'warm'
    ? `Hey {Name},\n\nThanks for taking a minute with me earlier. Quick rundown on SpontiCoupon.`
    : `Hi ${businessName} Team,\n\nI came across your business and wanted to reach out. Quick rundown on SpontiCoupon.`;

  return {
    subject: `Quick rundown on SpontiCoupon — ${businessName}`,
    body: `${opening}\n\n${rest}`,
  };
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; bg: string; text: string }> = {
  not_contacted:      { label: 'Not Contacted',       bg: 'bg-gray-100',     text: 'text-gray-700'    },
  contacted:          { label: 'Contacted',            bg: 'bg-blue-100',     text: 'text-blue-700'    },
  visited:            { label: 'Visited',              bg: 'bg-lime-100',     text: 'text-lime-700'    },
  visited_follow_up:  { label: 'Visited – Follow Up',  bg: 'bg-yellow-100',   text: 'text-yellow-700'  },
  visited_interested: { label: 'Visited – Interested', bg: 'bg-emerald-100',  text: 'text-emerald-700' },
  cold_email_sent:    { label: 'Cold Email Sent',      bg: 'bg-cyan-100',     text: 'text-cyan-700'    },
  email_sent:      { label: 'Warm Email Sent',    bg: 'bg-teal-100',   text: 'text-teal-700'   },
  follow_up:       { label: 'Follow Up',          bg: 'bg-orange-100', text: 'text-orange-700' },
  no_answer:      { label: 'No Answer',        bg: 'bg-slate-100',  text: 'text-slate-600'  },
  interested:     { label: 'Interested',      bg: 'bg-amber-100',  text: 'text-amber-700'  },
  signed_up:      { label: 'Signed Up',       bg: 'bg-green-100',  text: 'text-green-700'  },
  not_interested: { label: 'Not Interested',  bg: 'bg-red-100',    text: 'text-red-700'    },
};

// Green "Groupon" badge SVG-style pill
function GrouponBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500 text-white leading-none">
      G Groupon
    </span>
  );
}

export default function AdminLeadsPage() {
  const { user, role, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  // Multi-category state
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [location, setLocation]         = useState('Orlando, FL');
  const [radiusMiles, setRadiusMiles]   = useState('0');
  const [searching, setSearching]       = useState(false);
  const [searchProgress, setSearchProgress] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [nextOffset, setNextOffset]     = useState<number | null>(null);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [searchError, setSearchError]   = useState<string | null>(null);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving]     = useState(false);
  const [grouponFilter, setGrouponFilter] = useState<'all' | 'groupon_only' | 'not_groupon'>('all');
  const [importingGroupon, setImportingGroupon] = useState(false);

  // Batch import state
  const [batchOpen, setBatchOpen]         = useState(false);
  const [batchNames, setBatchNames]       = useState('');
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState('');

  // Manual cold-call add state
  const [manualOpen, setManualOpen]   = useState(false);
  const [manualLead, setManualLead]   = useState({ ...EMPTY_MANUAL_LEAD });
  const [manualSaving, setManualSaving] = useState(false);

  // Call-script popup state (null lead = general script, not tied to a row)
  const [callOpen, setCallOpen] = useState(false);
  const [callLead, setCallLead] = useState<VendorLead | null>(null);
  const [callForm, setCallForm] = useState<Record<string, string>>({});
  const [callSaving, setCallSaving] = useState(false);
  const [callOpener, setCallOpener] = useState('');
  // Their current deals, scraped from their site
  const [callDeals, setCallDeals] = useState<{ title: string; details: string }[] | null>(null);
  const [callDealsSummary, setCallDealsSummary] = useState('');
  const [callDealsLoading, setCallDealsLoading] = useState(false);
  const [callDealsError, setCallDealsError] = useState('');
  const openCallScript = (lead: VendorLead | null) => {
    setCallLead(lead);
    setCallOpener(buildOpener());
    setCallDeals(null);
    setCallDealsSummary('');
    setCallDealsError('');
    if (lead) {
      setCallForm({
        contact_name: lead.contact_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        category: lead.category || '',
        website: lead.website || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        zip: lead.zip || '',
        deal_offer: lead.deal_offer || '',
        original_price: lead.original_price != null ? String(lead.original_price) : '',
        deal_price: lead.deal_price != null ? String(lead.deal_price) : '',
        deal_type: lead.deal_type || '',
        payment_method: lead.payment_method || '',
        notes: lead.notes || '',
      });
    }
    setCallOpen(true);
  };

  // Build the PATCH payload from the in-call form (numbers parsed).
  const callFormPayload = (): Partial<VendorLead> => ({
    ...callForm,
    original_price: callForm.original_price ? Number(callForm.original_price) : null,
    deal_price: callForm.deal_price ? Number(callForm.deal_price) : null,
  } as Partial<VendorLead>);

  // Save what you've typed during the call (popup stays open).
  const saveCallForm = async () => {
    if (!callLead) return;
    setCallSaving(true);
    await handleUpdateLead(callLead.id, callFormPayload());
    setCallSaving(false);
    showToast('Saved', 'success');
  };

  // Save the form AND set the outcome status, then close.
  const logCallOutcome = async (status: LeadStatus, label: string) => {
    if (!callLead) return;
    setCallSaving(true);
    await handleUpdateLead(callLead.id, { ...callFormPayload(), status });
    setCallSaving(false);
    showToast(`Saved — marked ${label}`, 'success');
    setCallOpen(false);
  };

  // Scrape the business's site for the deals they currently advertise.
  const scanPlatformDeals = async () => {
    const website = (callForm.website || callLead?.website || '').trim();
    if (!website) { showToast('No website on this lead to scan', 'error'); return; }
    setCallDealsLoading(true);
    setCallDealsError('');
    setCallDeals(null);
    try {
      const res = await fetch('/api/admin/leads/scrape-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setCallDeals(data.deals || []);
      setCallDealsSummary(data.summary || '');
    } catch (err) {
      setCallDealsError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setCallDealsLoading(false);
    }
  };

  // Labeled input for the in-call form — small label always visible above the field,
  // so a pre-filled value never leaves you guessing which field it is.
  const callInputCls = 'text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400';
  const callField = (label: string, key: string, opts: { type?: string; full?: boolean; placeholder?: string } = {}) => (
    <label className={`flex flex-col gap-1 ${opts.full ? 'sm:col-span-2' : ''}`}>
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <input
        type={opts.type || 'text'}
        value={callForm[key] || ''}
        onChange={(e) => setCallForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={opts.placeholder || label}
        className={callInputCls}
      />
    </label>
  );

  // Email modal state
  const [emailModal, setEmailModal] = useState<{
    lead: VendorLead;
    toEmail: string;
    recipientName: string;
    subject: string;
    body: string;
    emailType: 'cold' | 'warm';
  } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);
  // Final message with the {Name} variable filled in
  const pitchFilled = emailModal ? emailModal.body.replaceAll('{Name}', emailModal.recipientName.trim() || 'there') : '';

  const markEmailSent = () => {
    if (!emailModal?.lead.id) return;
    const newStatus: LeadStatus = emailModal.emailType === 'cold' ? 'cold_email_sent' : 'email_sent';
    handleUpdateLead(emailModal.lead.id, { status: newStatus, email: emailModal.toEmail } as Partial<VendorLead>);
  };

  const copyPitch = () => {
    if (!emailModal) return;
    navigator.clipboard?.writeText(pitchFilled);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 2000);
    markEmailSent();
  };

  const openInGmail = () => {
    if (!emailModal) return;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailModal.toEmail)}&su=${encodeURIComponent(emailModal.subject)}&body=${encodeURIComponent(pitchFilled)}`;
    window.open(url, '_blank');
    markEmailSent(); // keep the pipeline accurate even though it's sent from Gmail
  };

  // Groupon check state: place_id → true (found) | false (not found) | null (checking)
  const [grouponStatus, setGrouponStatus] = useState<Record<string, boolean | null>>({});
  const grouponCheckRef = useRef<AbortController | null>(null);

  // Saved leads state
  const [leads, setLeads]               = useState<VendorLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [savingId, setSavingId]         = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [leadSearch, setLeadSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<LeadStatus>>(new Set());
  const toggleStatusFilter = (status: LeadStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  };

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Load saved leads
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leads');
      const data = await res.json();
      const fetched: VendorLead[] = data.leads || [];
      setLeads(fetched);
      setSavedPlaceIds(new Set(
        fetched.filter((l) => l.place_id).map((l) => l.place_id as string)
      ));
    } catch {
      showToast('Failed to load saved leads', 'error');
    } finally {
      setLeadsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user || role !== 'admin') return;
    fetchLeads();
  }, [user, role, fetchLeads]);

  // Run Groupon checks in the background for a batch of results
  const runGrouponChecks = useCallback(async (results: SearchResult[]) => {
    // Cancel any in-flight checks
    if (grouponCheckRef.current) grouponCheckRef.current.abort();
    const controller = new AbortController();
    grouponCheckRef.current = controller;

    // Initialize all as null (checking)
    setGrouponStatus((prev) => {
      const next = { ...prev };
      results.forEach((r) => { next[r.place_id] = null; });
      return next;
    });

    // Check up to 30 at a time to avoid hammering the server
    const batch = results.slice(0, 30);

    await Promise.allSettled(
      batch.map(async (result) => {
        try {
          const params = new URLSearchParams({ name: result.business_name, city: result.city });
          const res = await fetch(`/api/admin/leads/check-groupon?${params}`, {
            signal: controller.signal,
          });
          if (!res.ok) return;
          const data = await res.json();
          setGrouponStatus((prev) => ({ ...prev, [result.place_id]: data.found === true }));
        } catch {
          setGrouponStatus((prev) => ({ ...prev, [result.place_id]: false }));
        }
      })
    );
  }, []);

  // Multi-category search: fires one call per selected category, merges & dedupes
  const handleSearch = async () => {
    if (selectedCategories.size === 0 || !location.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setNextOffset(null);
    setGrouponStatus({});

    const cats = Array.from(selectedCategories);
    const allResults: SearchResult[] = [];
    const seen = new Set<string>();

    try {
      for (let i = 0; i < cats.length; i++) {
        const cat = cats[i];
        setSearchProgress(`Searching ${cat} (${i + 1}/${cats.length})...`);
        const params = new URLSearchParams({ category: cat, location: location.trim(), offset: '0', radius: radiusMiles });
        const res  = await fetch(`/api/admin/leads/search?${params}`);
        const data = await res.json();
        if (!res.ok) continue; // skip failed categories, don't abort all
        for (const r of (data.results || [])) {
          if (!seen.has(r.place_id)) {
            seen.add(r.place_id);
            allResults.push(r);
          }
        }
      }
      setSearchResults(allResults);
      setSearchProgress('');
      // Run Groupon checks in background
      if (allResults.length > 0) runGrouponChecks(allResults);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
      setSearchProgress('');
    }
  };

  // Import directly from Groupon via Apify headless browser
  const handleGrouponImport = async () => {
    if (!location.trim() || selectedCategories.size === 0) return;
    setImportingGroupon(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/admin/leads/groupon-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          categories: Array.from(selectedCategories),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Groupon import failed');

      const imported: SearchResult[] = data.results || [];
      if (imported.length === 0) {
        const msg = data.debug || 'No businesses found on Groupon — try a city name like "Orlando, FL" instead of a zip code, then retry.';
        showToast(msg, 'error');
        return;
      }

      // Merge with existing results, dedup by place_id
      setSearchResults((prev) => {
        const seen = new Set(prev.map((r) => r.place_id));
        return [...prev, ...imported.filter((r) => !seen.has(r.place_id))];
      });

      // Mark all imported as confirmed Groupon businesses
      setGrouponStatus((prev) => {
        const next = { ...prev };
        imported.forEach((r) => { next[r.place_id] = true; });
        return next;
      });

      showToast(`Imported ${imported.length} businesses from Groupon!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Groupon import failed', 'error');
    } finally {
      setImportingGroupon(false);
    }
  };

  // Batch import: paste a list of business names, look up each one via Yelp
  const handleBatchImport = async () => {
    const names = batchNames.split('\n').map((n) => n.trim()).filter((n) => n.length > 1);
    if (names.length === 0 || !location.trim()) return;
    setBatchImporting(true);
    setBatchProgress(`Looking up ${names.length} business${names.length > 1 ? 'es' : ''}…`);
    try {
      const res = await fetch('/api/admin/leads/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, location: location.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch import failed');
      const imported: SearchResult[] = data.results || [];
      if (imported.length === 0) {
        showToast('No businesses found — check names or try a different location', 'error');
        return;
      }
      setSearchResults((prev) => {
        const seen = new Set(prev.map((r) => r.place_id));
        return [...prev, ...imported.filter((r) => !seen.has(r.place_id))];
      });
      // Mark all batch-imported leads as Groupon
      setGrouponStatus((prev) => {
        const next = { ...prev };
        imported.forEach((r) => { next[r.place_id] = true; });
        return next;
      });
      showToast(`Found ${imported.length} of ${names.length} businesses!`, 'success');
      setBatchNames('');
      setBatchOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Batch import failed', 'error');
    } finally {
      setBatchImporting(false);
      setBatchProgress('');
    }
  };

  // Manually add a lead typed in during a cold call
  const handleManualAdd = async () => {
    if (!manualLead.business_name.trim()) {
      showToast('Business name is required', 'error');
      return;
    }
    setManualSaving(true);
    try {
      const payload = {
        ...manualLead,
        business_name: manualLead.business_name.trim(),
        // numeric fields: send as numbers or omit
        original_price: manualLead.original_price ? Number(manualLead.original_price) : undefined,
        deal_price: manualLead.deal_price ? Number(manualLead.deal_price) : undefined,
        status: 'contacted', // you just talked to them
      };
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add lead');
      setLeads((prev) => [data.lead, ...prev]);
      showToast('Lead added!', 'success');
      setManualLead({ ...EMPTY_MANUAL_LEAD });
      setManualOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add lead', 'error');
    } finally {
      setManualSaving(false);
    }
  };

  // Load more (single category — uses last searched category for load-more)
  const handleLoadMore = async () => {
    if (nextOffset === null) return;
    setLoadingMore(true);
    try {
      const cat = Array.from(selectedCategories)[0];
      const params = new URLSearchParams({ category: cat, location, offset: String(nextOffset) });
      const res  = await fetch(`/api/admin/leads/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load more');
      const newResults: SearchResult[] = data.results || [];
      setSearchResults((prev) => {
        const seen = new Set(prev.map((r) => r.place_id));
        return [...prev, ...newResults.filter((r) => !seen.has(r.place_id))];
      });
      setNextOffset(data.next_offset ?? null);
      runGrouponChecks(newResults);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load more', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Save a single lead
  const handleSaveLead = async (result: SearchResult) => {
    setSavingId(result.place_id);
    const onGroupon = grouponStatus[result.place_id] === true;
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result, on_groupon: onGroupon }),
      });
      const data = await res.json();
      if (res.status === 409) { showToast('Already saved', 'error'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      showToast('Lead saved!', 'success');
      setSavedPlaceIds((prev) => { const s = new Set(Array.from(prev)); s.add(result.place_id); return s; });
      setLeads((prev) => [data.lead, ...prev]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Bulk save all unsaved results
  const handleBulkSave = async () => {
    const unsaved = filteredResults.filter((r) => !savedPlaceIds.has(r.place_id));
    if (unsaved.length === 0) return;
    setBulkSaving(true);
    let saved = 0;
    for (const result of unsaved) {
      const onGroupon = grouponStatus[result.place_id] === true;
      try {
        const res = await fetch('/api/admin/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...result, on_groupon: onGroupon }),
        });
        const data = await res.json();
        if (res.ok) {
          saved++;
          setSavedPlaceIds((prev) => { const s = new Set(Array.from(prev)); s.add(result.place_id); return s; });
          setLeads((prev) => [data.lead, ...prev]);
        }
      } catch { /* skip failed */ }
    }
    setBulkSaving(false);
    showToast(`Saved ${saved} leads!`, 'success');
  };

  // Update status / on_groupon / notes
  const handleUpdateLead = async (id: string, fields: Partial<VendorLead>) => {
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data.lead } : l));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  // Toggle the persistent "visited" flag (stays regardless of status)
  const toggleVisited = (lead: VendorLead) => {
    const nowVisited = !lead.visited;
    handleUpdateLead(lead.id, {
      visited: nowVisited,
      visited_at: nowVisited ? new Date().toISOString() : null,
    } as Partial<VendorLead>);
  };

  // Delete a lead
  const handleDeleteLead = async (id: string, placeId: string | null) => {
    if (!confirm('Delete this lead?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setLeads((prev) => prev.filter((l) => l.id !== id));
      if (placeId) {
        setSavedPlaceIds((prev) => { const s = new Set(prev); s.delete(placeId); return s; });
      }
      showToast('Lead removed', 'success');
    } catch {
      showToast('Failed to delete lead', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Open email compose modal pre-filled with the right pitch template
  const openEmailModal = (lead: VendorLead) => {
    const firstName = lead.contact_name?.trim().split(/[\s/]/)[0];
    const name = firstName || '';
    const type: 'cold' | 'warm' = lead.status === 'not_contacted' ? 'cold' : 'warm';
    const pitch = buildPitch(type, lead.business_name);
    setEmailModal({
      lead,
      toEmail: lead.email || '',
      recipientName: name,
      emailType: type,
      subject: pitch.subject,
      body: pitch.body,
    });
  };

  // Swap the message template when the cold/warm toggle changes
  const setEmailType = (type: 'cold' | 'warm') => {
    setEmailModal((prev) => {
      if (!prev) return null;
      const pitch = buildPitch(type, prev.lead.business_name);
      return { ...prev, emailType: type, subject: pitch.subject, body: pitch.body };
    });
  };

  // Send the composed email
  const handleSendEmail = async () => {
    if (!emailModal) return;
    if (!emailModal.toEmail.trim()) {
      showToast('Please enter an email address', 'error');
      return;
    }
    setSendingEmail(true);
    const newStatus: LeadStatus = emailModal.emailType === 'cold' ? 'cold_email_sent' : 'email_sent';
    try {
      const res = await fetch('/api/admin/leads/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: emailModal.lead.id,
          toEmail: emailModal.toEmail.trim(),
          subject: emailModal.subject,
          body: pitchFilled,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      showToast(`Email sent to ${emailModal.toEmail}!`, 'success');
      setLeads((prev) => prev.map((l) =>
        l.id === emailModal.lead.id
          ? { ...l, email: emailModal.toEmail, email_sent_at: new Date().toISOString(), status: newStatus }
          : l
      ));
      setEmailModal(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send email', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExport = () => window.open('/api/admin/leads/export', '_blank');

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  };

  const grouponCount = searchResults.filter((r) => grouponStatus[r.place_id] === true).length;

  // Apply Groupon filter to results
  const filteredResults = searchResults.filter((r) => {
    if (grouponFilter === 'groupon_only') return grouponStatus[r.place_id] === true;
    if (grouponFilter === 'not_groupon')  return grouponStatus[r.place_id] !== true;
    return true;
  });

  const unsavedCount = filteredResults.filter((r) => !savedPlaceIds.has(r.place_id)).length;

  const stats = {
    total:      leads.length,
    contacted:  leads.filter((l) => l.status === 'contacted').length,
    interested: leads.filter((l) => l.status === 'interested').length,
    signed_up:  leads.filter((l) => l.status === 'signed_up').length,
  };

  // Status filter for the Saved Leads table
  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);
  const leadQuery = leadSearch.trim().toLowerCase();
  const filteredLeads = leads.filter((l) => {
    if (statusFilters.size > 0 && !statusFilters.has(l.status)) return false;
    if (!leadQuery) return true;
    const haystack = [
      l.business_name, l.contact_name, l.email, l.phone, l.address, l.city, l.state, l.zip,
      l.category, l.notes, l.deal_offer, l.payment_method, l.website,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(leadQuery);
  });

  if (authLoading || leadsLoading) {
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
    <div className="max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("admin.leads.title")}</h1>
            <p className="text-sm text-gray-500">{t("admin.leads.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openCallScript(null)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            <PhoneCall className="w-4 h-4" /> Call Script
          </button>
          <button
            onClick={handleExport}
            disabled={leads.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Total Leads</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500">Contacted</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.contacted}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500">Interested</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.interested}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500">Signed Up</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.signed_up}</p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Find Businesses</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedCategories(new Set(CATEGORIES))}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium">
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={() => setSelectedCategories(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>
        </div>

        {/* Category checkboxes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {CATEGORIES.map((cat) => {
            const checked = selectedCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                  checked
                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-colors ${
                  checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                }`}>
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {cat}
              </button>
            );
          })}
        </div>

        {/* Location + Radius + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="City, State or Zip Code (e.g. 32801)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <select
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          >
            <option value="0">Any Distance</option>
            <option value="1">Within 1 mile</option>
            <option value="5">Within 5 miles</option>
            <option value="10">Within 10 miles</option>
            <option value="15">Within 15 miles</option>
            <option value="25">Within 25 miles</option>
            <option value="50">~50 miles (metro area)</option>
            <option value="100">~100 miles (region)</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={searching || importingGroupon || selectedCategories.size === 0 || !location.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-[130px]"
          >
            {searching ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
            ) : (
              <><Search className="w-4 h-4" /> Yelp {selectedCategories.size > 1 ? `(${selectedCategories.size})` : ''}</>
            )}
          </button>
          {/* Import from Groupon via Apify headless browser */}
          <button
            onClick={handleGrouponImport}
            disabled={importingGroupon || searching || selectedCategories.size === 0 || !location.trim()}
            title="Scrape Groupon listings using Apify (uses free platform credits)"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-[170px]"
          >
            {importingGroupon ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importing (~60s)...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Import from Groupon</>
            )}
          </button>
        </div>

        {/* Progress indicator */}
        {searchProgress && (
          <p className="mt-3 text-xs text-orange-600 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {searchProgress}
          </p>
        )}

        {searchError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{searchError}</p>
        )}

        {searchResults.length > 0 && !searching && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Found <span className="font-semibold text-gray-700">{searchResults.length}</span> businesses
              {grouponCount > 0 && (
                <> — <span className="font-semibold text-green-600">{grouponCount} on Groupon</span></>
              )}
              {nextOffset !== null ? ' — more available below' : ''}
            </p>
            {unsavedCount > 0 && (
              <button
                onClick={handleBulkSave}
                disabled={bulkSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {bulkSaving
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  : <><Plus className="w-3.5 h-3.5" /> Save All ({unsavedCount})</>
                }
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manual Cold-Call Add Panel */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
        <button
          onClick={() => setManualOpen((o) => !o)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Add a Lead by Hand (Cold Call)</p>
              <p className="text-xs text-gray-500">On a call? Type in what they tell you — saves straight to your pipeline as &ldquo;Contacted.&rdquo;</p>
            </div>
          </div>
          <span className={`text-gray-400 transition-transform ${manualOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {manualOpen && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-5">
            {/* Bucket 1 — to create their account */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">1. To create their account</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input value={manualLead.business_name} onChange={(e) => setManualLead((m) => ({ ...m, business_name: e.target.value }))}
                  placeholder="Business name *" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <input value={manualLead.contact_name} onChange={(e) => setManualLead((m) => ({ ...m, contact_name: e.target.value }))}
                  placeholder="Contact name (who you spoke to)" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="email" value={manualLead.email} onChange={(e) => setManualLead((m) => ({ ...m, email: e.target.value }))}
                  placeholder="Email (account login)" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <input value={manualLead.phone} onChange={(e) => setManualLead((m) => ({ ...m, phone: e.target.value }))}
                  placeholder="Phone" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <select value={manualLead.category} onChange={(e) => setManualLead((m) => ({ ...m, category: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Category…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={manualLead.website} onChange={(e) => setManualLead((m) => ({ ...m, website: e.target.value }))}
                  placeholder="Website (Ava can build the deal from this)" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <input value={manualLead.address} onChange={(e) => setManualLead((m) => ({ ...m, address: e.target.value }))}
                  placeholder="Street address" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:col-span-2 lg:col-span-1" />
                <input value={manualLead.city} onChange={(e) => setManualLead((m) => ({ ...m, city: e.target.value }))}
                  placeholder="City" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={manualLead.state} onChange={(e) => setManualLead((m) => ({ ...m, state: e.target.value }))}
                    placeholder="State" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <input value={manualLead.zip} onChange={(e) => setManualLead((m) => ({ ...m, zip: e.target.value }))}
                    placeholder="Zip" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
            </div>

            {/* Bucket 2 — to build their deal */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">2. Their deal (optional — can fill later)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input value={manualLead.deal_offer} onChange={(e) => setManualLead((m) => ({ ...m, deal_offer: e.target.value }))}
                  placeholder="The offer (e.g. BOGO wings)" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:col-span-2 lg:col-span-1" />
                <input type="number" value={manualLead.original_price} onChange={(e) => setManualLead((m) => ({ ...m, original_price: e.target.value }))}
                  placeholder="Original price ($)" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <input type="number" value={manualLead.deal_price} onChange={(e) => setManualLead((m) => ({ ...m, deal_price: e.target.value }))}
                  placeholder="Deal price ($)" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                <select value={manualLead.deal_type} onChange={(e) => setManualLead((m) => ({ ...m, deal_type: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Deal type…</option>
                  <option value="sponti_coupon">Sponti (flash, 4–24 hrs)</option>
                  <option value="regular">Steady (ongoing)</option>
                </select>
                <input value={manualLead.payment_method} onChange={(e) => setManualLead((m) => ({ ...m, payment_method: e.target.value }))}
                  placeholder="How they get paid (e.g. Venmo @handle)" className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 sm:col-span-2" />
              </div>
            </div>

            {/* Notes + save */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <textarea value={manualLead.notes} onChange={(e) => setManualLead((m) => ({ ...m, notes: e.target.value }))}
                rows={2} placeholder="Call notes (anything else they said)…"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              <button
                onClick={handleManualAdd}
                disabled={manualSaving || !manualLead.business_name.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
              >
                {manualSaving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Plus className="w-4 h-4" /> Add to Pipeline</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Import Panel */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
        <button
          onClick={() => setBatchOpen((o) => !o)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Paste Groupon Business Names</p>
              <p className="text-xs text-gray-500">Browse Groupon, copy names, paste here — we&apos;ll look up their addresses automatically</p>
            </div>
          </div>
          <span className={`text-gray-400 transition-transform ${batchOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {batchOpen && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-3">
              Go to <a href="https://www.groupon.com" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">groupon.com</a>,
              browse your city, and copy the business names — one per line. We&apos;ll look up every address and phone number automatically.
            </p>
            <textarea
              value={batchNames}
              onChange={(e) => setBatchNames(e.target.value)}
              rows={8}
              placeholder={`Bella Italia Restaurant\nOrlando Spa & Wellness\nThe Escape Room Orlando\nSunshine Dental Group\n…`}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none font-mono"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">
                {batchNames.split('\n').filter((n) => n.trim().length > 1).length} names entered
                {location.trim() && <> · searching in <span className="font-medium text-gray-600">{location}</span></>}
              </p>
              <div className="flex items-center gap-2">
                {batchProgress && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {batchProgress}
                  </span>
                )}
                <button
                  onClick={handleBatchImport}
                  disabled={batchImporting || batchNames.trim().length === 0 || !location.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {batchImporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Looking up…</>
                    : <><Search className="w-4 h-4" /> Find Addresses</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              Search Results
              <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredResults.length}{filteredResults.length !== searchResults.length ? ` of ${searchResults.length}` : ''}
              </span>
            </h2>
            {/* Groupon filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([
                { key: 'all',          label: 'All' },
                { key: 'groupon_only', label: '🟢 Groupon Only' },
                { key: 'not_groupon',  label: 'Not on Groupon' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setGrouponFilter(key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    grouponFilter === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredResults.map((result) => {
              const isSaved   = savedPlaceIds.has(result.place_id);
              const isSaving  = savingId === result.place_id;
              const gStatus   = grouponStatus[result.place_id]; // null=checking, true=found, false=not found
              const onGroupon = gStatus === true;

              return (
                <div key={result.place_id} className={`border rounded-xl p-4 transition-colors ${
                  onGroupon ? 'border-green-200 bg-green-50/30' : 'border-gray-100 hover:border-gray-200'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 flex-wrap min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{result.business_name}</h3>
                      {/* Groupon badge */}
                      {gStatus === null && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> checking
                        </span>
                      )}
                      {onGroupon && <GrouponBadge />}
                      {/* Category pill */}
                      <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">
                        {result.category}
                      </span>
                    </div>
                    {result.rating && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-600">{result.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({result.review_count})</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 mb-3">
                    {result.address && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                        <span>{result.address}</span>
                      </div>
                    )}
                    {result.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <a href={`tel:${result.phone}`} className="hover:text-orange-600 transition-colors">{result.phone}</a>
                      </div>
                    )}
                    {result.website && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Globe className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        <a href={result.website} target="_blank" rel="noopener noreferrer"
                          className="hover:text-orange-600 transition-colors truncate max-w-[200px]">
                          {result.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(result.business_name + ' ' + result.city + ' groupon')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Check Groupon
                    </a>
                    <div className="flex-1" />
                    {isSaved ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-3 py-1.5 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSaveLead(result)}
                        disabled={isSaving}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Save Lead
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {nextOffset !== null && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full mt-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Loading more results...</>
              ) : (
                'Load More Results'
              )}
            </button>
          )}
        </div>
      )}

      {/* Saved Leads Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Saved Leads
              {leads.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {statusFilters.size === 0 ? leads.length : `${filteredLeads.length} of ${leads.length}`}
                </span>
              )}
            </h2>
            {leads.length > 0 && (
              <button onClick={handleExport} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
          </div>

          {/* Search across all lead fields */}
          {leads.length > 0 && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Search leads — name, business, email, phone, notes, anything…"
                className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-9 py-2 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              {leadSearch && (
                <button
                  onClick={() => setLeadSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Status filter pills */}
          {leads.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              <button
                onClick={() => setStatusFilters(new Set())}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilters.size === 0 ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All <span className="opacity-70">{leads.length}</span>
              </button>
              {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map((status) => {
                const cfg = STATUS_CONFIG[status];
                const count = statusCounts[status] || 0;
                const active = statusFilters.has(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      active ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1 ring-gray-400` : `${cfg.bg} ${cfg.text} opacity-60 hover:opacity-100`
                    }`}
                  >
                    {cfg.label} <span className="opacity-70">{count}</span>
                  </button>
                );
              })}
              {statusFilters.size > 0 && (
                <button
                  onClick={() => setStatusFilters(new Set())}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No leads saved yet. Search for businesses above and click Save Lead.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Groupon</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead) => {
                  const statusCfg = STATUS_CONFIG[lead.status];
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Business */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 text-sm">{lead.business_name}</p>
                          {lead.visited ? (
                            <button
                              onClick={() => toggleVisited(lead)}
                              title="Visited — click to remove"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-lime-100 text-lime-700 hover:bg-lime-200 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Visited <X className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleVisited(lead)}
                              title="Mark this business as visited"
                              className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full text-gray-400 hover:text-lime-700 hover:bg-lime-50 border border-dashed border-gray-300 transition-colors"
                            >
                              + Visited
                            </button>
                          )}
                        </div>
                        {lead.contact_name && (
                          <p className="text-xs text-gray-500">Contact: {lead.contact_name}</p>
                        )}
                        {lead.category && (
                          <span className="text-xs text-gray-400">{lead.category}</span>
                        )}
                        {lead.deal_offer && (
                          <p className="text-xs text-orange-600 mt-0.5">
                            🎟 {lead.deal_offer}
                            {lead.deal_price != null && (
                              <> — ${lead.deal_price}{lead.original_price != null ? <span className="text-gray-400 line-through ml-1">${lead.original_price}</span> : null}</>
                            )}
                          </p>
                        )}
                        {lead.payment_method && (
                          <p className="text-xs text-gray-400 mt-0.5">💳 {lead.payment_method}</p>
                        )}
                        {lead.rating && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-gray-500">{lead.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{lead.city}{lead.state ? `, ${lead.state}` : ''}</p>
                        {lead.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.business_name} ${lead.address}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Google Maps"
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors max-w-[180px] group mt-0.5"
                          >
                            <Navigation className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate">{lead.address}</span>
                          </a>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-orange-600 transition-colors mb-1">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </a>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors">
                            <Globe className="w-3 h-3" />
                            <span className="max-w-[120px] truncate">
                              {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </span>
                          </a>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLead(lead.id, { status: e.target.value as LeadStatus })}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer appearance-none ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                            <option key={val} value={val}>{cfg.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Groupon toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleUpdateLead(lead.id, { on_groupon: !lead.on_groupon })}
                          className={`text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                            lead.on_groupon
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {lead.on_groupon ? 'G Groupon' : 'No'}
                        </button>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 min-w-[180px]">
                          <input
                            type="email"
                            defaultValue={lead.email || ''}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (lead.email || '')) {
                                handleUpdateLead(lead.id, { email: val || null } as Partial<VendorLead>);
                              }
                            }}
                            placeholder="email@business.com"
                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent"
                          />
                          <button
                            onClick={() => openEmailModal(lead)}
                            title={lead.email_sent_at ? `Last sent ${new Date(lead.email_sent_at).toLocaleDateString()}` : 'Send pitch email'}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                              lead.email_sent_at
                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                          >
                            {lead.email_sent_at
                              ? <CheckCircle2 className="w-3.5 h-3.5" />
                              : <Send className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                        {lead.email_sent_at && (
                          <p className="text-[10px] text-green-600 mt-0.5 pl-0.5">
                            Sent {new Date(lead.email_sent_at).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editingNotes[lead.id] ?? (lead.notes || '')}
                          onChange={(e) => setEditingNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                          onBlur={() => {
                            const val = editingNotes[lead.id];
                            if (val !== undefined && val !== (lead.notes || '')) {
                              handleUpdateLead(lead.id, { notes: val });
                            }
                          }}
                          placeholder="Add notes..."
                          className="w-full min-w-[140px] text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-transparent"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openCallScript(lead)}
                            title="Open call script for this lead"
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-orange-600 hover:text-white hover:bg-orange-500 border border-orange-200 rounded-lg transition-colors"
                          >
                            <PhoneCall className="w-3.5 h-3.5" /> Call
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id, lead.place_id)}
                            disabled={deletingId === lead.id}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === lead.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Call script popup */}
      {callOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900">
                  Cold Call Script {callLead ? `— ${callLead.business_name}` : ''}
                </h2>
              </div>
              <button
                onClick={() => setCallOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Who you're calling */}
              {callLead && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-gray-900">{callLead.business_name}</p>
                  {callLead.contact_name && <p className="text-gray-600">Ask for: {callLead.contact_name}</p>}
                  {callLead.phone && (
                    <a href={`tel:${callLead.phone}`} className="inline-flex items-center gap-1.5 text-orange-600 font-medium mt-1 hover:underline">
                      <Phone className="w-4 h-4" /> {callLead.phone}
                    </a>
                  )}
                  {(callLead.city || callLead.category) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {[callLead.category, callLead.city && `${callLead.city}${callLead.state ? `, ${callLead.state}` : ''}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              )}

              {/* SpontiCoupon number + offer */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">SpontiCoupon callback #</p>
                    <a href={`tel:${SPONTI_TEL}`} className="text-lg font-bold text-gray-900 hover:text-orange-600">{SPONTI_PHONE}</a>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(SPONTI_PHONE); showToast('Number copied', 'success'); }}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-semibold">The offer:</span> 3 months free · no credit card · I set it all up for you.
                  Sign-up promo code <span className="font-mono font-semibold text-orange-700">{PROMO_CODE}</span> · {SPONTI_SITE}
                </p>
              </div>

              {/* Opening pitch — editable so you can tweak it live on the call */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Opening
                  </p>
                  <button
                    type="button"
                    onClick={() => setCallOpener(buildOpener())}
                    className="text-[11px] text-gray-400 hover:text-orange-600 transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  value={callOpener}
                  onChange={(e) => setCallOpener(e.target.value)}
                  rows={5}
                  placeholder="Your opening line…"
                  className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y min-h-[110px]"
                />
                <p className="text-[11px] text-gray-400 mt-1">Edit this however you want — say it in your own words.</p>
              </div>

              {/* Their current deals — scraped from their site */}
              {callLead && (
                <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Their current deals
                    </p>
                    <button
                      onClick={scanPlatformDeals}
                      disabled={callDealsLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {callDealsLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning…</>
                        : <><Search className="w-3.5 h-3.5" /> Scan for deals</>}
                    </button>
                  </div>

                  {!callDeals && !callDealsLoading && !callDealsError && (
                    <p className="text-xs text-gray-500">
                      Pulls the deals they currently advertise so you can reference them on the call.
                    </p>
                  )}
                  {callDealsError && (
                    <p className="text-xs text-red-600">{callDealsError}</p>
                  )}

                  {callDeals && (
                    <>
                      {callDeals.length > 0 ? (
                        <ul className="space-y-1.5 mb-3">
                          {callDeals.map((d, i) => (
                            <li key={i} className="text-sm text-gray-800 bg-white border border-emerald-100 rounded-lg px-3 py-2">
                              <span className="font-semibold">{d.title}</span>
                              {d.details && <span className="text-gray-600"> — {d.details}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500 mb-3">
                          No specific deals found on their site.{callDealsSummary ? ` ${callDealsSummary}` : ''}
                        </p>
                      )}

                      {callDeals.length > 0 && (
                        <p className="text-sm text-emerald-900 bg-white border border-emerald-200 rounded-lg p-3 leading-relaxed">
                          <MessageSquare className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                          &ldquo;Hey, I saw you&rsquo;ve got {callDeals.length === 1 ? 'this deal' : 'a couple deals'} going right now — mind if I throw {callDeals.length === 1 ? 'it' : 'them'} up
                          on our platform too? Won&rsquo;t cost you anything, I&rsquo;ll set it all up, and we&rsquo;ll start pushing your business out there for free.&rdquo;
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Info to collect — editable inputs when tied to a lead */}
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Grab this while you’re on the call
                </p>

                {callLead ? (
                  <div className="space-y-3">
                    {/* Contact + account basics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {callField('Contact name', 'contact_name')}
                      {callField('Phone', 'phone')}
                      {callField('Email (their login)', 'email', { type: 'email' })}
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Category</span>
                        <select value={callForm.category} onChange={(e) => setCallForm((f) => ({ ...f, category: e.target.value }))}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="">Category…</option>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </label>
                      {callField('Website', 'website', { full: true })}
                      {callField('Street address', 'address', { full: true })}
                      {callField('City', 'city')}
                      <div className="grid grid-cols-2 gap-2">
                        {callField('State', 'state')}
                        {callField('Zip', 'zip')}
                      </div>
                    </div>

                    {/* Their deal */}
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide pt-1">Their deal</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {callField('The offer', 'deal_offer', { full: true, placeholder: 'e.g. BOGO wings' })}
                      {callField('Original price ($)', 'original_price', { type: 'number' })}
                      {callField('Deal price ($)', 'deal_price', { type: 'number' })}
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Deal type</span>
                        <select value={callForm.deal_type} onChange={(e) => setCallForm((f) => ({ ...f, deal_type: e.target.value }))}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                          <option value="">Deal type…</option>
                          <option value="sponti_coupon">Sponti (flash, 4–24 hrs)</option>
                          <option value="regular">Steady (ongoing)</option>
                        </select>
                      </label>
                      {callField('How they get paid', 'payment_method', { placeholder: 'Venmo @handle' })}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Call notes</p>
                      <textarea value={callForm.notes} onChange={(e) => setCallForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={7} placeholder="Type anything they say here — pain points, objections, follow-ups, who to ask for next time…"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 leading-relaxed resize-y min-h-[140px]" />
                    </div>
                  </div>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {CALL_CHECKLIST.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-orange-400 mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Rebuttals */}
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> If they say… you say
                </p>
                <div className="space-y-2">
                  {CALL_REBUTTALS.map((r) => (
                    <div key={r.objection} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-gray-900">{r.objection}</p>
                      <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{r.response}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer — save what you typed + log the outcome (only when tied to a lead) */}
            {callLead && (
              <div className="px-6 py-4 border-t border-gray-100 shrink-0">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs text-gray-400">Log the outcome:</p>
                  <button
                    onClick={saveCallForm}
                    disabled={callSaving}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {callSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Save
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {([
                    { status: 'interested'     as LeadStatus, label: 'Interested',     cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                    { status: 'signed_up'      as LeadStatus, label: 'Signed Up',      cls: 'bg-green-100 text-green-700 hover:bg-green-200' },
                    { status: 'follow_up'      as LeadStatus, label: 'Follow Up',      cls: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                    { status: 'no_answer'      as LeadStatus, label: 'No Answer',      cls: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
                    { status: 'cold_email_sent' as LeadStatus, label: 'Cold Email',    cls: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
                    { status: 'email_sent'     as LeadStatus, label: 'Warm Email',     cls: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
                    { status: 'not_interested' as LeadStatus, label: 'Not Interested', cls: 'bg-red-100 text-red-700 hover:bg-red-200' },
                  ]).map(({ status, label, cls }) => (
                    <button
                      key={status}
                      onClick={() => logCallOutcome(status, label)}
                      disabled={callSaving}
                      className={`text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${cls}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email compose modal */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Send Pitch Email</h2>
              </div>
              <button
                onClick={() => setEmailModal(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
              {/* Recipient name → fills {Name} in the warm template (cold greets the business) */}
              {emailModal.emailType === 'warm' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name (fills “Hey ___,”)</label>
                  <input
                    type="text"
                    value={emailModal.recipientName}
                    onChange={(e) => setEmailModal((prev) => prev ? { ...prev, recipientName: e.target.value } : null)}
                    placeholder="e.g. Jason"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}

              {/* Cold vs warm — sets the lead status when you send */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mark this email as</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEmailType('cold')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      emailModal.emailType === 'cold' ? 'bg-cyan-100 border-cyan-300 text-cyan-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    ❄️ Cold Email
                  </button>
                  <button
                    onClick={() => setEmailType('warm')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      emailModal.emailType === 'warm' ? 'bg-teal-100 border-teal-300 text-teal-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    🔥 Warm Email
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Switching swaps the message to the cold or warm template.</p>
              </div>

              {/* To */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="email"
                  value={emailModal.toEmail}
                  onChange={(e) => setEmailModal((prev) => prev ? { ...prev, toEmail: e.target.value } : null)}
                  placeholder="recipient@business.com"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailModal.subject}
                  onChange={(e) => setEmailModal((prev) => prev ? { ...prev, subject: e.target.value } : null)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
                <textarea
                  value={emailModal.body}
                  onChange={(e) => setEmailModal((prev) => prev ? { ...prev, body: e.target.value } : null)}
                  rows={14}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none font-mono leading-relaxed"
                />
                <p className="text-[11px] text-gray-400 mt-1"><code>{'{Name}'}</code> is replaced with the name above when you Copy or Open in Gmail.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailModal.toEmail.trim()}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                title="Send via SpontiCoupon (Resend) — better for opted-in emails, not cold outreach"
              >
                {sendingEmail ? 'Sending…' : 'or send via SpontiCoupon'}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setEmailModal(null)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-2">
                  Cancel
                </button>
                <button
                  onClick={copyPitch}
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {pitchCopied ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
                <button
                  onClick={openInGmail}
                  disabled={!emailModal.toEmail.trim()}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" /> Open in Gmail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print styles for CSV printout */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
