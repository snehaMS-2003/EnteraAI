import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Power, PowerOff, AlertCircle, Search, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { orgFetch } from '../../hooks/useAuth';

export function SysAdminOrganizations() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError('');
    try {
      const orgsResponse = await orgFetch('/api/organizations');
      
      if (!orgsResponse.ok) {
        const err = await orgsResponse.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch organizations');
      }
      
      const orgsData = await orgsResponse.json();
      setOrganizations(Array.isArray(orgsData) ? orgsData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus, orgName) => {
    const action = currentStatus === 'active' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} organization "${orgName || 'this organization'}"?`)) {
      return;
    }
    setActionMsg({ type: '', text: '' });
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await orgFetch(`/api/organizations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Unable to ${action} organization`);
      }
      
      // Update local state
      setOrganizations(orgs => orgs.map(org => 
        org.id === id ? { ...org, status: newStatus } : org
      ));
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

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = 
      (org.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.admin_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.industry || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? org.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-gray-400">Manage all registered organizations on the Entera.ai platform.</p>
        </div>
        <Button onClick={() => navigate('/register')}>+ Register Organization</Button>
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

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Input 
            className="pl-10 h-10" 
            placeholder="Search organizations by name, email, or admin..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48 relative">
          <Select className="h-10" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="" className="bg-gray-900 text-white">All Statuses</option>
            <option value="active" className="bg-gray-900 text-white">Active</option>
            <option value="inactive" className="bg-gray-900 text-white">Inactive</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 flex justify-center text-gray-400">Loading organizations...</Card>
      ) : error ? (
        <Card className="p-12 flex justify-center text-red-400"><AlertCircle className="mr-2" /> {error}</Card>
      ) : organizations.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Building2 className="h-16 w-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Organizations Registered</h2>
          <p className="text-gray-400 max-w-md mb-4">There are currently no organizations registered on this platform.</p>
          <Button onClick={() => navigate('/register')}>Register First Organization</Button>
        </Card>
      ) : filteredOrgs.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center text-gray-400">
          <Building2 className="h-12 w-12 text-gray-600 mb-3 opacity-50" />
          <p className="text-lg font-medium text-white mb-1">No matching organizations</p>
          <p className="text-sm">No organizations match your search or filter criteria.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {filteredOrgs.map((org, index) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-500 shrink-0">
                        <Building2 className="h-8 w-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{org.name}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            org.status === 'active' 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {org.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-gray-400 text-sm">
                            Registered on: {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/admin/dashboard/orgs/${org.id}`)}
                      >
                        View Full Details
                      </Button>
                      <Button 
                        variant={org.status === 'active' ? "destructive" : "primary"}
                        onClick={() => handleStatusToggle(org.id, org.status, org.name)}
                        className="flex items-center gap-2"
                      >
                        {org.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        {org.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Industry</p>
                      <p className="text-white capitalize">{org.industry === 'other' ? org.industry_specific : org.industry || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Administrator</p>
                      <p className="text-white">{org.admin_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                      <p className="text-white">{org.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                      <p className="text-white">{org.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                     <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                       <p className="text-gray-400 text-sm font-medium mb-1">Total Applications</p>
                       <p className="text-2xl font-bold text-blue-500">{org.applications_count || 0}</p>
                     </div>
                     <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                       <p className="text-gray-400 text-sm font-medium mb-1">Total Users</p>
                       <p className="text-2xl font-bold text-green-500">{org.users_count || 0}</p>
                     </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
