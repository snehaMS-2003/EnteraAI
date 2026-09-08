import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Mail, Phone, MapPin, Globe, Briefcase, Calendar, Power, PowerOff, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function SysAdminOrganizationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganization();
  }, [id]);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`http://127.0.0.1:5000/api/organizations/${id}`, {
        headers: {
          'x-user-role': 'sys_admin'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) throw new Error('Organization not found');
        throw new Error('Failed to fetch organization details');
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
    try {
      const newStatus = org.status === 'active' ? 'inactive' : 'active';
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
      
      setOrg(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(err.message);
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
              <><PowerOff className="h-4 w-4 mr-2" /> Deactivate</>
            ) : (
              <><Power className="h-4 w-4 mr-2" /> Activate</>
            )}
          </Button>
          <Button>Edit Organization</Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-8">
          <div className="flex items-start gap-6 border-b border-white/10 pb-8 mb-8">
            <div className="h-20 w-20 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-500 shrink-0">
              <Building2 className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
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
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Email Address</p>
                  <p>{org.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Phone Number</p>
                  <p>{org.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Globe className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Website</p>
                  <p>{org.website ? <a href={org.website} target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">{org.website}</a> : 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Briefcase className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Industry</p>
                  <p className="capitalize">{org.industry === 'other' ? org.industry_specific : org.industry || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Calendar className="h-5 w-5 text-gray-500" />
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
                  <p className="text-2xl font-bold text-white mt-1">{org.applications_count}</p>
                </Card>
                <Card className="p-4 bg-white/5 border-none">
                  <p className="text-sm text-gray-400">Users/Designers</p>
                  <p className="text-2xl font-bold text-white mt-1">{org.users_count}</p>
                </Card>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
