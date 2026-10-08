import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Server, Tag, LayoutDashboard, Calendar, User, 
  Settings, Pencil, Check, X, Shield, Plus, Trash2, Power, AlertTriangle,
  Rocket, ExternalLink, Eye, CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function OrgApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authUser = useAuth();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Users Assignment State
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [allOrgUsers, setAllOrgUsers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState('');

  // Status State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  useEffect(() => {
    fetchApplicationDetails();
    fetchAssignedUsers();
  }, [id]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const res = await orgFetch(`/api/org/applications/${id}`);
      if (!res.ok) throw new Error('Failed to load application');
      const data = await res.json();
      setApp(data);
      setEditForm({
        app_name: data.app_name,
        app_description: data.app_description || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedUsers = async () => {
    try {
      const res = await orgFetch(`/api/org/applications/${id}/users`);
      if (res.ok) {
        const data = await res.json();
        setAssignedUsers(data.assigned);
        setAllOrgUsers(data.allOrgUsers);
      }
    } catch (err) {
      console.error('Failed to fetch assigned users:', err);
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const res = await orgFetch(`/api/org/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update application');
      }
      setIsEditing(false);
      fetchApplicationDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await orgFetch(`/api/org/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchApplicationDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await orgFetch(`/api/org/applications/${id}/publish`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (data.errors ? data.errors.join('\n') : 'Failed to publish application'));
      }
      alert(data.message || `Application published successfully as version ${data.version}!`);
      fetchApplicationDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Are you sure you want to unpublish this application? Public runtime access will be deactivated, but all your data remains intact.')) {
      return;
    }
    setUnpublishing(true);
    try {
      const res = await orgFetch(`/api/org/applications/${id}/unpublish`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unpublish application');
      alert(data.message || 'Application has been unpublished.');
      fetchApplicationDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setUnpublishing(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUserToAssign) return;
    setAssigning(true);
    try {
      const res = await orgFetch(`/api/org/applications/${id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserToAssign })
      });
      if (!res.ok) throw new Error('Failed to assign user');
      setSelectedUserToAssign('');
      fetchAssignedUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      const res = await orgFetch(`/api/org/applications/${id}/users/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove user');
      fetchAssignedUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-10 text-white">Loading application details...</div>;
  }

  if (error || !app) {
    return <div className="p-10 text-red-500">{error || 'Application not found'}</div>;
  }

  // Filter out users who are already assigned
  const availableUsersToAssign = allOrgUsers.filter(
    u => !assignedUsers.some(au => au.id === u.id) && u.status === 'active'
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/org-admin/dashboard/apps')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="h-6 w-6 text-primary-400" />
            {app.app_name}
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage application details, status, and user assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Status */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Application Details Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-gray-400" />
                Application Information
              </h2>
              {!isEditing ? (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit Details
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveDetails} disabled={saving} className="bg-primary-600">
                    <Check className="h-4 w-4 mr-2" /> Save
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Application Name</label>
                  <Input 
                    value={editForm.app_name} 
                    onChange={e => setEditForm({...editForm, app_name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                  <textarea 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    value={editForm.app_description}
                    onChange={e => setEditForm({...editForm, app_description: e.target.value})}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  <p className="text-white font-medium text-lg">{app.app_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-300">{app.app_description || 'No description provided.'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Industry</p>
                    <p className="text-white capitalize">{app.industry || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Template</p>
                    <p className="text-white">{app.industry_template || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Created By</p>
                    <p className="text-white">{app.created_by}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Created At</p>
                    <p className="text-white">{fmtDate(app.created_at)}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* User Assignment Card */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-gray-400" />
              Assigned Users
            </h2>
            
            {/* Assign User Dropdown */}
            <div className="flex gap-3 mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
              <select 
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedUserToAssign}
                onChange={e => setSelectedUserToAssign(e.target.value)}
              >
                <option value="">Select a user to assign...</option>
                {availableUsersToAssign.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <Button 
                onClick={handleAssignUser} 
                disabled={!selectedUserToAssign || assigning}
                className="bg-primary-600 hover:bg-primary-500"
              >
                <Plus className="h-4 w-4 mr-2" /> Assign User
              </Button>
            </div>

            {/* Assigned Users List */}
            {assignedUsers.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                No users are currently assigned to this application.
              </div>
            ) : (
              <div className="space-y-3">
                {assignedUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{u.name}</p>
                        <p className="text-gray-500 text-xs">{u.email} • Assigned {new Date(u.assigned_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveUser(u.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* Right Column: Status & Actions */}
        <div className="space-y-6">
          {/* Publishing & Deployment Card */}
          <Card className="p-6 bg-gradient-to-br from-primary-950/30 to-dark-200 border-primary-500/20">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary-400" />
              Publishing & Deployment
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-gray-300 text-xs font-medium">Published Version</span>
                <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {app.published_version ? `v${app.published_version}` : 'v1.0 (Draft)'}
                </span>
              </div>

              {app.status === 'published' ? (
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-xs py-2.5" 
                    onClick={() => window.open(`/app/${(app.app_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || app.id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" /> Open Live Application
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-primary-300 hover:text-white gap-2 text-xs py-2.5" 
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    <Rocket className="h-4 w-4" /> {publishing ? 'Publishing...' : 'Publish New Version'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2 text-xs py-2.5" 
                    onClick={handleUnpublish}
                    disabled={unpublishing}
                  >
                    <Power className="h-4 w-4" /> {unpublishing ? 'Unpublishing...' : 'Unpublish Application'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-primary-600 hover:bg-primary-500 text-white gap-2 text-xs py-2.5" 
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    <Rocket className="h-4 w-4" /> {publishing ? 'Publishing...' : 'Publish Application'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 text-xs py-2.5" 
                    onClick={() => window.open(`/preview/${app.id}`, '_blank')}
                  >
                    <Eye className="h-4 w-4 text-primary-400" /> Preview Application
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Lifecycle Status Card */}
          <Card className="p-6 bg-gradient-to-br from-white/5 to-transparent">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Lifecycle Status
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-gray-300 text-sm">Current Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  app.status === 'published' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  app.status === 'unpublished' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                  app.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  app.status === 'preview' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {app.status}
                </span>
              </div>

              <div className="space-y-2 mt-2">
                {app.status === 'draft' && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-500 text-white text-xs" 
                    onClick={() => handleUpdateStatus('active')}
                    disabled={updatingStatus}
                  >
                    <Power className="h-4 w-4 mr-2" /> Mark as Active
                  </Button>
                )}
                
                {app.status === 'active' && (
                  <Button 
                    variant="secondary" 
                    className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs" 
                    onClick={() => handleUpdateStatus('draft')}
                    disabled={updatingStatus}
                  >
                    <Power className="h-4 w-4 mr-2" /> Revert to Draft
                  </Button>
                )}

                {app.status === 'unpublished' && (
                  <Button 
                    variant="secondary" 
                    className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 text-xs" 
                    onClick={() => handleUpdateStatus('draft')}
                    disabled={updatingStatus}
                  >
                    <Power className="h-4 w-4 mr-2" /> Restore to Draft
                  </Button>
                )}
              </div>
              
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Status changes are immediately reflected across your organization. Only published applications are accessible via public runtime.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
