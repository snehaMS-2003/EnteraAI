import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { orgFetch } from '../../hooks/useAuth';

export function DesignerAppSettings({ application, onUpdate, basePath }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    app_name: application?.app_name || '',
    app_description: application?.app_description || '',
    status: application?.status || 'draft'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.app_name.trim()) {
      setError('Application Name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: formData.app_name,
          app_description: formData.app_description,
          status: formData.status
        })
      });

      if (res.ok) {
        const data = await res.json();
        onUpdate(data.application);
        setSuccess('Application settings updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update application');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${application.app_name}"? This action cannot be undone and will delete all associated schemas and APIs.`)) {
      return;
    }

    setDeleteLoading(true);
    setError('');

    try {
      const res = await orgFetch(`/api/designer/applications/${application.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        navigate(`${basePath}/apps`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete application');
        setDeleteLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred during deletion.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">General Settings</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Application Name</label>
            <Input
              name="app_name"
              value={formData.app_name}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              name="app_description"
              value={formData.app_description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg bg-dark-400/50 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-lg bg-dark-400/50 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 appearance-none"
            >
              <option value="draft" className="bg-dark-200">Draft</option>
              <option value="active" className="bg-dark-200">Active</option>
              <option value="archived" className="bg-dark-200">Archived</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" variant="primary" disabled={loading} className="gap-2">
              {loading ? <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 border-red-500/20 bg-red-500/5">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Once you delete an application, there is no going back. Please be certain.
        </p>

        <Button 
          variant="outline" 
          className="border-red-500/50 text-red-400 hover:bg-red-500/10 gap-2"
          onClick={handleDelete}
          disabled={deleteLoading}
        >
          {deleteLoading ? (
            <div className="h-4 w-4 rounded-full border-2 border-red-400/20 border-t-red-400 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete Application
        </Button>
      </Card>
    </div>
  );
}
