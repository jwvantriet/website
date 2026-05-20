import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { client } from '@/lib/api';

export interface PlatformUser {
  id: number;
  email: string;
  name: string;
  role: string; // placement, company, agency_admin, agency_ops
  auth_source: string; // carerix, local
  company_id?: number;
  placement_id?: number;
}

interface PlatformAuthContextType {
  platformUser: PlatformUser | null;
  loading: boolean;
  error: string | null;
  loginAgency: (email: string, password: string) => Promise<boolean>;
  loginLocal: (email: string, password: string) => Promise<boolean>;
  loginCarerix: () => Promise<void>;
  logout: () => void;
  isAgency: boolean;
  isCompany: boolean;
  isPlacement: boolean;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | null>(null);

export const usePlatformAuth = () => {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
  }
  return context;
};

export const PlatformAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing platform session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('platform_token');
        const userData = localStorage.getItem('platform_user');
        if (token && userData) {
          const user = JSON.parse(userData);
          setPlatformUser(user);
        }
      } catch {
        // No valid session
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const loginAgency = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/platform-auth/agency-login',
        method: 'POST',
        data: { email, password },
      });
      const data = response.data;
      if (data.token && data.user) {
        localStorage.setItem('platform_token', data.token);
        localStorage.setItem('platform_user', JSON.stringify(data.user));
        setPlatformUser(data.user);
        return true;
      }
      setError('Login failed');
      return false;
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || 'Login failed';
      setError(msg);
      return false;
    }
  }, []);

  const loginLocal = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/platform-auth/local-login',
        method: 'POST',
        data: { email, password },
      });
      const data = response.data;
      if (data.token && data.user) {
        localStorage.setItem('platform_token', data.token);
        localStorage.setItem('platform_user', JSON.stringify(data.user));
        setPlatformUser(data.user);
        return true;
      }
      setError('Login failed');
      return false;
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || 'Login failed';
      setError(msg);
      return false;
    }
  }, []);

  const loginCarerix = useCallback(async () => {
    // Redirect to existing Carerix OIDC flow
    await client.auth.toLogin();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('platform_token');
    localStorage.removeItem('platform_user');
    setPlatformUser(null);
  }, []);

  const value: PlatformAuthContextType = {
    platformUser,
    loading,
    error,
    loginAgency,
    loginLocal,
    loginCarerix,
    logout,
    isAgency: platformUser?.role === 'agency_admin' || platformUser?.role === 'agency_ops',
    isCompany: platformUser?.role === 'company',
    isPlacement: platformUser?.role === 'placement',
  };

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
};