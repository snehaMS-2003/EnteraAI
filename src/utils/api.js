/**
 * API Utility Configuration for Production
 * Supports configurable API_BASE_URL via Vite environment variables.
 * Includes resilience against Render cloud free-tier spin-down (HTTP 502/503 Bad Gateway from Vercel proxy)
 * by automatically retrying and falling back directly to Render backend.
 */

export const RENDER_BACKEND_URL = 'https://entera-backend.onrender.com';

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

/**
 * Sends a background non-blocking ping to wake up the Render backend service.
 * Useful on initial page load so Render is warmed up before user submits auth forms.
 */
export function pingBackendWarmup() {
  try {
    fetch(`${RENDER_BACKEND_URL}/health`, { method: 'GET', mode: 'no-cors' }).catch(() => {});
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')) {
      fetch('/health', { method: 'GET' }).catch(() => {});
    }
  } catch {
    // Silently ignore warmup errors
  }
}

/**
 * Resilient fetch wrapper for Entera.ai API calls.
 * 1. Executes request using buildApiUrl (proxied by Vercel in production or Vite in dev).
 * 2. If Vercel proxy returns 502/503/504 Bad Gateway (Render cold start timeout on free tier),
 *    automatically falls back directly to Render backend without Vercel's short 10s rewrite timeout.
 * 3. Automatically retries once if server is still completing wake-up.
 *
 * @param {string} path - Relative API endpoint (e.g. '/api/login') or absolute URL
 * @param {RequestInit} [options] - Standard Fetch API options
 * @param {number} [retries=1] - Number of retry attempts on cold start
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}, retries = 1) {
  if (!path) throw new Error('Path is required for apiFetch');

  // If path is already a full external URL, fetch directly
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return fetch(path, options);
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const primaryUrl = buildApiUrl(cleanPath);
  const fallbackUrl = `${RENDER_BACKEND_URL}${cleanPath}`;

  try {
    let response = await fetch(primaryUrl, options);

    // If primary returned Bad Gateway / Service Unavailable from Vercel proxy
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      console.warn(`[apiFetch] Primary route (${primaryUrl}) returned HTTP ${response.status}. Trying direct backend fallback...`);

      if (primaryUrl !== fallbackUrl) {
        try {
          const fallbackResponse = await fetch(fallbackUrl, options);
          if (fallbackResponse.ok || fallbackResponse.status < 500) {
            return fallbackResponse;
          }
          response = fallbackResponse;
        } catch (fallbackErr) {
          console.warn('[apiFetch] Fallback direct fetch failed:', fallbackErr.message);
        }
      }

      // If still 502/503/504 and we have retries left, wait 2s and retry
      if (retries > 0 && (response.status === 502 || response.status === 503 || response.status === 504)) {
        await new Promise(res => setTimeout(res, 2000));
        return apiFetch(path, options, retries - 1);
      }
    }

    return response;
  } catch (err) {
    // If primary fetch threw network error, attempt direct Render backend before giving up
    if (primaryUrl !== fallbackUrl) {
      console.warn('[apiFetch] Network error on primary route, attempting direct backend fallback:', err.message);
      try {
        const fallbackResponse = await fetch(fallbackUrl, options);
        if (fallbackResponse.ok || fallbackResponse.status < 500) {
          return fallbackResponse;
        }
      } catch {
        // Fallback also failed
      }
    }

    if (retries > 0) {
      await new Promise(res => setTimeout(res, 2000));
      return apiFetch(path, options, retries - 1);
    }

    throw err;
  }
}

