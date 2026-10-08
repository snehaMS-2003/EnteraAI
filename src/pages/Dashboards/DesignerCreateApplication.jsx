import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Building2, Tag, Info, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth, orgFetch } from '../../hooks/useAuth';
import { useApplicationContext } from '../../contexts/ApplicationContext';

const INDUSTRIES = [
  'Healthcare', 'Finance', 'Education', 'Retail', 
  'Manufacturing', 'Logistics', 'Government', 'IT Services', 'Other'
];

export function DesignerCreateApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refreshApplications } = useApplicationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const basePath = user?.role === 'lead_designer' ? '/lead-designer/dashboard' : '/designer/dashboard';

  const [formData, setFormData] = useState({
    app_name: '',
    app_description: '',
    industry_template: 'Healthcare',
    status: 'draft'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.app_name.trim()) {
      setError('Application Name is required.');
      return;
    }

    setLoading(true);

    try {
      const response = await orgFetch('/api/designer/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        await refreshApplications();
        navigate(`${basePath}/apps/${data.application.id}`);
      } else {
        setError(data.error || 'Failed to create application');
      }
    } catch (err) {
      console.error('Error creating app:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Application</h1>
          <p className="text-gray-400 mt-1">Start building a new enterprise application.</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary-400" />
                  Application Name *
                </label>
                <Input
                  name="app_name"
                  value={formData.app_name}
                  onChange={handleChange}
                  placeholder="e.g., Employee Management System"
                  maxLength={100}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary-400" />
                  Description
                </label>
                <textarea
                  name="app_description"
                  value={formData.app_description}
                  onChange={handleChange}
                  placeholder="Describe the purpose of this application..."
                  rows={4}
                  className="w-full rounded-lg bg-dark-400/50 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary-400" />
                    Industry Type
                  </label>
                  <select
                    name="industry_template"
                    value={formData.industry_template}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-dark-400/50 border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none"
                  >
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind} className="bg-dark-200">{ind}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-dark-400/50 border border-white/10 px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none"
                  >
                    <option value="draft" className="bg-dark-200">Draft</option>
                    <option value="active" className="bg-dark-200">Active</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading} className="gap-2">
                {loading ? <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Save className="h-4 w-4" />}
                {loading ? 'Creating...' : 'Create Application'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
