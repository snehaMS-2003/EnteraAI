import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Calendar, Phone, MapPin, Globe, Shield, RefreshCw, Pencil, Check, X, Save } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function OrgProfile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    name: '',
    admin_name: '',
    phone: '',
    industry: '',
    industry_specific: '',
    address: '',
    city: '',
    state: '',
    county: '',
    district: '',
    pincode: '',
    website: ''
  });

  const fetchProfile = async () => {
    try {
      const res = await orgFetch('/api/org/profile');
      if (!res.ok) {
        throw new Error('Failed to fetch organization profile');
      }
      const data = await res.json();
      setProfile(data);
      setForm({
        name: data.name || '',
        admin_name: data.admin_name || '',
        phone: data.phone || '',
        industry: data.industry || '',
        industry_specific: data.industry_specific || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        county: data.county || '',
        district: data.district || '',
        pincode: data.pincode || '',
        website: data.website || ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.organizationId) {
      fetchProfile();
    } else if (user && !user.organizationId) {
      setLoading(false);
      setError('No organization ID associated with your account.');
    }
  }, [user]);

  const handleStartEdit = () => {
    if (!profile) return;
    setForm({
      name: profile.name || '',
      admin_name: profile.admin_name || '',
      phone: profile.phone || '',
      industry: profile.industry || '',
      industry_specific: profile.industry_specific || '',
      address: profile.address || '',
      city: profile.city || '',
      state: profile.state || '',
      county: profile.county || '',
      district: profile.district || '',
      pincode: profile.pincode || '',
      website: profile.website || ''
    });
    setError('');
    setSuccessMsg('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Organization name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await orgFetch('/api/org/profile', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update organization profile');
      }

      setProfile(data.organization);
      if (updateUser) {
        updateUser({
          organizationName: data.organization.name,
          organizationIndustry: data.organization.industry
        });
      }
      setIsEditing(false);
      setSuccessMsg('Organization profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-400" />
          <p className="text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if ((error && !profile) || !profile) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm max-w-4xl mx-auto">
        {error || 'Profile not found'}
      </div>
    );
  }

  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
            <Building2 className="h-6 w-6 text-primary-400" />
            Organization Profile
          </h1>
          <p className="text-gray-400 text-sm">
            View and manage your organization details and settings.
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleStartEdit} className="gap-2 bg-primary-600 hover:bg-primary-500 shrink-0">
            <Pencil className="h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300"><X className="h-4 w-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-300"><X className="h-4 w-4" /></button>
        </div>
      )}

      {isEditing ? (
        /* Edit Profile Form */
        <Card className="p-8 border-white/10">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Edit Organization Information</h2>
              <span className="text-xs text-gray-400">Org ID: {profile.id}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Organization Name *</label>
                <Input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Admin Name</label>
                <Input
                  value={form.admin_name}
                  onChange={e => setForm({ ...form, admin_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website</label>
                <Input
                  value={form.website}
                  onChange={e => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Industry</label>
                <Input
                  value={form.industry}
                  onChange={e => setForm({ ...form, industry: e.target.value })}
                  placeholder="e.g. Healthcare, Finance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Sub-Industry</label>
                <Input
                  value={form.industry_specific}
                  onChange={e => setForm({ ...form, industry_specific: e.target.value })}
                  placeholder="e.g. Hospital Management"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Address & Location</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Street Address</label>
                  <Input
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Innovation Way"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">City</label>
                    <Input
                      value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">State / Province</label>
                    <Input
                      value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">District / County</label>
                    <Input
                      value={form.district}
                      onChange={e => setForm({ ...form, district: e.target.value })}
                      placeholder="District"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Postal Code</label>
                    <Input
                      value={form.pincode}
                      onChange={e => setForm({ ...form, pincode: e.target.value })}
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" variant="secondary" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary-600 hover:bg-primary-500 gap-2 min-w-[130px]">
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        /* View Profile Cards */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <Card className="md:col-span-2 p-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary-500/20 text-primary-400 flex items-center justify-center text-2xl font-bold border border-primary-500/30">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    profile.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }`}>
                    {profile.status ? profile.status.toUpperCase() : 'ACTIVE'}
                  </span>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    Org ID: {profile.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/10">
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Primary Email
                </p>
                <p className="text-white font-medium">{profile.email}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Admin Name
                </p>
                <p className="text-white font-medium">{profile.admin_name || '—'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone Number
                </p>
                <p className="text-white font-medium">{profile.phone || '—'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Website
                </p>
                <p className="text-primary-400 hover:underline">
                  {profile.website ? (
                    <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer">
                      {profile.website}
                    </a>
                  ) : '—'}
                </p>
              </div>
            </div>
          </Card>

          {/* Secondary Info Card */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider text-gray-400">
                Business Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Industry</p>
                  <p className="text-sm text-white capitalize">{profile.industry || '—'}</p>
                </div>
                {profile.industry_specific && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Sub-Industry</p>
                    <p className="text-sm text-white capitalize">{profile.industry_specific}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Registration Date
                  </p>
                  <p className="text-sm text-white">{fmtDate(profile.created_at)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </h3>
              <div className="space-y-2 text-sm text-white">
                {profile.address || profile.city || profile.state ? (
                  <>
                    {profile.address && <p className="text-gray-300">{profile.address}</p>}
                    <p>{profile.city}{profile.city && profile.state ? ', ' : ''}{profile.state}</p>
                    <p>{profile.county || profile.district}{profile.pincode ? ` - ${profile.pincode}` : ''}</p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">No address provided</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
