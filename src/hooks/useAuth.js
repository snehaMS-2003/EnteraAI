/**
 * useAuth — reads the current authenticated user from localStorage
 * (set by Login.jsx after a successful /api/login response).
 *
 * Returns the user object and a pre-configured orgFetch() helper that
 * automatically injects the X-Org-Id / X-User-Id / X-User-Email headers
 * required by the org-scoped backend routes.
 */

import { useState } from 'react';

export function useAuth() {
  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) return JSON.parse(stored);
    } catch {
      return null;
    }
    return null;
  });
  return user;
}

/**
 * orgFetch(path, options)
 * Wrapper around fetch() that automatically attaches org-auth headers.
 */
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
    if (user.organizationId) headers['X-Org-Id'] = String(user.organizationId);
    if (user.id)             headers['X-User-Id'] = String(user.id);
    if (user.email)          headers['X-User-Email'] = user.email;
  }

  return fetch(`http://localhost:5000${path}`, {
    ...options,
    headers,
  });
}
