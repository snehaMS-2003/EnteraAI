import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook, Plus, Trash2, Edit3, Play, Save, Check, AlertCircle,
  RefreshCw, X, ArrowLeft, ArrowRight, Shield, Terminal, Send,
  FileCode2, Copy, Download, CheckCircle2, ChevronRight, Sparkles,
  Database, Clock, Globe, Lock
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth, orgFetch } from '../../../hooks/useAuth';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function ApiManagement({ application, basePath = '', isStandalone = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isWorkflowWizard = location.pathname.includes('/workflow/');

  const [apiData, setApiData] = useState({ endpoints: [] });
  const [initialApiJson, setInitialApiJson] = useState('{"endpoints":[]}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // UI Tabs: 'catalog', 'tester', 'openapi'
  const [activeTab, setActiveTab] = useState('catalog');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Modal State: Create / Edit Endpoint
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApiIndex, setEditingApiIndex] = useState(null);
  const [apiFormData, setApiFormData] = useState({
    name: '',
    method: 'GET',
    path: '',
    description: '',
    entity: '',
    auth: 'user',
    parameters: [],
    requestBodySample: ''
  });
  const [modalErrors, setModalErrors] = useState([]);

  // Delete Confirmation State
  const [endpointToDelete, setEndpointToDelete] = useState(null);

  // Interactive Tester State
  const [testMethod, setTestMethod] = useState('GET');
  const [testUrl, setTestUrl] = useState('');
  const [testQueryParams, setTestQueryParams] = useState([{ key: '', value: '' }]);
  const [testHeaders, setTestHeaders] = useState([{ key: '', value: '' }]);
  const [testBody, setTestBody] = useState('');
  const [testExecuting, setTestExecuting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // OpenAPI State
  const [openApiSpec, setOpenApiSpec] = useState(null);
  const [loadingOpenApi, setLoadingOpenApi] = useState(false);
  const [copiedSpec, setCopiedSpec] = useState(false);

  // Check unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(apiData) !== initialApiJson;
  }, [apiData, initialApiJson]);

  // Fetch real APIs from PostgreSQL
  const fetchApis = useCallback(async () => {
    if (!application?.id) return;
    setLoading(true);
    setSaveError('');
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/apis`);
      if (res.ok) {
        const data = await res.json();
        const normalized = data && Array.isArray(data.endpoints) ? data : { endpoints: [] };
        setApiData(normalized);
        setInitialApiJson(JSON.stringify(normalized));

        // If endpoints exist and tester is blank, initialize tester with first endpoint
        if (normalized.endpoints.length > 0 && !testUrl) {
          const first = normalized.endpoints[0];
          setTestMethod(first.method || 'GET');
          setTestUrl(first.path || '');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error || 'Failed to load REST APIs');
      }
    } catch (err) {
      console.error('Fetch APIs error:', err);
      setSaveError('Network error connecting to API catalog service');
    } finally {
      setLoading(false);
    }
  }, [application?.id]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  // Save APIs to backend
  const handleSave = async (redirectAfter = false) => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/apis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_data: apiData })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save APIs');
      }

      setSaveSuccess(true);
      setInitialApiJson(JSON.stringify(apiData));
      setTimeout(() => setSaveSuccess(false), 3000);

      if (redirectAfter && isWorkflowWizard) {
        navigate(`${basePath}/apps/${application.id}/workflow/review`);
      }
    } catch (err) {
      console.error('Save APIs error:', err);
      setSaveError(err.message || 'An error occurred while saving API definitions.');
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Generate CRUD APIs from Schema
  const handleGenerateFromSchema = async () => {
    setGenerating(true);
    setSaveError('');
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/apis/generate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate APIs');
      }

      const generated = data.endpoints || [];
      setApiData({ endpoints: generated });
      setInitialApiJson(JSON.stringify({ endpoints: generated }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      if (generated.length > 0) {
        setTestMethod(generated[0].method);
        setTestUrl(generated[0].path);
      }
    } catch (err) {
      console.error('Generate APIs error:', err);
      setSaveError(err.message || 'Failed to generate APIs from application schema.');
    } finally {
      setGenerating(false);
    }
  };

  // Open Create API Modal
  const openCreateModal = () => {
    setEditingApiIndex(null);
    setApiFormData({
      name: '',
      method: 'GET',
      path: `/api/runtime/${application?.id}/data/`,
      description: '',
      entity: '',
      auth: 'user',
      parameters: [],
      requestBodySample: ''
    });
    setModalErrors([]);
    setIsModalOpen(true);
  };

  // Open Edit API Modal
  const openEditModal = (idx) => {
    const ep = apiData.endpoints[idx];
    setEditingApiIndex(idx);
    setApiFormData({
      name: ep.name || '',
      method: ep.method || 'GET',
      path: ep.path || '',
      description: ep.description || '',
      entity: ep.entity || '',
      auth: ep.auth || 'user',
      parameters: ep.parameters || [],
      requestBodySample: ep.requestBody?.sample || (typeof ep.requestBody === 'string' ? ep.requestBody : '')
    });
    setModalErrors([]);
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleSaveModalForm = (e) => {
    e.preventDefault();
    const errors = [];
    const trimmedPath = (apiFormData.path || '').trim();
    const method = (apiFormData.method || 'GET').toUpperCase();

    if (!trimmedPath) {
      errors.push('Endpoint path is required.');
    } else if (!trimmedPath.startsWith('/')) {
      errors.push('Endpoint path must begin with a forward slash (/), e.g. /api/runtime/...');
    }

    if (!HTTP_METHODS.includes(method)) {
      errors.push(`Invalid HTTP method "${method}".`);
    }

    // Check duplicate route
    const duplicate = apiData.endpoints.some((ep, i) =>
      i !== editingApiIndex &&
      (ep.method || 'GET').toUpperCase() === method &&
      (ep.path || '').trim() === trimmedPath
    );
    if (duplicate) {
      errors.push(`An endpoint for ${method} "${trimmedPath}" already exists.`);
    }

    if (errors.length > 0) {
      setModalErrors(errors);
      return;
    }

    const finalizedEndpoint = {
      id: editingApiIndex !== null ? apiData.endpoints[editingApiIndex].id : `custom_${Date.now()}`,
      name: apiFormData.name.trim() || `${method} ${trimmedPath}`,
      method,
      path: trimmedPath,
      description: apiFormData.description.trim(),
      entity: apiFormData.entity.trim(),
      auth: apiFormData.auth || 'user',
      parameters: apiFormData.parameters || [],
      requestBody: ['POST', 'PUT', 'PATCH'].includes(method) && apiFormData.requestBodySample ? {
        contentType: 'application/json',
        sample: apiFormData.requestBodySample
      } : null
    };

    setApiData(prev => {
      let nextEps;
      if (editingApiIndex !== null) {
        nextEps = prev.endpoints.map((ep, i) => i === editingApiIndex ? finalizedEndpoint : ep);
      } else {
        nextEps = [...(prev.endpoints || []), finalizedEndpoint];
      }
      return { ...prev, endpoints: nextEps };
    });

    setIsModalOpen(false);
  };

  // Initiate Delete API
  const initiateDelete = (idx) => {
    setEndpointToDelete({
      index: idx,
      endpoint: apiData.endpoints[idx]
    });
  };

  const confirmDelete = () => {
    if (!endpointToDelete) return;
    setApiData(prev => ({
      ...prev,
      endpoints: prev.endpoints.filter((_, i) => i !== endpointToDelete.index)
    }));
    setEndpointToDelete(null);
  };

  // Launch Endpoint in Interactive Tester
  const launchInTester = (ep) => {
    setTestMethod(ep.method || 'GET');
    setTestUrl(ep.path || '');
    setTestBody(ep.requestBody?.sample || '');
    setTestResult(null);
    setActiveTab('tester');
  };

  // Execute Interactive API Request
  const handleExecuteTest = async (e) => {
    e?.preventDefault();
    if (!testUrl.trim()) return;

    setTestExecuting(true);
    setTestResult(null);

    // Convert query parameters array to key-value object
    const queryObj = {};
    testQueryParams.forEach(p => {
      if (p.key && p.key.trim()) queryObj[p.key.trim()] = p.value || '';
    });

    // Convert custom headers array to key-value object
    const headersObj = {};
    testHeaders.forEach(h => {
      if (h.key && h.key.trim()) headersObj[h.key.trim()] = h.value || '';
    });

    // Parse JSON body if present
    let parsedBody = null;
    if (['POST', 'PUT', 'PATCH'].includes(testMethod.toUpperCase()) && testBody.trim()) {
      try {
        parsedBody = JSON.parse(testBody);
      } catch (jsonErr) {
        setTestResult({
          status: 400,
          statusText: 'Client-Side JSON Error',
          durationMs: 0,
          headers: {},
          data: { error: `Invalid JSON syntax in request body: ${jsonErr.message}` }
        });
        setTestExecuting(false);
        return;
      }
    }

    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/apis/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: testMethod,
          url: testUrl,
          headers: headersObj,
          query: queryObj,
          body: parsedBody
        })
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error('Test execution error:', err);
      setTestResult({
        status: 0,
        statusText: 'Execution Failed',
        durationMs: 0,
        headers: {},
        data: { error: err.message || 'Failed to reach API tester backend service' }
      });
    } finally {
      setTestExecuting(false);
    }
  };

  // Fetch OpenAPI 3.0 specification
  const fetchOpenApiSpec = async () => {
    setLoadingOpenApi(true);
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/openapi.json`);
      if (res.ok) {
        const data = await res.json();
        setOpenApiSpec(data);
      }
    } catch (err) {
      console.error('Failed to load OpenAPI:', err);
    } finally {
      setLoadingOpenApi(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'openapi' && !openApiSpec) {
      fetchOpenApiSpec();
    }
  }, [activeTab, openApiSpec]);

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    return (apiData.endpoints || []).filter(ep => {
      const matchesSearch = !searchQuery ||
        (ep.name && ep.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ep.path && ep.path.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ep.description && ep.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMethod = methodFilter === 'ALL' || (ep.method || 'GET').toUpperCase() === methodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [apiData.endpoints, searchQuery, methodFilter]);

  // Method Badge Styler
  const getMethodBadge = (m) => {
    const method = (m || 'GET').toUpperCase();
    const map = {
      GET: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      POST: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    };
    return (
      <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border tracking-wider ${map[method] || 'bg-gray-500/10 text-gray-400'}`}>
        {method}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Loading application REST APIs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">REST API Management</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-semibold font-mono">
              {apiData.endpoints?.length || 0} Endpoints
            </span>
            {hasUnsavedChanges && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Manage, generate, and test callable REST API endpoints backed by the Entera runtime for <strong className="text-gray-200">{application?.app_name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Action: Generate from Schema */}
          <Button
            onClick={handleGenerateFromSchema}
            disabled={generating}
            variant="outline"
            className="gap-2 border-primary-500/40 text-primary-300 hover:bg-primary-500/10"
            title="Auto-generate CRUD endpoints from defined schema tables"
          >
            <Sparkles className={`h-4 w-4 ${generating ? 'animate-spin' : 'text-primary-400'}`} />
            {generating ? 'Generating...' : 'Generate from Schema'}
          </Button>

          <Button onClick={openCreateModal} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium shadow-md">
            <Plus className="h-4 w-4" />
            Create API
          </Button>

          <Button
            onClick={() => handleSave(false)}
            disabled={saving || !hasUnsavedChanges}
            variant="outline"
            className={`gap-2 ${hasUnsavedChanges ? 'border-primary-500 text-primary-300 hover:bg-primary-500/10' : 'border-white/10 text-gray-400'}`}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save APIs'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {saveError && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{saveError}</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>API definitions saved and registered with backend runtime routing engine.</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'catalog'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Webhook className="h-4 w-4" />
          API Catalog ({apiData.endpoints?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tester')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'tester'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Play className="h-4 w-4 text-emerald-400" />
          Interactive API Tester
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('openapi')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'openapi'
              ? 'border-primary-500 text-primary-400 bg-primary-500/5'
              : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileCode2 className="h-4 w-4 text-amber-400" />
          OpenAPI 3.0 Specs
        </button>
      </div>

      {/* TAB 1: API CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-dark-300/60 rounded-xl border border-white/10">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search endpoints by name, path, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mr-1">Method:</span>
              {['ALL', ...HTTP_METHODS].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                    methodFilter === m
                      ? 'bg-primary-600 text-white shadow'
                      : 'bg-dark-400 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoints List */}
          {filteredEndpoints.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl bg-dark-400/20">
              <Terminal className="h-14 w-14 text-gray-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-white mb-2">No API endpoints match your criteria</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                Generate CRUD REST endpoints automatically from your Database Schema, or create a custom endpoint.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={handleGenerateFromSchema} className="gap-2 bg-primary-600 hover:bg-primary-500">
                  <Sparkles className="h-4 w-4" />
                  Generate CRUD APIs from Schema
                </Button>
                <Button onClick={openCreateModal} variant="outline" className="gap-2 border-white/10">
                  <Plus className="h-4 w-4" />
                  Create Custom API
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEndpoints.map((ep, idx) => (
                <Card key={ep.id || idx} className="p-4 border-white/10 hover:border-white/20 transition-all bg-dark-300/60">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {getMethodBadge(ep.method)}
                        <span className="font-mono text-sm font-bold text-white tracking-wide truncate">
                          {ep.path}
                        </span>
                        {ep.auth && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10 flex items-center gap-1">
                            {ep.auth === 'admin' ? <Lock className="h-2.5 w-2.5 text-amber-400" /> : <Shield className="h-2.5 w-2.5 text-primary-400" />}
                            {ep.auth}
                          </span>
                        )}
                        {ep.entity && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary-500/10 text-primary-300 border border-primary-500/20 flex items-center gap-1">
                            <Database className="h-2.5 w-2.5" />
                            {ep.entity}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-gray-200">{ep.name}</strong>
                        {ep.description && (
                          <span className="text-xs text-gray-400 truncate">&mdash; {ep.description}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => launchInTester(ep)}
                        className="gap-1.5 text-xs bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"
                      >
                        <Play className="h-3 w-3 fill-emerald-400" />
                        Test Endpoint
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(apiData.endpoints.findIndex(e => e === ep))}
                        className="gap-1.5 text-xs border-white/10 hover:bg-white/5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => initiateDelete(apiData.endpoints.findIndex(e => e === ep))}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                        title="Delete API"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE API TESTER */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Composer */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="p-5 border-white/10 bg-dark-300/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5" /> Request Composer
                </span>
                <span className="text-xs text-gray-400">Targeting Local API Engine</span>
              </div>

              <form onSubmit={handleExecuteTest} className="space-y-4">
                {/* Method & URL Input */}
                <div className="flex gap-2">
                  <select
                    value={testMethod}
                    onChange={(e) => setTestMethod(e.target.value)}
                    className="w-28 bg-dark-400 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {HTTP_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <Input
                    placeholder="/api/runtime/... or /api/students"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    className="font-mono text-xs flex-1"
                    required
                  />

                  <Button
                    type="submit"
                    disabled={testExecuting || !testUrl.trim()}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md min-w-[90px]"
                  >
                    {testExecuting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {testExecuting ? 'Sending...' : 'Send'}
                  </Button>
                </div>

                {/* Query Parameters Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Query Parameters</span>
                    <button
                      type="button"
                      onClick={() => setTestQueryParams(prev => [...prev, { key: '', value: '' }])}
                      className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Param
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {testQueryParams.map((qp, qIdx) => (
                      <div key={qIdx} className="flex gap-2 items-center">
                        <Input
                          placeholder="key"
                          value={qp.key}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestQueryParams(prev => prev.map((item, i) => i === qIdx ? { ...item, key: val } : item));
                          }}
                          className="font-mono text-xs h-8 flex-1"
                        />
                        <Input
                          placeholder="value"
                          value={qp.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestQueryParams(prev => prev.map((item, i) => i === qIdx ? { ...item, value: val } : item));
                          }}
                          className="font-mono text-xs h-8 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setTestQueryParams(prev => prev.filter((_, i) => i !== qIdx))}
                          className="p-1 text-gray-500 hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Request Body (For POST, PUT, PATCH) */}
                {['POST', 'PUT', 'PATCH'].includes(testMethod.toUpperCase()) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Request Body (JSON)</span>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            if (testBody) setTestBody(JSON.stringify(JSON.parse(testBody), null, 2));
                          } catch {
                            // ignore
                          }
                        }}
                        className="text-[11px] text-primary-400 hover:text-primary-300"
                      >
                        Format JSON
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      placeholder="{\n  &quot;name&quot;: &quot;Sample Value&quot;\n}"
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      className="w-full bg-dark-400 border border-white/10 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                )}
              </form>
            </Card>
          </div>

          {/* Response Inspector */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="p-5 border-white/10 bg-dark-300/80 min-h-[460px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-primary-400" /> Real HTTP Response
                  </span>

                  {testResult && (
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${
                        testResult.status >= 200 && testResult.status < 300
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : testResult.status >= 400 && testResult.status < 500
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {testResult.status} {testResult.statusText}
                      </span>
                      <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {testResult.durationMs}ms
                      </span>
                    </div>
                  )}
                </div>

                {testExecuting ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
                    <p className="text-xs text-gray-400 font-mono">Executing request against Entera backend engine...</p>
                  </div>
                ) : !testResult ? (
                  <div className="text-center py-24 text-gray-500">
                    <Send className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-xs text-gray-400">Configure parameters on the left and click &quot;Send&quot; to test a live API endpoint.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {/* Headers preview */}
                    {testResult.headers && Object.keys(testResult.headers).length > 0 && (
                      <div className="text-[11px] font-mono text-gray-400 bg-dark-400/50 p-2.5 rounded-lg border border-white/5 space-y-0.5">
                        <span className="text-gray-500 block uppercase font-bold text-[9px]">Response Headers:</span>
                        {Object.entries(testResult.headers).slice(0, 4).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-gray-300 font-semibold">{k}:</span> {v}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formatted Response Body */}
                    <div className="relative">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Response Body</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(testResult.data, null, 2));
                            setCopiedResponse(true);
                            setTimeout(() => setCopiedResponse(false), 2000);
                          }}
                          className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedResponse ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedResponse ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="bg-dark-400 p-4 rounded-xl border border-white/10 text-xs font-mono text-emerald-300 max-h-72 overflow-y-auto whitespace-pre-wrap word-break">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 text-[11px] text-gray-500">
                Calls execute directly against the live Express router with session authentication context.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: OPENAPI 3.0 SPECS */}
      {activeTab === 'openapi' && (
        <Card className="p-6 border-white/10 bg-dark-300/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-amber-400" /> OpenAPI 3.0.3 Specification
              </h3>
              <p className="text-xs text-gray-400">
                Machine-readable API specification generated dynamically for {application?.app_name}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(openApiSpec, null, 2));
                  setCopiedSpec(true);
                  setTimeout(() => setCopiedSpec(false), 2000);
                }}
                className="gap-1.5 text-xs border-white/10 hover:bg-white/5"
              >
                {copiedSpec ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSpec ? 'Copied Spec' : 'Copy JSON'}
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(openApiSpec, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${application?.app_name || 'application'}-openapi.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="gap-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white"
              >
                <Download className="h-3.5 w-3.5" /> Download Spec
              </Button>
            </div>
          </div>

          {loadingOpenApi ? (
            <div className="flex justify-center py-16">
              <RefreshCw className="h-8 w-8 text-primary-400 animate-spin" />
            </div>
          ) : (
            <pre className="bg-dark-400 p-5 rounded-xl border border-white/10 text-xs font-mono text-gray-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(openApiSpec, null, 2)}
            </pre>
          )}
        </Card>
      )}

      {/* Wizard Step Navigation */}
      {isWorkflowWizard && (
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/schema`)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Schema
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500">
              Next: Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT API MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-300 border border-white/10 rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400">
                    <Webhook className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {editingApiIndex !== null ? `Edit API Endpoint` : 'Create REST API Endpoint'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Configure HTTP method, route path, authentication, and payload schema.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Errors */}
              {modalErrors.length > 0 && (
                <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs space-y-1">
                  <ul className="list-disc pl-4 space-y-0.5">
                    {modalErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSaveModalForm} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      HTTP Method
                    </label>
                    <select
                      value={apiFormData.method}
                      onChange={(e) => setApiFormData(prev => ({ ...prev, method: e.target.value }))}
                      className="w-full bg-dark-400 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {HTTP_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      API Name
                    </label>
                    <Input
                      placeholder="e.g. List Students, Create Product"
                      value={apiFormData.name}
                      onChange={(e) => setApiFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Endpoint Path <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="/api/runtime/:appId/data/tableName"
                    value={apiFormData.path}
                    onChange={(e) => setApiFormData(prev => ({ ...prev, path: e.target.value }))}
                    className="font-mono text-xs"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Standard runtime pattern: <code className="text-gray-400">/api/runtime/{application?.id}/data/&lt;table&gt;</code>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      Associated Entity / Resource
                    </label>
                    <Input
                      placeholder="e.g. students, courses"
                      value={apiFormData.entity}
                      onChange={(e) => setApiFormData(prev => ({ ...prev, entity: e.target.value }))}
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      Required Authorization Level
                    </label>
                    <select
                      value={apiFormData.auth}
                      onChange={(e) => setApiFormData(prev => ({ ...prev, auth: e.target.value }))}
                      className="w-full bg-dark-400 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="public">Public (Unauthenticated)</option>
                      <option value="user">Authenticated User (Tenant Scoped)</option>
                      <option value="admin">Administrator Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <Input
                    placeholder="Short description of this endpoint operation"
                    value={apiFormData.description}
                    onChange={(e) => setApiFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="text-xs"
                  />
                </div>

                {['POST', 'PUT', 'PATCH'].includes(apiFormData.method.toUpperCase()) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                      Sample Request Body (JSON)
                    </label>
                    <textarea
                      rows={5}
                      placeholder="{\n  &quot;title&quot;: &quot;Example&quot;\n}"
                      value={apiFormData.requestBodySample}
                      onChange={(e) => setApiFormData(prev => ({ ...prev, requestBodySample: e.target.value }))}
                      className="w-full bg-dark-400 border border-white/10 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white font-medium">
                    {editingApiIndex !== null ? 'Apply Changes' : 'Add Endpoint'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {endpointToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-dark-300 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2.5 rounded-xl bg-red-500/10">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete API Endpoint?</h3>
                  <p className="text-xs text-gray-400">
                    <span className="font-mono text-gray-200">{endpointToDelete.endpoint.method} {endpointToDelete.endpoint.path}</span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-300">
                This endpoint will be removed from your application API catalog. Remember to save changes to persist.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEndpointToDelete(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={confirmDelete}>
                  Yes, Delete Endpoint
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
