import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { LayoutDashboard, CheckCircle2, Clock, Activity, FileEdit, Database, Layers } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

export function AppDesigner() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalApplications: 0,
    activeApplications: 0,
    draftApplications: 0
  });
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const basePath = user?.role === 'lead_designer' ? '/lead-designer/dashboard' : '/designer/dashboard';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, appsRes] = await Promise.all([
          fetch('http://127.0.0.1:5000/api/designer/dashboard', {
            headers: {
              'x-org-id': user?.organizationId,
              'x-user-id': user?.id,
              'x-user-email': user?.email
            }
          }),
          fetch('http://127.0.0.1:5000/api/designer/applications', {
            headers: {
              'x-org-id': user?.organizationId,
              'x-user-id': user?.id,
              'x-user-email': user?.email
            }
          })
        ]);
        
        if (!statsRes.ok || !appsRes.ok) {
          throw new Error('Failed to load dashboard data. The server might be unavailable.');
        }

        setStats(await statsRes.json());
        
        const appsData = await appsRes.json();
        const sorted = appsData.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        setRecentApps(sorted.slice(0, 3));
      } catch (err) {
        console.error('Failed to fetch designer stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const statCards = [
    {
      title: 'Assigned Applications',
      value: stats.totalApplications,
      icon: LayoutDashboard,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Active Applications',
      value: stats.activeApplications,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      title: 'Draft Applications',
      value: stats.draftApplications,
      icon: FileEdit,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Designer Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome back, {user?.name}. You are viewing data for {user?.organizationName}.
          </p>
        </div>
      </div>

      {error ? (
        <Card className="p-6 bg-red-500/10 border-red-500/50">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <Activity className="h-12 w-12 text-red-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Dashboard Unavailable</h2>
              <p className="text-red-400 text-sm mt-1">{error}</p>
            </div>
            <Button variant="outline" className="mt-4 border-red-500/50 text-red-400 hover:bg-red-500/20" onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {statCards.map((stat, idx) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-6 h-full flex flex-col justify-between hover:border-primary-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                  {loading ? (
                    <div className="h-10 w-16 bg-gray-800 animate-pulse rounded mt-2"></div>
                  ) : (
                    <h3 className="text-4xl font-bold mt-2">{stat.value}</h3>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link to={`${basePath}/apps`} className="flex flex-col items-center justify-center p-6 glass-card rounded-xl hover:bg-white/5 transition-colors text-center gap-3">
              <Layers className="h-8 w-8 text-blue-400" />
              <span className="font-medium">My Applications</span>
            </Link>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
              </div>
            ) : recentApps.length > 0 ? (
              recentApps.map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 glass-card rounded-lg border border-white/5">
                  <div>
                    <h4 className="font-medium text-white">{app.app_name}</h4>
                    <p className="text-xs text-gray-400">Updated {new Date(app.updated_at).toLocaleDateString()}</p>
                  </div>
                  <Link to={`${basePath}/apps/${app.id}/workflow/basic`}>
                    <Button variant="outline" size="sm" className="h-8">Open</Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>
      </>
      )}
    </div>
  );
}
