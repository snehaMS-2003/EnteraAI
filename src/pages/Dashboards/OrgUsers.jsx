import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, Filter, Eye, Pencil, Trash2,
  Mail, Calendar, Briefcase, Activity, Power, X, Plus,
  Send, RefreshCw, XCircle, Ban
} from 'lucide-react';

import { useAuth, orgFetch } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

// ─── Reusable Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    invited: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };
  const style = styles[status] || styles.inactive;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border uppercase tracking-wider ${style}`}>
      {status || 'Unknown'}
    </span>
  );
}

// ─── Format Date ─────────────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
}

// ─── Org Users Component ────────────────────────────────────────────────
export function OrgUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, pendingInvitations: 0, applicationsAssigned: 0 });
  const [applications, setApplications] = useState([]); // For assignment
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDesigner, setEditDesigner] = useState(null);
  const [viewDesigner, setViewDesigner] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [inviteModalData, setInviteModalData] = useState(null);

  const orgId = user?.organizationId || user?.organization_id;

  useEffect(() => {
    if (user && orgId) {
      fetchData();
    } else if (user && !orgId) {
      setLoading(false);
      setError('No organization ID associated with your account.');
    }
  }, [user, orgId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dsRes, statRes, appRes] = await Promise.all([
        orgFetch('/api/org/users'),
        orgFetch('/api/org/users/stats'),
        orgFetch('/api/org/applications')
      ]);

      if (dsRes.ok) {
        setUsers(await dsRes.json());
      } else {
        const errData = await dsRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load organization users');
      }

      if (statRes.ok) setStats(await statRes.json());
      if (appRes.ok) setApplications(await appRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === user?.id) {
      setError('You cannot delete your own administrator account.');
      setDeleteTarget(null);
      return;
    }
    try {
      const res = await orgFetch(`/api/org/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`User ${deleteTarget.name} deleted successfully.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setDeleteTarget(null);
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleAction = async (userId, action) => {
    if (userId === user?.id && action === 'deactivate') {
      setError('You cannot deactivate your own administrator account.');
      return;
    }
    try {
      const res = await orgFetch(`/api/org/users/${userId}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (data.token) {
           const inviteLink = `${window.location.origin}/accept-invitation?token=${data.token}`;
           console.log(`[TESTING ONLY] Invitation link for user ${userId}: ${inviteLink}`);
           const targetUser = users.find(u => u.id === userId);
           if (targetUser) {
             setInviteModalData({
               name: targetUser.name,
               email: targetUser.email,
               role: targetUser.role,
               inviteLink: inviteLink
             });
           } else {
             setSuccessMsg(`${data.message}`);
             setTimeout(() => setSuccessMsg(''), 4000);
           }
        } else {
           setSuccessMsg(data.message || `Action ${action} successful`);
           setTimeout(() => setSuccessMsg(''), 4000);
        }
        fetchData();
      } else {
        setError(data.error || `Failed to ${action} user`);
      }
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message}`);
    }
  };

  // ── Derived state for filtering
  const filteredUsers = users.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (roleFilter !== 'all' && d.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (d.name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q));
    }
    return true;
  });

  if (loading) {
    return <div className="p-8 text-white">Loading users...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Users</h1>
          <p className="text-gray-400">Manage users and assign roles within your organization.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="shrink-0 bg-primary-600 hover:bg-primary-500">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X className="h-4 w-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-300"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="h-16 w-16" />
          </div>
          <p className="text-sm font-medium text-gray-400">Total Users</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalUsers}</p>
        </Card>
        <Card className="p-6 bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
            <Activity className="h-16 w-16" />
          </div>
          <p className="text-sm font-medium text-gray-400">Active</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{stats.activeUsers}</p>
        </Card>
        <Card className="p-6 bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
            <Mail className="h-16 w-16" />
          </div>
          <p className="text-sm font-medium text-gray-400">Pending Invites</p>
          <p className="text-3xl font-bold text-amber-400 mt-2">{stats.pendingInvitations}</p>
        </Card>
        <Card className="p-6 bg-white/5 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-primary-500">
            <Briefcase className="h-16 w-16" />
          </div>
          <p className="text-sm font-medium text-gray-400">Apps Assigned</p>
          <p className="text-3xl font-bold text-primary-400 mt-2">{stats.applicationsAssigned}</p>
        </Card>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Roles</option>
              <option value="org_admin">Organization Admin</option>
              <option value="app_admin">Application Admin</option>
              <option value="designer">Designer</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {users.length === 0 ? (
        <Card className="p-12 border border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No users yet</h3>
          <p className="text-gray-400 max-w-md mb-6">Add a user to start granting access to your applications.</p>
          <Button onClick={() => setShowAddModal(true)} className="bg-primary-600 hover:bg-primary-500">
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </Card>
      ) : (
        <Card className="border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-gray-500 tracking-wider">
                  <th className="px-5 py-4">USER</th>
                  <th className="px-5 py-4 hidden md:table-cell">ROLE</th>
                  <th className="px-5 py-4 hidden lg:table-cell">APPLICATIONS</th>
                  <th className="px-5 py-4">STATUS</th>
                  <th className="px-5 py-4 hidden xl:table-cell">LAST ACTIVE</th>
                  <th className="px-5 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {filteredUsers.map(d => (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold">
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">{d.name}</p>
                            <p className="text-xs text-gray-500">{d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell text-sm text-gray-300 capitalize">
                        {d.role.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {d.assigned_applications?.length > 0 ? (
                            d.assigned_applications.slice(0,2).map(a => (
                              <span key={a.id} className="px-2 py-0.5 bg-white/10 rounded-md text-xs text-gray-300 truncate max-w-[120px]">
                                {a.name}
                              </span>
                            ))
                          ) : <span className="text-xs text-gray-500">—</span>}
                          {d.assigned_applications?.length > 2 && (
                            <span className="px-2 py-0.5 bg-white/5 rounded-md text-xs text-gray-400">
                              +{d.assigned_applications.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-4 hidden xl:table-cell text-xs text-gray-400">
                        {fmtDate(d.last_active)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.status === 'pending' && (
                            <button title="Approve & Send Invitation" onClick={() => handleAction(d.id, 'approve')} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Send className="h-4 w-4" /></button>
                          )}
                          {(d.status === 'pending' || d.status === 'invited') && (
                            <>
                              <button title="Resend Invitation" onClick={() => handleAction(d.id, 'resend')} className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"><RefreshCw className="h-4 w-4" /></button>
                              <button title="Cancel Invitation" onClick={() => handleAction(d.id, 'cancel')} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><XCircle className="h-4 w-4" /></button>
                            </>
                          )}
                          {d.status === 'active' && (
                            <button title="Deactivate" onClick={() => handleAction(d.id, 'deactivate')} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Ban className="h-4 w-4" /></button>
                          )}
                          {d.status === 'inactive' && (
                            <button title="Activate User" onClick={() => handleAction(d.id, 'activate')} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"><Power className="h-4 w-4" /></button>
                          )}
                          <button title="View" onClick={() => setViewDesigner(d)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"><Eye className="h-4 w-4" /></button>
                          <button title="Edit" onClick={() => setEditDesigner(d)} className="p-1.5 text-gray-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg"><Pencil className="h-4 w-4" /></button>
                          <button title="Delete" onClick={() => setDeleteTarget(d)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredUsers.length === 0 && (
                     <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-500">No users match your filters.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {(showAddModal || editDesigner) && (
          <DesignerModal
            designer={editDesigner}
            applications={applications}
            onClose={() => { setShowAddModal(false); setEditDesigner(null); }}
            onSuccess={() => { setShowAddModal(false); setEditDesigner(null); fetchData(); }}
          />
        )}
        
        {viewDesigner && (
          <ViewDesignerModal
            designer={viewDesigner}
            onClose={() => setViewDesigner(null)}
          />
        )}

        {deleteTarget && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
             <div className="relative glass-card p-6 max-w-md w-full z-10">
               <h3 className="text-lg font-bold text-white mb-2">Remove User?</h3>
               <p className="text-gray-400 text-sm mb-6">Are you sure you want to remove {deleteTarget.name}? They will lose access to all assigned applications.</p>
               <div className="flex justify-end gap-3">
                 <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                 <Button className="bg-red-600 hover:bg-red-500" onClick={handleDelete}>Remove</Button>
               </div>
             </div>
           </div>
        )}

        {inviteModalData && (
          <InviteSuccessModal 
            data={inviteModalData} 
            onClose={() => setInviteModalData(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Add / Edit User Modal ───────────────────────────────────────────────
function DesignerModal({ designer, applications, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: designer?.name || '',
    email: designer?.email || '',
    password: '',
    role: designer?.role || 'user',
    status: designer?.status || 'pending',
    applications: designer?.assigned_applications?.map(a => a.id) || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleApp = (appId) => {
    setForm(prev => {
      const apps = prev.applications.includes(appId)
        ? prev.applications.filter(id => id !== appId)
        : [...prev.applications, appId];
      return { ...prev, applications: apps };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = designer ? `/api/org/users/${designer.id}` : '/api/org/users';
      const method = designer ? 'PATCH' : 'POST';
      
      const res = await orgFetch(url, {
        method,
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save user');
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card p-6 max-w-lg w-full z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{designer ? 'Edit User' : 'Add User'}</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        
        {error && <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <Input required type="email" value={form.email} disabled={!!designer} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@example.com" />
          </div>
          {!designer && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
              <Input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              <p className="text-xs text-primary-400 mt-1">User will be created as active and can log in immediately with these credentials.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none">
                <option value="org_admin">Organization Admin</option>
                <option value="app_admin">Application Admin</option>
                <option value="designer">Designer</option>
                <option value="user">User</option>
              </select>
            </div>
            {designer && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Assign Applications</label>
            <div className="border border-white/10 rounded-xl max-h-48 overflow-y-auto bg-white/5 divide-y divide-white/5">
              {applications.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No applications available in organization.</div>
              ) : (
                applications.map(app => (
                  <label key={app.id} className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer">
                    <input type="checkbox" checked={form.applications.includes(app.id)} onChange={() => toggleApp(app.id)} className="rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-white/5" />
                    <span className="text-sm text-white">{app.app_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary-600">{loading ? 'Saving...' : (designer ? 'Save Changes' : 'Create User')}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── View Designer Modal ───────────────────────────────────────────────────
function ViewDesignerModal({ designer, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card p-0 max-w-lg w-full z-10 overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-start justify-between">
             <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-2xl font-bold">
                  {designer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{designer.name}</h2>
                  <p className="text-gray-400">{designer.email}</p>
                </div>
             </div>
             <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Role</p>
              <p className="text-sm text-white capitalize">{designer.role.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusBadge status={designer.status} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Added On</p>
              <p className="text-sm text-white">{fmtDate(designer.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Last Active</p>
              <p className="text-sm text-white">{fmtDate(designer.last_active)}</p>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-2">Assigned Applications ({designer.assigned_applications?.length || 0})</p>
            <div className="flex flex-wrap gap-2">
              {designer.assigned_applications?.length > 0 ? (
                designer.assigned_applications.map(a => (
                  <span key={a.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
                    {a.name}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No applications assigned.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Invitation Success Modal ────────────────────────────────────────────────
function InviteSuccessModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      alert("Invitation link copied.");
    });
  };

  const handleOpen = () => {
    window.open(data.inviteLink, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card p-6 max-w-md w-full z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Invitation Sent Successfully</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">User Name</p>
              <p className="text-sm text-white">{data.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-sm text-white">{data.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Role</p>
              <p className="text-sm text-white capitalize">{data.role.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusBadge status="invited" />
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 mb-1">Testing Link (Local Only)</p>
            <div className="p-3 bg-black/30 border border-white/10 rounded-lg text-xs text-gray-400 break-all font-mono">
              {data.inviteLink}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button onClick={handleCopy} className="w-full bg-primary-600 hover:bg-primary-500">
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button onClick={handleOpen} variant="secondary" className="w-full">
            Open Invitation
          </Button>
          <Button onClick={onClose} variant="secondary" className="w-full bg-white/5 hover:bg-white/10 text-white border-transparent">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
