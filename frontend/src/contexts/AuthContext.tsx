import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { client } from '@/lib/api';
import { authApi } from '@/lib/auth';

/**
 * Phase 2: Enhanced Auth Context
 *
 * Uses the resilient RPApi client (src/lib/auth.ts) for getCurrentUser
 * to properly handle 503/502/504 transient errors from the platform proxy.
 *
 * Improvements:
 * - Uses RPApi.getCurrentUser() which has built-in retry + graceful fallback
 * - Connection status tracking (connected / retrying / unavailable)
 * - Automatic background re-check when transitioning from unavailable → available
 * - Completely silent handling of transient errors (no visible error to user)
 */

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  last_login?: string;
}

type ConnectionStatus = 'connected' | 'retrying' | 'unavailable' | 'unknown';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('unknown');

  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus('retrying');

    try {
      // Use the resilient RPApi which has built-in retry logic
      // and returns null for both 401 and transient errors
      const userData = await authApi.getCurrentUser();

      if (userData) {
        setUser({
          id: userData.id || userData.user_id || '',
          email: userData.email || '',
          name: userData.name || userData.username || '',
          role: userData.role || 'user',
          last_login: userData.last_login || '',
        });
        setConnectionStatus('connected');
      } else {
        // null means either not authenticated or backend unreachable
        // In both cases, treat as "not logged in" without error
        setUser(null);
        setConnectionStatus('connected');
      }
    } catch (err: unknown) {
      // RPApi.getCurrentUser() already handles transient errors by returning null,
      // so if we get here it's an unexpected error. Still handle gracefully.
      console.warn('[AuthContext] Unexpected error during auth check:', err);
      setUser(null);
      setConnectionStatus('unavailable');
      // Don't set error — keep it silent for the user
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async () => {
    try {
      setError(null);
      await client.auth.toLogin();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes('503') ||
        msg.toLowerCase().includes('unavailable') ||
        msg.toLowerCase().includes('network')
      ) {
        setError(
          'The server is temporarily unavailable. Please try again in a few moments.'
        );
      } else {
        setError(msg || 'Login failed');
      }
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await client.auth.logout();
      setUser(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes('503') ||
        msg.toLowerCase().includes('unavailable') ||
        msg.toLowerCase().includes('network')
      ) {
        setError(
          'The server is temporarily unavailable. Please try again in a few moments.'
        );
      } else {
        setError(msg || 'Logout failed');
      }
    }
  };

  // Initial auth check
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Auto-retry when connection status is 'unavailable'
  // Periodically re-check to see if backend becomes available
  useEffect(() => {
    if (connectionStatus !== 'unavailable') return;

    const retryInterval = setInterval(() => {
      console.log(
        '[Auth] Backend was unavailable. Attempting background re-check...'
      );
      checkAuthStatus();
    }, 30000); // Re-check every 30 seconds

    return () => clearInterval(retryInterval);
  }, [connectionStatus, checkAuthStatus]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    connectionStatus,
    login,
    logout,
    refetch: checkAuthStatus,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};