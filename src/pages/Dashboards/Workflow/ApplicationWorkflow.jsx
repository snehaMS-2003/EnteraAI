import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

// Import workflow steps
import { BasicInfo } from './BasicInfo';
import { TemplateSelection } from './TemplateSelection';
import { ModuleManagement } from './ModuleManagement';
import { AppConfiguration } from './AppConfiguration';
import { DatabaseSchema } from './DatabaseSchema';
import { ApiManagement } from './ApiManagement';
import { Review } from './Review';

const steps = [
  { id: 'basic', label: 'Basic Information', path: 'basic' },
  { id: 'template', label: 'Template', path: 'template' },
  { id: 'modules', label: 'Modules', path: 'modules' },
  { id: 'config', label: 'Configuration', path: 'config' },
  { id: 'schema', label: 'Database Schema', path: 'schema' },
  { id: 'apis', label: 'APIs', path: 'apis' },
  { id: 'review', label: 'Review', path: 'review' }
];

export function ApplicationWorkflow() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const basePath = user?.role === 'lead_designer' ? '/lead-designer/dashboard' : '/designer/dashboard';

  const currentStepIndex = steps.findIndex(step => location.pathname.includes(step.path));

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/designer/applications/${id}`, {
          headers: {
            'x-org-id': user?.organizationId,
            'x-user-id': user?.id,
            'x-user-email': user?.email
          }
        });
        if (res.ok) {
          const data = await res.json();
          setApplication(data);
        } else {
          // If access denied or not found, redirect to apps list
          navigate(`${basePath}/apps`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchApp();
  }, [id, user, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" /></div>;
  }

  if (!application) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`${basePath}/apps`} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Application: {application.app_name}</h1>
          <p className="text-gray-400 mt-1">Application Design Workflow</p>
        </div>
      </div>

      <div className="bg-dark-200/50 rounded-xl border border-white/5 overflow-hidden">
        <div className="flex flex-wrap overflow-x-auto border-b border-white/10 bg-dark-300/50">
          {steps.map((step, idx) => (
            <Link
              key={step.id}
              to={step.path}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                currentStepIndex === idx
                  ? 'text-primary-400 border-b-2 border-primary-500 bg-primary-500/5'
                  : currentStepIndex > idx
                  ? 'text-white hover:bg-white/5'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs ${
                currentStepIndex === idx
                  ? 'bg-primary-500 text-white'
                  : currentStepIndex > idx
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-white/10 text-gray-400'
              }`}>
                {idx + 1}
              </span>
              {step.label}
              {idx < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-2 text-gray-600" />
              )}
            </Link>
          ))}
        </div>
        
        <div className="p-6">
          <Routes>
            <Route path="basic" element={<BasicInfo application={application} onUpdate={setApplication} basePath={basePath} />} />
            <Route path="template" element={<TemplateSelection application={application} onUpdate={setApplication} basePath={basePath} />} />
            <Route path="modules" element={<ModuleManagement application={application} basePath={basePath} />} />
            <Route path="config" element={<AppConfiguration application={application} onUpdate={setApplication} basePath={basePath} />} />
            <Route path="schema" element={<DatabaseSchema application={application} basePath={basePath} />} />
            <Route path="apis" element={<ApiManagement application={application} basePath={basePath} />} />
            <Route path="review" element={<Review application={application} basePath={basePath} />} />
            <Route path="*" element={<BasicInfo application={application} onUpdate={setApplication} basePath={basePath} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
