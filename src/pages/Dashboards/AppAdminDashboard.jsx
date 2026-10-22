import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Layers, Users, ExternalLink, Calendar, CheckCircle2, Play, Settings } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function AppAdminDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, usersRes] = await Promise.all([
        orgFetch('/api/designer/applications'),
        orgFetch('/api/org/users').catch(() => null)
      ]);

      if (appsRes.ok) {
        const apps = await appsRes.json();
        setApplications(Array.isArray(apps) ? apps : []);
      } else {
        const err = await appsRes.json().catch(() => ({}));
        setError(err.error || 'Failed to load assigned applications');
      }

      if (usersRes && usersRes.ok) {
        const users = await usersRes.json();
        setUsersCount(Array.isArray(users) ? users.length : 0);
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
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 capitalize">
                Application Administrator
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Active Scope
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Application Administration Console
            </h1>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Manage configuration, operational workflows, and assigned users for your allocated enterprise applications.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/app-admin/dashboard/apps">
              <Button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium">
                <Layers className="h-4 w-4" />
                Manage Applications
              </Button>
            </Link>
            <Link to="/app-admin/dashboard/users">
              <Button variant="outline" className="flex items-center gap-2 border-white/10 hover:bg-white/5 text-gray-300">
                <Users className="h-4 w-4" />
                Application Users
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Assigned Users</p>
              <h3 className="text-3xl font-bold text-white mt-1">{loading ? '...' : usersCount}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="h-6 w-6" />
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
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Settings className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Assigned Applications Section */}
      <Card className="p-6 border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-400" />
            Managed Applications
          </h2>
          <Link to="/app-admin/dashboard/apps" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl space-y-2">
            <Layers className="h-10 w-10 text-gray-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No applications assigned</h3>
            <p className="text-gray-400 text-xs">You currently have no applications assigned to administer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <div key={app.id} className="p-5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {app.status || 'Active'}
                    </span>
                    <span className="text-xs text-gray-400">{app.industry || 'General'}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg">{app.app_name}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">{app.app_description || 'Enterprise Application'}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <Link to={`/app-admin/dashboard/apps/${app.id}`}>
                    <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5 text-xs h-8">
                      Configure
                    </Button>
                  </Link>
                  <a href={`/preview/${app.id}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="bg-primary-600 hover:bg-primary-500 text-white text-xs h-8 flex items-center gap-1.5">
                      <Play className="h-3 w-3" />
                      Preview
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
