import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';

export function OrgCreateApplication() {
  const navigate = useNavigate();
  const user = useAuth();
  
  // Data State
  const [templates, setTemplates] = useState([]);
  
  // Form State
  const [form, setForm] = useState({
    appName: '',
    appDescription: '',
    industry: user?.organizationIndustry || '',
    industryTemplate: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial Fetches
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [tplRes, orgRes, statsRes] = await Promise.all([
          orgFetch('/api/templates'),
          orgFetch('/api/org/profile'),
          orgFetch('/api/orgadmin/stats')
        ]);
        
        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats.totalApplications >= 1) {
            setError('Your organization already has an application. Only one application is allowed.');
            setTimeout(() => navigate('/org-admin/dashboard/apps'), 3000);
            return;
          }
        }

        if (tplRes.ok) setTemplates(await tplRes.json());
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
  }, [navigate]);

  const handleCreate = async () => {
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
          industry_template: form.industryTemplate,
          status: 'draft'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create application');
      
      navigate('/org-admin/dashboard/apps');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const industryTemplates = templates.filter(
    tpl => tpl.industry?.toLowerCase() === form.industry?.toLowerCase()
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/org-admin/dashboard/apps')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Application</h1>
          <p className="text-gray-400 text-sm">Create an enterprise application for your organization.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Content Form */}
      <Card className="p-8">
        <div className="space-y-6">
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              placeholder="A system for managing patients, doctors and appointments."
              rows={3}
              value={form.appDescription}
              onChange={(e) => setForm({...form, appDescription: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="pt-4">
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
        </div>
      </Card>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/org-admin/dashboard/apps')}
        >
          Cancel
        </Button>
        
        <Button onClick={handleCreate} disabled={loading} className="gap-2 min-w-[120px]">
          {loading ? (
            <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            'Create Application'
          )}
        </Button>
      </div>
    </div>
  );
}
