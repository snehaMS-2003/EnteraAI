import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Play, ExternalLink, Calendar, Search, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function UserApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orgFetch('/api/designer/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to load assigned applications');
      }
    } catch (e) {
      setError(e.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = applications.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (a.app_name || '').toLowerCase().includes(q) ||
           (a.app_description || '').toLowerCase().includes(q) ||
           (a.industry || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Applications</h1>
          <p className="text-gray-400 text-sm mt-1">
            Applications assigned to you by your Organization Administrator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search applications..."
              className="pl-9 h-10"
            />
          </div>
        </div>
      </div>

      <Card className="p-6 border-white/10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-xl text-center space-y-3">
            <h3 className="text-lg font-bold text-red-400">Unable to load applications</h3>
            <p className="text-red-400/80 text-sm">{error}</p>
            <Button variant="outline" onClick={fetchApplications} className="border-red-500/40 text-red-400">
              Retry
            </Button>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl space-y-3">
            <Layers className="h-12 w-12 text-gray-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">No applications available</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              {search.trim()
                ? 'No applications match your search query.'
                : 'You have not been assigned to any applications yet. Contact your Organization Administrator to get assigned.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-gray-400">
                  <th className="p-4 font-semibold">Application</th>
                  <th className="p-4 font-semibold">Industry</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Last Updated</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredApps.map((app, idx) => (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-white text-base">{app.app_name}</div>
                      <div className="text-xs text-gray-400 line-clamp-1">{app.app_description || 'Enterprise Application'}</div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{app.industry || 'General'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {app.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">
                      {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={`/app/${app.id}`}>
                          <Button size="sm" className="bg-primary-600 hover:bg-primary-500 text-white font-medium flex items-center gap-1.5 h-8">
                            <Play className="h-3.5 w-3.5" />
                            Launch App
                          </Button>
                        </a>
                        <a href={`/preview/${app.id}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-gray-300 h-8">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </div>
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
