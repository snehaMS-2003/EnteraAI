import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings2, ArrowLeft, Construction } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function ConfigureApplication() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Configure Application</h1>
          <p className="text-gray-400 text-sm">
            Application ID: <span className="text-primary-400 font-mono">{id}</span>
          </p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="p-4 rounded-2xl bg-primary-500/10 border border-primary-500/20">
            <Construction className="h-10 w-10 text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Configure Application</h2>
            <p className="text-gray-400 text-sm max-w-md">
              This page will let you configure modules, roles, workflows and deployment settings
              for your new enterprise application.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20">
            <Settings2 className="h-4 w-4 text-primary-400" />
            <span className="text-sm text-primary-300">Coming Soon</span>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
