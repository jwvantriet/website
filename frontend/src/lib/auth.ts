import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAPIBaseURL } from './config';

/**
 * Phase 1: Resilient Auth API Client
 *
 * Handles transient 503/502/504 errors from the platform proxy with:
 * - Automatic retry with exponential backoff
 * - Graceful fallback for transient errors (treat as "not logged in")
 * - Proper detection of HTML error pages vs JSON responses
 */

const TRANSIENT_STATUS_CODES = [502, 503, 504];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an axios error represents a transient/retryable issue.
 */
function isRetryableError(error: AxiosError): boolean {
  // No response at all — network error, DNS failure, timeout
  if (!error.response) {
    return true;
  }

  // Platform proxy errors (502, 503, 504)
  if (TRANSIENT_STATUS_CODES.includes(error.response.status)) {
    return true;
  }

  // Check if response data is an HTML error page (platform proxy fallback)
  if (
    typeof error.response.data === 'string' &&
    (error.response.data.includes('Temporarily Unavailable') ||
      error.response.data.includes('<!DOCTYPE') ||
      error.response.data.includes('<html'))
  ) {
    return true;
  }

  return false;
}

/**
 * Execute a request with automatic retry for transient errors.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxRetries = MAX_RETRIES,
    baseDelay = BASE_DELAY_MS,
    context = 'request',
  }: { maxRetries?: number; baseDelay?: number; context?: string } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const axiosErr = error as AxiosError;

      if (isRetryableError(axiosErr) && attempt < maxRetries) {
        const delay = baseDelay * attempt;
        console.warn(
          `[RPApi] ${context} attempt ${attempt}/${maxRetries} failed (transient error: ${axiosErr.message}). Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      // Either not retryable or last attempt — rethrow
      throw error;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error(`[RPApi] ${context} failed after ${maxRetries} attempts`);
}

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private getBaseURL() {
    return getAPIBaseURL();
  }

  /**
   * Get current user info with retry logic.
   * Returns null for 401 (not authenticated) and transient errors after retries exhausted.
   */
  async getCurrentUser() {
    try {
      const response = await withRetry(
        () => this.client.get(`${this.getBaseURL()}/api/v1/auth/me`),
        { context: 'getCurrentUser' }
      );
      return response.data;
    } catch (error) {
      const axiosErr = error as AxiosError;

      // 401 = not authenticated — normal case
      if (axiosErr.response?.status === 401) {
        return null;
      }

      // If all retries exhausted for a transient error, treat as "not logged in"
      // instead of throwing and crashing the UI
      if (isRetryableError(axiosErr)) {
        console.warn(
          '[RPApi] getCurrentUser: Backend unreachable after retries. Treating as not logged in.'
        );
        return null;
      }

      throw new Error(
        axiosErr.response?.data?.detail ||
          (axiosErr.response?.data as string) ||
          'Failed to get user info'
      );
    }
  }

  /**
   * Initiate OIDC login with retry logic.
   */
  async login() {
    try {
      const response = await withRetry(
        () => this.client.get(`${this.getBaseURL()}/api/v1/auth/login`),
        { context: 'login' }
      );
      // The backend will redirect to OIDC provider
      // SSO will work via cookies automatically
      window.location.href = response.data.redirect_url;
    } catch (error) {
      const axiosErr = error as AxiosError;

      if (isRetryableError(axiosErr)) {
        throw new Error(
          'The server is temporarily unavailable. Please try again in a few moments.'
        );
      }

      throw new Error(
        axiosErr.response?.data?.detail || 'Failed to initiate login'
      );
    }
  }

  /**
   * Logout with retry logic.
   */
  async logout() {
    try {
      const response = await withRetry(
        () => this.client.get(`${this.getBaseURL()}/api/v1/auth/logout`),
        { context: 'logout' }
      );
      // The backend will redirect to OIDC provider logout
      window.location.href = response.data.redirect_url;
    } catch (error) {
      const axiosErr = error as AxiosError;

      if (isRetryableError(axiosErr)) {
        throw new Error(
          'The server is temporarily unavailable. Please try again in a few moments.'
        );
      }

      throw new Error(
        axiosErr.response?.data?.detail || 'Failed to logout'
      );
    }
  }
}

export { isRetryableError, withRetry, TRANSIENT_STATUS_CODES };
export const authApi = new RPApi();