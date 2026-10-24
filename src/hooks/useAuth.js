/**
 * useAuth — re-exports useAuth from AuthContext for centralized state.
 * orgFetch — wrapper around fetch() that automatically attaches org-auth headers.
 */

import { buildApiUrl, apiFetch } from '../utils/api';

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
    const uid = user.id || user.userId || user.user_id;
    const role = user.role ? String(user.role).toLowerCase().trim().replace(/[-\s]+/g, '_') : null;
    if (orgId) headers['X-Org-Id'] = String(orgId);
    if (uid) headers['X-User-Id'] = String(uid);
    if (user.email) headers['X-User-Email'] = user.email;
    if (role) headers['X-User-Role'] = role;
  }

  return apiFetch(path, {
    ...options,
    headers,
  });
}
