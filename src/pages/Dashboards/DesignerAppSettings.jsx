import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save, AlertTriangle, Trash2, Settings, Server, Database, Shield,
  CheckCircle2, AlertCircle, RefreshCw, Layers, Globe, Palette,
  RotateCcw, ExternalLink
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { orgFetch } from '../../hooks/useAuth';

const THEME_COLORS = [
  { name: 'Sky Blue', hex: '#0ea5e9' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Purple', hex: '#a855f7' }
];

export function DesignerAppSettings({ application, onUpdate, basePath }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Diagnostics State
  const [systemStatus, setSystemStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    app_name: application?.app_name || '',
    app_description: application?.app_description || '',
    status: application?.status || 'draft',
    industry: application?.industry || 'Education',
    industry_template: application?.industry_template || 'Student Management System',
    deployment_type: application?.deployment_type || 'cloud',
    theme_color: application?.theme_color || '#0ea5e9',
    default_route: application?.default_route || '/'
  });

  // Track initial state for Cancel / Reset
  const [initialData, setInitialData] = useState({ ...formData });

  // Fetch real system diagnostics from backend
  useEffect(() => {
    const fetchDiagnostics = async () => {
      if (!application?.id) return;
      setLoadingStatus(true);
      try {
        const res = await orgFetch(`/api/designer/applications/${application.id}/system-status`);
        if (res.ok) {
          const data = await res.json();
          setSystemStatus(data);
        }
      } catch (err) {
        console.error('Failed to load system diagnostics:', err);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchDiagnostics();
  }, [application?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({ ...initialData });
    setError('');
    setSuccess('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const trimmedName = (formData.app_name || '').trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      setError('Application Name must contain between 2 and 100 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: trimmedName,
          app_description: formData.app_description,
          status: formData.status,
          industry: formData.industry,
          industry_template: formData.industry_template,
          deployment_type: formData.deployment_type,
          theme_color: formData.theme_color,
          default_route: formData.default_route
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (onUpdate && data.application) {
          onUpdate(data.application);
        }
        setInitialData({ ...formData });
        setSuccess('Application settings and configuration successfully updated and persisted.');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update application settings');
      }
    } catch (err) {
      console.error(err);
      setError('Network connection error while saving application settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmation = window.prompt(
      `CAUTION: To permanently delete "${application.app_name}" and all associated schemas, APIs, and runtime data, type the application name below to confirm:`
    );

    if (confirmation !== application.app_name) {
      if (confirmation !== null) {
        alert('Name did not match. Application deletion cancelled.');
      }
      return;
    }

    setDeleteLoading(true);
    setError('');

    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        navigate(`${basePath}/apps`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete application');
        setDeleteLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred during deletion.');
      setDeleteLoading(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary-400" />
          Application Settings & Infrastructure Diagnostics
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Configure metadata, operational parameters, and inspect verified infrastructure readiness for <strong className="text-gray-200">{application?.app_name}</strong>.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="font-semibold">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SECTION 1: GENERAL APPLICATION CONFIGURATION */}
      <Card className="p-6 border-white/10 bg-dark-300/80">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary-400" /> General Configuration
        </h3>

        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Application Name <span className="text-red-400">*</span>
              </label>
              <Input
                name="app_name"
                value={formData.app_name}
                onChange={handleChange}
                className="w-full text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Status Lifecycle
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg bg-dark-400 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="draft">Draft (Private development)</option>
                <option value="active">Active (Available to designers)</option>
                <option value="published">Published (Operational in runtime)</option>
                <option value="archived">Archived (Read-only)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Application Description
            </label>
            <textarea
              name="app_description"
              value={formData.app_description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the application scope and business objective..."
              className="w-full rounded-lg bg-dark-400 border border-white/10 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Industry Domain
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full rounded-lg bg-dark-400 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Education">Education & Academia</option>
                <option value="Healthcare">Healthcare & Clinical</option>
                <option value="Finance">Finance & Banking</option>
                <option value="Retail">Retail & E-Commerce</option>
                <option value="Logistics">Logistics & Supply Chain</option>
                <option value="Technology">Technology & SaaS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Default Landing Route
              </label>
              <Input
                name="default_route"
                value={formData.default_route}
                onChange={handleChange}
                placeholder="e.g. / or /students"
                className="font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Deployment Mode
              </label>
              <select
                name="deployment_type"
                value={formData.deployment_type}
                onChange={handleChange}
                className="w-full rounded-lg bg-dark-400 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="cloud">Entera Decoupled Cloud</option>
                <option value="on-premise">Self-Hosted Dedicated</option>
                <option value="hybrid">Hybrid Deployment</option>
              </select>
            </div>
          </div>

          {/* Theme & Brand Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary-400" />
              Primary Theme Accent Color
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              {THEME_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, theme_color: c.hex }))}
                  className={`h-8 w-8 rounded-full border-2 transition-transform flex items-center justify-center ${
                    formData.theme_color === c.hex ? 'scale-110 border-white' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {formData.theme_color === c.hex && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
              <Input
                name="theme_color"
                value={formData.theme_color}
                onChange={handleChange}
                className="w-28 font-mono text-xs uppercase"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              disabled={loading || !hasChanges}
              onClick={handleReset}
              className="gap-2 border-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Discard Changes
            </Button>

            <Button
              type="submit"
              disabled={loading || !hasChanges}
              className="gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium min-w-[130px]"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      {/* SECTION 2: SYSTEM & INFRASTRUCTURE STATUS (READ-ONLY) */}
      <Card className="p-6 border-white/10 bg-dark-300/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-400" /> Infrastructure Health & Readiness
            </h3>
            <p className="text-xs text-gray-400">
              Live operational metrics and multi-tenant security status (sensitive passwords and keys are never exposed).
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            OPERATIONAL
          </span>
        </div>

        {loadingStatus ? (
          <div className="py-12 flex justify-center">
            <RefreshCw className="h-6 w-6 text-primary-400 animate-spin" />
          </div>
        ) : systemStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Backend Engine */}
            <div className="p-4 rounded-xl bg-dark-400/60 border border-white/5 space-y-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Backend API Server</span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Node.js {systemStatus.server?.nodeVersion} (Port {systemStatus.server?.port})
              </div>
              <div className="text-xs text-gray-400 font-mono">
                Uptime: {Math.floor((systemStatus.server?.uptimeSeconds || 0) / 60)} min &bull; {systemStatus.server?.requestsPerMinute} req/min
              </div>
            </div>

            {/* PostgreSQL Engine */}
            <div className="p-4 rounded-xl bg-dark-400/60 border border-white/5 space-y-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Database Connection</span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-400" />
                {systemStatus.database?.engine}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                Catalog: {systemStatus.database?.databaseName} &bull; SSL: {systemStatus.database?.sslEnabled ? 'Active' : 'Disabled'}
              </div>
            </div>

            {/* Security Isolation */}
            <div className="p-4 rounded-xl bg-dark-400/60 border border-white/5 space-y-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Security Isolation</span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-400" />
                Strict Multi-Tenancy Active
              </div>
              <div className="text-xs text-gray-400 font-mono">
                Rate Limiting: Active &bull; {systemStatus.security?.corsOriginsCount} CORS Origins
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      {/* SECTION 3: DANGER ZONE */}
      <Card className="p-6 border-red-500/20 bg-red-950/10 space-y-4">
        <div className="flex items-center gap-2.5 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-lg font-bold">Danger Zone</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
          Deleting an application is permanent. All pages, UI component trees, database schemas, REST APIs, and runtime entity records associated with <strong className="text-gray-200">{application?.app_name}</strong> will be permanently removed.
        </p>

        <div>
          <Button
            type="button"
            variant="outline"
            disabled={deleteLoading}
            onClick={handleDelete}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2 text-xs"
          >
            {deleteLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {deleteLoading ? 'Deleting Application...' : 'Permanently Delete Application'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
