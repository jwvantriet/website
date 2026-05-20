/**
 * Phase 3: Resilient Runtime Configuration
 *
 * Improvements:
 * - Retry logic for loadRuntimeConfig when /api/config returns 503/502/504
 * - Proper detection of HTML error pages vs JSON responses
 * - Graceful fallback to defaults after retries exhausted
 * - Non-blocking: config loading never prevents app from rendering
 */

// Runtime configuration
let runtimeConfig: {
  API_BASE_URL: string;
} | null = null;

// Configuration loading state
let configLoading = true;

// Default fallback configuration
// Use empty string (relative URL) so requests go through the same origin.
// In dev, the Vite proxy (configured in vite.config.ts) forwards /api/* to localhost:8000.
// In production, the platform proxy handles routing to the backend.
const defaultConfig = {
  API_BASE_URL: '',
};

/** Transient HTTP status codes from platform proxy */
const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);

/**
 * Helper: wait for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load runtime configuration with retry logic for transient errors.
 *
 * Retries up to `maxRetries` times with exponential backoff when the
 * platform proxy returns 502/503/504 or the fetch fails due to network issues.
 */
export async function loadRuntimeConfig(
  maxRetries = 2,
  baseDelay = 1000
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/config');

      // If we get a transient error status, retry
      if (TRANSIENT_STATUS_CODES.has(response.status)) {
        if (attempt < maxRetries) {
          const delay = baseDelay * attempt;
          console.warn(
            `[Config] Attempt ${attempt}/${maxRetries}: /api/config returned ${response.status}. Retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }
        // Last attempt — fall through to defaults
        console.warn(
          `[Config] /api/config returned ${response.status} after ${maxRetries} attempts. Using defaults.`
        );
        break;
      }

      if (response.ok) {
        const contentType = response.headers.get('content-type');

        // Only parse as JSON if the response is actually JSON
        // (platform proxy may return HTML error pages with 200 status)
        if (contentType && contentType.includes('application/json')) {
          const body = await response.json();

          // Validate the response shape before accepting it
          if (body && typeof body.API_BASE_URL === 'string') {
            runtimeConfig = body;
            console.log('[Config] Runtime config loaded successfully');
          } else {
            console.warn(
              '[Config] Runtime config response missing expected fields, using defaults'
            );
          }
        } else if (contentType && contentType.includes('text/html')) {
          // Got an HTML page instead of JSON — likely a proxy error page
          console.warn(
            '[Config] /api/config returned HTML instead of JSON (possible proxy issue). Using defaults.'
          );
        }
      }

      // Non-retryable response (e.g., 404, 400) — just use defaults
      break;
    } catch (error) {
      // Network error, DNS failure, etc.
      if (attempt < maxRetries) {
        const delay = baseDelay * attempt;
        console.warn(
          `[Config] Attempt ${attempt}/${maxRetries}: Failed to fetch /api/config (${error instanceof Error ? error.message : 'unknown error'}). Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      console.log(
        '[Config] Failed to load runtime config after retries, using defaults'
      );
    }
  }

  // Always mark loading as complete, even on failure
  configLoading = false;
}

// Get current configuration
export function getConfig() {
  // If config is still loading, return default config (relative URL)
  if (configLoading) {
    return defaultConfig;
  }

  // First try runtime config (for Lambda)
  if (runtimeConfig) {
    return runtimeConfig;
  }

  // Then try Vite environment variables (for local development override)
  if (import.meta.env.VITE_API_BASE_URL) {
    return {
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };
  }

  // Finally fall back to default (relative URL)
  return defaultConfig;
}

// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

// For backward compatibility, but this should be avoided
// Removed static export to prevent using stale config values
// export const API_BASE_URL = getAPIBaseURL();

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};