import { useState, useEffect, useCallback, useMemo } from "react";
import { client } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Filter,
  GitCompare,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  Settings,
  StopCircle,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineItem {
  source: "sync" | "webhook";
  id: number;
  entity_type: string;
  event_type: string;
  timestamp: string;
  status: string;
  completed_at?: string;
  records_fetched?: number;
  records_created?: number;
  records_updated?: number;
  query_time_ms?: number;
  error_message?: string;
  entity_id?: string;
  processed_at?: string;
  changed_fields?: string;
}

interface ScheduleInfo {
  enabled: boolean;
  sync_time_1: string;
  sync_time_2: string;
  timezone: string;
  next_sync_in_minutes: number;
  next_sync_time: string | null;
  last_scheduled_run: string | null;
}

interface TimelineResponse {
  timeline: TimelineItem[];
  schedule: ScheduleInfo | null;
  hours: number;
  total_items: number;
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
  records_database?: number;
  records_carerix?: number;
  sync_started_at?: string;
  current_phase?: string;
  progress_pct?: number;
  eta_display?: string;
  elapsed_display?: string;
  speed_records_per_min?: number;
}

interface WebhookSummary {
  total_events: number;
  by_status: Record<string, number>;
  by_entity: Record<string, number>;
}

interface CompareEntry {
  entity_type: string;
  carerix_total: number;
  carerix_modified_since_last_sync: number | null;
  local_db_count: number;
  last_sync_timestamp: string | null;
  last_full_sync: string | null;
  sync_status: string | null;
  difference: number;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  crx_todos: "Todos",
};

const ENTITY_TYPES = Object.keys(ENTITY_COLORS);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

function formatMs(ms: number | undefined): string {
  if (!ms) return "\u2014";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCountdown(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "\u2014";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function getProgressPercent(status: SyncStatusEntry): number {
  if (status.sync_status !== "running") return 0;
  if (status.progress_pct && status.progress_pct > 0) return status.progress_pct;
  if (!status.total_expected || status.total_expected === 0) {
    return status.current_fetched > 0 ? Math.min(status.current_fetched / 10, 90) : 5;
  }
  const fetchPct = (status.current_fetched / status.total_expected) * 50;
  const upsertPct = status.current_fetched > 0 ? (status.current_upserted / status.current_fetched) * 50 : 0;
  return Math.min(Math.round(fetchPct + upsertPct), 99);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type TabId = "overview" | "sync" | "reconcile" | "webhooks";

export default function AdminOperationsDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);

  // Timeline data
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [timelineHours, setTimelineHours] = useState<string>("48");

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleInfo | null>(null);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    enabled: true,
    sync_time_1: "06:00",
    sync_time_2: "18:00",
    timezone: "Europe/Amsterdam",
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Sync status
  const [syncStatuses, setSyncStatuses] = useState<SyncStatusEntry[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Full sync toggle per entity
  const [fullSyncFlags, setFullSyncFlags] = useState<Record<string, boolean>>({});

  // Webhook summary
  const [webhookSummary, setWebhookSummary] = useState<WebhookSummary | null>(null);

  // Timeline filter
  const [timelineFilter, setTimelineFilter] = useState<string>("all");

  // Expanded timeline items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Countdown timer
  const [countdownMinutes, setCountdownMinutes] = useState<number | null>(null);

  // Reconciliation
  const [compareData, setCompareData] = useState<CompareEntry[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [reconciling, setReconciling] = useState<string | null>(null);

  // ---- Data fetching ----

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await client.apiCall.invoke({
        url: `/api/v1/operations/timeline?hours=${timelineHours}`,
        method: "GET",
      });
      const data = res.data as TimelineResponse;
      setTimelineData(data);
      if (data.schedule) {
        setSchedule(data.schedule);
        setCountdownMinutes(data.schedule.next_sync_in_minutes);
        if (!editingSchedule) {
          setScheduleForm({
            enabled: data.schedule.enabled,
            sync_time_1: data.schedule.sync_time_1,
            sync_time_2: data.schedule.sync_time_2,
            timezone: data.schedule.timezone,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
    }
  }, [timelineHours, editingSchedule]);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/sync/status",
        method: "GET",
      });
      const data = res.data as { status: SyncStatusEntry[]; any_running?: boolean };
      setSyncStatuses(data.status || []);
      if (data.any_running) {
        setSyncing("all");
      }
    } catch (err) {
      console.error("Failed to fetch sync status:", err);
    }
  }, []);

  const fetchWebhookSummary = useCallback(async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/webhooks/dashboard?limit=1",
        method: "GET",
      });
      const data = res.data as { summary: WebhookSummary };
      setWebhookSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to fetch webhook summary:", err);
    }
  }, []);

  const fetchCompare = useCallback(async () => {
    setCompareLoading(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/sync/compare",
        method: "GET",
      });
      const data = res.data as { comparison: CompareEntry[] };
      setCompareData(data.comparison || []);
    } catch (err) {
      console.error("Failed to fetch compare data:", err);
      toast({ title: "Error", description: "Could not fetch comparison data.", variant: "destructive" });
    } finally {
      setCompareLoading(false);
    }
  }, [toast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTimeline(), fetchSyncStatus(), fetchWebhookSummary()]);
    setLoading(false);
  }, [fetchTimeline, fetchSyncStatus, fetchWebhookSummary]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (activeTab === "reconcile") {
      fetchCompare();
    }
  }, [activeTab, fetchCompare]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTimeline();
      fetchSyncStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchTimeline, fetchSyncStatus]);

  useEffect(() => {
    if (countdownMinutes === null) return;
    const interval = setInterval(() => {
      setCountdownMinutes((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 60000);
    return () => clearInterval(interval);
  }, [countdownMinutes]);

  // ---- Actions ----

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/sync/schedule",
        method: "PUT",
        body: scheduleForm,
      });
      const data = res.data as ScheduleInfo;
      setSchedule(data);
      setCountdownMinutes(data.next_sync_in_minutes);
      setEditingSchedule(false);
      toast({ title: "Schedule Updated", description: "Sync schedule saved successfully." });
    } catch (err) {
      console.error("Failed to save schedule:", err);
      toast({ title: "Error", description: "Failed to save schedule.", variant: "destructive" });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleTriggerSync = async (entityType: string, fullSync?: boolean) => {
    const isFullSync = fullSync ?? (fullSyncFlags[entityType] || false);
    setSyncing(entityType);
    try {
      const url =
        entityType === "all"
          ? `/api/v1/sync/trigger-all?full=${isFullSync}`
          : `/api/v1/sync/trigger/${entityType}?full=${isFullSync}`;
      await client.apiCall.invoke({ url, method: "POST" });
      toast({
        title: `${isFullSync ? "Full" : "Incremental"} Sync Started`,
        description: `${isFullSync ? "Full" : "Incremental"} sync for ${entityType === "all" ? "all entities" : ENTITY_LABELS[entityType] || entityType} started.`,
      });
      const pollInterval = setInterval(async () => {
        try {
          const res = await client.apiCall.invoke({
            url: "/api/v1/sync/running",
            method: "GET",
          });
          const data = res.data as { any_running: boolean };
          await fetchSyncStatus();
          if (!data.any_running) {
            clearInterval(pollInterval);
            setSyncing(null);
            toast({ title: "Sync Complete", description: "Background sync has finished." });
            fetchTimeline();
          }
        } catch {
          // continue polling
        }
      }, 3000);
    } catch (err) {
      console.error("Sync trigger failed:", err);
      toast({ title: "Sync Failed", description: "Could not trigger sync.", variant: "destructive" });
      setSyncing(null);
    }
  };

  const handleStopSync = async () => {
    try {
      await client.apiCall.invoke({ url: "/api/v1/sync/stop/all", method: "POST" });
      toast({ title: "Stop Requested", description: "Sync will stop after current page." });
    } catch {
      toast({ title: "Error", description: "Could not stop sync.", variant: "destructive" });
    }
  };

  const handleForceReset = async () => {
    try {
      await client.apiCall.invoke({ url: "/api/v1/sync/force-reset", method: "POST" });
      setSyncing(null);
      toast({ title: "Reset Complete", description: "All sync flags cleared." });
      fetchAll();
    } catch {
      toast({ title: "Error", description: "Could not reset syncs.", variant: "destructive" });
    }
  };

  const handleProcessWebhooks = async () => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/webhooks/process-pending",
        method: "POST",
      });
      const data = res.data as { count?: number };
      toast({
        title: "Processing Started",
        description: `${data?.count || 0} webhook events queued.`,
      });
      setTimeout(() => {
        fetchTimeline();
        fetchWebhookSummary();
      }, 2000);
    } catch {
      toast({ title: "Error", description: "Could not process webhooks.", variant: "destructive" });
    }
  };

  const handleReconcile = async (entityType: string) => {
    setReconciling(entityType);
    try {
      const url =
        entityType === "all"
          ? "/api/v1/webhooks/reconcile-all"
          : `/api/v1/webhooks/reconcile/${entityType}`;
      await client.apiCall.invoke({ url, method: "POST" });
      toast({
        title: "Reconciliation Complete",
        description: `Reconciliation for ${entityType === "all" ? "all entities" : ENTITY_LABELS[entityType] || entityType} finished.`,
      });
      fetchCompare();
    } catch (err) {
      console.error("Reconciliation failed:", err);
      toast({ title: "Reconciliation Failed", description: "Could not complete reconciliation.", variant: "destructive" });
    } finally {
      setReconciling(null);
    }
  };

  // ---- Computed ----

  const anyRunning = useMemo(
    () => syncStatuses.some((s) => s.sync_status === "running"),
    [syncStatuses]
  );

  const filteredTimeline = useMemo(() => {
    if (!timelineData?.timeline) return [];
    if (timelineFilter === "all") return timelineData.timeline;
    if (timelineFilter === "sync")
      return timelineData.timeline.filter((t) => t.source === "sync");
    if (timelineFilter === "webhook")
      return timelineData.timeline.filter((t) => t.source === "webhook");
    return timelineData.timeline.filter((t) => t.entity_type === timelineFilter);
  }, [timelineData, timelineFilter]);

  const syncMetrics = useMemo(() => {
    const syncs = (timelineData?.timeline || []).filter((t) => t.source === "sync");
    const webhooks = (timelineData?.timeline || []).filter((t) => t.source === "webhook");
    const successSyncs = syncs.filter((s) => s.status === "success" || s.status === "partial");
    const failedSyncs = syncs.filter((s) => s.status === "error" || s.status === "cancelled");
    const fullSyncs = syncs.filter((s) => s.event_type === "full");
    const incrSyncs = syncs.filter((s) => s.event_type === "incremental");
    const completedWebhooks = webhooks.filter((w) => w.status === "completed");
    const pendingWebhooks = webhooks.filter(
      (w) => w.status === "pending" || w.status === "pending_api_access"
    );
    return {
      totalSyncs: syncs.length,
      successSyncs: successSyncs.length,
      failedSyncs: failedSyncs.length,
      fullSyncs: fullSyncs.length,
      incrSyncs: incrSyncs.length,
      totalWebhooks: webhooks.length,
      completedWebhooks: completedWebhooks.length,
      pendingWebhooks: pendingWebhooks.length,
    };
  }, [timelineData]);

  const totalDifference = useMemo(() => {
    return compareData.reduce((sum, c) => sum + Math.abs(c.difference), 0);
  }, [compareData]);

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFullSync = (entityType: string) => {
    setFullSyncFlags((prev) => ({ ...prev, [entityType]: !prev[entityType] }));
  };

  // ---- Render helpers ----

  const renderStatusBadge = (source: string, status: string) => {
    if (source === "sync") {
      const map: Record<string, string> = {
        success: "bg-green-100 text-green-700 border-green-200",
        partial: "bg-amber-100 text-amber-700 border-amber-200",
        error: "bg-red-100 text-red-700 border-red-200",
        cancelled: "bg-orange-100 text-orange-700 border-orange-200",
        running: "bg-blue-100 text-blue-700 border-blue-200",
      };
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}
        >
          {status === "success" && <CheckCircle2 className="w-3 h-3" />}
          {status === "error" && <XCircle className="w-3 h-3" />}
          {status === "running" && <Loader2 className="w-3 h-3 animate-spin" />}
          {status}
        </span>
      );
    }
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-700 border-green-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      failed: "bg-red-100 text-red-700 border-red-200",
      processing: "bg-blue-100 text-blue-700 border-blue-200",
      pending_api_access: "bg-orange-100 text-orange-700 border-orange-200",
      duplicate: "bg-gray-100 text-gray-500 border-gray-200",
      echo_suppressed: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}
      >
        {status === "completed" && <CheckCircle2 className="w-3 h-3" />}
        {status === "failed" && <XCircle className="w-3 h-3" />}
        {status === "pending" && <Clock className="w-3 h-3" />}
        {status.replace("_", " ")}
      </span>
    );
  };

  const renderSyncTypeBadge = (eventType: string) => {
    if (eventType === "full") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
          FULL
        </span>
      );
    }
    if (eventType === "incremental") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-100 text-cyan-700 border border-cyan-200">
          INCR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
        {eventType}
      </span>
    );
  };

  // ---- Tab: Overview ----

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Schedule + Countdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Sync Countdown */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Timer className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                  Next Scheduled Sync
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {schedule?.enabled ? formatCountdown(countdownMinutes) : "Disabled"}
                </p>
              </div>
            </div>
            {schedule?.next_sync_time && schedule.enabled && (
              <p className="text-xs text-blue-500">{formatDate(schedule.next_sync_time)}</p>
            )}
            {schedule?.last_scheduled_run && (
              <p className="text-xs text-gray-400 mt-1">
                Last auto-sync: {formatRelative(schedule.last_scheduled_run)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Schedule Config */}
        <Card className="border-indigo-200 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sync Schedule
              </CardTitle>
              {!editingSchedule ? (
                <Button variant="outline" size="sm" onClick={() => setEditingSchedule(true)} className="text-xs h-7">
                  <Settings className="w-3 h-3 mr-1" />
                  Configure
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveSchedule}
                    disabled={savingSchedule}
                    className="text-xs h-7 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {savingSchedule && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingSchedule(false)} className="text-xs h-7">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingSchedule ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Enabled</label>
                  <Switch
                    checked={scheduleForm.enabled}
                    onCheckedChange={(v) => setScheduleForm((p) => ({ ...p, enabled: v }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Sync Time 1</label>
                  <Input
                    type="time"
                    value={scheduleForm.sync_time_1}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, sync_time_1: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Sync Time 2</label>
                  <Input
                    type="time"
                    value={scheduleForm.sync_time_2}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, sync_time_2: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Timezone</label>
                  <Select
                    value={scheduleForm.timezone}
                    onValueChange={(v) => setScheduleForm((p) => ({ ...p, timezone: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Amsterdam">Europe/Amsterdam</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${schedule?.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-gray-600">{schedule?.enabled ? "Active" : "Disabled"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono text-xs">{schedule?.sync_time_1 || "06:00"}</span>
                  <span className="text-gray-300">|</span>
                  <span className="font-mono text-xs">{schedule?.sync_time_2 || "18:00"}</span>
                </div>
                <span className="text-xs text-gray-400">{schedule?.timezone || "Europe/Amsterdam"}</span>
              </div>
            )}

            {/* Visual daily timeline bar */}
            {!editingSchedule && (
              <div className="mt-4">
                <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  {[0, 6, 12, 18].map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-gray-200"
                      style={{ left: `${(h / 24) * 100}%` }}
                    >
                      <span className="absolute -top-0.5 left-1 text-[9px] text-gray-400">
                        {h.toString().padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                  {[schedule?.sync_time_1, schedule?.sync_time_2].map((t, i) => {
                    if (!t) return null;
                    const [h, m] = t.split(":").map(Number);
                    const pct = ((h * 60 + m) / (24 * 60)) * 100;
                    return (
                      <div
                        key={i}
                        className="absolute top-1 bottom-1 w-1 rounded-full bg-blue-500"
                        style={{ left: `${pct}%` }}
                        title={`Sync at ${t}`}
                      >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <Zap className="w-3 h-3 text-blue-600" />
                        </div>
                      </div>
                    );
                  })}
                  {(() => {
                    const now = new Date();
                    const pct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
                    return (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${pct}%` }}>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] text-red-500 font-bold">
                          NOW
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{syncMetrics.totalSyncs}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Syncs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mx-auto mb-2">
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-700">{syncMetrics.fullSyncs}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Full</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center mx-auto mb-2">
              <RefreshCw className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-cyan-700">{syncMetrics.incrSyncs}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Incremental</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-700">{syncMetrics.successSyncs}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700">{syncMetrics.failedSyncs}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{syncMetrics.totalWebhooks}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{syncMetrics.completedWebhooks}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700">{syncMetrics.pendingWebhooks}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Running Sync Progress */}
      {anyRunning && (
        <Card className="border-2 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <h3 className="text-sm font-semibold text-gray-900">Sync In Progress</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopSync}
                  className="text-amber-600 border-amber-200 h-7 text-xs"
                >
                  <StopCircle className="w-3 h-3 mr-1" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleForceReset}
                  className="text-red-600 border-red-200 h-7 text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Force Reset
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {syncStatuses
                .filter((s) => s.sync_status === "running")
                .map((s) => {
                  const pct = getProgressPercent(s);
                  return (
                    <div key={s.entity_type}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: ENTITY_COLORS[s.entity_type] }}
                          />
                          <span className="text-sm font-medium">
                            {ENTITY_LABELS[s.entity_type] || s.entity_type}
                          </span>
                          {s.eta_display && (
                            <span className="text-[10px] text-gray-400">ETA: {s.eta_display}</span>
                          )}
                          {s.elapsed_display && (
                            <span className="text-[10px] text-gray-400">({s.elapsed_display})</span>
                          )}
                        </div>
                        <span className="text-xs text-blue-600 font-semibold">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Timeline
              <Badge variant="outline" className="text-[10px] ml-2">
                Last {timelineHours}h
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <Select value={timelineFilter} onValueChange={setTimelineFilter}>
                <SelectTrigger className="w-[140px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="sync">Syncs Only</SelectItem>
                  <SelectItem value="webhook">Webhooks Only</SelectItem>
                  {ENTITY_TYPES.map((et) => (
                    <SelectItem key={et} value={et}>
                      {ENTITY_LABELS[et]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timelineHours} onValueChange={setTimelineHours}>
                <SelectTrigger className="w-[90px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTimeline.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity in the selected time range</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredTimeline.slice(0, 80).map((item) => {
                const key = `${item.source}-${item.id}`;
                const isExpanded = expandedItems.has(key);
                return (
                  <div key={key}>
                    <div
                      className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(key)}
                    >
                      {/* Source indicator */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          item.source === "sync" ? "bg-blue-100" : "bg-amber-100"
                        }`}
                      >
                        {item.source === "sync" ? (
                          <Database className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                        )}
                      </div>

                      {/* Entity color dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ENTITY_COLORS[item.entity_type] || "#6b7280" }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-800">
                            {ENTITY_LABELS[item.entity_type] || item.entity_type}
                          </span>
                          {/* Sync type badge */}
                          {item.source === "sync" && renderSyncTypeBadge(item.event_type)}
                          {item.source === "sync" && item.records_fetched !== undefined && (
                            <span className="text-[10px] text-gray-400">
                              {"\u00B7"} {item.records_fetched} records
                            </span>
                          )}
                          {item.source === "webhook" && (
                            <span className="text-[10px] text-gray-400">
                              {item.event_type}
                            </span>
                          )}
                          {item.source === "webhook" && item.entity_id && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              #{item.entity_id}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      {renderStatusBadge(item.source, item.status)}

                      {/* Time */}
                      <span className="text-[10px] text-gray-400 shrink-0 w-16 text-right">
                        {formatRelative(item.timestamp)}
                      </span>

                      {/* Expand icon */}
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400">Time:</span>{" "}
                            <span className="text-gray-700">{formatDate(item.timestamp)}</span>
                          </div>
                          {item.source === "sync" && (
                            <>
                              <div>
                                <span className="text-gray-400">Type:</span>{" "}
                                <span className="text-gray-700 font-semibold capitalize">{item.event_type}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Query Time:</span>{" "}
                                <span className="text-gray-700">{formatMs(item.query_time_ms)}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Created:</span>{" "}
                                <span className="text-emerald-600">+{item.records_created || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Updated:</span>{" "}
                                <span className="text-amber-600">~{item.records_updated || 0}</span>
                              </div>
                              {item.completed_at && (
                                <div>
                                  <span className="text-gray-400">Completed:</span>{" "}
                                  <span className="text-gray-700">{formatDate(item.completed_at)}</span>
                                </div>
                              )}
                            </>
                          )}
                          {item.source === "webhook" && (
                            <>
                              <div>
                                <span className="text-gray-400">Entity ID:</span>{" "}
                                <span className="font-mono text-gray-700">{item.entity_id || "\u2014"}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Processed:</span>{" "}
                                <span className="text-gray-700">{formatDate(item.processed_at)}</span>
                              </div>
                              {item.changed_fields && (
                                <div>
                                  <span className="text-gray-400">Changed:</span>{" "}
                                  <span className="text-indigo-600">{item.changed_fields}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {item.error_message && (
                          <div className="mt-2 bg-red-50 border border-red-100 rounded p-2 text-xs text-red-600">
                            {item.error_message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ---- Tab: Sync Details ----

  const renderSyncTab = () => (
    <div className="space-y-6">
      {/* Global full sync toggle */}
      <Card className="border-indigo-200 bg-indigo-50/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Sync All Entities</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Trigger a sync for all entity types at once
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Full sync:</span>
                <Switch
                  checked={fullSyncFlags["all"] || false}
                  onCheckedChange={() => toggleFullSync("all")}
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleTriggerSync("all")}
                disabled={syncing !== null || anyRunning}
                className="bg-[#222c4a] hover:bg-[#1a2340] text-white h-8 text-xs"
              >
                {anyRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 mr-1" />
                    {fullSyncFlags["all"] ? "Full Sync All" : "Incremental Sync All"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ENTITY_TYPES.map((et) => {
          const status = syncStatuses.find((s) => s.entity_type === et);
          const isRunning = status?.sync_status === "running";
          const pct = status ? getProgressPercent(status) : 0;
          const isFullMode = fullSyncFlags[et] || false;

          return (
            <Card
              key={et}
              className={`hover:shadow-md transition-shadow ${
                isRunning ? "border-blue-300 ring-1 ring-blue-200" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ENTITY_COLORS[et] }}
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {ENTITY_LABELS[et]}
                    </span>
                  </div>
                  {renderStatusBadge("sync", status?.sync_status || "idle")}
                </div>

                {isRunning && (
                  <div className="mb-3">
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">
                        {status?.current_phase || "syncing"}
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold">{pct}%</span>
                    </div>
                  </div>
                )}

                {status?.sync_status === "error" && status.error_message && (
                  <div className="mb-3 bg-red-50 rounded p-2">
                    <p className="text-[10px] text-red-600 line-clamp-2">{status.error_message}</p>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Carerix</span>
                    <span className="font-medium text-gray-800">
                      {status?.records_carerix?.toLocaleString() || "\u2014"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Database</span>
                    <span
                      className={`font-medium ${
                        status?.records_carerix && status?.records_database !== undefined && status.records_database >= status.records_carerix
                          ? "text-green-600"
                          : status?.records_carerix
                            ? "text-amber-600"
                            : "text-gray-800"
                      }`}
                    >
                      {status?.records_database?.toLocaleString() || "0"}
                    </span>
                  </div>
                  {status?.records_carerix !== undefined && status?.records_database !== undefined && status.records_carerix > 0 && (
                      <div className="flex justify-between">
                        <span>Diff</span>
                        <span
                          className={`font-medium ${
                            status.records_carerix - status.records_database === 0
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {status.records_carerix - status.records_database === 0
                            ? "\u2713 In sync"
                            : `${(status.records_carerix - status.records_database).toLocaleString()} missing`}
                        </span>
                      </div>
                    )}

                  {/* Modification dates */}
                  <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Sync</span>
                      <span className="font-medium text-gray-700 text-[10px]">
                        {formatRelative(status?.last_sync_timestamp)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Full Sync</span>
                      <span className="font-medium text-gray-700 text-[10px]">
                        {formatRelative(status?.last_full_sync)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sync controls: full/incremental toggle + button */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Full sync</span>
                    <Switch
                      checked={isFullMode}
                      onCheckedChange={() => toggleFullSync(et)}
                      className="scale-75"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTriggerSync(et)}
                    disabled={syncing !== null || anyRunning}
                    className="w-full text-xs h-7"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        {isFullMode ? "Full Sync" : "Incremental Sync"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick link to full sync dashboard */}
      <div className="text-center">
        <Button
          variant="link"
          onClick={() => navigate("/admin/sync-dashboard")}
          className="text-sm text-blue-600"
        >
          Open Full Sync Dashboard (charts, audit log) {"\u2192"}
        </Button>
      </div>
    </div>
  );

  // ---- Tab: Reconcile ----

  const renderReconcileTab = () => (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                <GitCompare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-purple-900">
                  DB vs Carerix Reconciliation
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Compare local database counts against live Carerix records and reconcile differences
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCompare}
                disabled={compareLoading}
                className="text-xs h-7"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${compareLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => handleReconcile("all")}
                disabled={reconciling !== null}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
              >
                {reconciling === "all" ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Reconciling...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-3 h-3 mr-1" />
                    Reconcile All
                  </>
                )}
              </Button>
            </div>
          </div>
          {totalDifference > 0 && (
            <div className="mt-3 bg-amber-100 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-800 font-medium">
                {totalDifference} total record difference detected across all entities
              </span>
            </div>
          )}
          {totalDifference === 0 && compareData.length > 0 && (
            <div className="mt-3 bg-green-100 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-800 font-medium">
                All entities are in sync with Carerix
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {compareLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <span className="ml-3 text-gray-500 text-sm">Fetching live Carerix counts...</span>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Entity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Carerix Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Modified Since Sync</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Local DB</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Difference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Last Sync</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Last Full Sync</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {compareData.map((entry) => (
                    <tr key={entry.entity_type} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: ENTITY_COLORS[entry.entity_type] || "#6b7280" }}
                          />
                          <span className="text-xs font-semibold text-gray-900">
                            {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                          </span>
                          {entry.sync_status && renderStatusBadge("sync", entry.sync_status)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">
                        {entry.carerix_total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {entry.carerix_modified_since_last_sync !== null ? (
                          <span className={entry.carerix_modified_since_last_sync > 0 ? "text-amber-600 font-semibold" : "text-gray-500"}>
                            {entry.carerix_modified_since_last_sync.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-700">
                        {entry.local_db_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            entry.difference === 0
                              ? "text-green-600"
                              : entry.difference > 0
                                ? "text-red-600"
                                : "text-amber-600"
                          }`}
                        >
                          {entry.difference === 0 ? "\u2713 0" : entry.difference > 0 ? `+${entry.difference}` : entry.difference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatRelative(entry.last_sync_timestamp)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatRelative(entry.last_full_sync)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReconcile(entry.entity_type)}
                          disabled={reconciling !== null}
                          className="text-[10px] h-6 px-2"
                        >
                          {reconciling === entry.entity_type ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <GitCompare className="w-3 h-3 mr-1" />
                              Reconcile
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ---- Tab: Webhooks ----

  const renderWebhooksTab = () => (
    <div className="space-y-6">
      {/* Webhook Summary Cards */}
      {webhookSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{webhookSummary.total_events}</p>
              <p className="text-[10px] text-gray-400 uppercase">Total</p>
            </CardContent>
          </Card>
          {Object.entries(webhookSummary.by_status).map(([status, count]) => (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-[10px] text-gray-400 uppercase capitalize">
                  {status.replace("_", " ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Entity breakdown */}
      {webhookSummary?.by_entity && Object.keys(webhookSummary.by_entity).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-600 mb-2">Events by Entity</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(webhookSummary.by_entity).map(([entity, count]) => (
                <Badge key={entity} variant="secondary" className="text-xs">
                  {ENTITY_LABELS[entity] || entity}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleProcessWebhooks}>
          <Play className="w-4 h-4 mr-1" />
          Process Pending
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/webhook-dashboard")}>
          <Settings className="w-4 h-4 mr-1" />
          Full Webhook Dashboard
        </Button>
      </div>

      {/* Webhook timeline (filtered) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-900">Recent Webhook Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const webhookItems = (timelineData?.timeline || []).filter((t) => t.source === "webhook");
            if (webhookItems.length === 0) {
              return (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Zap className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No webhook events in the last {timelineHours} hours
                </div>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Entity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Event</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {webhookItems.slice(0, 30).map((item) => (
                      <tr key={`wh-${item.id}`} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: ENTITY_COLORS[item.entity_type] || "#6b7280" }}
                            />
                            <span className="text-xs font-medium">
                              {ENTITY_LABELS[item.entity_type] || item.entity_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">
                          {item.entity_id || "\u2014"}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600 capitalize">{item.event_type}</td>
                        <td className="px-4 py-2">{renderStatusBadge("webhook", item.status)}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">{formatRelative(item.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );

  // ---- Main render ----

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#222c4a] shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/vacancies")}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Admin
            </Button>
            <div className="w-8 h-8 rounded-lg bg-[#fbc134] flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#222c4a]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">Operations Dashboard</h1>
              <p className="text-white/40 text-[10px]">Carerix Sync & Webhooks</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-xs hidden sm:block">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchAll()}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-14 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1">
            {(
              [
                { id: "overview" as TabId, label: "Overview", icon: Activity },
                { id: "sync" as TabId, label: "Sync Details", icon: Database },
                { id: "reconcile" as TabId, label: "Reconcile", icon: GitCompare },
                { id: "webhooks" as TabId, label: "Webhooks", icon: Zap },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#222c4a] text-[#222c4a]"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "webhooks" && webhookSummary?.by_status?.pending !== undefined && webhookSummary.by_status.pending > 0 && (
                    <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 ml-1">
                      {webhookSummary.by_status.pending}
                    </Badge>
                  )}
                {tab.id === "sync" && anyRunning && (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-1" />
                )}
                {tab.id === "reconcile" && totalDifference > 0 && (
                  <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0 ml-1">
                    {totalDifference}
                  </Badge>
                )}
              </button>
            ))}

            {/* Quick actions in tab bar */}
            <div className="ml-auto flex items-center gap-2 py-2">
              {anyRunning ? (
                <Button
                  size="sm"
                  onClick={handleStopSync}
                  className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
                >
                  <StopCircle className="w-3 h-3 mr-1" />
                  Stop Sync
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleTriggerSync("all")}
                  disabled={syncing !== null}
                  className="bg-[#222c4a] hover:bg-[#1a2340] text-white h-7 text-xs"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Sync All
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="ml-3 text-gray-500">Loading operations data...</span>
          </div>
        ) : (
          <>
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "sync" && renderSyncTab()}
            {activeTab === "reconcile" && renderReconcileTab()}
            {activeTab === "webhooks" && renderWebhooksTab()}
          </>
        )}
      </div>
    </div>
  );
}
