import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth, orgFetch } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, Terminal, Plus, Check } from 'lucide-react';

export function ApiManagement({ application, basePath = '', isStandalone = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiData, setApiData] = useState({ endpoints: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchApis = async () => {
      try {
        const res = await orgFetch(`/api/designer/applications/${application.id}/apis`);
        if (res.ok) {
          const data = await res.json();
          setApiData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (application?.id) fetchApis();
  }, [application, user]);

  const handleSave = async (redirect = false) => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/apis`, {
        method: 'PUT',
        body: JSON.stringify({ api_data: apiData })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        if (redirect) {
          navigate(`${basePath}/apps/${application.id}/workflow/review`);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save APIs');
      }
    } catch (err) {
      console.error(err);
      setSaveError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const addEndpoint = () => {
    setApiData(prev => ({
      ...prev,
      endpoints: [...(prev.endpoints || []), { method: 'GET', path: '/api/resource', description: '' }]
    }));
  };

  if (loading) return <div>Loading APIs...</div>;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Management</h2>
          <p className="text-gray-400">Define REST APIs for your application.</p>
        </div>
        <Button onClick={addEndpoint} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Endpoint
        </Button>
      </div>

      {saveError && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm">
          {saveError}
        </div>
      )}
      
      <div className="space-y-4 my-6">
        {apiData.endpoints && apiData.endpoints.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
            <Terminal className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No APIs defined</h3>
            <p className="text-gray-400">Add an API endpoint to begin configuring your application's interfaces.</p>
          </div>
        ) : (
          apiData.endpoints.map((ep, idx) => (
            <Card key={idx} className="p-4 border-white/10 flex gap-4 items-center">
              <select
                value={ep.method || 'GET'}
                onChange={(e) => {
                  setApiData(prev => ({
                    ...prev,
                    endpoints: prev.endpoints.map((ep, i) => i === idx ? { ...ep, method: e.target.value } : ep)
                  }));
                }}
                className={`bg-dark-300 border border-white/10 rounded px-3 py-2 text-sm font-bold w-24
                  ${ep.method === 'GET' ? 'text-blue-400' : ''}
                  ${ep.method === 'POST' ? 'text-green-400' : ''}
                  ${ep.method === 'PUT' ? 'text-amber-400' : ''}
                  ${ep.method === 'DELETE' ? 'text-red-400' : ''}
                `}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              
              <input 
                type="text" 
                placeholder="/api/path"
                value={ep.path} 
                onChange={(e) => {
                  setApiData(prev => ({
                    ...prev,
                    endpoints: prev.endpoints.map((ep, i) => i === idx ? { ...ep, path: e.target.value } : ep)
                  }));
                }}
                className="flex-1 bg-dark-400/50 border border-white/10 rounded px-3 py-2 text-white font-mono text-sm"
              />

              <input 
                type="text" 
                placeholder="Description"
                value={ep.description} 
                onChange={(e) => {
                  setApiData(prev => ({
                    ...prev,
                    endpoints: prev.endpoints.map((ep, i) => i === idx ? { ...ep, description: e.target.value } : ep)
                  }));
                }}
                className="flex-1 bg-dark-400/50 border border-white/10 rounded px-3 py-2 text-gray-300 text-sm"
              />
              
              <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  const newEps = apiData.endpoints.filter((_, i) => i !== idx);
                  setApiData({...apiData, endpoints: newEps});
                }}
              >
                Delete
              </Button>
            </Card>
          ))
        )}
      </div>
      
      {!isStandalone && (
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/schema`)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 min-w-[130px]">
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </>
              )}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2">
              Next: Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      {isStandalone && (
        <div className="flex justify-end items-center mt-8 pt-6 border-t border-white/10">
          <Button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 min-w-[140px]">
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4" /> Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
