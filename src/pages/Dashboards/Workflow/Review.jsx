import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export function Review({ application, basePath = `${basePath}` }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [data, setData] = useState({
    modules: [],
    schema: { tables: [] },
    apis: { endpoints: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const headers = {
          'x-org-id': user?.organizationId,
          'x-user-id': user?.id,
          'x-user-email': user?.email
        };
        
        const [modRes, schemaRes, apiRes] = await Promise.all([
          fetch(`http://127.0.0.1:5000/api/designer/applications/${application.id}/modules`, { headers }),
          fetch(`http://127.0.0.1:5000/api/designer/applications/${application.id}/schema`, { headers }),
          fetch(`http://127.0.0.1:5000/api/designer/applications/${application.id}/apis`, { headers })
        ]);

        const modules = modRes.ok ? await modRes.json() : [];
        const schema = schemaRes.ok ? await schemaRes.json() : { tables: [] };
        const apis = apiRes.ok ? await apiRes.json() : { endpoints: [] };

        setData({ modules, schema, apis });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (application?.id) fetchAllData();
  }, [application, user]);

  const handleFinish = () => {
    navigate(`${basePath}/apps`);
  };

  if (loading) return <div>Loading review data...</div>;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Review Configuration</h2>
        <p className="text-gray-400">Review your application design before finishing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 text-primary-400">Basic Information</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500 font-medium">Name:</span> {application.app_name}</p>
            <p><span className="text-gray-500 font-medium">Industry:</span> {application.industry || 'N/A'}</p>
            <p><span className="text-gray-500 font-medium">Template:</span> {application.industry_template || 'Custom'}</p>
            <p><span className="text-gray-500 font-medium">Deployment:</span> {application.deployment_type}</p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 text-primary-400">Enabled Modules</h3>
          {data.modules.filter(m => m.is_enabled).length === 0 ? (
            <p className="text-gray-500 text-sm">No modules enabled.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
              {data.modules.filter(m => m.is_enabled).map((m, i) => (
                <li key={i}>{m.module_id.replace('_', ' ').toUpperCase()}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 text-primary-400">Database Schema</h3>
          {!data.schema.tables || data.schema.tables.length === 0 ? (
            <p className="text-gray-500 text-sm">No tables defined.</p>
          ) : (
            <div className="space-y-3">
              {data.schema.tables.map((t, i) => (
                <div key={i}>
                  <p className="font-bold text-sm text-gray-200">{t.name}</p>
                  <p className="text-xs text-gray-500">{(t.columns || []).length} columns</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 text-primary-400">API Endpoints</h3>
          {!data.apis.endpoints || data.apis.endpoints.length === 0 ? (
            <p className="text-gray-500 text-sm">No API endpoints defined.</p>
          ) : (
            <div className="space-y-3">
              {data.apis.endpoints.map((ep, i) => (
                <div key={i} className="flex gap-2 items-center text-sm">
                  <span className={`font-bold text-xs
                    ${ep.method === 'GET' ? 'text-blue-400' : ''}
                    ${ep.method === 'POST' ? 'text-green-400' : ''}
                    ${ep.method === 'PUT' ? 'text-amber-400' : ''}
                    ${ep.method === 'DELETE' ? 'text-red-400' : ''}
                  `}>{ep.method}</span>
                  <span className="text-gray-300 font-mono text-xs">{ep.path}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
        <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/apis`)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleFinish} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white border-none">
          Finish Configuration
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
