import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Mail, Phone, MapPin, Globe, Briefcase, Calendar, Power, PowerOff, AlertCircle, Server, Users } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { orgFetch } from '../../hooks/useAuth';

export function SysAdminOrganizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await orgFetch(`/api/organizations/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Organization not found');
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch organization details');
      }
      
      const data = await response.json();
      setOrg(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!org) return;
    const action = org.status === 'active' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} organization "${org.name}"?`)) {
      return;
    }
    setActionMsg({ type: '', text: '' });
    try {
      const newStatus = org.status === 'active' ? 'inactive' : 'active';
      const response = await orgFetch(`/api/organizations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Unable to ${action} organization`);
      }
      
      setOrg(prev => ({ ...prev, status: newStatus }));
      setActionMsg({
        type: 'success',
        text: `Organization ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`
      });
    } catch (err) {
      setActionMsg({
        type: 'error',
        text: `Unable to ${action} organization: ${err.message}`
      });
    }
  };

  if (loading) {
    return <div className="py-12 flex justify-center text-gray-400">Loading organization details...</div>;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/admin/dashboard/orgs')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Organizations
        </Button>
        <div className="py-12 flex justify-center text-red-400"><AlertCircle className="mr-2" /> {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin/dashboard/orgs')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Organizations
        </button>
        
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className={org.status === 'active' ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}
            onClick={handleStatusToggle}
          >
            {org.status === 'active' ? (
              <><PowerOff className="h-4 w-4 mr-2" /> Deactivate Organization</>
            ) : (
              <><Power className="h-4 w-4 mr-2" /> Activate Organization</>
            )}
          </Button>
        </div>
      </div>

      {actionMsg.text && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg({ type: '', text: '' })} className="text-xs opacity-70 hover:opacity-100 font-bold ml-4">✕</button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-8">
          <div className="flex items-start gap-6 border-b border-white/10 pb-8 mb-8">
            <div className="h-20 w-20 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-500 shrink-0">
              <Building2 className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold text-white">{org.name}</h1>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  org.status === 'active' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {org.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-gray-400 text-lg">{org.admin_name} — Administrator</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Contact & Overview</h3>
              
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Email Address</p>
                  <p>{org.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Phone Number</p>
                  <p>{org.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Globe className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Website</p>
                  <p>{org.website ? <a href={org.website} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">{org.website}</a> : 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Briefcase className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Industry</p>
                  <p className="capitalize">{org.industry === 'other' ? org.industry_specific : org.industry || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Calendar className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Registration Date</p>
                  <p>
                    {(() => {
                      if (!org.created_at) return 'N/A';
                      const date = new Date(org.created_at);
                      if (isNaN(date.getTime())) return 'N/A';
                      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Location</h3>
              
              <div className="flex gap-3 text-gray-300">
                <MapPin className="h-5 w-5 text-gray-500 shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Full Address</p>
                  <p>{org.address || 'No address provided'}</p>
                  {(org.city || org.state || org.county || org.pincode) && (
                    <p className="mt-1 text-gray-400">
                      {[org.city, org.district, org.state, org.county, org.pincode].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 mt-8">Platform Usage</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-white/5 border-none">
                  <p className="text-sm text-gray-400">Applications</p>
                  <p className="text-2xl font-bold text-white mt-1">{org.applications_count || 0}</p>
                </Card>
                <Card className="p-4 bg-white/5 border-none">
                  <p className="text-sm text-gray-400">Users/Designers</p>
                  <p className="text-2xl font-bold text-white mt-1">{org.users_count || 0}</p>
                </Card>
              </div>
            </div>
          </div>

          {/* Organization Applications List */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-400" /> Organization Applications ({org.applications?.length || 0})
            </h3>
            {org.applications && org.applications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase">
                      <th className="py-3 px-4">Application Name</th>
                      <th className="py-3 px-4">Industry</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {org.applications.map(app => (
                      <tr key={app.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium text-white">{app.app_name}</td>
                        <td className="py-3 px-4 text-gray-400">{app.industry || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                            {app.status || 'draft'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No applications created by this organization yet.</p>
            )}
          </div>

          {/* Organization Users List */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" /> Organization Users ({org.users?.length || 0})
            </h3>
            {org.users && org.users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 uppercase">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {org.users.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <span className="font-medium text-white">{u.name}</span>
                          <span className="block text-xs text-gray-500">{u.email}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-300 capitalize">{u.role?.replace('_', ' ')}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No users registered for this organization yet.</p>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
