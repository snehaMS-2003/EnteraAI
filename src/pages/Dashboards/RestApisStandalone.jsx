import React, { useState, useEffect } from 'react';
import { orgFetch } from '../../hooks/useAuth';
import { ApiManagement } from './Workflow/ApiManagement';
import { Network, ChevronDown } from 'lucide-react';

export function RestApisStandalone() {
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await orgFetch('/api/designer/applications');
        if (!res.ok) throw new Error('Failed to load applications');
        const data = await res.json();
        
        setApplications(data);
        if (data && data.length > 0) {
          setSelectedAppId(data[0].id.toString());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, []);

  const selectedApp = applications.find(app => app.id.toString() === selectedAppId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 font-medium">Loading REST APIs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 max-w-md">
          <p className="font-medium mb-1">Failed to load applications</p>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
        <div className="p-8 bg-dark-300 rounded-xl border border-white/10 max-w-md">
          <Network className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Application Found</h2>
          <p className="text-gray-400">
            You must create an application first before managing REST APIs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">REST APIs</h1>
          <p className="text-gray-400">Manage API endpoints for your applications</p>
        </div>
        
        {applications.length > 1 && (
          <div className="relative min-w-[250px]">
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Select Application</label>
            <div className="relative">
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full bg-dark-400 border border-white/10 text-white rounded-lg pl-4 pr-10 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {applications.map(app => (
                  <option key={app.id} value={app.id}>{app.app_name || app.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>
      
      {selectedApp && (
        <ApiManagement application={selectedApp} isStandalone={true} />
      )}
    </div>
  );
}
