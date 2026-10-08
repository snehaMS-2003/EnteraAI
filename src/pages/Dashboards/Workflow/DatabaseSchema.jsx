import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAuth, orgFetch } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowRight, ArrowLeft, Database, Plus, Check, Trash2 } from 'lucide-react';

export function DatabaseSchema({ application, basePath = '', isStandalone = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schemaData, setSchemaData] = useState({ tables: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await orgFetch(`/api/designer/applications/${application.id}/schema`);
        if (res.ok) {
          const data = await res.json();
          setSchemaData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (application?.id) fetchSchema();
  }, [application, user]);

  const handleSave = async (redirect = false) => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}/schema`, {
        method: 'PUT',
        body: JSON.stringify({ schema_data: schemaData })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        if (redirect) {
          navigate(`${basePath}/apps/${application.id}/workflow/apis`);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save schema');
      }
    } catch (err) {
      console.error(err);
      setSaveError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const addTable = () => {
    setSchemaData(prev => ({
      ...prev,
      tables: [...(prev.tables || []), { name: 'new_table', columns: [] }]
    }));
  };

  if (loading) return <div>Loading schema...</div>;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Database Schema</h2>
          <p className="text-gray-400">Design the underlying database tables for this application.</p>
        </div>
        <Button onClick={addTable} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Table
        </Button>
      </div>

      {saveError && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-sm">
          {saveError}
        </div>
      )}
      
      <div className="space-y-4 my-6">
        {schemaData.tables && schemaData.tables.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
            <Database className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No tables defined</h3>
            <p className="text-gray-400">Start building your schema by adding a table.</p>
          </div>
        ) : (
          schemaData.tables.map((table, idx) => (
            <Card key={idx} className="p-4 border-white/10">
              <div className="flex justify-between items-center mb-4">
                <input 
                  type="text" 
                  value={table.name} 
                  onChange={(e) => {
                    setSchemaData(prev => ({
                      ...prev,
                      tables: prev.tables.map((t, i) => i === idx ? { ...t, name: e.target.value } : t)
                    }));
                  }}
                  className="bg-dark-400/50 border border-white/10 rounded px-3 py-1.5 text-white font-mono"
                />
                <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    const newTables = schemaData.tables.filter((_, i) => i !== idx);
                    setSchemaData({...schemaData, tables: newTables});
                  }}
                >
                  Delete Table
                </Button>
              </div>
              <div className="space-y-2">
                {(table.columns || []).map((col, colIdx) => (
                  <div key={colIdx} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Column name"
                      value={col.name}
                      onChange={(e) => {
                        setSchemaData(prev => ({
                          ...prev,
                          tables: prev.tables.map((t, i) => i === idx ? {
                            ...t,
                            columns: t.columns.map((c, j) => j === colIdx ? { ...c, name: e.target.value } : c)
                          } : t)
                        }));
                      }}
                      className="flex-1 bg-dark-300 border border-white/10 rounded px-2 py-1 text-sm font-mono"
                    />
                    <select
                      value={col.type || 'varchar'}
                      onChange={(e) => {
                        setSchemaData(prev => ({
                          ...prev,
                          tables: prev.tables.map((t, i) => i === idx ? {
                            ...t,
                            columns: t.columns.map((c, j) => j === colIdx ? { ...c, type: e.target.value } : c)
                          } : t)
                        }));
                      }}
                      className="bg-dark-300 border border-white/10 rounded px-2 py-1 text-sm font-mono text-gray-300"
                    >
                      <option value="varchar">VARCHAR</option>
                      <option value="integer">INTEGER</option>
                      <option value="boolean">BOOLEAN</option>
                      <option value="timestamp">TIMESTAMP</option>
                      <option value="jsonb">JSONB</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-gray-400">
                      <input 
                        type="checkbox" 
                        checked={col.primaryKey || false}
                        onChange={(e) => {
                          setSchemaData(prev => ({
                            ...prev,
                            tables: prev.tables.map((t, i) => i === idx ? {
                              ...t,
                              columns: t.columns.map((c, j) => j === colIdx ? { ...c, primaryKey: e.target.checked } : c)
                            } : t)
                          }));
                        }}
                      /> PK
                    </label>
                    <button
                      type="button"
                      title="Delete Column"
                      onClick={() => {
                        setSchemaData(prev => ({
                          ...prev,
                          tables: prev.tables.map((t, i) => i === idx ? {
                            ...t,
                            columns: t.columns.filter((_, j) => j !== colIdx)
                          } : t)
                        }));
                      }}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="mt-2"
                  onClick={() => {
                    setSchemaData(prev => ({
                      ...prev,
                      tables: prev.tables.map((t, i) => i === idx ? {
                        ...t,
                        columns: [...(t.columns || []), { name: 'new_column', type: 'varchar' }]
                      } : t)
                    }));
                  }}
                >
                  + Add Column
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {!isStandalone && (
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
          <Button variant="ghost" onClick={() => navigate(`${basePath}/apps/${application.id}/workflow/config`)} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2">
              Next: APIs
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
                <Check className="h-4 w-4" />
                Saved!
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
