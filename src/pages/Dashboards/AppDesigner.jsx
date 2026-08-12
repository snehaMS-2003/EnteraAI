import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  FolderKanban, 
  Workflow, 
  Database, 
  Network, 
  Plus, 
  Bot,
  Activity
} from 'lucide-react';

export function AppDesigner() {
  const navigate = useNavigate();
  const stats = [
    { title: 'Total Applications', value: '12', icon: FolderKanban, color: 'text-blue-500' },
    { title: 'Generated Workflows', value: '48', icon: Workflow, color: 'text-purple-500' },
    { title: 'Database Schemas', value: '24', icon: Database, color: 'text-green-500' },
    { title: 'Generated APIs', value: '156', icon: Network, color: 'text-orange-500' },
  ];

  const recentApps = [
    { name: 'Customer Portal', industry: 'Retail', template: 'B2C E-commerce', status: 'Deployed', date: '2026-07-25' },
    { name: 'Inventory Manager', industry: 'Logistics', template: 'Internal Tool', status: 'Draft', date: '2026-07-26' },
    { name: 'Patient Records', industry: 'Healthcare', template: 'HIPAA Compliant', status: 'Building', date: '2026-07-27' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Application Designer Dashboard</h1>
          <p className="text-gray-400">Welcome back. Here's an overview of your projects.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Recommendation
          </Button>
          <Button className="gap-2" onClick={() => navigate('/dashboard/designer/apps/create')}>
            <Plus className="h-4 w-4" />
            Create Application
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className="flex items-center p-6 gap-4">
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <h3 className="text-lg font-semibold mb-4 text-white">Recent Applications</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-sm">
                    <th className="pb-3 font-medium">Application Name</th>
                    <th className="pb-3 font-medium">Industry</th>
                    <th className="pb-3 font-medium">Template</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-gray-300">
                  {recentApps.map((app, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 font-medium text-white">{app.name}</td>
                      <td className="py-4">{app.industry}</td>
                      <td className="py-4 text-gray-400">{app.template}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          app.status === 'Deployed' ? 'bg-green-500/20 text-green-400' :
                          app.status === 'Draft' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-4">{app.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        
        <div>
          <Card className="h-full">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-500" />
              Recent Activity
            </h3>
            <div className="space-y-6">
              {[
                { title: 'Workflow Generated', desc: 'Patient Records Application', time: '2 hours ago' },
                { title: 'Schema Generated', desc: 'Inventory Manager', time: '5 hours ago' },
                { title: 'API Generated', desc: 'Inventory Manager', time: '6 hours ago' },
                { title: 'Deployment Completed', desc: 'Customer Portal', time: '1 day ago' },
              ].map((activity, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== 3 && <div className="absolute left-1.5 top-6 bottom-[-24px] w-[1px] bg-white/10" />}
                  <div className="h-3 w-3 mt-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">{activity.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.desc}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
