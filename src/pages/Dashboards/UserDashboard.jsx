import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Layers, Play, ExternalLink, Calendar, CheckCircle2, ShieldCheck, User } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function UserDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAssignedApplications();
  }, []);

  const fetchAssignedApplications = async () => {
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

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="glass-card p-8 rounded-2xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Active Session
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 capitalize">
                Role: {user?.role || 'User'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || user?.username || 'User'}!
            </h1>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Access and launch your assigned enterprise applications built with Entera.ai.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/user/dashboard/apps">
              <Button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium">
                <Layers className="h-4 w-4" />
                My Applications ({applications.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Assigned Applications</p>
              <h3 className="text-3xl font-bold text-white mt-1">{loading ? '...' : applications.length}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Organization</p>
              <h3 className="text-xl font-bold text-white mt-1 truncate max-w-[200px]">
                {user?.organizationName || user?.organization_name || 'Organization'}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">User Identity</p>
              <h3 className="text-xl font-bold text-white mt-1">@{user?.username || user?.name || 'user'}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Assigned Applications Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-400" />
            Your Available Applications
          </h2>
          <Link to="/user/dashboard/apps" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 rounded-2xl border-2 border-dashed border-white/10 text-center space-y-3">
            <Layers className="h-12 w-12 text-gray-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Applications Assigned</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Your Organization Administrator has not assigned any applications to your account yet. Contact your administrator to request access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map((app, idx) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-6 flex flex-col justify-between h-full border-white/10 hover:border-primary-500/40 transition-all hover:shadow-xl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {app.status || 'Active'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : 'Active'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight">{app.app_name}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2">
                      {app.app_description || 'Enterprise application ready for runtime interaction.'}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-white/10 mt-6 flex items-center gap-2">
                    <a
                      href={`/app/${app.id}`}
                      className="flex-1"
                    >
                      <Button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium flex items-center justify-center gap-2 h-10">
                        <Play className="h-4 w-4" />
                        Launch Application
                      </Button>
                    </a>
                    <a
                      href={`/preview/${app.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Preview in new tab"
                    >
                      <Button variant="outline" className="border-white/10 hover:bg-white/5 h-10 px-3">
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </Button>
                    </a>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
