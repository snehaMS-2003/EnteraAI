/**
 * useAuth — re-exports useAuth from AuthContext for centralized state.
 * orgFetch — wrapper around fetch() that automatically attaches org-auth headers.
 */

import { buildApiUrl } from '../utils/api';

export { useAuth } from '../contexts/AuthContext';

export function orgFetch(path, options = {}) {
  let user = null;
  try {
    const stored = localStorage.getItem('user');
    if (stored) user = JSON.parse(stored);
  } catch {
    /* ignore */
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (user) {
    const orgId = user.organizationId || user.organization_id;
    if (orgId) headers['X-Org-Id'] = String(orgId);
    if (user.id) headers['X-User-Id'] = String(user.id);
    if (user.email) headers['X-User-Email'] = user.email;
    if (user.role) headers['X-User-Role'] = user.role;
  }

  return fetch(buildApiUrl(path), {
    ...options,
    headers,
  });
}
