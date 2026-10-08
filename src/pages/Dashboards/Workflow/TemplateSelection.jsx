import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, LayoutTemplate } from 'lucide-react';

const availableTemplates = [
  'Healthcare / Patient Management',
  'Finance / Core Banking',
  'Education / LMS',
  'Retail / POS',
  'Manufacturing / MES',
  'Logistics / Fleet Management',
  'Custom (Blank Canvas)'
];

export function TemplateSelection({ application, onUpdate, basePath = `${basePath}` }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(application.industry_template || 'Custom (Blank Canvas)');
  const [saving, setSaving] = useState(false);

  const handleSave = async (redirect = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/designer/applications/${application.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': user?.organizationId,
          'x-user-id': user?.id,
          'x-user-email': user?.email
        },
        body: JSON.stringify({ industry_template: selectedTemplate })
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate(data.application);
        if (redirect) {
          navigate(`${basePath}/apps/${application.id}/workflow/modules`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <h2 className="text-2xl font-bold">Template Selection</h2>
      <p className="text-gray-400">Choose a starting template for your application architecture.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        {availableTemplates.map(template => (
          <div 
            key={template}
            onClick={() => setSelectedTemplate(template)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 ${
              selectedTemplate === template 
                ? 'bg-primary-500/20 border-primary-500 text-white' 
                : 'bg-dark-400/50 border-white/10 text-gray-400 hover:bg-white/5 hover:border-white/20'
            }`}
          >
            <LayoutTemplate className={`h-8 w-8 ${selectedTemplate === template ? 'text-primary-400' : 'text-gray-500'}`} />
            <span className="font-medium">{template}</span>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/basic`)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2">
            Next: Modules
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
