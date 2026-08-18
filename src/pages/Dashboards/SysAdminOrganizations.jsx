import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Filter, MoreVertical, Eye, Power, PowerOff, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export function SysAdminOrganizations() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    inactiveOrganizations: 0,
    totalApplications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const [orgsResponse, statsResponse] = await Promise.all([
        fetch('http://127.0.0.1:5000/api/organizations', {
          headers: { 'x-user-role': 'sys_admin' }
        }),
        fetch('http://127.0.0.1:5000/api/sysadmin/stats', {
          headers: { 'x-user-role': 'sys_admin' }
        })
      ]);
      
      if (!orgsResponse.ok || !statsResponse.ok) throw new Error('Failed to fetch data');
      
      const orgsData = await orgsResponse.json();
      const statsData = await statsResponse.json();
      
      setOrganizations(orgsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`http://127.0.0.1:5000/api/organizations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'sys_admin'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      // Update local state
      setOrganizations(orgs => orgs.map(org => 
        org.id === id ? { ...org, status: newStatus } : org
      ));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.admin_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? org.status === statusFilter : true;
    const matchesIndustry = industryFilter ? org.industry === industryFilter : true;
    return matchesSearch && matchesStatus && matchesIndustry;
  });

  // Unique industries for filter dropdown
  const industries = [...new Set(organizations.map(o => o.industry).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-gray-400">Manage all organizations registered on the Entera.ai platform.</p>
        </div>
        <Button onClick={() => navigate('/register')}>+ Register Organization</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-400 font-medium">Total Organizations</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalOrganizations}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-400 font-medium">Active</p>
          <p className="text-3xl font-bold text-green-500 mt-2">{stats.activeOrganizations}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-400 font-medium">Inactive</p>
          <p className="text-3xl font-bold text-red-500 mt-2">{stats.inactiveOrganizations}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-400 font-medium">Total Applications</p>
          <p className="text-3xl font-bold text-blue-500 mt-2">{stats.totalApplications}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input 
              className="pl-10 h-10" 
              placeholder="Search organizations by name, email, or admin..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select className="h-10" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="" className="bg-gray-900 text-white">All Statuses</option>
              <option value="active" className="bg-gray-900 text-white">Active</option>
              <option value="inactive" className="bg-gray-900 text-white">Inactive</option>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select className="h-10" value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)}>
              <option value="" className="bg-gray-900 text-white">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind} className="bg-gray-900 text-white">{ind}</option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-gray-400">Loading organizations...</div>
        ) : error ? (
          <div className="py-12 flex justify-center text-red-400"><AlertCircle className="mr-2" /> {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-sm">
                  <th className="pb-3 font-medium">Organization Name</th>
                  <th className="pb-3 font-medium">Admin & Email</th>
                  <th className="pb-3 font-medium">Industry</th>
                  <th className="pb-3 font-medium">Apps</th>
                  <th className="pb-3 font-medium">Users</th>
                  <th className="pb-3 font-medium">Reg. Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 font-medium text-white flex items-center gap-2">
                      <div className="h-8 w-8 rounded bg-primary-500/20 flex items-center justify-center text-primary-500">
                        <Building2 className="h-4 w-4" />
                      </div>
                      {org.name}
                    </td>
                    <td className="py-4">
                      <div className="text-white">{org.admin_name}</div>
                      <div className="text-gray-500 text-xs">{org.email}</div>
                    </td>
                    <td className="py-4 text-gray-300 capitalize">{org.industry || '-'}</td>
                    <td className="py-4 text-gray-300">{org.applications_count || 0}</td>
                    <td className="py-4 text-gray-300">{org.users_count || 0}</td>
                    <td className="py-4 text-gray-300">
                      {(() => {
                        if (!org.created_at) return 'N/A';
                        const date = new Date(org.created_at);
                        if (isNaN(date.getTime())) return 'N/A';
                        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      })()}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        org.status === 'active' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {org.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button 
                        onClick={() => navigate(`/dashboard/sys-admin/orgs/${org.id}`)}
                        className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusToggle(org.id, org.status)}
                        className={`p-1.5 rounded transition-colors ${
                          org.status === 'active' 
                            ? 'text-red-400 hover:bg-red-500/20 bg-white/5' 
                            : 'text-green-400 hover:bg-green-500/20 bg-white/5'
                        }`}
                        title={org.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {org.status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrgs.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-500">
                      No organizations found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
