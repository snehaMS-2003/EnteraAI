/**
 * API Utility Configuration for Production
 * Supports configurable API_BASE_URL via Vite environment variables.
 */

export const API_BASE_URL = (
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)
) || '';

/**
 * Builds a complete API URL from a relative or absolute path.
 * In development, defaults to relative path (proxied by Vite).
 * In production, prefixes VITE_API_URL if configured, otherwise uses relative path.
 *
 * @param {string} path - API endpoint path (e.g. '/api/students')
 * @returns {string} - Resolved URL
 */
export function buildApiUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
