import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft } from 'lucide-react';

export function AppConfiguration({ application, onUpdate, basePath = `${basePath}` }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deploymentType, setDeploymentType] = useState(application.deployment_type || 'cloud');
  const [saving, setSaving] = useState(false);

  const handleSave = async (redirect = false) => {
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
        body: JSON.stringify({ deployment_type: deploymentType })
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.application);
        if (redirect) {
          navigate(`${basePath}/apps/${application.id}/workflow/schema`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <h2 className="text-2xl font-bold">Global Configuration</h2>
      <p className="text-gray-400">Configure deployment settings for your application.</p>
      
      <div className="space-y-4 my-6">
        <label className="text-sm font-medium text-gray-300 block">Deployment Target</label>
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => setDeploymentType('cloud')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              deploymentType === 'cloud' 
                ? 'bg-primary-500/20 border-primary-500 text-white' 
                : 'bg-dark-400/50 border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            <h4 className="font-bold mb-1">Entera Cloud</h4>
            <p className="text-sm opacity-80">Fully managed, secure cloud hosting provided by Entera.</p>
          </div>
          
          <div 
            onClick={() => setDeploymentType('on-premise')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              deploymentType === 'on-premise' 
                ? 'bg-primary-500/20 border-primary-500 text-white' 
                : 'bg-dark-400/50 border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            <h4 className="font-bold mb-1">On-Premise / Private Cloud</h4>
            <p className="text-sm opacity-80">Deploy to your own infrastructure or AWS/Azure/GCP account.</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/modules`)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2">
            Next: Database Schema
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
