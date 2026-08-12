import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Building2, Network, Server, Users } from 'lucide-react';

export function SystemAdmin() {
  const stats = [
    { title: 'Total Organizations', value: '142', icon: Building2, color: 'text-purple-500' },
    { title: 'Total Applications', value: '1,024', icon: Server, color: 'text-blue-500' },
    { title: 'Registered Users', value: '3,842', icon: Users, color: 'text-green-500' },
    { title: 'API Requests / min', value: '45.2k', icon: Network, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System Administrator Dashboard</h1>
        <p className="text-gray-400">Platform overview and health metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="min-h-[300px] flex items-center justify-center">
           <p className="text-gray-500">System Health Chart</p>
        </Card>
        <Card className="min-h-[300px] flex items-center justify-center">
           <p className="text-gray-500">Platform Activity Chart</p>
        </Card>
      </div>
    </div>
  );
}
