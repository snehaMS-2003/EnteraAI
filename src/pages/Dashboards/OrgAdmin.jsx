import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, FolderKanban, Briefcase, Plus, Eye, Code, Activity, LayoutDashboard } from 'lucide-react';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function OrgAdmin() {
  const user = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalApplications: 0,
    activeApplications: 0,
    draftApplications: 0,
    totalUsers: 0,
    activeUsers: 0
  });
  
  const [recentApps, setRecentApps] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, appsRes, activityRes] = await Promise.all([
          orgFetch('/api/orgadmin/stats'),
          orgFetch('/api/org/applications'),
          orgFetch('/api/orgadmin/activity')
        ]);
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          // Display top 5 recent applications
          setRecentApps(appsData.slice(0, 5));
        }
        
        if (activityRes.ok) {
          const actData = await activityRes.json();
          setTimeline(actData.timeline || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const maxActivity = Math.max(...timeline.map(d => Math.max(d.users, d.apps)), 10);
  const chartHeight = 160;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome, {user?.name || 'Administrator'}</h1>
          <p className="text-gray-400">Manage your organization's applications and designers.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/dashboard/org-admin/apps')}>
            View Applications
          </Button>
          <Button onClick={() => navigate('/dashboard/org-admin/apps/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Application
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Organization</p>
              <p className="text-lg font-bold text-white truncate max-w-[150px]">{user?.organizationName || 'Acme Corp'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Total Applications</p>
              <p className="text-2xl font-bold text-white">{stats.totalApplications}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/20 text-green-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Active / Draft</p>
              <p className="text-2xl font-bold text-white">{stats.activeApplications} <span className="text-gray-500 text-lg">/ {stats.draftApplications}</span></p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Users (Active/Total)</p>
              <p className="text-2xl font-bold text-white">{stats.activeUsers} <span className="text-gray-500 text-lg">/ {stats.totalUsers}</span></p>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Chart */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4">Organization Activity</h2>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-400 text-sm">Applications and Users created over the last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500"></div> Applications</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500"></div> Users</div>
            </div>
          </div>
          
          <div className="relative pt-4 border-b border-white/10 pb-2">
             <div className="absolute left-0 top-0 bottom-8 border-r border-white/10 pr-2 flex flex-col justify-between text-xs text-gray-500 w-8 text-right">
                <span>{maxActivity}</span>
                <span>{Math.round(maxActivity / 2)}</span>
                <span>0</span>
             </div>
             
             <div className="ml-10 flex items-end justify-between h-[160px]">
                {timeline.map((day, i) => {
                  const hApps = (day.apps / maxActivity) * chartHeight;
                  const hUsers = (day.users / maxActivity) * chartHeight;
                  const dateLabel = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
                  
                  return (
                    <div key={i} className="flex flex-col items-center group relative w-full px-1">
                      <div className="flex items-end justify-center gap-1 w-full h-[160px]">
                         <div className="w-1/3 max-w-[16px] bg-blue-500 rounded-t-sm relative transition-all duration-300 hover:opacity-80" style={{ height: `${hApps}px` }}>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-xs text-white px-2 py-1 rounded">
                              {day.apps} Apps
                            </div>
                         </div>
                         <div className="w-1/3 max-w-[16px] bg-purple-500 rounded-t-sm relative transition-all duration-300 hover:opacity-80" style={{ height: `${hUsers}px` }}>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-xs text-white px-2 py-1 rounded">
                              {day.users} Users
                            </div>
                         </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2">{dateLabel}</span>
                    </div>
                  );
                })}
             </div>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Applications</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/org-admin/apps')}>
            View All
          </Button>
        </div>
        
        <Card className="overflow-hidden">
          {recentApps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Application Name</th>
                    <th className="px-6 py-4 font-medium">Industry</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Created By</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentApps.map((app) => (
                    <tr key={app.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{app.app_name}</td>
                      <td className="px-6 py-4 text-gray-400 capitalize">{app.industry || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          app.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          app.status === 'draft' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{app.created_by || '-'}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/org-admin/apps`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <LayoutDashboard className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No applications found.</p>
              <Button onClick={() => navigate('/dashboard/org-admin/apps/create')} className="mt-4" variant="secondary">
                Create First Application
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
