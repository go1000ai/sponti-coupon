'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import {
  Key, Plus, Trash2, Loader2, Copy, Eye, EyeOff,
  AlertCircle, CheckCircle2, Code,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasAccess = canAccess('api_access');

  useEffect(() => {
    if (!user) return;
    fetchKeys();
  }, [user]);

  async function fetchKeys() {
    try {
      const res = await fetch('/api/vendor/api-keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a name for the API key.' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vendor/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setKeys(prev => [data.key, ...prev]);
        setNewSecret(data.secret);
        setNewKeyName('');
        setShowCreateForm(false);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to create API key.' });
    }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? Any integrations using this key will stop working.')) return;
    try {
      const res = await fetch(`/api/vendor/api-keys?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
        setMessage({ type: 'success', text: 'API key revoked.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to revoke API key.' });
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        featureName="API Access"
        description="Create API keys to programmatically manage deals, view analytics, and integrate with your existing systems."
        mode="full-page"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Key className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Access</h1>
            <p className="text-gray-500 text-sm mt-1">Manage API keys for your integrations</p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); setNewSecret(null); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New API Key
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* New Secret Display (shown only once after creation) */}
      {newSecret && (
        <div className="card p-6 mb-6 border-2 border-amber-300 bg-amber-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">Save Your API Key</h3>
          </div>
          <p className="text-sm text-amber-700 mb-3">
            Copy this key now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 p-3">
            <code className="flex-1 text-sm font-mono text-gray-800 break-all">
              {showSecret ? newSecret : '•'.repeat(40)}
            </code>
            <button onClick={() => setShowSecret(!showSecret)} className="p-1.5 text-gray-500 hover:text-gray-700">
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => copyToClipboard(newSecret)} className="p-1.5 text-gray-500 hover:text-primary-500">
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewSecret(null)} className="text-sm text-amber-600 hover:text-amber-800 mt-3 font-medium">
            I&apos;ve saved this key — dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && !newSecret && (
        <div className="card p-6 mb-6 border-2 border-primary-200">
          <h3 className="font-bold text-gray-900 mb-4">Create New API Key</h3>
          <div className="flex gap-3">
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              className="input-field flex-1"
              placeholder="Key name (e.g., POS Integration, CRM Sync)"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Generate
            </button>
          </div>
          <button onClick={() => setShowCreateForm(false)} className="text-sm text-gray-500 hover:text-gray-700 mt-2">Cancel</button>
        </div>
      )}

      {/* API Documentation Quick Reference */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-5 h-5 text-primary-500" />
          <h3 className="font-bold text-gray-900">Quick Reference</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Base URL</p>
            <code className="bg-gray-100 px-3 py-1.5 rounded text-xs font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}/api/v1</code>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Authentication</p>
            <code className="bg-gray-100 px-3 py-1.5 rounded text-xs font-mono">Authorization: Bearer sc_live_your_key_here</code>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Endpoints</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">GET</span>
                <code className="text-xs font-mono text-gray-600">/api/v1/deals</code>
                <span className="text-xs text-gray-400">— List your deals</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">POST</span>
                <code className="text-xs font-mono text-gray-600">/api/v1/deals</code>
                <span className="text-xs text-gray-400">— Create a deal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keys List */}
      {keys.length === 0 && !showCreateForm ? (
        <div className="card p-12 text-center">
          <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">No API Keys</h3>
          <p className="text-sm text-gray-400 mb-4">Create an API key to start integrating with your systems.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Your First Key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className={`card p-5 flex items-center justify-between ${
              !key.is_active ? 'opacity-50' : ''
            }`}>
              <div className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${key.is_active ? 'bg-green-50' : 'bg-gray-100'}`}>
                  <Key className={`w-5 h-5 ${key.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{key.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      key.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-mono">{key.key_prefix}</p>
                  <p className="text-xs text-gray-400">
                    Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              {key.is_active && (
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Revoke this key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
