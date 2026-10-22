import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { orgFetch, useAuth } from '../hooks/useAuth';

const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

export function ApplicationProvider({ children }) {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const orgId = user?.organizationId || user?.organization_id;

  const storageKey = useMemo(() => {
    return orgId ? `lastSelectedAppId_${orgId}` : 'lastSelectedAppId';
  }, [orgId]);

  const fetchApplications = useCallback(async () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        const stored = localStorage.getItem('user');
        if (stored) currentUser = JSON.parse(stored);
      } catch {
        /* ignore */
      }
    }

    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const userRole = (currentUser.role || '').toLowerCase().trim().replace(/[-\s]+/g, '_');
      const endpoint = (userRole === 'org_admin' || userRole === 'sys_admin') 
        ? '/api/org/applications' 
        : '/api/designer/applications';
        
      const res = await orgFetch(endpoint);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          throw new Error(errorData.error || 'Access Denied: Insufficient role permissions to access applications.');
        }
        throw new Error(errorData.error || ('Failed to load applications. Status: ' + res.status));
      }
      
      const data = await res.json();
      setApplications(data || []);
      
      if (data && data.length > 0) {
        const lastId = localStorage.getItem(storageKey);
        const matchingApp = lastId ? data.find(app => app.id.toString() === lastId.toString()) : null;
        if (matchingApp) {
          setSelectedAppId(matchingApp.id.toString());
        } else {
          const newId = data[0].id.toString();
          setSelectedAppId(newId);
          localStorage.setItem(storageKey, newId);
        }
      } else {
        setSelectedAppId('');
      }
    } catch (err) {
      console.error('Error fetching applications context:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, storageKey]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const selectedApp = useMemo(() => {
    if (!applications || applications.length === 0) return null;
    return applications.find(app => app.id.toString() === selectedAppId?.toString()) || applications[0] || null;
  }, [applications, selectedAppId]);

  const value = {
    applications,
    selectedAppId: selectedApp?.id ? selectedApp.id.toString() : selectedAppId,
    setSelectedAppId: (id) => {
      setSelectedAppId(id ? id.toString() : '');
      if (id) localStorage.setItem(storageKey, id.toString());
    },
    selectedApp,
    currentApp: selectedApp,
    loading,
    error,
    refreshApplications: fetchApplications
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}
