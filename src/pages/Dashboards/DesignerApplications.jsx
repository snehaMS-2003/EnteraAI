import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Search, Filter, Layers, ExternalLink, Calendar, PenTool } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';

export function DesignerApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const basePath = user?.role === 'lead_designer' ? '/lead-designer/dashboard' : '/designer/dashboard';

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/designer/applications', {
          headers: {
            'x-org-id': user?.organizationId,
            'x-user-id': user?.id,
            'x-user-email': user?.email
          }
        });
        if (response.ok) {
          const data = await response.json();
          setApplications(data);
        }
      } catch (err) {
        console.error('Failed to fetch applications:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) {
      fetchApps();
    }
  }, [user]);

  const filteredApps = applications.filter(app => 
    app.app_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.industry && app.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
          <p className="text-gray-400 mt-1">View and edit applications assigned to you.</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <Input 
              placeholder="Search assigned applications..." 
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl">
            <div className="mx-auto h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">No applications found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              You haven't been assigned to any applications yet, or none match your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 font-medium text-gray-300">Application Name</th>
                  <th className="p-4 font-medium text-gray-300">Industry</th>
                  <th className="p-4 font-medium text-gray-300">Status</th>
                  <th className="p-4 font-medium text-gray-300">Assigned Date</th>
                  <th className="p-4 font-medium text-gray-300">Last Updated</th>
                  <th className="p-4 font-medium text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app, idx) => (
                  <motion.tr 
                    key={app.id} 
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <td className="p-4">
                      <div className="font-medium text-white text-lg">{app.app_name}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{app.app_description || 'No description'}</div>
                    </td>
                    <td className="p-4 text-gray-400">{app.industry || 'Not set'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                        app.status === 'active' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400">
                      {app.assigned_at ? new Date(app.assigned_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(app.updated_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Link to={`${basePath}/apps/${app.id}/workflow/basic`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </Button>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
