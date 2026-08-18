import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Calendar, Phone, MapPin, Globe, Shield, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function OrgProfile() {
  const user = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !user.organizationId) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await orgFetch('/api/org/profile');
        if (!res.ok) {
          throw new Error('Failed to fetch organization profile');
        }
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

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

  if (error || !profile) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm">
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
          <Building2 className="h-6 w-6 text-primary-400" />
          Organization Profile
        </h1>
        <p className="text-gray-400 text-sm">
          View your organization details and settings.
        </p>
      </div>

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
              <p className="text-white font-medium">{profile.admin_name}</p>
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
              {profile.address ? (
                <>
                  <p className="text-gray-300">{profile.address}</p>
                  <p>{profile.city}{profile.city && profile.state ? ', ' : ''}{profile.state}</p>
                  <p>{profile.county}{profile.county && profile.pincode ? ' - ' : ''}{profile.pincode}</p>
                  <p>{profile.district}</p>
                </>
              ) : (
                <p className="text-gray-500 italic">No address provided</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
