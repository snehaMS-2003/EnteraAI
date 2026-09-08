import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, Check, Box } from 'lucide-react';

const ALL_MODULES = [
  { id: 'user_management', name: 'User Management', desc: 'Manage users, roles and permissions' },
  { id: 'employee_management', name: 'Employee Management', desc: 'Manage staff details and records' },
  { id: 'customer_management', name: 'Customer Management', desc: 'CRM capabilities for your business' },
  { id: 'inventory_management', name: 'Inventory Management', desc: 'Track stock levels and items' },
  { id: 'sales_management', name: 'Sales Management', desc: 'Manage sales pipelines and orders' },
  { id: 'reports', name: 'Reports', desc: 'Generate business reports and analytics' },
  { id: 'file_management', name: 'File Management', desc: 'Upload and organize files' },
  { id: 'appointment_management', name: 'Appointment Management', desc: 'Schedule and manage appointments' }
];

export function ModuleManagement({ application, basePath = `${basePath}` }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedModules, setSelectedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/designer/applications/${application.id}/modules`, {
          headers: {
            'x-org-id': user?.organizationId,
            'x-user-id': user?.id,
            'x-user-email': user?.email
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedModules(data.filter(m => m.is_enabled).map(m => m.module_id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (application?.id) fetchModules();
  }, [application, user]);

  const toggleModule = (id) => {
    setSelectedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSave = async (redirect = false) => {
    setSaving(true);
    try {
      const payload = {
        modules: selectedModules.map(id => ({ module_id: id, is_enabled: true }))
      };
      const res = await fetch(`http://127.0.0.1:5000/api/designer/applications/${application.id}/modules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': user?.organizationId,
          'x-user-id': user?.id,
          'x-user-email': user?.email
        },
        body: JSON.stringify(payload)
      });
      if (res.ok && redirect) {
        navigate(`${basePath}/apps/${application.id}/workflow/config`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading modules...</div>;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <h2 className="text-2xl font-bold">Module Management</h2>
      <p className="text-gray-400">Select the business modules to include in this application.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {ALL_MODULES.map(mod => {
          const isSelected = selectedModules.includes(mod.id);
          return (
            <div 
              key={mod.id}
              onClick={() => toggleModule(mod.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                isSelected 
                  ? 'bg-primary-500/10 border-primary-500/50' 
                  : 'bg-dark-400/50 border-white/5 hover:bg-white/5'
              }`}
            >
              <div className={`mt-1 h-5 w-5 rounded border flex items-center justify-center ${
                isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-500 text-transparent'
              }`}>
                <Check className="h-3 w-3" />
              </div>
              <div>
                <h3 className={`font-medium ${isSelected ? 'text-primary-400' : 'text-white'}`}>{mod.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{mod.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/template`)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2">
            Next: Configuration
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
