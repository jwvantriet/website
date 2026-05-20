import React, { useState, useEffect, useCallback } from 'react';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { client } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowLeft,
  Filter,
  Zap,
  RotateCcw,
  Play,
  Shield,
  Settings,
  TestTube2,
  Copy,
  ExternalLink,
  Loader2,
  KeyRound,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface WebhookEvent {
  id: number;
  event_id: string;
  entity_id: string;
  entity_type: string;
  event_type: string;
  event_time: string;
  changed_fields: string | null;
  processing_status: string;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  raw_payload: string | null;
}

interface DashboardSummary {
  total_events: number;
  by_status: Record<string, number>;
  by_entity: Record<string, number>;
}

interface DashboardData {
  summary: DashboardSummary;
  events: WebhookEvent[];
}

interface ConfigIssue {
  severity: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
}

interface WebhookConfig {
  webhook_endpoint: string;
  webhook_url_local: string;
  webhook_url_deployed: string | null;
  webhook_url_effective?: string;
  url_is_placeholder?: boolean;
  secret_configured: boolean;
  tenant: string;
  client_id_configured: boolean;
  webhook_client_id_configured?: boolean;
  webhook_client_id_hint?: string;
  issues?: ConfigIssue[];
  has_critical_issues?: boolean;
  instructions: {
    carerix_url: string;
    custom_header_name: string;
    custom_header_value: string;
    supported_entities: string[];
    supported_events: string[];
  };
}

interface TestResult {
  test_result: string;
  message: string;
  status_code?: number;
  webhook_url?: string;
  signature_used?: boolean;
  event_stored?: boolean;
  event_id?: string;
  event_processing_status?: string;
  error?: string;
  token_type?: string;
  expires_in?: number;
  token_url?: string;
}

interface CarerixApplication {
  [key: string]: unknown;
}

interface CarerixWebhook {
  filters?: Array<{ eventType?: string; condition?: string }>;
  customHeaders?: Array<{ name?: string; value?: string }>;
  [key: string]: unknown;
}

interface RegistrationResult {
  status: string;
  message: string;
  application_id?: string;
  webhook_url?: string;
  secret_included?: boolean;
  webhook?: CarerixWebhook;
}

interface TokenDiagResult {
  auth_url?: string;
  auth_urls_tried?: string[];
  tenant?: string;
  general_client_id?: string;
  webhook_client_id?: string;
  using_dedicated_webhook_client?: boolean;
  error?: string;
  token_results?: Array<{
    auth_url?: string;
    client?: string;
    scope_requested: string;
    success: boolean;
    expires_in?: number;
    token_scopes?: string;
    realm_access_roles?: string[];
    resource_access?: string[];
    azp?: string;
    iss?: string;
    error?: string;
  }>;
}

/**
 * Extract a value from a Carerix API object by trying multiple field names.
 */
function extractField(obj: Record<string, unknown>, fields: string[]): string {
  for (const f of fields) {
    if (obj[f] != null && String(obj[f]).trim()) return String(obj[f]).trim();
  }
  return '';
}

function extractId(obj: Record<string, unknown>): string {
  return extractField(obj, ['_id', 'id', 'applicationId', 'application_id', 'appId', 'webhookId', 'webhook_id', 'uuid']);
}

function extractName(obj: Record<string, unknown>): string {
  return extractField(obj, ['name', 'title', 'label', 'description']) || extractField(obj, ['_kind']) || 'Unnamed';
}

function extractUrl(obj: Record<string, unknown>): string {
  return extractField(obj, ['url', 'webhookUrl', 'webhook_url', 'callbackUrl', 'callback_url', 'endpoint']);
}

/**
 * Parse raw_payload JSON and extract a human-readable summary of what the event contains.
 */
function summarizePayload(rawPayload: string | null): string {
  if (!rawPayload) return '—';
  try {
    const payload = JSON.parse(rawPayload);
    const parts: string[] = [];
    // Show entity class name if available
    if (payload.entity || payload.entityType) {
      parts.push(payload.entity || payload.entityType);
    }
    // Show event action
    if (payload.event || payload.eventType) {
      const evt = payload.event || payload.eventType;
      if (!parts.some(p => evt.includes(p))) {
        parts.push(evt);
      }
    }
    // Show if it's a test event
    if (payload._test) parts.push('(test)');
    return parts.join(' · ') || '—';
  } catch {
    return '—';
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  processing: 'bg-blue-100 text-blue-800 border-blue-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  pending_api_access: 'bg-orange-100 text-orange-800 border-orange-300',
  duplicate: 'bg-gray-100 text-gray-600 border-gray-300',
  echo_suppressed: 'bg-purple-100 text-purple-800 border-purple-300',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  processing: <RefreshCw className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  failed: <AlertCircle className="h-3 w-3" />,
  pending_api_access: <KeyRound className="h-3 w-3" />,
  duplicate: <Shield className="h-3 w-3" />,
  echo_suppressed: <Shield className="h-3 w-3" />,
};

const AdminWebhookDashboard: React.FC = () => {
  const { platformUser, loading: authLoading } = usePlatformAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Config & test state
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testingAuth, setTestingAuth] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<TestResult | null>(null);
  const [authTestResult, setAuthTestResult] = useState<TestResult | null>(null);

  // Carerix registration state
  const [registering, setRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [carerixApps, setCarerixApps] = useState<CarerixApplication[]>([]);
  const [carerixWebhooks, setCarerixWebhooks] = useState<CarerixWebhook[]>([]);
  const [loadingCarerixStatus, setLoadingCarerixStatus] = useState(false);

  // Token diagnostics state
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<TokenDiagResult | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Debug raw response state
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugRawResult, setDebugRawResult] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Expanded event rows (to show raw payload)
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  // Show raw JSON for Carerix objects
  const [showRawCarerix, setShowRawCarerix] = useState(false);

  // Deleting / toggling state
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchDashboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (statusFilter !== 'all') params.status_filter = statusFilter;
      if (entityFilter !== 'all') params.entity_filter = entityFilter;

      const queryString = new URLSearchParams(params).toString();
      const response = await client.apiCall.invoke({
        url: `/api/v1/webhooks/dashboard?${queryString}`,
        method: 'GET',
      });

      if (response?.data) {
        setDashboardData(response.data as DashboardData);
      }
    } catch (err) {
      console.error('Failed to fetch webhook dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, entityFilter]);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/webhooks/config',
        method: 'GET',
      });
      if (response?.data) {
        const raw = response.data as Record<string, unknown>;
        // Normalize: if flat properties are missing, derive them from nested credentials
        const creds = raw.credentials as Record<string, Record<string, unknown>> | undefined;
        const normalized: WebhookConfig = {
          ...(raw as unknown as WebhookConfig),
          secret_configured:
            typeof raw.secret_configured === 'boolean'
              ? raw.secret_configured
              : Boolean(creds?.webhook?.client_secret_configured),
          client_id_configured:
            typeof raw.client_id_configured === 'boolean'
              ? raw.client_id_configured
              : Boolean(creds?.general_api?.client_id_configured),
          webhook_client_id_configured:
            typeof raw.webhook_client_id_configured === 'boolean'
              ? raw.webhook_client_id_configured
              : Boolean(creds?.webhook?.client_id_configured),
          webhook_client_id_hint:
            (raw.webhook_client_id_hint as string) ||
            (creds?.webhook?.client_id_hint as string) ||
            undefined,
        };
        setWebhookConfig(normalized);
      }
    } catch (err) {
      console.error('Failed to fetch webhook config:', err);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && platformUser) {
      fetchDashboard();
      fetchConfig();
    }
  }, [authLoading, platformUser, fetchDashboard, fetchConfig]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchDashboard(), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboard]);

  const toggleEventExpand = (eventId: number) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const handleRetry = async (eventId: number) => {
    try {
      await client.apiCall.invoke({
        url: `/api/v1/webhooks/retry/${eventId}`,
        method: 'POST',
      });
      toast({ title: 'Retry started', description: `Event #${eventId} queued for reprocessing.` });
      setTimeout(() => fetchDashboard(), 1000);
    } catch {
      toast({ title: 'Retry failed', description: 'Could not retry the webhook event.', variant: 'destructive' });
    }
  };

  const handleProcessPending = async (includeApiAccess = false) => {
    try {
      const url = includeApiAccess
        ? '/api/v1/webhooks/process-pending?include_api_access=true'
        : '/api/v1/webhooks/process-pending';
      const response = await client.apiCall.invoke({
        url,
        method: 'POST',
      });
      const data = response?.data as { count?: number; statuses_checked?: string[] } | undefined;
      toast({
        title: 'Processing started',
        description: `${data?.count || 0} events queued (${(data?.statuses_checked || ['pending']).join(', ')}).`,
      });
      setTimeout(() => fetchDashboard(), 2000);
    } catch {
      toast({ title: 'Error', description: 'Could not trigger pending event processing.', variant: 'destructive' });
    }
  };

  const handleReconcileAll = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/webhooks/reconcile-all',
        method: 'POST',
      });
      const data = response?.data as { summary?: { total_checked?: number; total_upserted?: number } } | undefined;
      toast({
        title: 'Reconciliation complete',
        description: `Checked ${data?.summary?.total_checked || 0} records, upserted ${data?.summary?.total_upserted || 0}.`,
      });
      setTimeout(() => fetchDashboard(), 1000);
    } catch {
      toast({ title: 'Reconciliation failed', description: 'Could not complete reconciliation.', variant: 'destructive' });
    }
  };

  const handleRetryFailed = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/webhooks/retry-failed',
        method: 'POST',
      });
      const data = response?.data as { count?: number; categories?: Record<string, number>; category_details?: Record<string, string> } | undefined;
      const cats = data?.categories || {};
      const details = Object.entries(cats).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ');
      toast({
        title: 'Retry Started',
        description: `${data?.count || 0} failed events re-queued. ${details ? `(${details})` : ''}`,
      });
      setTimeout(() => fetchDashboard(), 2000);
    } catch {
      toast({ title: 'Retry Failed', description: 'Could not retry failed events.', variant: 'destructive' });
    }
  };

  const handleCleanupEvents = async () => {
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/webhooks/cleanup?keep_days=30',
        method: 'DELETE',
      });
      const data = response?.data as { deleted?: number; remaining?: number } | undefined;
      toast({
        title: 'Cleanup Complete',
        description: `Removed ${data?.deleted || 0} old events. ${data?.remaining || 0} remaining.`,
      });
      setTimeout(() => fetchDashboard(), 1000);
    } catch {
      toast({ title: 'Cleanup Failed', description: 'Could not clean up old events.', variant: 'destructive' });
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const response = await client.apiCall.invoke({ url: '/api/v1/webhooks/test', method: 'POST' });
      if (response?.data) {
        setWebhookTestResult(response.data as TestResult);
        setTimeout(() => fetchDashboard(), 1500);
      }
    } catch {
      setWebhookTestResult({ test_result: 'error', message: '❌ Failed to run webhook test.' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleTestAuth = async () => {
    setTestingAuth(true);
    setAuthTestResult(null);
    try {
      const response = await client.apiCall.invoke({ url: '/api/v1/webhooks/test-carerix-auth', method: 'POST' });
      if (response?.data) setAuthTestResult(response.data as TestResult);
    } catch {
      setAuthTestResult({ test_result: 'error', message: '❌ Failed to test Carerix authentication.' });
    } finally {
      setTestingAuth(false);
    }
  };

  const handleDiagnoseToken = async () => {
    setDiagnosing(true);
    setDiagResult(null);
    setShowDiagnostics(true);
    try {
      const response = await client.apiCall.invoke({ url: '/api/v1/webhooks/diagnose-token', method: 'GET' });
      if (response?.data) setDiagResult(response.data as TokenDiagResult);
    } catch {
      setDiagResult({ error: 'Failed to run token diagnostics.' });
    } finally {
      setDiagnosing(false);
    }
  };

  const handleLoadCarerixStatus = async () => {
    setLoadingCarerixStatus(true);
    try {
      const appsResponse = await client.apiCall.invoke({ url: '/api/v1/webhooks/carerix-applications', method: 'GET' });
      const appsData = appsResponse?.data as { applications?: CarerixApplication[]; error?: string } | undefined;
      const apps = appsData?.applications || [];
      setCarerixApps(apps);

      if (appsData?.error) {
        toast({ title: 'Carerix API Error', description: appsData.error.substring(0, 200), variant: 'destructive' });
      }

      // Load webhooks from ALL applications
      const allWebhooks: CarerixWebhook[] = [];
      for (const app of apps) {
        const appObj = app as Record<string, unknown>;
        const appId = extractId(appObj);
        if (appId) {
          try {
            const whResponse = await client.apiCall.invoke({
              url: `/api/v1/webhooks/carerix-webhooks/${appId}`,
              method: 'GET',
            });
            const whData = whResponse?.data as { webhooks?: CarerixWebhook[] } | undefined;
            const webhooks = whData?.webhooks || [];
            for (const wh of webhooks) {
              (wh as Record<string, unknown>)._parentAppId = appId;
              (wh as Record<string, unknown>)._parentAppName = extractName(appObj);
            }
            allWebhooks.push(...webhooks);
          } catch {
            // Skip apps where webhook listing fails
          }
        }
      }
      setCarerixWebhooks(allWebhooks);
    } catch (err) {
      console.error('Failed to load Carerix webhook status:', err);
      toast({ title: 'Error', description: 'Could not load Carerix webhook status.', variant: 'destructive' });
    } finally {
      setLoadingCarerixStatus(false);
    }
  };

  const handleDeleteWebhook = async (applicationId: string, webhookId: string) => {
    if (!confirm(`Delete webhook ${webhookId.substring(0, 12)}...?\nThis cannot be undone.`)) return;
    setDeletingIds(prev => new Set(prev).add(webhookId));
    try {
      await client.apiCall.invoke({
        url: `/api/v1/webhooks/carerix-webhooks/${applicationId}/${webhookId}`,
        method: 'DELETE',
      });
      toast({ title: 'Webhook deleted', description: 'Removed from Carerix.' });
      setTimeout(() => handleLoadCarerixStatus(), 500);
    } catch {
      toast({ title: 'Delete failed', description: 'Could not delete the webhook.', variant: 'destructive' });
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(webhookId); return n; });
    }
  };

  const handleToggleWebhook = async (applicationId: string, webhookId: string, currentlyEnabled: boolean) => {
    const action = currentlyEnabled ? 'disable' : 'enable';
    setTogglingIds(prev => new Set(prev).add(webhookId));
    try {
      await client.apiCall.invoke({
        url: `/api/v1/webhooks/carerix-webhooks/${applicationId}/${webhookId}/${action}`,
        method: 'POST',
      });
      toast({ title: `Webhook ${action}d`, description: `Webhook ${action}d in Carerix.` });
      setTimeout(() => handleLoadCarerixStatus(), 500);
    } catch {
      toast({ title: `${action} failed`, description: `Could not ${action} the webhook.`, variant: 'destructive' });
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(webhookId); return n; });
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    if (!confirm(`Delete application ${applicationId.substring(0, 12)}...?\nAll webhooks under this application will also be removed.\nThis cannot be undone.`)) return;
    setDeletingIds(prev => new Set(prev).add(applicationId));
    try {
      await client.apiCall.invoke({
        url: `/api/v1/webhooks/carerix-applications/${applicationId}`,
        method: 'DELETE',
      });
      toast({ title: 'Application deleted', description: 'Removed from Carerix.' });
      setTimeout(() => handleLoadCarerixStatus(), 500);
    } catch {
      toast({ title: 'Delete failed', description: 'Could not delete the application. It may still have webhooks.', variant: 'destructive' });
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(applicationId); return n; });
    }
  };

  const handleDebugRawResponse = async () => {
    setDebugLoading(true);
    setDebugRawResult(null);
    setShowDebug(true);
    try {
      const response = await client.apiCall.invoke({ url: '/api/v1/webhooks/carerix-debug-raw', method: 'GET' });
      if (response?.data) setDebugRawResult(response.data as Record<string, unknown>);
    } catch {
      setDebugRawResult({ error: 'Failed to fetch debug data.' });
    } finally {
      setDebugLoading(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setRegistering(true);
    setRegistrationResult(null);
    try {
      const response = await client.apiCall.invoke({
        url: '/api/v1/webhooks/carerix-register',
        method: 'POST',
        body: {},
      });
      if (response?.data) {
        setRegistrationResult(response.data as RegistrationResult);
        toast({ title: 'Webhook Registered!', description: 'Endpoint registered in Carerix.' });
        setTimeout(() => handleLoadCarerixStatus(), 1000);
      }
    } catch (err: unknown) {
      let errorMsg = 'Unknown error';
      if (err && typeof err === 'object') {
        const errObj = err as Record<string, unknown>;
        if (errObj.data && typeof errObj.data === 'object') {
          const data = errObj.data as Record<string, unknown>;
          errorMsg = (data.detail as string) || (data.message as string) || JSON.stringify(data);
        } else if (errObj.detail && typeof errObj.detail === 'string') {
          errorMsg = errObj.detail;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
      }
      const is403 = errorMsg.includes('403') || errorMsg.includes('Forbidden');
      setRegistrationResult({
        status: 'error',
        message: is403
          ? `❌ Access Denied (403): Your API client doesn't have webhook permissions. Use "Diagnose Token" to check scopes.`
          : `❌ Registration failed: ${errorMsg}`,
      });
      toast({ title: 'Registration Failed', description: errorMsg.substring(0, 100), variant: 'destructive' });
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Copied to clipboard.' });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading webhook dashboard...</span>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary;
  const events = dashboardData?.events || [];
  const webhookUrl = webhookConfig?.webhook_url_deployed || webhookConfig?.webhook_url_local || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/operations')}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Operations
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Webhook Monitor
                </h1>
                <p className="text-sm text-gray-500">Carerix webhook events & registration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
                <Settings className="h-4 w-4 mr-1" />
                {showConfig ? 'Hide' : 'Show'} Config
              </Button>
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Live' : 'Auto-refresh'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchDashboard(true)} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Pending API Access Banner */}
        {summary?.by_status?.pending_api_access && summary.by_status.pending_api_access > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800">
                🔑 {summary.by_status.pending_api_access} event{summary.by_status.pending_api_access > 1 ? 's' : ''} waiting for API credentials
              </p>
              <p className="text-xs text-orange-700 mt-1">
                These webhook events were received from Carerix but could not be processed because the current API credentials
                don&apos;t have permission to fetch entity data from the GraphQL API (403 Forbidden). The events are safely stored
                and will be automatically reprocessed once valid credentials with data access are configured.
              </p>
              <p className="text-xs text-orange-600 mt-2">
                <strong>To fix:</strong> Update <code className="bg-orange-100 px-1 rounded">CARERIX_CLIENT_ID</code> and{' '}
                <code className="bg-orange-100 px-1 rounded">CARERIX_CLIENT_SECRET</code> with credentials that have GraphQL data access permissions,
                then click &quot;Reprocess API Access&quot; below.
              </p>
            </div>
          </div>
        )}

        {/* Configuration & Registration Section */}
        {showConfig && (
          <>
          {/* Critical Issues Banner */}
          {webhookConfig?.issues && webhookConfig.issues.length > 0 && (
            <div className="space-y-2">
              {webhookConfig.issues.filter(i => i.severity === 'critical').map((issue, idx) => (
                <div key={idx} className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800">🚨 Critical Configuration Issue</p>
                    <p className="text-sm text-red-700 mt-1">{issue.message}</p>
                    <p className="text-xs text-red-500 mt-2">
                      Code: <code className="bg-red-100 px-1 rounded">{issue.code}</code>
                    </p>
                  </div>
                </div>
              ))}
              {webhookConfig.issues.filter(i => i.severity === 'warning').map((issue, idx) => (
                <div key={idx} className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">⚠️ Warning</p>
                    <p className="text-xs text-amber-700 mt-0.5">{issue.message}</p>
                  </div>
                </div>
              ))}
              {webhookConfig.issues.filter(i => i.severity === 'info').map((issue, idx) => (
                <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700">ℹ️ Note</p>
                    <p className="text-xs text-blue-600 mt-0.5">{issue.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Webhook URL & Config */}
            <Card className={`${webhookConfig?.url_is_placeholder ? 'border-red-300 bg-red-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${webhookConfig?.url_is_placeholder ? 'text-red-900' : 'text-blue-900'}`}>
                  <Settings className="h-4 w-4" />
                  Webhook Configuration
                  {webhookConfig?.url_is_placeholder && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">URL BROKEN</Badge>
                  )}
                </CardTitle>
                <CardDescription className={`text-xs ${webhookConfig?.url_is_placeholder ? 'text-red-700' : 'text-blue-700'}`}>
                  {webhookConfig?.url_is_placeholder
                    ? 'PYTHON_BACKEND_URL is not configured — Carerix cannot deliver events'
                    : 'Your webhook endpoint URL for Carerix'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {configLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : webhookConfig ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Webhook Endpoint URL
                        {webhookConfig.url_is_placeholder && (
                          <span className="text-red-600 ml-2 font-bold">⚠ PLACEHOLDER — NOT A REAL URL</span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <code className={`flex-1 border rounded px-3 py-2 text-sm font-mono break-all ${
                          webhookConfig.url_is_placeholder
                            ? 'bg-red-50 border-red-300 text-red-700 line-through'
                            : 'bg-white border-blue-200 text-gray-800'
                        }`}>
                          {webhookUrl}
                        </code>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookUrl)} className="shrink-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {webhookConfig.url_is_placeholder && webhookConfig.webhook_url_local && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Local URL (for testing only): </span>
                          <code className="text-blue-600 break-all">{webhookConfig.webhook_url_local}</code>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {!webhookConfig.url_is_placeholder
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span className={!webhookConfig.url_is_placeholder ? 'text-green-700' : 'text-red-600'}>
                          Backend URL {!webhookConfig.url_is_placeholder ? '✓' : '✗ placeholder'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {webhookConfig.secret_configured
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span className={webhookConfig.secret_configured ? 'text-green-700' : 'text-red-600'}>
                          Webhook Secret {webhookConfig.secret_configured ? '✓' : 'missing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {webhookConfig.client_id_configured
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          : <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        <span className={webhookConfig.client_id_configured ? 'text-green-700' : 'text-red-600'}>
                          General Client {webhookConfig.client_id_configured ? '✓' : 'missing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {webhookConfig.webhook_client_id_configured
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                        <span className={webhookConfig.webhook_client_id_configured ? 'text-green-700' : 'text-amber-600'}>
                          Webhook Client {webhookConfig.webhook_client_id_configured ? '✓' : 'not set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-green-700">Tenant: {webhookConfig.tenant || 'confair'}</span>
                      </div>
                    </div>

                    {webhookConfig.url_is_placeholder && (
                      <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-800">
                        <p className="font-bold">🚨 Action Required</p>
                        <p className="mt-1">
                          Set the <code className="bg-red-200 px-1 rounded">PYTHON_BACKEND_URL</code> environment variable to your actual deployed backend URL
                          (e.g., <code className="bg-red-200 px-1 rounded">https://your-app.example.com</code>).
                          Until this is fixed, Carerix will not be able to deliver webhook events.
                        </p>
                      </div>
                    )}

                    {!webhookConfig.url_is_placeholder && !webhookConfig.webhook_client_id_configured && (
                      <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                        <p className="font-medium">⚠️ Webhook Client Not Configured</p>
                        <p className="mt-1 text-gray-600">
                          Set <code>CARERIX_WEBHOOK_CLIENT_ID</code> and <code>CARERIX_WEBHOOK_CLIENT_SECRET</code> to the dedicated webhook client.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Could not load configuration.</p>
                )}
              </CardContent>
            </Card>

            {/* Registration & Tests */}
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                  <TestTube2 className="h-4 w-4" />
                  Registration & Tests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Register Webhook */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Register Webhook in Carerix
                  </p>
                  {webhookConfig?.url_is_placeholder && (
                    <p className="text-xs text-red-600 font-medium mb-1">
                      ⚠️ Cannot register — PYTHON_BACKEND_URL is a placeholder. Fix it first.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleRegisterWebhook}
                      disabled={registering || (!!webhookConfig && !webhookConfig.webhook_client_id_configured) || !!webhookConfig?.url_is_placeholder}
                      className={`text-white ${
                        (webhookConfig && !webhookConfig.webhook_client_id_configured) || webhookConfig?.url_is_placeholder
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {registering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                      Register
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleLoadCarerixStatus} disabled={loadingCarerixStatus} className="border-blue-300">
                      {loadingCarerixStatus ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Load Status
                    </Button>
                  </div>
                  {registrationResult && (
                    <div className={`p-2 rounded text-xs border ${
                      registrationResult.status === 'registered'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                      <p className="font-medium">{registrationResult.message}</p>
                      {registrationResult.webhook_url && (
                        <p className="mt-1 text-gray-500">URL: <code className="break-all">{registrationResult.webhook_url}</code></p>
                      )}
                      {registrationResult.application_id && (
                        <p className="text-gray-500">App ID: <code>{registrationResult.application_id}</code></p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-amber-200" />

                {/* Quick tests */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleTestWebhook} disabled={testingWebhook}>
                    {testingWebhook ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1 text-amber-600" />}
                    Test Ingestion
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleTestAuth} disabled={testingAuth}>
                    {testingAuth ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <KeyRound className="h-3 w-3 mr-1 text-blue-600" />}
                    Test Auth
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDiagnoseToken} disabled={diagnosing}>
                    {diagnosing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1 text-purple-600" />}
                    Diagnose Token
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDebugRawResponse} disabled={debugLoading}>
                    {debugLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Search className="h-3 w-3 mr-1 text-orange-600" />}
                    Debug Raw API
                  </Button>
                </div>

                {/* Test results (compact) */}
                {webhookTestResult && (
                  <div className={`p-2 rounded text-xs border ${webhookTestResult.test_result === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <p>{webhookTestResult.message}</p>
                  </div>
                )}
                {authTestResult && (
                  <div className={`p-2 rounded text-xs border ${authTestResult.test_result === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <p>{authTestResult.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </>
        )}

        {/* Carerix Status: Applications & Webhooks */}
        {showConfig && (carerixApps.length > 0 || carerixWebhooks.length > 0) && (
          <Card className="border-indigo-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                  📡 Carerix Webhook Status
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowRawCarerix(!showRawCarerix)}
                  >
                    {showRawCarerix ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {showRawCarerix ? 'Hide' : 'Show'} Raw JSON
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleLoadCarerixStatus} disabled={loadingCarerixStatus}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${loadingCarerixStatus ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Applications */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Applications ({carerixApps.length})
                  <span className="font-normal text-gray-400 ml-2">
                    — Each application is a container for webhooks in Carerix
                  </span>
                </h4>
                <div className="space-y-1">
                  {carerixApps.map((app, i) => {
                    const appObj = app as Record<string, unknown>;
                    const appId = extractId(appObj);
                    const appName = extractName(appObj);
                    return (
                      <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-800">{appName}</span>
                          <span className="text-gray-400 ml-2">
                            ID: <code className="text-[11px] select-all">{appId || '?'}</code>
                          </span>
                          {showRawCarerix && (
                            <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                              {JSON.stringify(appObj, null, 2)}
                            </pre>
                          )}
                        </div>
                        {appId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                            onClick={() => handleDeleteApplication(appId)}
                            disabled={deletingIds.has(appId)}
                            title="Delete this application"
                          >
                            {deletingIds.has(appId) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Webhooks */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Webhooks ({carerixWebhooks.length})
                  <span className="font-normal text-gray-400 ml-2">
                    — Each webhook listens for specific event types
                  </span>
                </h4>
                {carerixWebhooks.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    ⚠️ No webhooks found. Click &quot;Register&quot; above to create one.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {carerixWebhooks.map((wh, i) => {
                      const whObj = wh as Record<string, unknown>;
                      const whId = extractId(whObj);
                      const whUrl = extractUrl(whObj);
                      const parentAppId = String(whObj._parentAppId || '');
                      const parentAppName = String(whObj._parentAppName || '');
                      const filters = wh.filters || [];
                      const whStatus = extractField(whObj, ['status', '_status']);
                      const isEnabled = !whStatus || whStatus.toLowerCase() !== 'disabled';
                      return (
                        <div key={i} className={`bg-white border rounded px-3 py-2 text-xs ${!isEnabled ? 'border-gray-300 opacity-60' : 'border-gray-200'}`}>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0 space-y-1">
                              {/* Status + URL */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {whStatus && (
                                  <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                    {whStatus}
                                  </Badge>
                                )}
                                <span className="text-gray-500">URL: </span>
                                {whUrl ? (
                                  <>
                                    <code className={`text-[11px] break-all select-all ${
                                      whUrl.includes('$$') || whUrl.includes('BACKEND_DOMAIN')
                                        ? 'text-red-600 line-through'
                                        : 'text-blue-700'
                                    }`}>{whUrl}</code>
                                    {(whUrl.includes('$$') || whUrl.includes('BACKEND_DOMAIN')) && (
                                      <span className="ml-1 text-red-600 font-bold text-[10px]">⚠ BROKEN PLACEHOLDER URL</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic">not available in API response</span>
                                )}
                              </div>
                              {/* ID */}
                              <div>
                                <span className="text-gray-500">ID: </span>
                                <code className="text-[11px] text-gray-600 select-all">{whId || '?'}</code>
                                <span className="text-gray-400 ml-2">
                                  (App: {parentAppName || parentAppId.substring(0, 8) + '...'})
                                </span>
                              </div>
                              {/* Event filters */}
                              {filters.length > 0 && (
                                <div>
                                  <span className="text-gray-500">Events ({filters.length}): </span>
                                  <span className="text-gray-600">
                                    {filters.map(f => f.eventType || '?').join(', ')}
                                  </span>
                                </div>
                              )}
                              {/* Raw JSON toggle */}
                              {showRawCarerix && (
                                <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                                  {JSON.stringify(whObj, null, 2)}
                                </pre>
                              )}
                            </div>
                            {whId && parentAppId && (
                              <div className="flex flex-col gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-6 px-2 text-xs ${isEnabled ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                                  onClick={() => handleToggleWebhook(parentAppId, whId, isEnabled)}
                                  disabled={togglingIds.has(whId)}
                                  title={isEnabled ? 'Disable this webhook' : 'Enable this webhook'}
                                >
                                  {togglingIds.has(whId) ? <Loader2 className="h-3 w-3 animate-spin" /> : (isEnabled ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />)}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteWebhook(parentAppId, whId)}
                                  disabled={deletingIds.has(whId)}
                                  title="Delete this webhook"
                                >
                                  {deletingIds.has(whId) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Diagnostics (collapsible) */}
        {showConfig && showDiagnostics && diagResult && (
          <Card className="border-purple-200">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowDiagnostics(!showDiagnostics)}>
              <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                🔍 Token Diagnostics
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              {diagResult.error && <p className="text-red-600">Error: {diagResult.error}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Tenant:</span> <strong>{diagResult.tenant}</strong></div>
                <div>
                  <span className="text-gray-500">Webhook Client:</span> <code>{diagResult.webhook_client_id}</code>
                  {diagResult.using_dedicated_webhook_client ? ' ✅' : ' ⚠️ not set'}
                </div>
                <div><span className="text-gray-500">General Client:</span> <code>{diagResult.general_client_id}</code></div>
                <div>
                  <span className="text-gray-500">Hosts tried:</span>{' '}
                  {(diagResult.auth_urls_tried || [diagResult.auth_url || '']).map((u, i) => (
                    <code key={i} className="text-[10px] break-all block">{u}</code>
                  ))}
                </div>
              </div>
              {diagResult.token_results && diagResult.token_results.length > 0 && (() => {
                // Group results by auth_url for clarity
                const grouped: Record<string, typeof diagResult.token_results> = {};
                for (const tr of diagResult.token_results!) {
                  const key = tr.auth_url || 'unknown';
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key]!.push(tr);
                }
                const anySuccessPerHost: Record<string, boolean> = {};
                for (const [url, results] of Object.entries(grouped)) {
                  anySuccessPerHost[url] = results!.some(r => r.success);
                }
                return (
                  <div className="mt-3 space-y-3">
                    {Object.entries(grouped).map(([url, results]) => (
                      <div key={url}>
                        <p className="font-medium text-purple-800 mb-1 flex items-center gap-2">
                          {anySuccessPerHost[url] ? '✅' : '❌'}
                          <code className="text-[11px] break-all">{url}</code>
                          {anySuccessPerHost[url]
                            ? <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">Working</Badge>
                            : <Badge variant="secondary" className="text-[10px]">Not working</Badge>}
                        </p>
                        <div className="space-y-0.5 ml-4">
                          {results!.map((tr, i) => (
                            <div key={i} className={`flex items-center gap-2 px-2 py-0.5 rounded ${tr.success ? 'bg-green-50' : 'bg-gray-50'}`}>
                              <span className="text-[11px]">{tr.success ? '✅' : '❌'}</span>
                              <span className="text-purple-600 font-medium text-[11px]">[{tr.client}]</span>
                              <code className="text-gray-600 text-[11px]">{tr.scope_requested}</code>
                              {tr.success && tr.expires_in && <span className="text-green-600 ml-auto text-[10px]">expires: {tr.expires_in}s</span>}
                              {tr.error && <span className="text-red-400 ml-auto text-[10px] truncate max-w-[200px]">{tr.error}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Debug Raw Response (collapsible) */}
        {showConfig && showDebug && debugRawResult && (
          <Card className="border-orange-200">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowDebug(!showDebug)}>
              <CardTitle className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                🔧 Debug: Raw Carerix API Response
                <ChevronDown className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-[10px] text-gray-600 bg-gray-50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                {JSON.stringify(debugRawResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{summary?.total_events || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </CardContent>
          </Card>
          {Object.entries(summary?.by_status || {}).map(([status, count]) => (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize flex items-center justify-center gap-1">
                  {STATUS_ICONS[status]}
                  {status.replace('_', ' ')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Entity breakdown */}
        {summary?.by_entity && Object.keys(summary.by_entity).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Events by Entity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.by_entity).map(([entity, count]) => (
                  <Badge key={entity} variant="secondary" className="text-sm">
                    {entity}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions + Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending_api_access">Pending API Access</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="echo_suppressed">Echo Suppressed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="companies">Companies</SelectItem>
                <SelectItem value="employees">Employees</SelectItem>
                <SelectItem value="crx_vacancies">Vacancies</SelectItem>
                <SelectItem value="crx_publications">Publications</SelectItem>
                <SelectItem value="crx_jobs">Jobs</SelectItem>
                <SelectItem value="crx_matches">Matches</SelectItem>
                <SelectItem value="crx_todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleProcessPending(false)}>
              <Play className="h-4 w-4 mr-1" />
              Process Pending
            </Button>
            {summary?.by_status?.pending_api_access && summary.by_status.pending_api_access > 0 && (
              <Button variant="outline" size="sm" onClick={() => handleProcessPending(true)} className="border-orange-300 text-orange-700 hover:bg-orange-50">
                <KeyRound className="h-4 w-4 mr-1" />
                Reprocess API Access ({summary.by_status.pending_api_access})
              </Button>
            )}
            {summary?.by_status?.failed && summary.by_status.failed > 0 && (
              <Button variant="outline" size="sm" onClick={handleRetryFailed} className="border-red-300 text-red-700 hover:bg-red-50">
                <RotateCcw className="h-4 w-4 mr-1" />
                Retry Failed ({summary.by_status.failed})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReconcileAll}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reconcile All
            </Button>
            {(summary?.total_events || 0) > 50 && (
              <Button variant="ghost" size="sm" onClick={handleCleanupEvents} className="text-gray-500 hover:text-red-600">
                <Trash2 className="h-4 w-4 mr-1" />
                Cleanup
              </Button>
            )}
          </div>
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Recent Events ({events.length})
              <span className="font-normal text-gray-400 ml-2">— Click a row to see the full payload</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 w-8"></th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Entity</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Entity ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Changed Fields</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Received</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No webhook events found</p>
                        <p className="text-xs mt-1">Click &quot;Test Ingestion&quot; to send a test event</p>
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <React.Fragment key={event.id}>
                        <tr
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => toggleEventExpand(event.id)}
                        >
                          <td className="px-4 py-3 text-gray-400">
                            {expandedEvents.has(event.id)
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronRight className="h-3 w-3" />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">#{event.id}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[event.processing_status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_ICONS[event.processing_status]}
                              {event.processing_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs font-normal">{event.entity_type}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{event.entity_id || '—'}</td>
                          <td className="px-4 py-3 text-gray-700 capitalize">{event.event_type}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {event.changed_fields
                              ? <span title={event.changed_fields}>{event.changed_fields.length > 50 ? event.changed_fields.substring(0, 50) + '…' : event.changed_fields}</span>
                              : summarizePayload(event.raw_payload)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{event.created_at ? formatDate(event.created_at) : '—'}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {(event.processing_status === 'failed' || event.processing_status === 'pending' || event.processing_status === 'pending_api_access') && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleRetry(event.id)}>
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </td>
                        </tr>
                        {/* Expanded row: show full payload */}
                        {expandedEvents.has(event.id) && (
                          <tr className="bg-gray-50">
                            <td colSpan={9} className="px-6 py-3">
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                  <div><span className="text-gray-500">Event ID:</span> <code className="text-gray-700 break-all">{event.event_id}</code></div>
                                  <div><span className="text-gray-500">Event Time:</span> {event.event_time || '—'}</div>
                                  <div><span className="text-gray-500">Processed:</span> {event.processed_at ? formatDate(event.processed_at) : '—'}</div>
                                  <div><span className="text-gray-500">Retries:</span> {event.retry_count}</div>
                                </div>
                                {event.changed_fields && (
                                  <div className="mt-1 text-xs">
                                    <span className="text-gray-500 font-medium">Changed fields:</span>{' '}
                                    <span className="text-indigo-700">{event.changed_fields}</span>
                                  </div>
                                )}
                                {event.error_message && (
                                  <div className="bg-red-50 border border-red-100 rounded p-2 text-xs text-red-700">
                                    <span className="font-medium">Error:</span> {event.error_message}
                                  </div>
                                )}
                                {event.raw_payload && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 mb-1">Raw Payload:</p>
                                    <pre className="text-[10px] text-gray-600 bg-white border border-gray-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                      {(() => {
                                        try { return JSON.stringify(JSON.parse(event.raw_payload), null, 2); }
                                        catch { return event.raw_payload; }
                                      })()}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default AdminWebhookDashboard;