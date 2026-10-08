import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  PenTool, 
  Database, 
  Webhook, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Settings as SettingsIcon,
  ExternalLink,
  Plus
} from 'lucide-react';
import { useAuth, orgFetch } from '../../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

export function AppDesigner() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const basePath = user?.role === 'lead_designer' ? '/lead-designer/dashboard' : '/designer/dashboard';

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        setLoading(true);
        const res = await orgFetch('/api/designer/workspace');
        if (!res.ok) {
          throw new Error('Failed to load designer workspace. Status: ' + res.status);
        }
        const data = await res.json();
        setWorkspace(data);
      } catch (err) {
        console.error('Failed to fetch designer workspace:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchWorkspace();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-500/10 border-red-500/50">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <Activity className="h-12 w-12 text-red-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Workspace Unavailable</h2>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
          <Button variant="outline" className="mt-4 border-red-500/50 text-red-400 hover:bg-red-500/20" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </Card>
    );
  }

  const app = workspace?.application;
  const org = workspace?.organization;
  const schema = workspace?.schema || { hasSchema: false, tableCount: 0, tables: [] };
  const apis = workspace?.apis || { hasApis: false, endpointCount: 0, endpoints: [] };
  const pages = workspace?.pages || { count: 0, pages: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Designer Workspace</h1>
          <p className="text-gray-400 mt-1 flex items-center gap-2">
            <span>Welcome, {user?.name}.</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-primary-400 font-medium">
              <Building2 className="h-4 w-4" />
              {org?.name || user?.organizationName || 'Organization'}
            </span>
          </p>
        </div>
      </div>

      {/* Main Organization Application Workspace Hub */}
      {app ? (
        <Card className="p-8 border-primary-500/30 bg-gradient-to-br from-dark-200 via-dark-200 to-primary-950/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <PenTool className="h-48 w-48 text-primary-500" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white tracking-tight">{app.app_name}</h2>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                    app.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {app.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-1 max-w-2xl">
                  {app.app_description || 'Design screens, configure forms & tables, and link real schema and REST APIs.'}
                </p>
              </div>

              {/* Prominent Builder Entry Point */}
              <Link to={`${basePath}/apps/${app.id}/builder`}>
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="gap-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.5)] border-none font-semibold text-base py-3 px-6"
                >
                  <PenTool className="h-5 w-5" />
                  Launch Application Builder
                </Button>
              </Link>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10">
              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/5 space-y-1">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                  <Database className="h-4 w-4 text-blue-400" />
                  Database Schema
                </span>
                <p className="text-sm font-bold text-white">
                  {schema.hasSchema ? `${schema.tableCount} Tables Configured` : 'Not Configured'}
                </p>
                <p className="text-[11px] text-gray-500 truncate font-mono">
                  {schema.tables.map(t => t.name).join(', ') || 'No tables'}
                </p>
              </div>

              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/5 space-y-1">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                  <Webhook className="h-4 w-4 text-purple-400" />
                  REST APIs
                </span>
                <p className="text-sm font-bold text-white">
                  {apis.hasApis ? `${apis.endpointCount} Active Endpoints` : 'No Endpoints'}
                </p>
                <p className="text-[11px] text-gray-500 truncate font-mono">
                  {apis.endpoints.map(e => e.method).join(', ') || 'No APIs'}
                </p>
              </div>

              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/5 space-y-1">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Application Screens
                </span>
                <p className="text-sm font-bold text-white">
                  {pages.count} Configured Pages
                </p>
                <p className="text-[11px] text-gray-500 truncate font-mono">
                  {pages.pages.map(p => p.name).join(', ') || 'Dashboard'}
                </p>
              </div>

              <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/5 space-y-1">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Last Updated
                </span>
                <p className="text-sm font-bold text-white">
                  {new Date(app.updated_at).toLocaleDateString()}
                </p>
                <p className="text-[11px] text-gray-500 font-mono">
                  ID: #{app.id}
                </p>
              </div>
            </div>

            {/* Sub-Navigation Links to Specific Workspaces */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to={`${basePath}/apps/${app.id}/builder`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs text-primary-300 border-primary-500/30">
                  <PenTool className="h-3.5 w-3.5" />
                  UI Canvas
                </Button>
              </Link>
              <Link to={`${basePath}/apps/${app.id}/schema`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Database className="h-3.5 w-3.5 text-blue-400" />
                  Schema Editor
                </Button>
              </Link>
              <Link to={`${basePath}/apps/${app.id}/apis`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Webhook className="h-3.5 w-3.5 text-purple-400" />
                  REST Endpoints
                </Button>
              </Link>
              <Link to={`${basePath}/apps/${app.id}/settings`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <SettingsIcon className="h-3.5 w-3.5 text-gray-400" />
                  App Settings
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center border-dashed border-white/10 space-y-4">
          <div className="mx-auto h-16 w-16 bg-white/5 rounded-full flex items-center justify-center">
            <Layers className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white">No Application Created Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto text-sm">
            Your organization doesn't have an active application yet. Create your single application to start designing screens.
          </p>
          <Link to={`${basePath}/apps/create`}>
            <Button variant="primary" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Application
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
