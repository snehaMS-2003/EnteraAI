import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function normalizeUser(rawUser) {
  if (!rawUser) return null;
  const user = { ...rawUser };
  const orgId = user.organizationId || user.organization_id || null;
  user.organizationId = orgId ? Number(orgId) : null;
  user.organization_id = user.organizationId;
  return user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        return normalizeUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  const login = (userData) => {
    const normalized = normalizeUser(userData);
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('lastSelectedAppId');
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = normalizeUser({ ...prev, ...updates });
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  // Sync state if another tab or storage change occurs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'user') {
        try {
          setUser(e.newValue ? normalizeUser(JSON.parse(e.newValue)) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback if rendered outside AuthProvider: read directly from localStorage
    try {
      const stored = localStorage.getItem('user');
      const user = stored ? normalizeUser(JSON.parse(stored)) : null;
      return {
        user,
        loading: false,
        login: (u) => localStorage.setItem('user', JSON.stringify(normalizeUser(u))),
        logout: () => localStorage.removeItem('user'),
        updateUser: () => {},
        isAuthenticated: !!user
      };
    } catch {
      return { user: null, loading: false, login: () => {}, logout: () => {}, updateUser: () => {}, isAuthenticated: false };
    }
  }
  return context;
}
