import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AppWindow, Building2, ChevronDown, CheckSquare, Server, Cloud, Container,
  CheckCircle2, XCircle, Loader2, Save, ArrowRight, X, Layers, LayoutTemplate,
  Database, Code2, ListChecks, Check, ShieldCheck, Settings, PlayCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button, cn } from '../../components/ui/Button';
import { WizardProgress } from '../../components/ui/WizardProgress';

const WIZARD_STEPS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'template', label: 'Template' },
  { id: 'modules', label: 'Modules' },
  { id: 'configure', label: 'Configure' },
  { id: 'schema', label: 'Schema' },
  { id: 'apis', label: 'APIs' },
  { id: 'summary', label: 'Review' },
  { id: 'deploy', label: 'Deploy' }
];

const INDUSTRIES = [
  'Healthcare', 'Finance', 'Education', 'Retail',
  'Manufacturing', 'Logistics', 'Government', 'IT Services'
];

function FieldError({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-1.5 flex items-center gap-1 text-xs text-red-400"
        >
          <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ icon: Icon, title, accent = false }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className={cn('p-2 rounded-lg', accent ? 'bg-primary-500/15' : 'bg-white/5')}>
        <Icon className={cn('h-4 w-4', accent ? 'text-primary-400' : 'text-gray-400')} />
      </div>
      <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function Label({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300 mb-1.5">
      {children}
      {required && <span className="text-primary-400 ml-1">*</span>}
    </label>
  );
}

function StyledInput({ id, className, error, ...rest }) {
  return (
    <input
      id={id}
      className={cn(
        'glass-input flex h-10 w-full px-3 py-2 text-sm transition-all duration-200',
        error ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30' : '',
        className
      )}
      {...rest}
    />
  );
}

function StyledTextarea({ id, className, error, ...rest }) {
  return (
    <textarea
      id={id}
      rows={3}
      className={cn(
        'glass-input w-full px-3 py-2 text-sm resize-none transition-all duration-200',
        error ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30' : '',
        className
      )}
      {...rest}
    />
  );
}

function StyledSelect({ id, className, error, children, ...rest }) {
  return (
    <div className="relative">
      <select
        id={id}
        style={{ backgroundColor: '#0f0f18', color: '#ffffff' }}
        className={cn(
          'glass-input flex h-10 w-full px-3 py-2 text-sm appearance-none pr-10 transition-all duration-200 text-white',
          error ? 'border-red-500/60 focus:border-red-400 focus:ring-red-400/30' : '',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    </div>
  );
}

// Dummy mock schemas for step 5
const generateMockSchema = (modules) => {
  return modules.map(m => ({
    table: m + 's',
    columns: [
      { name: 'id', type: 'UUID', key: 'PK' },
      { name: 'created_at', type: 'TIMESTAMP', key: '' },
      { name: 'name', type: 'VARCHAR', key: '' }
    ]
  }));
};

// Dummy mock apis for step 6
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

export function CreateApplication() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [appId, setAppId] = useState(null); // application ID from DB
  
  const [organizations, setOrganizations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);

  const [form, setForm] = useState({
    appName: '',
    appDescription: '',
    organizationId: '',
    industry: '',
    industryTemplate: '',
    businessModules: [],
    deploymentType: 'cloud',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generatedSchema, setGeneratedSchema] = useState([]);
  const [generatedAPIs, setGeneratedAPIs] = useState([]);
  const [deploymentStatus, setDeploymentStatus] = useState(null); // 'deploying', 'success', 'error'
  const [deploymentUrl, setDeploymentUrl] = useState('');

  const DEFAULT_ORGS = [
    { id: 1, name: 'Acme Corporation' }
  ];

  const DEFAULT_MODULES = [
    { id: 'user_management', name: 'User Management', description: 'Manage users, roles and permissions' },
    { id: 'customer_management', name: 'Customer Management', description: 'CRM capabilities for your business' },
    { id: 'inventory_management', name: 'Inventory Management', description: 'Track stock levels and items' },
    { id: 'sales_management', name: 'Sales Management', description: 'Manage sales pipelines and orders' },
    { id: 'reports', name: 'Reports', description: 'Generate business reports and analytics' },
    { id: 'notifications', name: 'Notifications', description: 'Email, SMS and push notifications' }
  ];

  // Fetch Orgs & Modules on Mount
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/organizations')
      .then(res => res.json())
      .then(data => {
        const orgs = (Array.isArray(data) && data.length > 0) ? data : DEFAULT_ORGS;
        setOrganizations(orgs);
        if (orgs.length === 1) {
          setForm(prev => ({ ...prev, organizationId: orgs[0].id }));
        }
      })
      .catch(() => {
        setOrganizations(DEFAULT_ORGS);
        setForm(prev => ({ ...prev, organizationId: DEFAULT_ORGS[0].id }));
      });
      
    fetch('http://127.0.0.1:5000/api/modules')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableModules(data);
        } else {
          setAvailableModules(DEFAULT_MODULES);
        }
      })
      .catch(() => {
        setAvailableModules(DEFAULT_MODULES);
      });
  }, []);

  // Fetch Templates when Industry changes
  useEffect(() => {
    if (form.industry) {
      fetch(`http://127.0.0.1:5000/api/templates?industry=${form.industry}`)
        .then(res => res.json())
        .then(data => Array.isArray(data) && setTemplates(data))
        .catch(() => {});
    } else {
      setTemplates([]);
    }
  }, [form.industry]);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleModule = (id) => {
    setForm(prev => ({
      ...prev,
      businessModules: prev.businessModules.includes(id)
        ? prev.businessModules.filter(m => m !== id)
        : [...prev.businessModules, id]
    }));
    if (errors.businessModules) setErrors(prev => ({ ...prev, businessModules: '' }));
  };

  // --- Step Handlers ---
  
  const handleSaveDraft = async () => {
    if (!form.appName) {
      setErrors({ appName: 'App name required for draft.' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        app_name: form.appName,
        app_description: form.appDescription,
        organization_id: form.organizationId,
        industry: form.industry,
        industry_template: form.industryTemplate,
        business_modules: form.businessModules.join(','),
        deployment_type: form.deploymentType,
        status: 'draft'
      };
      
      if (!appId) {
        const res = await fetch('http://127.0.0.1:5000/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.id) setAppId(data.id);
      } else {
        await fetch(`http://127.0.0.1:5000/api/applications/${appId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleNext = async () => {
    let e = {};
    if (currentStep === 0) {
      if (!form.appName) e.appName = 'Required';
      if (!form.appDescription) e.appDescription = 'Required';
      if (!form.organizationId) e.organizationId = 'Required';
      if (!form.industry) e.industry = 'Required';
      if (Object.keys(e).length > 0) { setErrors(e); return; }
      
      setLoading(true);
      const payload = {
        app_name: form.appName,
        app_description: form.appDescription,
        organization_id: form.organizationId,
        industry: form.industry,
        status: 'draft'
      };
      try {
        if (!appId) {
          const res = await fetch('http://127.0.0.1:5000/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.id) setAppId(data.id);
        } else {
          await fetch(`http://127.0.0.1:5000/api/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    } 
    else if (currentStep === 1) {
      if (!form.industryTemplate) e.industryTemplate = 'Please select a template';
      if (Object.keys(e).length > 0) { setErrors(e); return; }
    }
    else if (currentStep === 2) {
      if (form.businessModules.length === 0) e.businessModules = 'Select at least one module';
      if (Object.keys(e).length > 0) { setErrors(e); return; }
    }

    if (currentStep === 4 && generatedSchema.length === 0) {
      setGeneratedSchema(generateMockSchema(form.businessModules));
    }
    
    if (currentStep === 5 && generatedAPIs.length === 0) {
      setGeneratedAPIs(generateMockAPIs(form.businessModules));
    }

    setCurrentStep(p => Math.min(WIZARD_STEPS.length - 1, p + 1));
  };

  const handleBack = () => {
    setCurrentStep(p => Math.max(0, p - 1));
  };

  const handleGenerateSchema = async () => {
    setLoading(true);
    const schema = generateMockSchema(form.businessModules);
    setGeneratedSchema(schema);
    if (appId) {
      await fetch(`http://127.0.0.1:5000/api/applications/${appId}/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_data: schema })
      });
    }
    setLoading(false);
  };

  const handleGenerateAPIs = async () => {
    setLoading(true);
    const apis = generateMockAPIs(form.businessModules);
    setGeneratedAPIs(apis);
    if (appId) {
      await fetch(`http://127.0.0.1:5000/api/applications/${appId}/apis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_data: apis })
      });
    }
    setLoading(false);
  };

  const handleDeploy = async () => {
    setDeploymentStatus('deploying');
    if (appId) {
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/applications/${appId}/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deployment_type: form.deploymentType })
        });
        const data = await res.json();
        setDeploymentStatus('success');
        setDeploymentUrl(data.deployment.deployment_url);
        
        await fetch(`http://127.0.0.1:5000/api/applications/${appId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' })
        });
      } catch (err) {
        setDeploymentStatus('error');
      }
    } else {
      setTimeout(() => {
        setDeploymentStatus('success');
        setDeploymentUrl('https://entera.cloud/app/demo');
      }, 2000);
    }
  };

  // --- Render Steps ---

  const renderStep1 = () => (
    <Card>
      <SectionHeader icon={AppWindow} title="Basic Information" accent />
      <div className="grid grid-cols-1 gap-6">
        <div>
          <Label htmlFor="appName" required>Application Name</Label>
          <StyledInput id="appName" value={form.appName} onChange={e => setField('appName', e.target.value)} error={errors.appName} />
          <FieldError message={errors.appName} />
        </div>
        <div>
          <Label htmlFor="appDescription" required>Description</Label>
          <StyledTextarea id="appDescription" value={form.appDescription} onChange={e => setField('appDescription', e.target.value)} error={errors.appDescription} />
          <FieldError message={errors.appDescription} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label htmlFor="organization" required>Organization</Label>
            {organizations.length === 1 ? (
              <div className="glass-input flex h-10 w-full px-3 py-2 text-sm items-center text-gray-300 cursor-not-allowed">
                {organizations[0].name}
              </div>
            ) : (
              <StyledSelect id="organization" value={form.organizationId} onChange={e => setField('organizationId', e.target.value)} error={errors.organizationId}>
                <option value="">— Select —</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </StyledSelect>
            )}
            <FieldError message={errors.organizationId} />
          </div>
          <div>
            <Label htmlFor="industry" required>Industry</Label>
            <StyledSelect id="industry" value={form.industry} onChange={e => { setField('industry', e.target.value); setField('industryTemplate', ''); }} error={errors.industry}>
              <option value="">— Select —</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </StyledSelect>
            <FieldError message={errors.industry} />
          </div>
        </div>
      </div>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <SectionHeader icon={LayoutTemplate} title="Select Industry Template" accent />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map(t => {
          const selected = form.industryTemplate === t.name;
          return (
            <button
              key={t.id} onClick={() => setField('industryTemplate', t.name)}
              className={cn(
                "p-4 text-left border rounded-xl transition-all",
                selected ? "bg-primary-500/10 border-primary-500 shadow-lg" : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
              )}
            >
              <h3 className={cn("font-medium", selected ? "text-primary-300" : "text-gray-200")}>{t.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{t.description}</p>
              <div className="mt-3 text-xs text-primary-400/80 font-medium">
                {t.recommended_modules} Recommended Modules
              </div>
            </button>
          )
        })}
      </div>
      <FieldError message={errors.industryTemplate} />
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <SectionHeader icon={Layers} title="Select Business Modules" accent />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {availableModules.map(m => {
          const checked = form.businessModules.includes(m.id);
          return (
            <button key={m.id} onClick={() => toggleModule(m.id)}
              className={cn(
                "flex flex-col text-left p-3 border rounded-xl transition-all",
                checked ? "bg-primary-500/10 border-primary-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center", checked ? "bg-primary-500 border-primary-500" : "border-gray-500")}>
                  {checked && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={cn("font-medium text-sm", checked ? "text-primary-300" : "text-gray-300")}>{m.name}</span>
              </div>
              <p className="text-[10px] text-gray-500 pl-6">{m.description}</p>
            </button>
          )
        })}
      </div>
      <FieldError message={errors.businessModules} />
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <SectionHeader icon={Settings} title="Configure Application" accent />
      <p className="text-sm text-gray-400 mb-6">Configure settings and permissions for the selected modules.</p>
      
      <div className="space-y-4">
        {form.businessModules.map(mId => {
          const mod = availableModules.find(m => m.id === mId) || { name: mId };
          return (
            <div key={mId} className="p-4 border border-white/10 rounded-xl bg-white/5 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-200">{mod.name}</h4>
                <p className="text-xs text-gray-500">Enable advanced features and role access.</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          )
        })}
      </div>
    </Card>
  );

  const renderStep5 = () => (
    <Card>
      <SectionHeader icon={Database} title="Database Schema Generation" accent />
      <p className="text-sm text-gray-400 mb-4">A relational schema is generated based on your selected modules.</p>
      
      <div className="mb-4">
        <Button onClick={handleGenerateSchema} disabled={loading} variant="primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />}
          {generatedSchema.length > 0 ? "Regenerate Schema" : "Generate Schema"}
        </Button>
      </div>

      {generatedSchema.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {generatedSchema.map(t => (
            <div key={t.table} className="border border-white/10 bg-[#0f0f18] rounded-xl overflow-hidden">
              <div className="bg-white/5 px-4 py-2 border-b border-white/10 font-mono text-sm text-primary-300 font-semibold">
                {t.table}
              </div>
              <div className="p-4">
                {t.columns.map(c => (
                  <div key={c.name} className="flex justify-between items-center text-xs mb-2 last:mb-0">
                    <span className="text-gray-300 font-mono">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-mono">{c.type}</span>
                      {c.key && <span className="bg-yellow-500/20 text-yellow-500 px-1 rounded font-bold text-[9px]">{c.key}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderStep6 = () => (
    <Card>
      <SectionHeader icon={Code2} title="REST API Generation" accent />
      <p className="text-sm text-gray-400 mb-4">RESTful API endpoints generated for standard CRUD operations.</p>
      
      <div className="mb-4">
        <Button onClick={handleGenerateAPIs} disabled={loading} variant="primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Code2 className="w-4 h-4 mr-2" />}
          {generatedAPIs.length > 0 ? "Regenerate APIs" : "Generate APIs"}
        </Button>
      </div>

      {generatedAPIs.length > 0 && (
        <div className="space-y-2 mt-6">
          {generatedAPIs.map((api, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 border border-white/10 rounded-lg bg-white/5">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-bold w-16 text-center",
                api.method === 'GET' ? "bg-blue-500/20 text-blue-400" :
                api.method === 'POST' ? "bg-green-500/20 text-green-400" :
                api.method === 'PUT' ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              )}>{api.method}</span>
              <span className="text-sm font-mono text-gray-200 flex-1">{api.endpoint}</span>
              <span className="text-xs text-gray-500 hidden sm:block">{api.desc}</span>
              <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded">Active</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  const renderStep7 = () => (
    <Card>
      <SectionHeader icon={ListChecks} title="Application Summary" accent />
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">App Name</p>
            <p className="text-sm font-medium text-gray-200">{form.appName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Organization</p>
            <p className="text-sm font-medium text-gray-200">
              {organizations.find(o => o.id === form.organizationId)?.name || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Industry / Template</p>
            <p className="text-sm font-medium text-gray-200">{form.industry} - {form.industryTemplate}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Modules Selected</p>
            <p className="text-sm font-medium text-gray-200">{form.businessModules.length}</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-gray-500 mb-2">Selected Modules</p>
          <div className="flex flex-wrap gap-2">
            {form.businessModules.map(m => (
              <span key={m} className="px-2 py-1 rounded bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs">
                {availableModules.find(mod => mod.id === m)?.name || m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderStep8 = () => (
    <Card>
      <SectionHeader icon={Cloud} title="Deployment Options" accent />
      
      {!deploymentStatus ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setField('deploymentType', 'cloud')}
              className={cn("p-4 border rounded-xl text-center transition-all", form.deploymentType === 'cloud' ? "bg-primary-500/10 border-primary-500" : "bg-white/5 border-white/10")}
            >
              <Cloud className={cn("w-6 h-6 mx-auto mb-2", form.deploymentType === 'cloud' ? "text-primary-400" : "text-gray-400")} />
              <div className="font-medium text-sm">Entera Cloud</div>
            </button>
            <button
              onClick={() => setField('deploymentType', 'docker')}
              className={cn("p-4 border rounded-xl text-center transition-all", form.deploymentType === 'docker' ? "bg-primary-500/10 border-primary-500" : "bg-white/5 border-white/10")}
            >
              <Container className={cn("w-6 h-6 mx-auto mb-2", form.deploymentType === 'docker' ? "text-primary-400" : "text-gray-400")} />
              <div className="font-medium text-sm">Docker Hub</div>
            </button>
          </div>
          <Button variant="primary" className="w-full" onClick={handleDeploy}>
            Deploy Application
          </Button>
        </>
      ) : deploymentStatus === 'deploying' ? (
        <div className="text-center py-10">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Deploying Application...</h3>
          <p className="text-gray-400 text-sm">Provisioning resources, building images, and applying schemas.</p>
        </div>
      ) : deploymentStatus === 'success' ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Application Deployed Successfully!</h3>
          <p className="text-gray-400 text-sm mb-6">Your enterprise application is live and ready to use.</p>
          
          <div className="p-4 bg-black/40 rounded-xl font-mono text-sm text-green-400 mb-6 inline-block border border-white/10">
            {deploymentUrl}
          </div>

          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate('/dashboard/designer')}>
              Return to Dashboard
            </Button>
            <Button variant="primary">
              <PlayCircle className="w-4 h-4 mr-2" />
              Open Application
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Deployment Failed</h3>
          <Button variant="outline" onClick={() => setDeploymentStatus(null)}>Try Again</Button>
        </div>
      )}
    </Card>
  );

  const RENDERERS = [
    renderStep1, renderStep2, renderStep3, renderStep4,
    renderStep5, renderStep6, renderStep7, renderStep8
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary-500/15 border border-primary-500/20">
          <AppWindow className="h-6 w-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Application Wizard</h1>
          <p className="text-gray-400 text-sm">Create and configure your enterprise application</p>
        </div>
      </div>

      <WizardProgress steps={WIZARD_STEPS} currentStep={currentStep} />

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {RENDERERS[currentStep]()}
      </motion.div>

      {/* Navigation Buttons (Hide on deploying/success in step 8) */}
      {(currentStep < 7 || !deploymentStatus) && (
        <div className="flex items-center justify-between mt-8 border-t border-white/10 pt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || loading}
          >
            Back
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            
            {currentStep < 7 && (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
