import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Power, PowerOff, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function SysAdminOrganizations() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const orgsResponse = await fetch('http://127.0.0.1:5000/api/organizations', {
        headers: { 'x-user-role': 'sys_admin' }
      });
      
      if (!orgsResponse.ok) throw new Error('Failed to fetch data');
      
      const orgsData = await orgsResponse.json();
      setOrganizations(orgsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Organization</h1>
          <p className="text-gray-400">Manage the registered organization on the Entera.ai single-organization platform.</p>
        </div>
        {/* Only show Register button if NO organization exists */}
        {!loading && organizations.length === 0 && (
          <Button onClick={() => navigate('/register')}>+ Register Organization</Button>
        )}
      </div>

      {loading ? (
        <Card className="p-12 flex justify-center text-gray-400">Loading organization details...</Card>
      ) : error ? (
        <Card className="p-12 flex justify-center text-red-400"><AlertCircle className="mr-2" /> {error}</Card>
      ) : organizations.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
          <Building2 className="h-16 w-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Organization Registered</h2>
          <p className="text-gray-400 max-w-md">There is currently no organization registered on this platform. You must register one to start using the system.</p>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-500">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{organizations[0].name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    organizations[0].status === 'active' 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {organizations[0].status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-gray-400 text-sm">
                    Registered on: {organizations[0].created_at ? new Date(organizations[0].created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 flex gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate(`/admin/dashboard/orgs/${organizations[0].id}`)}
              >
                View Full Details
              </Button>
              <Button 
                variant={organizations[0].status === 'active' ? "destructive" : "primary"}
                onClick={() => handleStatusToggle(organizations[0].id, organizations[0].status)}
                className="flex items-center gap-2"
              >
                {organizations[0].status === 'active' ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {organizations[0].status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Industry</p>
              <p className="text-white capitalize">{organizations[0].industry || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Administrator</p>
              <p className="text-white">{organizations[0].admin_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
              <p className="text-white">{organizations[0].email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
              <p className="text-white">{organizations[0].phone || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="bg-white/5 rounded-xl p-6 border border-white/10">
               <p className="text-gray-400 font-medium mb-2">Total Applications</p>
               <p className="text-3xl font-bold text-blue-500">{organizations[0].applications_count || 0}</p>
             </div>
             <div className="bg-white/5 rounded-xl p-6 border border-white/10">
               <p className="text-gray-400 font-medium mb-2">Total Users</p>
               <p className="text-3xl font-bold text-green-500">{organizations[0].users_count || 0}</p>
             </div>
          </div>
        </Card>
      )}
    </div>
  );
}
