import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink,
  RefreshCw, Shield, History, Clock, ArrowRight, Copy, Check,
  Lock, Eye, Power, FileCode, Database, Webhook, Layers
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth, orgFetch } from '../../../hooks/useAuth';

export function DeploymentManager({ application, onUpdate, basePath }) {
  const { user } = useAuth();
  
  const [deployments, setDeployments] = useState([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  
  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Publishing / Unpublishing state
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  
  // Feedback toasts
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const canPublish = user?.role && ['org_admin', 'sys_admin', 'lead_designer'].includes(user.role);
  const isPublished = (application?.status || '').toLowerCase() === 'published';
  const isUnpublished = (application?.status || '').toLowerCase() === 'unpublished';

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch real PostgreSQL deployment history
  const fetchDeployments = useCallback(async () => {
    if (!application?.id) return;
    setLoadingDeployments(true);
    try {
      const res = await orgFetch(`/api/applications/${application.id}/deployments`);
      if (res.ok) {
        const data = await res.json();
        setDeployments(data);
      }
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoadingDeployments(false);
    }
  }, [application?.id]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // Run pre-publish validation check
  const handleValidate = async () => {
    if (!application?.id) return;
    setValidating(true);
    try {
      const res = await orgFetch(`/api/applications/${application.id}/validate-publish`, {
        method: 'POST'
      });
      const data = await res.json();
      setValidationResult(data);
      setShowValidationModal(true);
    } catch (err) {
      showToast('Failed to validate application configuration', 'error');
    } finally {
      setValidating(false);
    }
  };

  // Execute Publish
  const handlePublish = async () => {
    if (!application?.id) return;
    setPublishing(true);
    try {
      const res = await orgFetch(`/api/applications/${application.id}/publish`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish application');
      }

      showToast(data.message || `Application published successfully as version ${data.version}!`);
      setShowValidationModal(false);
      
      // Refresh deployments & app parent state
      fetchDeployments();
      if (onUpdate) {
        onUpdate({
          ...application,
          status: 'published',
          published_version: data.version,
          published_at: data.deployment?.published_at || new Date().toISOString()
        });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPublishing(false);
    }
  };

  // Execute Unpublish
  const handleUnpublish = async () => {
    if (!application?.id) return;
    setUnpublishing(true);
    try {
      const res = await orgFetch(`/api/applications/${application.id}/unpublish`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unpublish application');
      }

      showToast(data.message || 'Application has been unpublished.');
      setShowUnpublishModal(false);

      fetchDeployments();
      if (onUpdate) {
        onUpdate({
          ...application,
          status: 'unpublished'
        });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUnpublishing(false);
    }
  };

  const runtimeSlug = (application?.app_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const liveUrl = `/app/${runtimeSlug || application?.id}`;

  const copyToClipboard = (text, id) => {
    const fullUrl = `${window.location.origin}${text}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    showToast('Deployment URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm animate-in fade-in slide-in-from-bottom-3 ${
          toast.type === 'error'
            ? 'bg-red-950/90 border-red-500/40 text-red-200'
            : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Application Status</span>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isPublished
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : isUnpublished
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                <span className={`h-2 w-2 rounded-full ${isPublished ? 'bg-emerald-400 animate-pulse' : isUnpublished ? 'bg-rose-400' : 'bg-amber-400'}`} />
                {(application.status || 'draft').toUpperCase()}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {isPublished 
              ? 'Active in published runtime' 
              : isUnpublished 
              ? 'Runtime deactivated' 
              : 'Draft development mode'}
          </p>
        </Card>

        {/* Version Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Published Version</span>
            <div className="mt-2 text-2xl font-black text-white">
              {application.published_version ? `v${application.published_version}` : 'v1.0 (Draft)'}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {deployments.length > 0 ? `${deployments.length} releases deployed` : 'No release published yet'}
          </p>
        </Card>

        {/* Published Date Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Published</span>
            <div className="mt-2 text-sm font-semibold text-gray-200">
              {application.published_at 
                ? new Date(application.published_at).toLocaleString() 
                : (deployments[0]?.published_at ? new Date(deployments[0].published_at).toLocaleString() : 'Never')}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Auto-versioned on release
          </p>
        </Card>

        {/* Security & Access Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Publish Permissions</span>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
              <Shield className={`h-4 w-4 ${canPublish ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className={canPublish ? 'text-emerald-300' : 'text-amber-300'}>
                {canPublish ? 'Authorized Publisher' : 'Designer (Read-only)'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            {canPublish ? 'Organization Admin / Lead permissions active' : 'Publishing requires Org Admin role'}
          </p>
        </Card>
      </div>

      {/* Action Header Card */}
      <Card className="p-6 bg-gradient-to-br from-dark-300 to-dark-200 border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Application Publishing & Deployment</h2>
            </div>
            <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
              Validate your pages, database schema, and REST API configuration before publishing. Published releases generate a stable snapshot for end users while draft changes remain isolated.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Preview Button */}
            <Button
              variant="outline"
              onClick={() => window.open(`/preview/${application.id}`, '_blank')}
              className="gap-2"
            >
              <Eye className="h-4 w-4 text-primary-400" />
              <span>Preview Draft</span>
            </Button>

            {/* Unpublish Button (when published) */}
            {isPublished && (
              <Button
                variant="destructive"
                disabled={!canPublish || unpublishing}
                onClick={() => setShowUnpublishModal(true)}
                className="gap-2"
                title={!canPublish ? 'Requires Organization Administrator role' : 'Deactivate published application'}
              >
                <Power className="h-4 w-4" />
                <span>Unpublish</span>
              </Button>
            )}

            {/* Publish Button */}
            <Button
              variant="primary"
              disabled={!canPublish || validating || publishing}
              onClick={handleValidate}
              className="gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 shadow-lg hover:from-primary-500 hover:to-indigo-500"
              title={!canPublish ? 'Requires Organization Administrator role' : 'Validate and publish new version'}
            >
              {validating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 text-white" />
                  <span>{isPublished ? 'Publish New Version' : 'Publish Application'}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Published Route Banner (if published) */}
        {isPublished && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Application URL</span>
                <p className="text-sm font-mono text-gray-200 mt-0.5">{liveUrl}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(liveUrl, 'header-url')}
                className="gap-1.5 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
              >
                {copiedId === 'header-url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedId === 'header-url' ? 'Copied' : 'Copy URL'}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(liveUrl, '_blank')}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 border-none text-white shadow-md shadow-emerald-900/40"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Live Application</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Real PostgreSQL Deployment History (Task 8) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-primary-400" />
            <h3 className="text-lg font-bold text-white">Deployment History</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
              {deployments.length} Records
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeployments}
            disabled={loadingDeployments}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingDeployments ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {loadingDeployments ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : deployments.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-dark-400/40">
            <Rocket className="h-10 w-10 text-gray-500 mx-auto mb-3 opacity-60" />
            <h4 className="text-sm font-semibold text-gray-300">No deployments recorded yet</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Click &quot;Publish Application&quot; above to validate configurations and deploy the first release of this application.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-dark-300/80 text-gray-400 text-xs uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deployment State</th>
                  <th className="py-3 px-4">Published Date</th>
                  <th className="py-3 px-4">Published By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {deployments.map((d, index) => {
                  const isLatest = index === 0;
                  const isDepActive = (d.status || '').toLowerCase() === 'published' && d.deployment_state === 'DEPLOYED';

                  return (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-white flex items-center gap-2">
                        <span>v{d.version || '1.0'}</span>
                        {isLatest && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                            Latest
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-200 font-medium">
                        {d.application_name || application.app_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          isDepActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isDepActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {d.status || 'published'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          d.deployment_state === 'DEPLOYED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : d.deployment_state === 'UNPUBLISHED'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {d.deployment_state || 'DEPLOYED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                        {d.published_at ? new Date(d.published_at).toLocaleString() : new Date(d.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-300">
                        {d.published_by || 'Administrator'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(d.deployment_url || liveUrl, d.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            title="Copy runtime URL"
                          >
                            {copiedId === d.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </button>
                          {isDepActive && (
                            <button
                              type="button"
                              onClick={() => window.open(d.deployment_url || liveUrl, '_blank')}
                              className="p-1.5 rounded text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors"
                              title="Open in live runtime"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pre-Publish Validation Modal (Task 2) */}
      <AnimatePresence>
        {showValidationModal && validationResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-300 border border-white/10 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${validationResult.valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {validationResult.valid ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Pre-Publish Validation</h3>
                    <p className="text-xs text-gray-400">Verifying configuration integrity before release</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowValidationModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              {/* Validation Checklist Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-dark-400/60 border border-white/5">
                  <div className="flex items-center gap-3">
                    <FileCode className="h-4 w-4 text-primary-400" />
                    <span className="text-sm font-medium text-gray-200">Application Configuration</span>
                  </div>
                  {validationResult.checks?.application ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Passed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                      <AlertCircle className="h-4 w-4" /> Failed
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-dark-400/60 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-gray-200">Business Modules</span>
                  </div>
                  {validationResult.checks?.modules ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Configured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                      <AlertCircle className="h-4 w-4" /> Missing
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-dark-400/60 border border-white/5">
                  <div className="flex items-center gap-3">
                    <FileCode className="h-4 w-4 text-teal-400" />
                    <span className="text-sm font-medium text-gray-200">Pages & Navigation</span>
                  </div>
                  {validationResult.checks?.pages ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Configured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                      <AlertCircle className="h-4 w-4" /> Missing
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-dark-400/60 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-medium text-gray-200">Database Schema</span>
                  </div>
                  {validationResult.checks?.schema ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Tables Defined
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                      <AlertCircle className="h-4 w-4" /> Missing
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-dark-400/60 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-gray-200">REST APIs</span>
                  </div>
                  {validationResult.checks?.apis ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Endpoints Defined
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                      <AlertCircle className="h-4 w-4" /> Missing
                    </span>
                  )}
                </div>
              </div>

              {/* Error messages if validation failed */}
              {!validationResult.valid && validationResult.errors?.length > 0 && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Validation Errors (Cannot Publish)
                  </h4>
                  <ul className="text-xs text-red-200 space-y-1 list-disc list-inside">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ready to Publish Info */}
              {validationResult.valid && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                  All system checks passed successfully. Publishing will create a new immutable release snapshot in PostgreSQL and update runtime access immediately.
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setShowValidationModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!validationResult.valid || publishing}
                  onClick={handlePublish}
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-none shadow-lg shadow-emerald-950/50"
                >
                  {publishing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      <span>Confirm & Publish Release</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unpublish Confirmation Modal (Task 7) */}
      <AnimatePresence>
        {showUnpublishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-300 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-rose-500/20 text-rose-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Unpublish Application?</h3>
                  <p className="text-xs text-gray-400">Deactivate live runtime execution</p>
                </div>
              </div>

              <div className="text-xs text-gray-300 leading-relaxed bg-dark-400/60 p-4 rounded-xl border border-white/5 space-y-2">
                <p>
                  Unpublishing will immediately revoke public runtime access to this application. End users attempting to open the URL will receive an <span className="font-mono text-rose-400">APP_UNPUBLISHED</span> status.
                </p>
                <p className="text-gray-400">
                  <strong className="text-white">Note:</strong> All existing data records (including students and entities), schemas, and deployment history are completely preserved in PostgreSQL.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUnpublishModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={unpublishing}
                  onClick={handleUnpublish}
                  className="gap-2"
                >
                  {unpublishing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Unpublishing...</span>
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4" />
                      <span>Confirm Unpublish</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
