import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Server, Tag, LayoutDashboard, Calendar, User, 
  Settings, Pencil, Check, X, Shield, Plus, Trash2, Power, AlertTriangle
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/org-admin/apps')}>
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
          <Card className="p-6 bg-gradient-to-br from-white/5 to-transparent">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Lifecycle Status
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-gray-300 text-sm">Current Status</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  app.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  app.status === 'draft' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                  'bg-orange-500/20 text-orange-400 border-orange-500/30'
                }`}>
                  {app.status}
                </span>
              </div>

              <div className="space-y-2 mt-2">
                {app.status === 'draft' && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-500 text-white" 
                    onClick={() => handleUpdateStatus('active')}
                    disabled={updatingStatus}
                  >
                    <Power className="h-4 w-4 mr-2" /> Activate Application
                  </Button>
                )}
                
                {app.status === 'active' && (
                  <Button 
                    variant="secondary" 
                    className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10" 
                    onClick={() => handleUpdateStatus('inactive')}
                    disabled={updatingStatus}
                  >
                    <Power className="h-4 w-4 mr-2" /> Deactivate Application
                  </Button>
                )}

                {app.status === 'inactive' && (
                  <Button 
                    variant="secondary" 
                    className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10" 
                    onClick={() => handleUpdateStatus('active')}
                    disabled={updatingStatus}
                  >
                    <Power className="h-4 w-4 mr-2" /> Reactivate Application
                  </Button>
                )}
              </div>
              
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Status changes are immediately reflected across your organization. Users can only access active applications.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
