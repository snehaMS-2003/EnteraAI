import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight } from 'lucide-react';

export function BasicInfo({ application, onUpdate, basePath = `${basePath}` }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    app_name: application.app_name || '',
    app_description: application.app_description || '',
    industry: application.industry || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/designer/applications/${application.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': user?.organizationId,
          'x-user-id': user?.id,
          'x-user-email': user?.email
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.application);
        return true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
    return false;
  };

  const handleNext = async () => {
    const success = await handleSave();
    if (success) {
      navigate(`${basePath}/apps/${application.id}/workflow/template`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <h2 className="text-2xl font-bold">Basic Information</h2>
      <p className="text-gray-400">Update the core details of your application.</p>
      
      <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
        <Input 
          label="Application Name"
          name="app_name"
          value={formData.app_name}
          onChange={handleChange}
          required
        />
        
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-300">Description</label>
          <textarea
            name="app_description"
            value={formData.app_description}
            onChange={handleChange}
            className="w-full bg-dark-400/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all min-h-[120px]"
          />
        </div>
        
        <Input 
          label="Industry"
          name="industry"
          value={formData.industry}
          onChange={handleChange}
        />
        
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-white/10">
          <Button type="button" variant="outline" onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            Next: Template
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
