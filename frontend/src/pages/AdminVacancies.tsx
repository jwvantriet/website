import { useState, useEffect } from "react";
import { client } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plane,
  Ship,
  Fuel,
  Briefcase,
  MapPin,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowUpFromLine,
  LogOut,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Pencil,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Vacancy {
  id: string;
  title: string;
  industry: string;
  location: string;
  employment_type: string;
  summary: string;
  posted_date: string;
  modification_date: string;
  apply_url: string | null;
}

interface VacancyDetail {
  id: string;
  title: string;
  industry: string;
  location: string;
  employment_type: string;
  summary: string;
  posted_date: string;
  intro_html: string;
  vacancy_html: string;
  requirements_html: string;
  offer_html: string;
  company_html: string;
  contact_html: string;
}

/** Carerix field mapping — shown only in admin preview */
const CARERIX_FIELD_MAP: Record<string, string> = {
  Introduction: "introInformationHTML",
  "Job Description": "vacancyInformationHTML",
  Requirements: "requirementsInformationHTML",
  "What We Offer": "offerInformationHTML",
  "Company Information": "companyInformationHTML",
  Contact: "functionContactInformationHTML",
};

/** Maps section title to the key used in the vacancy detail object */
const SECTION_KEY_MAP: Record<string, keyof VacancyDetail> = {
  Introduction: "intro_html",
  "Job Description": "vacancy_html",
  Requirements: "requirements_html",
  "What We Offer": "offer_html",
  "Company Information": "company_html",
  Contact: "contact_html",
};

const industryIcons: Record<string, typeof Plane> = {
  Aviation: Plane,
  Maritime: Ship,
  Offshore: Fuel,
};

const industryColors: Record<string, string> = {
  Aviation: "bg-blue-50 text-blue-700 border-blue-200",
  Maritime: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Offshore: "bg-amber-50 text-amber-700 border-amber-200",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function AdminVacancies() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Enhancement state
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVacancy, setPreviewVacancy] = useState<{
    original: VacancyDetail | null;
    enhanced: VacancyDetail | null;
    vacancyId: string;
    title: string;
  } | null>(null);

  // Editable enhanced content — admin can tweak before pushing
  const [editedContent, setEditedContent] = useState<Record<string, string>>(
    {}
  );
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const fetchVacancies = async () => {
    setLoading(true);
    try {
      const response = await client.apiCall.invoke({
        url: "/api/v1/vacancies/admin/list",
        method: "GET",
      });
      const data = response.data as { items: Vacancy[]; total: number };
      setVacancies(data.items || []);
    } catch (err) {
      console.error("Failed to fetch vacancies:", err);
      toast({
        title: "Error",
        description: "Failed to load vacancies. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacancies();
  }, []);

  const handleEnhance = async (vacancy: Vacancy) => {
    setEnhancingId(vacancy.id);
    try {
      const response = await client.apiCall.invoke({
        url: `/api/v1/vacancies/admin/enhance/${vacancy.id}`,
        method: "POST",
      });
      const data = response.data as {
        original: VacancyDetail;
        enhanced: VacancyDetail | null;
        ai_enhanced: boolean;
        error?: string;
      };

      if (data.ai_enhanced && data.enhanced) {
        setPreviewVacancy({
          original: data.original,
          enhanced: data.enhanced,
          vacancyId: vacancy.id,
          title: vacancy.title,
        });
        // Initialize editable content from enhanced data
        setEditedContent({
          intro_html: data.enhanced.intro_html || "",
          vacancy_html: data.enhanced.vacancy_html || "",
          requirements_html: data.enhanced.requirements_html || "",
          offer_html: data.enhanced.offer_html || "",
          company_html: data.enhanced.company_html || "",
        });
        setEditingSection(null);
        setPreviewOpen(true);
      } else {
        toast({
          title: "Enhancement Failed",
          description:
            data.error ||
            "AI enhancement could not be completed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Enhancement failed:", err);
      toast({
        title: "Error",
        description: "Failed to enhance vacancy. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEnhancingId(null);
    }
  };

  const handlePushToCarerix = async () => {
    if (!previewVacancy) return;
    const { vacancyId, title } = previewVacancy;

    setPushingId(vacancyId);
    try {
      const response = await client.apiCall.invoke({
        url: `/api/v1/vacancies/admin/push/${vacancyId}`,
        method: "POST",
        data: {
          intro_html: editedContent.intro_html || null,
          vacancy_html: editedContent.vacancy_html || null,
          requirements_html: editedContent.requirements_html || null,
          offer_html: editedContent.offer_html || null,
          company_html: editedContent.company_html || null,
        },
      });
      const data = response.data as {
        push_result: {
          success: boolean;
          error?: string;
          details?: Record<string, string>;
        };
      };

      if (data.push_result?.success) {
        setPushedIds((prev) => new Set(prev).add(vacancyId));
        setPreviewOpen(false);
        setPreviewVacancy(null);
        setEditedContent({});
        toast({
          title: "Success!",
          description: `"${title}" has been pushed to Carerix.`,
        });
        // Refresh the list to get updated data
        fetchVacancies();
      } else {
        const errorMsg =
          data.push_result?.error || "Failed to push to Carerix.";
        const details = data.push_result?.details;
        const graphqlErrors = data.push_result?.graphql_errors;

        // Build a concise, actionable error message
        let description = errorMsg;

        if (graphqlErrors && graphqlErrors.length > 0) {
          const gqlMsgs = graphqlErrors
            .map((e: { message?: string }) => e.message || JSON.stringify(e))
            .join("; ");
          description += `\n\nGraphQL errors: ${gqlMsgs}`;
        } else if (details) {
          // Show per-mutation error details
          const detailLines = Object.entries(details)
            .filter(([, v]) => v !== "Not found in schema")
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
          if (detailLines) {
            description += `\n\nDetails:\n${detailLines}`;
          }
        }

        toast({
          title: "Push Failed",
          description,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Push to Carerix failed:", err);
      toast({
        title: "Error",
        description: "Failed to push to Carerix. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPushingId(null);
    }
  };

  const filteredVacancies = vacancies.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.title.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q) ||
      v.industry.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-[#222c4a] shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#fbc134] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#222c4a]" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">
                Vacancy Enhancer
              </h1>
              <p className="text-white/50 text-xs">Admin Dashboard</p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#222c4a]">
              Manage Vacancies
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Enhance vacancy descriptions with AI and push updates to Carerix
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/sync-dashboard")}
              className="gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/webhook-dashboard")}
              className="gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Webhook Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVacancies}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search vacancies by title, location, or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Total Vacancies
            </p>
            <p className="text-2xl font-bold text-[#222c4a]">
              {vacancies.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Aviation
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {vacancies.filter((v) => v.industry === "Aviation").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Maritime
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {vacancies.filter((v) => v.industry === "Maritime").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Offshore
            </p>
            <p className="text-2xl font-bold text-amber-600">
              {vacancies.filter((v) => v.industry === "Offshore").length}
            </p>
          </div>
        </div>

        {/* Vacancy List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#407df1] animate-spin" />
            <span className="ml-3 text-gray-500">Loading vacancies...</span>
          </div>
        ) : filteredVacancies.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No vacancies found
            </h3>
            <p className="text-gray-400">
              {searchQuery
                ? "Try adjusting your search query."
                : "No vacancies available from Carerix."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVacancies.map((vacancy) => {
              const Icon = industryIcons[vacancy.industry] || Briefcase;
              const colorClass =
                industryColors[vacancy.industry] ||
                "bg-gray-50 text-gray-700 border-gray-200";
              const isPushed = pushedIds.has(vacancy.id);
              const isEnhancing = enhancingId === vacancy.id;

              return (
                <div
                  key={vacancy.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
                        >
                          <Icon className="w-3 h-3" />
                          {vacancy.industry}
                        </span>
                        {isPushed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Pushed
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#222c4a] truncate">
                        {vacancy.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {vacancy.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(vacancy.posted_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          {vacancy.employment_type}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEnhance(vacancy)}
                        disabled={isEnhancing || enhancingId !== null}
                        className="gap-1.5"
                      >
                        {isEnhancing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Enhance with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhancement Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Enhancement Preview
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {previewVacancy?.title}
            </p>
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              You can edit the enhanced text before pushing to Carerix. Click
              &quot;Edit&quot; on any section.
            </p>
          </DialogHeader>

          <Tabs
            defaultValue="enhanced"
            className="flex-1 overflow-hidden flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="original">Original</TabsTrigger>
              <TabsTrigger value="enhanced">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Enhanced (Editable)
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="original" className="mt-0">
                {previewVacancy?.original && (
                  <PreviewContent
                    vacancy={previewVacancy.original}
                    showCarerixFields
                  />
                )}
              </TabsContent>
              <TabsContent value="enhanced" className="mt-0">
                {previewVacancy?.enhanced && (
                  <EditablePreviewContent
                    vacancy={previewVacancy.enhanced}
                    editedContent={editedContent}
                    setEditedContent={setEditedContent}
                    editingSection={editingSection}
                    setEditingSection={setEditingSection}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setPreviewOpen(false);
                setPreviewVacancy(null);
                setEditedContent({});
                setEditingSection(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePushToCarerix}
              disabled={pushingId !== null}
              className="bg-[#222c4a] hover:bg-[#1a2340] text-white gap-1.5"
            >
              {pushingId ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pushing to Carerix...
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="w-4 h-4" />
                  Push to Carerix
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Read-only preview (for Original tab) with Carerix field labels      */
/* ------------------------------------------------------------------ */
function PreviewContent({
  vacancy,
  showCarerixFields = false,
}: {
  vacancy: VacancyDetail;
  showCarerixFields?: boolean;
}) {
  const sections = [
    { title: "Introduction", html: vacancy.intro_html },
    { title: "Job Description", html: vacancy.vacancy_html },
    { title: "Requirements", html: vacancy.requirements_html },
    { title: "What We Offer", html: vacancy.offer_html },
    { title: "Company Information", html: vacancy.company_html },
    { title: "Contact", html: vacancy.contact_html },
  ];

  return (
    <div className="space-y-6 pb-4">
      {sections.map((section) =>
        section.html ? (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider">
                {section.title}
              </h3>
              {showCarerixFields && CARERIX_FIELD_MAP[section.title] && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-[10px] font-mono text-gray-500">
                  <Info className="w-2.5 h-2.5" />
                  {CARERIX_FIELD_MAP[section.title]}
                </span>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none text-gray-600 leading-relaxed
                prose-headings:text-[#222c4a] prose-headings:font-semibold
                prose-a:text-[#407df1] prose-li:marker:text-[#407df1]
                [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                [&_p]:mb-2 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: section.html }}
            />
          </div>
        ) : null
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editable preview (for Enhanced tab)                                 */
/* ------------------------------------------------------------------ */
function EditablePreviewContent({
  vacancy,
  editedContent,
  setEditedContent,
  editingSection,
  setEditingSection,
}: {
  vacancy: VacancyDetail;
  editedContent: Record<string, string>;
  setEditedContent: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editingSection: string | null;
  setEditingSection: (s: string | null) => void;
}) {
  const sections = [
    { title: "Introduction", key: "intro_html" },
    { title: "Job Description", key: "vacancy_html" },
    { title: "Requirements", key: "requirements_html" },
    { title: "What We Offer", key: "offer_html" },
    { title: "Company Information", key: "company_html" },
  ];

  return (
    <div className="space-y-6 pb-4">
      {sections.map((section) => {
        const html = editedContent[section.key] || "";
        if (!html && !(vacancy as Record<string, string>)[section.key]) return null;

        const isEditing = editingSection === section.key;

        return (
          <div key={section.key}>
            {/* Section header with Carerix field label and edit button */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#222c4a] uppercase tracking-wider">
                  {section.title}
                </h3>
                {CARERIX_FIELD_MAP[section.title] && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-[10px] font-mono text-purple-600 border border-purple-200">
                    <Info className="w-2.5 h-2.5" />
                    {CARERIX_FIELD_MAP[section.title]}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setEditingSection(isEditing ? null : section.key)
                }
                className="text-xs gap-1 h-7 px-2"
              >
                {isEditing ? (
                  <>
                    <Eye className="w-3 h-3" />
                    Preview
                  </>
                ) : (
                  <>
                    <Pencil className="w-3 h-3" />
                    Edit
                  </>
                )}
              </Button>
            </div>

            {isEditing ? (
              <textarea
                value={html}
                onChange={(e) =>
                  setEditedContent((prev) => ({
                    ...prev,
                    [section.key]: e.target.value,
                  }))
                }
                className="w-full min-h-[200px] p-3 rounded-lg border border-purple-200 bg-white font-mono text-xs text-gray-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-y"
                placeholder="Enter HTML content..."
              />
            ) : (
              <div
                className="prose prose-sm max-w-none text-gray-600 leading-relaxed
                  prose-headings:text-[#222c4a] prose-headings:font-semibold
                  prose-a:text-[#407df1] prose-li:marker:text-[#407df1]
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                  [&_p]:mb-2 [&_li]:mb-1
                  rounded-lg border border-transparent hover:border-gray-200 p-2 -m-2 transition-colors cursor-pointer"
                onClick={() => setEditingSection(section.key)}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}