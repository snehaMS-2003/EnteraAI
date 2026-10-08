import React, { useState, useEffect } from 'react';
import { useAuth, orgFetch } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { User, Mail, Building, Briefcase, Lock, Server, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export function UserProfile() {
  const authUser = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  
  const [form, setForm] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReports: false,
    securityNotices: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = async () => {
    setPageLoading(true);
    setPageError('');
    try {
      const res = await orgFetch('/api/users/profile');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load profile data.');
      }
      const data = await res.json();
      setProfile(data);
      setForm(prev => ({ ...prev, name: data.name || '' }));
    } catch (err) {
      setPageError(err.message);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await orgFetch('/api/users/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess('Password updated successfully.');
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.name || !form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await orgFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: form.name.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      setSuccess('Profile updated successfully.');
      setProfile(prev => ({ ...prev, name: data.user.name }));
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.name = data.user.name;
        localStorage.setItem('user', JSON.stringify(stored));
      } catch {}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 font-medium tracking-wide">Loading profile...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 max-w-md">
          <p className="font-medium mb-1">Failed to load profile</p>
          <p className="text-sm opacity-80">{pageError}</p>
        </div>
        <Button onClick={fetchProfile} className="gap-2" variant="outline">
          <RefreshCcw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Settings</h1>
        <p className="text-gray-400">Manage your account settings, profile, and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Information & System Information Column */}
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Profile Information</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-2xl font-bold">
                    {profile.name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">{profile.name}</p>
                    <StatusBadge status={profile.status} />
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Email Address</p>
                      <p className="text-sm text-white">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="text-sm text-white capitalize">{profile.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Organization</p>
                      <p className="text-sm text-white">{profile.organization_name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Server className="h-5 w-5 text-primary-400" /> System Information
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-gray-400 text-sm">Platform name</span>
                  <span className="text-white font-medium text-sm">Entera.ai</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-gray-400 text-sm">Account role</span>
                  <span className="text-primary-400 font-medium text-sm capitalize">{profile.role?.replace('_', ' ')}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Account Settings Column */}
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Account Settings</h2>
              
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-500 text-sm">
                  {success}
                </div>
              )}

              <div className="space-y-8">
                {/* Edit Profile */}
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Edit Profile</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                    <div className="flex gap-2">
                      <Input 
                        value={form.name}
                        onChange={e => setForm({...form, name: e.target.value})}
                      />
                      <Button type="submit" variant="secondary" className="whitespace-nowrap">Save</Button>
                    </div>
                  </div>
                </form>

                <div className="w-full h-px bg-white/10" />

                {/* Change Password */}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4" /> Change Password
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                    <Input 
                      required 
                      type="password" 
                      placeholder="••••••••" 
                      value={form.currentPassword}
                      onChange={e => setForm({...form, currentPassword: e.target.value})}
                    />
                  </div>
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                    <Input 
                      required 
                      type="password" 
                      placeholder="••••••••" 
                      value={form.newPassword}
                      onChange={e => setForm({...form, newPassword: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                    <Input 
                      required 
                      type="password" 
                      placeholder="••••••••" 
                      value={form.confirmPassword}
                      onChange={e => setForm({...form, confirmPassword: e.target.value})}
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-500">
                      {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>

                <div className="w-full h-px bg-white/10" />

                {/* Notification Preferences */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-2">Notification Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <span className="text-sm text-gray-300">Email Alerts</span>
                      <input 
                        type="checkbox" 
                        checked={notifications.emailAlerts}
                        onChange={(e) => setNotifications({...notifications, emailAlerts: e.target.checked})}
                        className="rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <span className="text-sm text-gray-300">Weekly Reports</span>
                      <input 
                        type="checkbox" 
                        checked={notifications.weeklyReports}
                        onChange={(e) => setNotifications({...notifications, weeklyReports: e.target.checked})}
                        className="rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <span className="text-sm text-gray-300">Security Notices</span>
                      <input 
                        type="checkbox" 
                        checked={notifications.securityNotices}
                        onChange={(e) => setNotifications({...notifications, securityNotices: e.target.checked})}
                        className="rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>

              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    invited: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };
  const style = styles[status?.toLowerCase()] || styles.inactive;
  return (
    <span className={`px-2 py-0.5 mt-1 inline-block rounded text-[10px] font-medium border uppercase tracking-wider ${style}`}>
      {status || 'Unknown'}
    </span>
  );
}
