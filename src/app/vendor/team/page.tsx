'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVendorTier } from '@/lib/hooks/useVendorTier';
import { UpgradePrompt } from '@/components/vendor/UpgradePrompt';
import {
  Users, Plus, Pencil, UserX, Loader2, Save, X,
  Mail, Shield, MapPin, AlertCircle, CheckCircle2,
  UserPlus, Crown, Star,
} from 'lucide-react';
import type { TeamMember, TeamRole, VendorLocation } from '@/lib/types/database';

interface MemberForm {
  email: string;
  name: string;
  role: TeamRole;
  location_id: string;
}

const emptyForm: MemberForm = { email: '', name: '', role: 'staff', location_id: '' };

const ROLE_CONFIG: Record<TeamRole, { label: string; description: string; icon: typeof Shield; color: string }> = {
  admin: { label: 'Admin', description: 'Full access to all features', icon: Crown, color: 'text-amber-600 bg-amber-50' },
  manager: { label: 'Manager', description: 'Manage deals, view analytics', icon: Star, color: 'text-primary-600 bg-primary-50' },
  staff: { label: 'Staff', description: 'Redeem deals, view dashboard', icon: Shield, color: 'text-gray-600 bg-gray-50' },
};

export default function TeamPage() {
  const { user } = useAuth();
  const { canAccess, loading: tierLoading } = useVendorTier();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasAccess = canAccess('team_access');

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchMembers(), fetchLocations()]).then(() => setLoading(false));
  }, [user]);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/vendor/team');
      const data = await res.json();
      setMembers(data.members || []);
    } catch { /* ignore */ }
  }

  async function fetchLocations() {
    try {
      const res = await fetch('/api/vendor/locations');
      const data = await res.json();
      setLocations(data.locations || []);
    } catch { /* ignore */ }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInvite = async () => {
    if (!form.email || !form.name) {
      setMessage({ type: 'error', text: 'Email and name are required.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vendor/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setMembers(prev => [...prev, data.member]);
        setForm(emptyForm);
        setShowInviteForm(false);
        setMessage({ type: 'success', text: 'Team member invited!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to invite team member.' });
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/vendor/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, role: form.role, location_id: form.location_id || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error });
      } else {
        setMembers(prev => prev.map(m => m.id === editingId ? data.member : m));
        setEditingId(null);
        setForm(emptyForm);
        setMessage({ type: 'success', text: 'Team member updated!' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update team member.' });
    }
    setSaving(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Remove this team member? They will lose access to your account.')) return;
    try {
      const res = await fetch(`/api/vendor/team?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'revoked' as const } : m));
        setMessage({ type: 'success', text: 'Team member removed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove team member.' });
    }
  };

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setShowInviteForm(false);
    setForm({
      email: member.email,
      name: member.name,
      role: member.role,
      location_id: member.location_id || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowInviteForm(false);
    setForm(emptyForm);
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
        requiredTier="business"
        featureName="Team Member Access"
        description="Invite team members, assign roles, and manage access across your business locations."
        mode="full-page"
      />
    );
  }

  const activeMembers = members.filter(m => m.status !== 'revoked');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary-500" />
          <div>
            <h1 className="text-3xl font-bold text-secondary-500">Team</h1>
            <p className="text-gray-500 text-sm mt-1">Manage team members and their roles</p>
          </div>
        </div>
        <button
          onClick={() => { setShowInviteForm(true); setEditingId(null); setForm(emptyForm); }}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
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

      {/* Invite / Edit Form */}
      {(showInviteForm || editingId) && (
        <div className="card p-6 mb-6 border-2 border-primary-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-500">{editingId ? 'Edit Member' : 'Invite Team Member'}</h3>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="John Doe" required disabled={!!editingId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="john@example.com" required disabled={!!editingId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="input-field">
                <option value="staff">Staff — Redeem deals, view dashboard</option>
                <option value="manager">Manager — Manage deals, view analytics</option>
                <option value="admin">Admin — Full access to all features</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Location (optional)</label>
              <select name="location_id" value={form.location_id} onChange={handleChange} className="input-field">
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Role description */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(Object.entries(ROLE_CONFIG) as [TeamRole, typeof ROLE_CONFIG['admin']][]).map(([key, config]) => {
              const IconComp = config.icon;
              return (
                <div key={key} className={`p-3 rounded-lg border text-center ${
                  form.role === key ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}>
                  <IconComp className={`w-5 h-5 mx-auto mb-1 ${form.role === key ? 'text-primary-500' : 'text-gray-400'}`} />
                  <p className="text-xs font-semibold text-gray-700">{config.label}</p>
                  <p className="text-[10px] text-gray-400">{config.description}</p>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={cancelEdit} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              onClick={editingId ? handleUpdate : handleInvite}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {editingId ? 'Update' : 'Send Invite'}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      {activeMembers.length === 0 && !showInviteForm ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-500 mb-1">No Team Members Yet</h3>
          <p className="text-sm text-gray-400 mb-4">Invite team members to help manage your deals and locations.</p>
          <button
            onClick={() => { setShowInviteForm(true); setForm(emptyForm); }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Invite Your First Member
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeMembers.map((member) => {
            const roleConfig = ROLE_CONFIG[member.role];
            const RoleIcon = roleConfig.icon;
            return (
              <div key={member.id} className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${roleConfig.color}`}>
                    <RoleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-secondary-500">{member.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {member.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {member.email}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <Shield className="w-3 h-3" /> {roleConfig.label}
                      {member.location_id && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {locations.find(l => l.id === member.location_id)?.name || 'Unknown'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(member)} className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRevoke(member.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
