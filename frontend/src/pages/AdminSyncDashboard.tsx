import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { client } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Zap,
  BarChart3,
  AlertTriangle,
  Play,
  Filter,
  Bug,
  Wifi,
  WifiOff,
  Search,
  StopCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncLogEntry {
  id: number;
  entity_type: string;
  sync_type: string;
  started_at: string;
  completed_at: string;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_deleted: number;
  records_skipped_unchanged: number;
  sync_status: string;
  error_message: string | null;
  filter_used: string | null;
  carerix_query_time_ms: number;
}

interface SyncStatusEntry {
  entity_type: string;
  last_sync_timestamp: string | null;
  last_full_sync: string | null;
  records_synced: number;
  sync_status: string;
  error_message: string | null;
  total_expected: number;
  current_fetched: number;
  current_upserted: number;
  records_carerix: number;
  records_database: number;
}

interface EntityDebugResult {
  entity_type: string;
  query_name?: string;
  full_fields_ok: boolean;
  minimal_fields_ok: boolean;
  total_elements?: number;
  sample_items?: unknown[];
  full_fields_error?: string | null;
  minimal_fields_error?: string | null;
  query_time_ms?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  "companies",
  "employees",
  "crx_vacancies",
  "crx_publications",
  "crx_jobs",
  "crx_matches",
  "crx_todos",
];

const ENTITY_COLORS: Record<string, string> = {
  companies: "#3b82f6",
  employees: "#10b981",
  crx_vacancies: "#f59e0b",
  crx_publications: "#8b5cf6",
  crx_jobs: "#ef4444",
  crx_matches: "#06b6d4",
  crx_todos: "#ec4899",
};

const ENTITY_LABELS: Record<string, string> = {
  companies: "Companies",
  employees: "Employees",
  crx_vacancies: "Vacancies",
  crx_publications: "Publications",
  crx_jobs: "Jobs",
  crx_matches: "Matches",
  crx_todos: "Todos (Tasks only)",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a date string from the backend.
 * The backend stores timestamps in UTC as ISO 8601 strings (e.g. "2026-04-03T15:28:10Z").
 * Older entries may use "YYYY-MM-DD HH:MM:SS" without a timezone suffix — treat those as UTC too.
 */
function parseBackendDate(dateStr: string): Date {
  // If the string has no timezone indicator, assume UTC by appending 'Z'
  const normalized = dateStr.includes("T") || dateStr.endsWith("Z")
    ? dateStr
    : dateStr.replace(" ", "T") + "Z";
  return new Date(normalized);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  try {
    const d = parseBackendDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = parseBackendDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getProgressPercent(status: SyncStatusEntry): number {
  if (status.sync_status !== "running") return 0;
  if (!status.total_expected || status.total_expected === 0) {
    // If we don't know total yet, show indeterminate-like progress
    return status.current_fetched > 0 ? Math.min(status.current_fetched / 10, 90) : 5;
  }
  const fetchPercent = (status.current_fetched / status.total_expected) * 50;
  const upsertPercent = status.current_fetched > 0
    ? (status.current_upserted / status.current_fetched) * 50
    : 0;
  return Math.min(Math.round(fetchPercent + upsertPercent), 99);
}

function getProgressLabel(status: SyncStatusEntry): string {
  if (status.sync_status !== "running") return "";
  if (status.current_upserted > 0 && status.current_fetched > 0) {
    return `Upserting ${status.current_upserted}/${status.current_fetched} records`;
  }
  if (status.current_fetched > 0) {
    const totalStr = status.total_expected > 0 ? `/${status.total_expected}` : "";
    return `Fetching ${status.current_fetched}${totalStr} records`;
  }
  return "Starting...";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSyncDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [statusEntries, setStatusEntries] = useState<SyncStatusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [filterEntity, setFilterEntity] = useState<string>("all");

  // Debug state
  const [debugResult, setDebugResult] = useState<Record<string, unknown> | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  // Log cleanup state
  const [cleaningLogs, setCleaningLogs] = useState(false);

  // Entity debug state
  const [entityDebugResults, setEntityDebugResults] = useState<EntityDebugResult[]>([]);
  const [entityDebugLoading, setEntityDebugLoading] = useState(false);
  const [showEntityDebug, setShowEntityDebug] = useState(false);

  // ---- Data fetching ----

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, statusRes] = await Promise.all([
        client.apiCall.invoke({
          url: "/api/v1/sync/log?limit=200",
          method: "GET",
        }),
        client.apiCall.invoke({
          url: "/api/v1/sync/status",
          method: "GET",
        }),
      ]);

      const logData = logRes.data as { logs: SyncLogEntry[]; count: number };
      const statusData = statusRes.data as { status: SyncStatusEntry[]; any_running?: boolean };

      setLogs(logData.logs || []);
      setStatusEntries(statusData.status || []);
      setSyncErrors([]);

      // Check if any sync is currently running (e.g. page refresh mid-sync)
      if (statusData.any_running) {
        setSyncing("all");
        startPolling();
      }
    } catch (err: unknown) {
      console.error("Failed to fetch sync data:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncErrors((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Fetch data failed: ${errMsg}`,
      ]);
      toast({
        title: "Error",
        description: "Failed to load sync data. Make sure you are authenticated.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Debug connectivity test ----

  const handleDebugTest = async () => {
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/sync/debug",
        method: "GET",
      });
      setDebugResult(res.data as Record<string, unknown>);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setDebugResult({
        error: true,
        message: `Debug request failed: ${errMsg}`,
        hint: "Make sure you are logged in and the backend is running.",
      });
    } finally {
      setDebugLoading(false);
    }
  };

  // ---- Entity debug test ----

  const handleEntityDebugTest = async () => {
    setEntityDebugLoading(true);
    setEntityDebugResults([]);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/sync/debug-entities",
        method: "GET",
      });
      const data = res.data as { results: EntityDebugResult[] };
      setEntityDebugResults(data.results || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncErrors((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Entity debug failed: ${errMsg}`,
      ]);
    } finally {
      setEntityDebugLoading(false);
    }
  };

  // ---- Graceful stop sync ----

  const [stopping, setStopping] = useState(false);

  const handleStopSync = async () => {
    setStopping(true);
    try {
      await client.apiCall.invoke({
        url: "/api/v1/sync/stop/all",
        method: "POST",
      });
      toast({
        title: "Stop Requested",
        description: "Sync will stop after the current page completes. Please wait...",
      });
      // Keep polling — the sync will finish gracefully and polling will detect completion
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: "Stop Failed",
        description: `Could not send stop signal: ${errMsg}. Try Force Reset instead.`,
        variant: "destructive",
      });
    } finally {
      setStopping(false);
    }
  };

  // ---- Force reset stuck syncs ----

  const [resetting, setResetting] = useState(false);

  const handleForceReset = async () => {
    setResetting(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/sync/force-reset",
        method: "POST",
      });
      const data = res.data as { message?: string; cleared_running_flags?: string[]; reset_db_entities?: string[] };
      stopPolling();
      setSyncing(null);
      toast({
        title: "Sync Reset",
        description: data.message || "All sync flags have been cleared. You can restart syncs now.",
      });
      // Refresh data
      await fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: "Reset Failed",
        description: `Could not reset syncs: ${errMsg}`,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  // ---- Clean up old logs ----

  const handleCleanupLogs = async () => {
    setCleaningLogs(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/sync/log/cleanup?keep_days=30&keep_latest=100",
        method: "DELETE",
      });
      const data = res.data as { deleted?: number; remaining?: number; status?: string };
      toast({
        title: "Logs Cleaned",
        description: `Removed ${data.deleted || 0} old entries. ${data.remaining || 0} remaining.`,
      });
      await fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        title: "Cleanup Failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setCleaningLogs(false);
    }
  };

  // ---- Poll for running status ----

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return; // already polling
    pollIntervalRef.current = setInterval(async () => {
      try {
        const [runningRes, statusRes] = await Promise.all([
          client.apiCall.invoke({ url: "/api/v1/sync/running", method: "GET" }),
          client.apiCall.invoke({ url: "/api/v1/sync/status", method: "GET" }),
        ]);
        const runningData = runningRes.data as { any_running: boolean; running: Record<string, boolean> };
        const statusData = statusRes.data as { status: SyncStatusEntry[] };

        setStatusEntries(statusData.status || []);

        if (!runningData.any_running) {
          // Sync finished — stop polling, refresh all data
          stopPolling();
          setSyncing(null);
          toast({
            title: "Sync completed",
            description: "Background sync has finished. Data refreshed.",
          });
          fetchData();
        }
      } catch {
        // Silently continue polling
      }
    }, 2000); // Poll every 2 seconds for smoother progress updates
  }, [fetchData]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // ---- Trigger sync ----

  const handleTriggerSync = async (entityType: string) => {
    setSyncing(entityType);
    setSyncErrors([]);
    try {
      const url =
        entityType === "all"
          ? "/api/v1/sync/trigger-all"
          : `/api/v1/sync/trigger/${entityType}`;
      const res = await client.apiCall.invoke({ url, method: "POST" });
      const data = res.data as { status?: string; message?: string };

      if (data.status === "already_running") {
        toast({
          title: "Sync already running",
          description: data.message || "A sync is already in progress.",
        });
      } else {
        toast({
          title: "Sync started",
          description: data.message || `Sync for ${entityType} started in background.`,
        });
      }

      // Start polling for completion
      startPolling();
    } catch (err: unknown) {
      console.error("Sync trigger failed:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncErrors((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Sync trigger failed for ${entityType}: ${errMsg}`,
      ]);
      toast({
        title: "Sync request failed",
        description: `Could not trigger sync: ${errMsg}`,
        variant: "destructive",
      });
      setSyncing(null);
    }
  };

  // ---- Computed metrics ----

  const metrics = useMemo(() => {
    const successLogs = logs.filter((l) => l.sync_status === "success" || l.sync_status === "partial");
    const failedLogs = logs.filter((l) => l.sync_status === "error" || l.sync_status === "cancelled");
    const totalQueryTime = successLogs.reduce(
      (sum, l) => sum + (l.carerix_query_time_ms || 0),
      0
    );
    const avgQueryTime =
      successLogs.length > 0 ? Math.round(totalQueryTime / successLogs.length) : 0;
    const totalRecords = successLogs.reduce(
      (sum, l) => sum + l.records_fetched,
      0
    );
    const successRate =
      logs.length > 0
        ? Math.round((successLogs.length / logs.length) * 100)
        : 0;

    return {
      totalSyncs: logs.length,
      successCount: successLogs.length,
      failedCount: failedLogs.length,
      avgQueryTime,
      totalRecords,
      successRate,
    };
  }, [logs]);

  // ---- Chart data: Average query time per entity type ----

  const avgTimeByEntity = useMemo(() => {
    const grouped: Record<string, { total: number; count: number }> = {};
    logs
      .filter((l) => l.sync_status === "success")
      .forEach((l) => {
        if (!grouped[l.entity_type]) {
          grouped[l.entity_type] = { total: 0, count: 0 };
        }
        grouped[l.entity_type].total += l.carerix_query_time_ms || 0;
        grouped[l.entity_type].count += 1;
      });

    return ENTITY_TYPES.map((et) => ({
      entity: ENTITY_LABELS[et] || et,
      entity_type: et,
      avgTime: grouped[et]
        ? Math.round(grouped[et].total / grouped[et].count)
        : 0,
      totalRecords: logs
        .filter((l) => l.entity_type === et && l.sync_status === "success")
        .reduce((sum, l) => sum + l.records_fetched, 0),
      syncCount: grouped[et]?.count || 0,
    }));
  }, [logs]);

  // ---- Chart data: Sync history timeline (last 20 syncs) ----

  const syncTimeline = useMemo(() => {
    const filtered =
      filterEntity === "all"
        ? logs
        : logs.filter((l) => l.entity_type === filterEntity);

    return filtered
      .slice(0, 30)
      .reverse()
      .map((l) => ({
        date: formatShortDate(l.started_at),
        entity: ENTITY_LABELS[l.entity_type] || l.entity_type,
        queryTime: l.carerix_query_time_ms || 0,
        fetched: l.records_fetched,
        created: l.records_created,
        updated: l.records_updated,
        status: l.sync_status,
      }));
  }, [logs, filterEntity]);

  // ---- Chart data: Records per entity (pie chart) ----

  const recordsByEntity = useMemo(() => {
    return statusEntries
      .filter((s) => s.records_synced > 0)
      .map((s) => ({
        name: ENTITY_LABELS[s.entity_type] || s.entity_type,
        value: s.records_synced,
        color: ENTITY_COLORS[s.entity_type] || "#6b7280",
      }));
  }, [statusEntries]);

  // ---- Filtered log table ----

  const filteredLogs = useMemo(() => {
    if (filterEntity === "all") return logs.slice(0, 50);
    return logs.filter((l) => l.entity_type === filterEntity).slice(0, 50);
  }, [logs, filterEntity]);

  // ---- Check if any entity is currently running ----
  const anyEntityRunning = useMemo(() => {
    return statusEntries.some((s) => s.sync_status === "running");
  }, [statusEntries]);

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#222c4a] shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/vacancies")}
              className="text-white/70 hover:text-white hover:bg-white/10 mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Vacancies
            </Button>
            <div className="w-8 h-8 rounded-lg bg-[#fbc134] flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#222c4a]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                Sync Dashboard
              </h1>
              <p className="text-white/50 text-xs">
                Carerix ↔ Atoms Cloud Performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/60 text-sm hidden sm:block">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#222c4a]">
              Sync Performance Metrics
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Monitor Carerix data volume, query times, and backend load
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/operations")}
              className="gap-1.5"
            >
              <Activity className="w-4 h-4" />
              Operations Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/webhook-dashboard")}
              className="gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Webhook Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug(!showDebug)}
              className="gap-1.5"
            >
              <Bug className="w-4 h-4" />
              Debug
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEntityDebug(!showEntityDebug);
                if (!showEntityDebug && entityDebugResults.length === 0) {
                  handleEntityDebugTest();
                }
              }}
              className="gap-1.5"
            >
              <Search className="w-4 h-4" />
              Test Entities
            </Button>
            {(syncing || anyEntityRunning) ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleStopSync}
                  disabled={stopping || resetting}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  {stopping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    <>
                      <StopCircle className="w-4 h-4" />
                      Stop Sync
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceReset}
                  disabled={resetting}
                  className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                >
                  {resetting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Force Reset
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => handleTriggerSync("all")}
                disabled={syncing !== null || anyEntityRunning}
                className="bg-[#222c4a] hover:bg-[#1a2340] text-white gap-1.5"
              >
                <Zap className="w-4 h-4" />
                Sync All Entities
              </Button>
            )}
          </div>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Debug Panel — Carerix Connectivity
                </h3>
              </div>
              <Button
                size="sm"
                onClick={handleDebugTest}
                disabled={debugLoading}
                className="bg-amber-500 hover:bg-amber-600 text-black gap-1.5"
              >
                {debugLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>

            {debugResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    className={`rounded-lg p-3 ${
                      (debugResult as { credentials_configured?: boolean }).credentials_configured
                        ? "bg-green-900/30 border border-green-700"
                        : "bg-red-900/30 border border-red-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                      {(debugResult as { credentials_configured?: boolean }).credentials_configured ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      Credentials
                    </div>
                    <p className="text-xs text-gray-300">
                      {(debugResult as { credentials_configured?: boolean }).credentials_configured
                        ? "CARERIX_CLIENT_ID & SECRET configured"
                        : "Missing API credentials"}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg p-3 ${
                      (debugResult as { token_acquired?: boolean }).token_acquired
                        ? "bg-green-900/30 border border-green-700"
                        : "bg-red-900/30 border border-red-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                      {(debugResult as { token_acquired?: boolean }).token_acquired ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      OAuth Token
                    </div>
                    <p className="text-xs text-gray-300">
                      {(debugResult as { token_acquired?: boolean }).token_acquired
                        ? "Token acquired from Keycloak"
                        : "Token acquisition failed"}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg p-3 ${
                      (debugResult as { graphql_reachable?: boolean }).graphql_reachable
                        ? "bg-green-900/30 border border-green-700"
                        : "bg-red-900/30 border border-red-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                      {(debugResult as { graphql_reachable?: boolean }).graphql_reachable ? (
                        <Wifi className="w-4 h-4 text-green-400" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-400" />
                      )}
                      GraphQL API
                    </div>
                    <p className="text-xs text-gray-300">
                      {(debugResult as { graphql_reachable?: boolean }).graphql_reachable
                        ? "Carerix GraphQL reachable"
                        : "GraphQL unreachable"}
                    </p>
                  </div>
                </div>

                {/* Sample query result */}
                {(debugResult as { sample_query_result?: Record<string, unknown> }).sample_query_result && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">
                      Sample Query Result
                    </p>
                    <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(
                        (debugResult as { sample_query_result: unknown }).sample_query_result,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}

                {/* Errors */}
                {(debugResult as { errors?: string[] }).errors &&
                  ((debugResult as { errors: string[] }).errors).length > 0 && (
                    <div className="bg-red-900/20 rounded-lg p-3 border border-red-800">
                      <p className="text-xs font-semibold text-red-400 mb-1">
                        Errors
                      </p>
                      {((debugResult as { errors: string[] }).errors).map(
                        (err: string, i: number) => (
                          <p key={i} className="text-xs text-red-300">
                            • {err}
                          </p>
                        )
                      )}
                    </div>
                  )}

                {/* Generic error */}
                {(debugResult as { error?: boolean }).error && (
                  <div className="bg-red-900/20 rounded-lg p-3 border border-red-800">
                    <p className="text-xs text-red-300">
                      {(debugResult as { message?: string }).message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(debugResult as { hint?: string }).hint}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Entity Debug Panel */}
        {showEntityDebug && (
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 mb-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Entity Query Diagnostics
                </h3>
              </div>
              <Button
                size="sm"
                onClick={handleEntityDebugTest}
                disabled={entityDebugLoading}
                className="bg-cyan-500 hover:bg-cyan-600 text-black gap-1.5"
              >
                {entityDebugLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing All Entities...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Re-test All
                  </>
                )}
              </Button>
            </div>

            {entityDebugLoading && entityDebugResults.length === 0 && (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Testing each entity type against Carerix API...
              </div>
            )}

            {entityDebugResults.length > 0 && (
              <div className="space-y-3">
                {entityDebugResults.map((r) => (
                  <div
                    key={r.entity_type}
                    className={`rounded-lg p-4 border ${
                      r.full_fields_ok
                        ? "bg-green-900/20 border-green-700"
                        : r.minimal_fields_ok
                        ? "bg-amber-900/20 border-amber-700"
                        : "bg-red-900/20 border-red-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ENTITY_COLORS[r.entity_type] }}
                        />
                        <span className="font-semibold text-sm">
                          {ENTITY_LABELS[r.entity_type] || r.entity_type}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({r.query_name})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.full_fields_ok ? (
                          <Badge className="bg-green-600 text-white text-[10px]">
                            Full Fields OK
                          </Badge>
                        ) : r.minimal_fields_ok ? (
                          <Badge className="bg-amber-600 text-white text-[10px]">
                            Minimal Only
                          </Badge>
                        ) : (
                          <Badge className="bg-red-600 text-white text-[10px]">
                            Failed
                          </Badge>
                        )}
                        {r.total_elements !== undefined && (
                          <span className="text-xs text-gray-300">
                            {r.total_elements.toLocaleString()} records
                          </span>
                        )}
                        {r.query_time_ms !== undefined && (
                          <span className="text-xs text-gray-400">
                            {formatMs(r.query_time_ms)}
                          </span>
                        )}
                      </div>
                    </div>

                    {r.full_fields_error && (
                      <div className="mt-2 bg-black/30 rounded p-2">
                        <p className="text-xs text-red-300 font-mono break-all">
                          {r.full_fields_error.slice(0, 500)}
                        </p>
                      </div>
                    )}
                    {r.minimal_fields_error && (
                      <div className="mt-2 bg-black/30 rounded p-2">
                        <p className="text-xs text-red-300 font-mono break-all">
                          Minimal: {r.minimal_fields_error.slice(0, 500)}
                        </p>
                      </div>
                    )}
                    {r.error && (
                      <div className="mt-2 bg-black/30 rounded p-2">
                        <p className="text-xs text-red-300 font-mono">
                          {r.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync Errors */}
        {syncErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-semibold text-red-700">
                Sync Errors ({syncErrors.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSyncErrors([])}
                className="ml-auto text-red-500 hover:text-red-700 text-xs h-6"
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1">
              {syncErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 font-mono">
                  {err}
                </p>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#407df1] animate-spin" />
            <span className="ml-3 text-gray-500">Loading sync data...</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Total Syncs
                  </p>
                </div>
                <p className="text-3xl font-bold text-[#222c4a]">
                  {metrics.totalSyncs}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {metrics.successCount} successful · {metrics.failedCount}{" "}
                  failed
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Avg Query Time
                  </p>
                </div>
                <p className="text-3xl font-bold text-[#222c4a]">
                  {formatMs(metrics.avgQueryTime)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Per sync operation
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Database className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Total Records
                  </p>
                </div>
                <p className="text-3xl font-bold text-[#222c4a]">
                  {metrics.totalRecords.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Fetched from Carerix
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Success Rate
                  </p>
                </div>
                <p className="text-3xl font-bold text-[#222c4a]">
                  {metrics.successRate}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Sync reliability
                </p>
              </div>
            </div>

            {/* Real-time Progress Section (only visible when syncing) */}
            {anyEntityRunning && (
              <div className="bg-white rounded-xl border-2 border-blue-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider">
                      Sync In Progress
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleStopSync}
                      disabled={stopping || resetting}
                      className="text-amber-600 border-amber-200 hover:bg-amber-50 gap-1.5"
                    >
                      {stopping ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Stopping...
                        </>
                      ) : (
                        <>
                          <StopCircle className="w-3.5 h-3.5" />
                          Stop
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleForceReset}
                      disabled={resetting}
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                    >
                      {resetting ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          Force Reset
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {statusEntries
                    .filter((s) => s.sync_status === "running")
                    .map((s) => {
                      const percent = getProgressPercent(s);
                      const label = getProgressLabel(s);
                      return (
                        <div key={s.entity_type}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: ENTITY_COLORS[s.entity_type],
                                }}
                              />
                              <span className="text-sm font-medium text-[#222c4a]">
                                {ENTITY_LABELS[s.entity_type] || s.entity_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500">
                                {label}
                              </span>
                              <span className="text-xs font-semibold text-blue-600 min-w-[36px] text-right">
                                {percent}%
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={percent}
                            className="h-2.5"
                          />
                        </div>
                      );
                    })}

                  {/* Show completed entities during a sync-all */}
                  {statusEntries
                    .filter(
                      (s) =>
                        s.sync_status === "success" &&
                        anyEntityRunning &&
                        s.last_sync_timestamp
                    )
                    .slice(0, 7)
                    .map((s) => (
                      <div key={`done-${s.entity_type}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: ENTITY_COLORS[s.entity_type],
                              }}
                            />
                            <span className="text-sm font-medium text-[#222c4a]">
                              {ENTITY_LABELS[s.entity_type] || s.entity_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-green-600">
                              ✓ {s.records_synced?.toLocaleString()} records
                            </span>
                            <span className="text-xs font-semibold text-green-600 min-w-[36px] text-right">
                              100%
                            </span>
                          </div>
                        </div>
                        <Progress value={100} className="h-2.5" />
                      </div>
                    ))}

                  {/* Show errored entities during a sync-all */}
                  {statusEntries
                    .filter(
                      (s) => s.sync_status === "error" && anyEntityRunning
                    )
                    .map((s) => (
                      <div key={`err-${s.entity_type}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: ENTITY_COLORS[s.entity_type],
                              }}
                            />
                            <span className="text-sm font-medium text-[#222c4a]">
                              {ENTITY_LABELS[s.entity_type] || s.entity_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-500 truncate max-w-[200px]" title={s.error_message || ""}>
                              ✗ {s.error_message?.slice(0, 60) || "Error"}
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-red-100 overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: "100%" }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Avg Query Time per Entity */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider mb-1">
                  Average Query Time by Entity
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Milliseconds per sync operation
                </p>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={avgTimeByEntity} barSize={32}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0f0f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="entity"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}ms`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`${value}ms`, "Avg Time"]}
                      />
                      <Bar
                        dataKey="avgTime"
                        radius={[6, 6, 0, 0]}
                        fill="#3b82f6"
                      >
                        {avgTimeByEntity.map((entry) => (
                          <Cell
                            key={entry.entity_type}
                            fill={ENTITY_COLORS[entry.entity_type] || "#6b7280"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Records Distribution Pie */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider mb-1">
                  Records per Entity Type
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Current data volume in local database
                </p>
                {recordsByEntity.length > 0 ? (
                  <div className="h-[280px] flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={recordsByEntity}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={{ strokeWidth: 1 }}
                        >
                          {recordsByEntity.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
                    No sync data yet. Trigger a sync to see results.
                  </div>
                )}
              </div>
            </div>

            {/* Sync Timeline Chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider mb-1">
                    Sync History Timeline
                  </h3>
                  <p className="text-xs text-gray-400">
                    Query time and records per sync operation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Select
                    value={filterEntity}
                    onValueChange={setFilterEntity}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      {ENTITY_TYPES.map((et) => (
                        <SelectItem key={et} value={et}>
                          {ENTITY_LABELS[et]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {syncTimeline.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={syncTimeline}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0f0f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="time"
                        orientation="left"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}ms`}
                      />
                      <YAxis
                        yAxisId="records"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                      />
                      <Line
                        yAxisId="time"
                        type="monotone"
                        dataKey="queryTime"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Query Time (ms)"
                      />
                      <Line
                        yAxisId="records"
                        type="monotone"
                        dataKey="fetched"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Records Fetched"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                  No sync history available for the selected filter.
                </div>
              )}
            </div>

            {/* Entity Status Cards */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider mb-4">
                Entity Sync Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ENTITY_TYPES.map((et) => {
                  const status = statusEntries.find(
                    (s) => s.entity_type === et
                  );
                  const entityLogs = logs.filter(
                    (l) => l.entity_type === et && l.sync_status === "success"
                  );
                  const avgTime =
                    entityLogs.length > 0
                      ? Math.round(
                          entityLogs.reduce(
                            (sum, l) => sum + (l.carerix_query_time_ms || 0),
                            0
                          ) / entityLogs.length
                        )
                      : 0;
                  const isRunning = status?.sync_status === "running";
                  const progressPercent = status ? getProgressPercent(status) : 0;

                  return (
                    <div
                      key={et}
                      className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
                        isRunning ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: ENTITY_COLORS[et],
                            }}
                          />
                          <span className="text-sm font-semibold text-[#222c4a]">
                            {ENTITY_LABELS[et]}
                          </span>
                        </div>
                        {status?.sync_status === "success" ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200 bg-green-50 text-[10px]"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        ) : status?.sync_status === "partial" ? (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-200 bg-amber-50 text-[10px]"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Partial
                          </Badge>
                        ) : status?.sync_status === "cancelled" ? (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200 bg-orange-50 text-[10px]"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Cancelled
                          </Badge>
                        ) : status?.sync_status === "error" ? (
                          <Badge
                            variant="outline"
                            className="text-red-600 border-red-200 bg-red-50 text-[10px]"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        ) : isRunning ? (
                          <Badge
                            variant="outline"
                            className="text-blue-600 border-blue-200 bg-blue-50 text-[10px]"
                          >
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            {progressPercent}%
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-gray-400 border-gray-200 text-[10px]"
                          >
                            Pending
                          </Badge>
                        )}
                      </div>

                      {/* Progress bar for running entities */}
                      {isRunning && (
                        <div className="mb-3">
                          <Progress value={progressPercent} className="h-1.5 mb-1" />
                          <p className="text-[10px] text-blue-500">
                            {status ? getProgressLabel(status) : ""}
                          </p>
                        </div>
                      )}

                      {/* Error message */}
                      {status?.sync_status === "error" && status.error_message && (
                        <div className="mb-3 bg-red-50 rounded p-2">
                          <p
                            className="text-[10px] text-red-600 line-clamp-3"
                            title={status.error_message}
                          >
                            {status.error_message.slice(0, 150)}
                            {status.error_message.length > 150 ? "..." : ""}
                          </p>
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Records Carerix</span>
                          <span className="font-medium text-[#222c4a]">
                            {status?.records_carerix?.toLocaleString() || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Records Database</span>
                          <span className={`font-medium ${
                            status?.records_carerix && status?.records_database !== undefined
                              ? status.records_database >= status.records_carerix
                                ? "text-green-600"
                                : "text-amber-600"
                              : "text-[#222c4a]"
                          }`}>
                            {status?.records_database?.toLocaleString() || "0"}
                          </span>
                        </div>
                        {status?.records_carerix !== undefined && status?.records_database !== undefined && status.records_carerix > 0 && (
                          <div className="flex justify-between">
                            <span>Difference</span>
                            <span className={`font-medium ${
                              status.records_carerix - status.records_database === 0
                                ? "text-green-600"
                                : "text-red-500"
                            }`}>
                              {status.records_carerix - status.records_database === 0
                                ? "✓ In sync"
                                : `${(status.records_carerix - status.records_database).toLocaleString()} missing`}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Avg Time</span>
                          <span className="font-medium text-[#222c4a]">
                            {formatMs(avgTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Sync</span>
                          <span className="font-medium text-[#222c4a] text-[10px]">
                            {formatDate(status?.last_sync_timestamp || null)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerSync(et)}
                        disabled={syncing !== null || anyEntityRunning}
                        className="w-full mt-3 gap-1.5 text-xs h-8"
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Sync Now
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sync Log Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider">
                    Sync Audit Log
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Detailed history of all sync operations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {filteredLogs.length} entries
                  </Badge>
                  {logs.length > 50 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCleanupLogs}
                      disabled={cleaningLogs}
                      className="text-xs h-7 gap-1 text-gray-500 hover:text-red-600"
                    >
                      {cleaningLogs ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      Clean Old Logs
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Entity
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Query Time
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Fetched
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Created
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Updated
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                        Unchanged
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-12 text-center text-gray-400"
                        >
                          <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          No sync logs found. Trigger a sync to get started.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    ENTITY_COLORS[log.entity_type] || "#6b7280",
                                }}
                              />
                              <span className="font-medium text-[#222c4a] text-xs">
                                {ENTITY_LABELS[log.entity_type] ||
                                  log.entity_type}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                log.sync_type === "full"
                                  ? "text-purple-600 border-purple-200 bg-purple-50"
                                  : "text-blue-600 border-blue-200 bg-blue-50"
                              }`}
                            >
                              {log.sync_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {log.sync_status === "success" ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Success
                              </span>
                            ) : log.sync_status === "partial" ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Partial
                              </span>
                            ) : log.sync_status === "cancelled" ? (
                              <span className="inline-flex items-center gap-1 text-orange-600 text-xs">
                                <XCircle className="w-3.5 h-3.5" />
                                Cancelled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-xs">
                                <XCircle className="w-3.5 h-3.5" />
                                Error
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-[#222c4a]">
                            {formatMs(log.carerix_query_time_ms || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-[#222c4a]">
                            {log.records_fetched}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-emerald-600">
                            +{log.records_created}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-amber-600">
                            ~{log.records_updated}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            {log.records_skipped_unchanged > 0 ? (
                              <span
                                className="text-gray-400"
                                title={log.filter_used || "Incremental: unchanged records skipped"}
                              >
                                ={log.records_skipped_unchanged}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {formatShortDate(log.started_at)}
                          </td>
                          <td className="px-4 py-3 text-xs text-red-500 max-w-[200px] truncate">
                            {log.error_message ? (
                              <span
                                className="flex items-center gap-1"
                                title={log.error_message}
                              >
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                {log.error_message.slice(0, 60)}
                                {log.error_message.length > 60 ? "..." : ""}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}