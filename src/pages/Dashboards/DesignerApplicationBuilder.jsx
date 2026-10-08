import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, Webhook, Settings as SettingsIcon, ArrowLeft, PenTool, Rocket } from 'lucide-react';
import { useAuth, orgFetch } from '../../hooks/useAuth';

// Sub-components
import { DesignerAppOverview } from './DesignerAppOverview';
import { DatabaseSchema } from './Workflow/DatabaseSchema';
import { ApiManagement } from './Workflow/ApiManagement';
import { DesignerAppSettings } from './DesignerAppSettings';
import { AppUiBuilder } from './Builder/AppUiBuilder';
import { DeploymentManager } from './Workflow/DeploymentManager';

export function DesignerApplicationBuilder() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const basePath = user?.role === 'lead_designer' ? '/lead-designer/dashboard' : '/designer/dashboard';

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await orgFetch(`/api/designer/applications/${id}`);
        if (res.ok) {
          const data = await res.json();
          setApplication(data);
          localStorage.setItem('lastSelectedAppId', data.id.toString());
        } else {
          navigate(`${basePath}/apps`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchApp();
  }, [id, user, navigate, basePath]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" /></div>;
  }

  if (!application) return null;

  const tabs = [
    { name: 'Overview', path: '', icon: LayoutDashboard },
    { name: 'UI Builder', path: 'builder', icon: PenTool },
    { name: 'Database Schema', path: 'schema', icon: Database },
    { name: 'REST APIs', path: 'apis', icon: Webhook },
    { name: 'Deployments', path: 'deployments', icon: Rocket },
    { name: 'Settings', path: 'settings', icon: SettingsIcon },
  ];

  // Helper to determine if a tab is active
  const isTabActive = (path) => {
    const currentPath = location.pathname;
    const basePathForApp = `${basePath}/apps/${id}`;
    if (path === '') {
      return currentPath === basePathForApp || currentPath === `${basePathForApp}/`;
    }
    return currentPath.startsWith(`${basePathForApp}/${path}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`${basePath}/apps`} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Application: {application.app_name}</h1>
          <p className="text-gray-400 mt-1">Application Builder Workspace</p>
        </div>
      </div>

      <div className="bg-dark-200/50 rounded-xl border border-white/5 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-white/10 bg-dark-300/50">
          {tabs.map((tab) => {
            const active = isTabActive(tab.path);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.name}
                to={tab.path}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </div>
        
        {/* Main Content Area */}
        <div className="p-6">
          <Routes>
            <Route path="" element={<DesignerAppOverview application={application} basePath={basePath} />} />
            <Route path="builder/*" element={<AppUiBuilder application={application} basePath={basePath} />} />
            <Route path="schema" element={<DatabaseSchema application={application} basePath={basePath} />} />
            <Route path="apis" element={<ApiManagement application={application} basePath={basePath} />} />
            <Route path="deployments" element={<DeploymentManager application={application} onUpdate={setApplication} basePath={basePath} />} />
            <Route path="settings" element={<DesignerAppSettings application={application} onUpdate={setApplication} basePath={basePath} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
