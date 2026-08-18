import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Building2, Network, Server, Users, Activity, CheckCircle, Database, Clock } from 'lucide-react';

export function SystemAdmin() {
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalApplications: 0,
    registeredUsers: 0
  });
  const [activity, setActivity] = useState({ timeline: [], health: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch('http://127.0.0.1:5000/api/sysadmin/stats', { headers: { 'x-user-role': 'sys_admin' } }),
        fetch('http://127.0.0.1:5000/api/sysadmin/activity', { headers: { 'x-user-role': 'sys_admin' } })
      ]);

      if (!statsRes.ok || !activityRes.ok) throw new Error('Failed to fetch dashboard data');
      
      setStats(await statsRes.json());
      setActivity(await activityRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Organizations', value: stats.totalOrganizations, icon: Building2, color: 'text-purple-500' },
    { title: 'Total Applications', value: stats.totalApplications, icon: Server, color: 'text-blue-500' },
    { title: 'Registered Users', value: stats.registeredUsers || 0, icon: Users, color: 'text-green-500' },
    { title: 'API Requests / min', value: '—', icon: Network, color: 'text-orange-500' },
  ];

  // SVG Chart Dimensions
  const maxActivity = Math.max(...(activity.timeline?.map(d => Math.max(d.users, d.orgs)) || [1]));
  const chartHeight = 200;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System Administrator Dashboard</h1>
        <p className="text-gray-400">Platform overview and health metrics.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }}>
            <Card className="flex items-center p-6 gap-4">
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                {stat.title === 'API Requests / min' ? (
                   <p className="text-xs text-gray-500 mt-1 italic">No API activity yet</p>
                ) : (
                   <p className="text-2xl font-bold text-white">{loading ? '...' : stat.value}</p>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="min-h-[300px] p-6 flex flex-col">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-500"/> System Health</h3>
           {loading ? (
             <div className="flex-1 flex items-center justify-center text-gray-500">Loading health data...</div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
               <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Platform Status</p>
                  <p className="text-xl font-bold text-emerald-400">{activity.health?.status || 'Operational'}</p>
               </div>
               <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <Clock className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-400">Uptime (30d)</p>
                      <p className="font-bold text-white">{activity.health?.uptime || '99.99%'}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <Database className="h-6 w-6 text-purple-500" />
                    <div>
                      <p className="text-xs text-gray-400">DB Latency</p>
                      <p className="font-bold text-white">{activity.health?.dbLatency || '12ms'}</p>
                    </div>
                  </div>
               </div>
             </div>
           )}
        </Card>

        <Card className="min-h-[300px] p-6 flex flex-col">
           <h3 className="text-lg font-bold text-white mb-6">Platform Activity (Last 7 Days)</h3>
           {loading ? (
             <div className="flex-1 flex items-center justify-center text-gray-500">Loading activity...</div>
           ) : activity.timeline?.length > 0 ? (
             <div className="flex-1 flex flex-col justify-end relative h-full">
               {/* Legend */}
               <div className="absolute top-0 right-0 flex gap-4 text-xs">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> <span className="text-gray-400">Users</span></div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded-sm"></div> <span className="text-gray-400">Orgs</span></div>
               </div>
               
               {/* Chart Area */}
               <div className="flex items-end justify-between h-[200px] mt-8 border-b border-white/10 pb-2">
                 {activity.timeline.map((day, i) => {
                   const hUsers = (day.users / (maxActivity || 1)) * chartHeight;
                   const hOrgs = (day.orgs / (maxActivity || 1)) * chartHeight;
                   
                   return (
                     <div key={i} className="flex flex-col items-center group relative w-full px-1">
                       <div className="flex items-end justify-center gap-1 w-full h-[200px]">
                         <div className="w-1/3 max-w-[12px] bg-blue-500 rounded-t-sm relative transition-all duration-300 hover:opacity-80" style={{ height: `${hUsers}px` }}>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-xs text-white px-2 py-1 rounded">
                              {day.users} Users
                            </div>
                         </div>
                         <div className="w-1/3 max-w-[12px] bg-purple-500 rounded-t-sm relative transition-all duration-300 hover:opacity-80" style={{ height: `${hOrgs}px` }}>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-black text-xs text-white px-2 py-1 rounded">
                              {day.orgs} Orgs
                            </div>
                         </div>
                       </div>
                       <span className="text-[10px] text-gray-500 mt-2 rotate-45 md:rotate-0 origin-left whitespace-nowrap">
                         {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                       </span>
                     </div>
                   );
                 })}
               </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <Network className="h-10 w-10 mb-2 opacity-20" />
                <p>No recent activity data available.</p>
             </div>
           )}
        </Card>
      </div>
    </div>
  );
}
