import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Eye, ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    inactive: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };
  const style = styles[status] || styles.inactive;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border uppercase tracking-wider ${style}`}>
      {status || 'Unknown'}
    </span>
  );
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
}

export function SysAdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/sysadmin/users', {
        headers: { 'x-user-role': 'sys_admin' }
      });
      if (!response.ok) throw new Error('Failed to fetch platform users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete the user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/sysadmin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'sys_admin' }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete user');
      }
      
      // Update state locally
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? u.status === statusFilter : true;
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesOrg = orgFilter ? u.organization_name === orgFilter : true;
    return matchesSearch && matchesStatus && matchesRole && matchesOrg;
  });

  const uniqueOrgs = [...new Set(users.map(u => u.organization_name).filter(Boolean))];
  const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Platform Users</h1>
          <p className="text-gray-400">View and manage all users across all registered organizations.</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input 
              className="pl-10 h-10" 
              placeholder="Search users by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48 relative">
            <Select className="h-10" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="" className="bg-gray-900 text-white">All Statuses</option>
              <option value="active" className="bg-gray-900 text-white">Active</option>
              <option value="pending" className="bg-gray-900 text-white">Pending</option>
              <option value="inactive" className="bg-gray-900 text-white">Inactive</option>
            </Select>
          </div>
          <div className="w-full md:w-48 relative">
            <Select className="h-10 capitalize" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="" className="bg-gray-900 text-white">All Roles</option>
              {uniqueRoles.map(r => (
                <option key={r} value={r} className="bg-gray-900 text-white">{r.replace('_', ' ')}</option>
              ))}
            </Select>
          </div>
          <div className="w-full md:w-64 relative">
            <Select className="h-10" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
              <option value="" className="bg-gray-900 text-white">All Organizations</option>
              {uniqueOrgs.map(org => (
                <option key={org} value={org} className="bg-gray-900 text-white">{org}</option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-gray-400">Loading platform users...</div>
        ) : error ? (
          <div className="py-12 flex justify-center text-red-400"><ShieldAlert className="mr-2" /> {error}</div>
        ) : users.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium text-white">No users found</p>
            <p className="text-sm">There are no users registered on the platform yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-gray-500 tracking-wider uppercase">
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Organization</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 hidden md:table-cell">Reg. Date</th>
                  <th className="px-5 py-4 hidden lg:table-cell">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {filteredUsers.map(u => (
                    <motion.tr 
                      key={u.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-white">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                            {u.role !== 'sys_admin' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id, u.name); }}
                                className="p-1 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-500/10 ml-2" 
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-300">{u.organization_name || 'System'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-300 capitalize">{u.role?.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell text-xs text-gray-400">
                        {fmtDate(u.created_at)}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-xs text-gray-400">
                        {fmtDate(u.last_active)}
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
        )}
      </Card>
    </div>
  );
}
