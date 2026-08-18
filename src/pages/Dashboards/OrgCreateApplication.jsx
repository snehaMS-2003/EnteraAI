import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Circle, Save, ArrowRight, Server, Database, Plug, Settings } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';

const STEPS = [
  'Basic Information',
  'Template',
  'Modules',
  'Configuration',
  'Database Schema',
  'APIs',
  'Review',
  'Create'
];

export function OrgCreateApplication() {
  const navigate = useNavigate();
  const user = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [appId, setAppId] = useState(null);
  
  // Data State
  const [templates, setTemplates] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);
  
  // Form State
  const [form, setForm] = useState({
    appName: '',
    appDescription: '',
    industry: user?.organizationIndustry || '',
    industryTemplate: '',
    businessModules: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial Fetches
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [tplRes, modRes, orgRes] = await Promise.all([
          orgFetch('/api/templates'),
          orgFetch('/api/modules'),
          orgFetch('/api/org/profile')
        ]);
        if (tplRes.ok) setTemplates(await tplRes.json());
        if (modRes.ok) setAvailableModules(await modRes.json());
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setForm(prev => ({ ...prev, industry: orgData.industry || '' }));
          if (!orgData.industry) {
            setError('Your organization must have an Industry defined before creating an application.');
          }
        }
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Helpers
  const generateMockSchema = (modules) => {
    return modules.map(m => ({
      table: m.replace('_management', 's'),
      columns: [
        { name: 'id', type: 'UUID', key: 'PK' },
        { name: 'created_at', type: 'TIMESTAMP', key: '' },
        { name: 'name', type: 'VARCHAR', key: '' }
      ]
    }));
  };

  const generateMockAPIs = (modules) => {
    let apis = [];
    modules.forEach(m => {
      const resource = m.replace('_management', 's');
      apis.push({ method: 'GET', endpoint: `/api/${resource}`, desc: `List ${resource}` });
      apis.push({ method: 'POST', endpoint: `/api/${resource}`, desc: `Create ${resource}` });
      apis.push({ method: 'GET', endpoint: `/api/${resource}/:id`, desc: `Get ${resource}` });
      apis.push({ method: 'PUT', endpoint: `/api/${resource}/:id`, desc: `Update ${resource}` });
      apis.push({ method: 'DELETE', endpoint: `/api/${resource}/:id`, desc: `Delete ${resource}` });
    });
    return apis;
  };

  // Step 1: Save Basic Info
  const handleSaveBasicInfo = async () => {
    if (!form.appName || !form.industry) {
      setError('Application Name is required. Your organization must also have an Industry defined.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await orgFetch('/api/org/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: form.appName,
          app_description: form.appDescription,
          industry: form.industry,
          status: 'draft'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save application');
      
      setAppId(data.application.id);
      setCurrentStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Save Schema
  const handleSaveSchema = async () => {
    setLoading(true);
    try {
      const schemaData = generateMockSchema(form.businessModules);
      const res = await orgFetch(`/api/org/applications/${appId}/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_data: schemaData })
      });
      if (!res.ok) throw new Error('Failed to save schema');
      setCurrentStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 6: Save APIs
  const handleSaveAPIs = async () => {
    setLoading(true);
    try {
      const apiData = generateMockAPIs(form.businessModules);
      const res = await orgFetch(`/api/org/applications/${appId}/apis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_data: apiData })
      });
      if (!res.ok) throw new Error('Failed to save APIs');
      setCurrentStep(6);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 8: Finalize Creation
  const handleFinalize = async () => {
    setLoading(true);
    try {
      // 1. Save Modules Mapping
      const modRes = await orgFetch(`/api/org/applications/${appId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: form.businessModules })
      });
      if (!modRes.ok) throw new Error('Failed to save modules mapping');

      // 2. Update Application metadata
      const appRes = await orgFetch(`/api/org/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry_template: form.industryTemplate,
          business_modules: JSON.stringify(form.businessModules),
          status: 'draft'
        })
      });
      if (!appRes.ok) throw new Error('Failed to finalize application');

      setCurrentStep(7);
      setTimeout(() => navigate(`/dashboard/designer/apps/${appId}/configure`), 2000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0) return handleSaveBasicInfo();
    if (currentStep === 4) return handleSaveSchema();
    if (currentStep === 5) return handleSaveAPIs();
    if (currentStep === 7) return handleFinalize();
    setCurrentStep(c => c + 1);
  };

  const toggleModule = (modId) => {
    setForm(prev => {
      const modules = prev.businessModules.includes(modId)
        ? prev.businessModules.filter(id => id !== modId)
        : [...prev.businessModules, modId];
      return { ...prev, businessModules: modules };
    });
  };

  // ─── Step Renders ───────────────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-4">Basic Information</h3>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Application Name *</label>
        <Input 
          placeholder="e.g. Hospital Management System" 
          value={form.appName}
          onChange={(e) => setForm({...form, appName: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
        <textarea 
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="A system for managing patients, doctors and appointments."
          rows={3}
          value={form.appDescription}
          onChange={(e) => setForm({...form, appDescription: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Industry</label>
        <Input 
          value={form.industry || 'No Industry Defined'}
          disabled
          className={`opacity-70 ${!form.industry ? 'text-red-400 border-red-500/50' : ''}`}
        />
        {form.industry ? (
          <p className="text-xs text-primary-400 mt-1">Automatically inherited from organization</p>
        ) : (
          <p className="text-xs text-red-500 mt-1">Organization must have an Industry defined.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Organization</label>
        <Input value={user?.organizationName || ''} disabled className="opacity-50" />
      </div>
    </div>
  );

  const renderStep1 = () => {
    const industryTemplates = templates.filter(
      tpl => tpl.industry?.toLowerCase() === form.industry?.toLowerCase()
    );

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">Select Template</h3>
        {industryTemplates.length === 0 && (
          <p className="text-gray-400 text-sm mb-4">No predefined templates found for your industry. You can start from scratch.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {industryTemplates.map(tpl => (
            <div 
              key={tpl.id} 
              onClick={() => setForm({...form, industryTemplate: tpl.name})}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${form.industryTemplate === tpl.name ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
            >
              <h4 className="text-white font-medium">{tpl.name}</h4>
              <p className="text-xs text-primary-400 mt-1">{tpl.industry}</p>
              <p className="text-sm text-gray-400 mt-2">{tpl.description}</p>
            </div>
          ))}
          <div 
              onClick={() => setForm({...form, industryTemplate: 'Start From Scratch'})}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${form.industryTemplate === 'Start From Scratch' ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
            >
              <h4 className="text-white font-medium">Start From Scratch</h4>
              <p className="text-sm text-gray-400 mt-2">Build your application from the ground up without a template.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-4">Select Modules</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableModules.map(mod => (
          <div 
            key={mod.id} 
            onClick={() => toggleModule(mod.id)}
            className={`p-4 rounded-xl border cursor-pointer transition-colors flex gap-3 ${form.businessModules.includes(mod.id) ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
          >
            <div className="mt-0.5">
              {form.businessModules.includes(mod.id) ? (
                <CheckCircle2 className="h-5 w-5 text-primary-500" />
              ) : (
                <Circle className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div>
              <h4 className="text-white font-medium">{mod.name}</h4>
              <p className="text-xs text-gray-400 mt-1">{mod.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-4">Module Configuration</h3>
      <div className="space-y-4">
        {form.businessModules.length === 0 ? (
          <p className="text-gray-400">No modules selected.</p>
        ) : (
          form.businessModules.map(modId => {
            const mod = availableModules.find(m => m.id === modId);
            return (
              <div key={modId} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">{mod?.name}</h4>
                  <p className="text-xs text-gray-400">Standard configuration enabled</p>
                </div>
                <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-500/30">
                  Enabled
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderStep4 = () => {
    const mockSchema = generateMockSchema(form.businessModules);
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">Database Schema</h3>
        <p className="text-sm text-gray-400">The following database tables will be generated for your application.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockSchema.map(table => (
            <div key={table.table} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-primary-400" />
                <h4 className="text-white font-medium capitalize">{table.table}</h4>
              </div>
              <div className="space-y-2">
                {table.columns.map((col, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-mono">{col.name}</span>
                    <div className="flex gap-2">
                      <span className="text-gray-500">{col.type}</span>
                      {col.key && <span className="text-yellow-500 font-bold">{col.key}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    const mockAPIs = generateMockAPIs(form.businessModules);
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">REST APIs</h3>
        <p className="text-sm text-gray-400">The following API endpoints will be generated.</p>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {mockAPIs.map((api, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold w-12 ${
                  api.method === 'GET' ? 'text-blue-400' :
                  api.method === 'POST' ? 'text-green-400' :
                  api.method === 'PUT' ? 'text-orange-400' : 'text-red-400'
                }`}>{api.method}</span>
                <span className="text-gray-300 font-mono text-sm">{api.endpoint}</span>
              </div>
              <span className="text-xs text-gray-500">{api.desc}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStep6 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-white mb-4">Review Application</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Application Information</h4>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="text-white font-medium">{form.appName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Industry</span><span className="text-white">{form.industry}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Organization</span><span className="text-white">{user?.organizationName}</span></div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Template & Configuration</h4>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Template</span><span className="text-white font-medium">{form.industryTemplate || 'None'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Modules Selected</span><span className="text-white">{form.businessModules.length}</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
        <div className="relative p-6 rounded-2xl bg-green-500/10 text-green-400">
          <CheckCircle2 className="h-14 w-14" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white">Application Created Successfully!</h2>
      <p className="text-gray-400 text-sm max-w-md">
        Your application "{form.appName}" has been saved as a Draft. You will be redirected shortly.
      </p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard/org-admin/apps')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Application</h1>
          <p className="text-gray-400 text-sm">Follow the wizard to generate your enterprise application.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Progress Indicator */}
      {currentStep < 7 && (
        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/10 -z-10" />
          {STEPS.map((step, idx) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep > idx ? 'bg-primary-500 text-white' :
                currentStep === idx ? 'bg-primary-500 border-4 border-primary-900 text-white' :
                'bg-gray-800 text-gray-500 border border-white/10'
              }`}>
                {currentStep > idx ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={`text-xs ${currentStep === idx ? 'text-primary-400 font-medium' : 'text-gray-500'}`}>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content Form */}
      <Card className="p-8 min-h-[400px]">
        {currentStep === 0 && renderStep0()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
        {currentStep === 7 && renderStep7()}
      </Card>

      {/* Navigation Footer */}
      {currentStep < 7 && (
        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => currentStep > 0 ? setCurrentStep(c => c - 1) : navigate('/dashboard/org-admin/apps')}
          >
            {currentStep > 0 ? 'Back' : 'Cancel'}
          </Button>
          
          <div className="flex gap-3">
            <Button variant="secondary" className="gap-2" onClick={() => navigate('/dashboard/org-admin/apps')}>
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            <Button onClick={handleNext} disabled={loading} className="gap-2 min-w-[120px]">
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : currentStep === 6 ? (
                'Create Application'
              ) : (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
