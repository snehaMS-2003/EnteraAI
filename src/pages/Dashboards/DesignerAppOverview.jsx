import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Database, Webhook, Settings2, PlayCircle, Calendar, Tag, PenTool, Rocket, ExternalLink } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function DesignerAppOverview({ application, basePath }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ tablesCount: 0, apisCount: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [schemaRes, apisRes] = await Promise.all([
          orgFetch(`/api/designer/applications/${application.id}/schema`),
          orgFetch(`/api/designer/applications/${application.id}/apis`)
        ]);

        let tablesCount = 0;
        let apisCount = 0;

        if (schemaRes.ok) {
          const schemaData = await schemaRes.json();
          tablesCount = schemaData.tables?.length || 0;
        }

        if (apisRes.ok) {
          const apiData = await apisRes.json();
          apisCount = apiData.endpoints?.length || 0;
        }

        setStats({ tablesCount, apisCount });
      } catch (err) {
        console.error('Failed to fetch app stats:', err);
      }
    };

    if (application?.id) fetchStats();
  }, [application]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 bg-primary-500/10 rounded-full">
            <Tag className="h-6 w-6 text-primary-400" />
          </div>
          <p className="text-sm text-gray-400">Status</p>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
            application.status === 'published'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : application.status === 'unpublished'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : application.status === 'preview'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {(application.status || 'draft').toUpperCase()}
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {application.published_version ? `v${application.published_version}` : 'v1.0 (Draft)'}
          </span>
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <Database className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm text-gray-400">Database Tables</p>
          <p className="text-2xl font-bold">{stats.tablesCount}</p>
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 bg-purple-500/10 rounded-full">
            <Webhook className="h-6 w-6 text-purple-400" />
          </div>
          <p className="text-sm text-gray-400">REST APIs</p>
          <p className="text-2xl font-bold">{stats.apisCount}</p>
        </Card>

        <Card className="p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="p-3 bg-gray-500/10 rounded-full">
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-400">Last Updated</p>
          <p className="text-sm font-medium">{new Date(application.updated_at).toLocaleDateString()}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Application Details</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Description</p>
              <p className="text-gray-200 mt-1">{application.app_description || 'No description provided.'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Industry</p>
              <p className="text-gray-200 mt-1">{application.industry_template || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Application ID</p>
              <p className="text-gray-200 mt-1 font-mono text-xs bg-white/5 p-2 rounded">{application.id}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="primary" 
              className="h-auto py-3.5 flex flex-col items-center gap-1.5 bg-gradient-to-r from-primary-600 to-indigo-600 border-none shadow-lg hover:from-primary-500 hover:to-indigo-500"
              onClick={() => navigate('builder')}
            >
              <PenTool className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Application Builder</span>
              <span className="text-[11px] text-primary-200">Design screens & pages</span>
            </Button>

            <Button 
              variant="primary" 
              className="h-auto py-3.5 flex flex-col items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 border-none shadow-lg hover:from-emerald-500 hover:to-teal-500"
              onClick={() => window.open(`/preview/${application.id}`, '_blank')}
            >
              <PlayCircle className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Preview Application</span>
              <span className="text-[11px] text-emerald-200">Test live draft execution</span>
            </Button>

            <Button 
              variant="primary" 
              className="h-auto py-3.5 flex flex-col items-center gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 border-none shadow-lg hover:from-violet-500 hover:to-fuchsia-500"
              onClick={() => navigate('deployments')}
            >
              <Rocket className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Deployments</span>
              <span className="text-[11px] text-violet-200">Publish, version & history</span>
            </Button>

            {application.status === 'published' ? (
              <Button 
                variant="outline" 
                className="h-auto py-3.5 flex flex-col items-center gap-1.5 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-300"
                onClick={() => window.open(`/app/${(application.app_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || application.id}`, '_blank')}
              >
                <ExternalLink className="h-5 w-5 text-emerald-400" />
                <span className="font-semibold">Open Live App</span>
                <span className="text-[11px] text-emerald-400/80">Published Runtime</span>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="h-auto py-3 flex flex-col items-center gap-1.5"
                onClick={() => navigate('schema')}
              >
                <Database className="h-5 w-5 text-blue-400" />
                <span>Database Schema</span>
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
