import { useState, useEffect, useCallback } from "react";
import { client } from "@/lib/api";
import Layout from "@/components/Layout";
import VacancyCard, { Vacancy } from "@/components/VacancyCard";
import { Search, SlidersHorizontal, Plane, Ship, Fuel, Briefcase, RefreshCw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const INDUSTRIES = [
  { label: "All Industries", value: "all", icon: Briefcase, color: "bg-[#222c4a]" },
  { label: "Aviation", value: "Aviation", icon: Plane, color: "bg-blue-500" },
  { label: "Maritime", value: "Maritime", icon: Ship, color: "bg-emerald-500" },
  { label: "Offshore Energy", value: "Offshore", icon: Fuel, color: "bg-amber-500" },
];

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch vacancies
  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeIndustry !== "all") params.industry = activeIndustry;
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await client.apiCall.invoke({
        url: "/api/v1/vacancies",
        method: "GET",
        data: params,
      });

      const data = response.data as { items: Vacancy[]; total: number; source?: string };
      setVacancies(data.items || []);
      setTotal(data.total || 0);
      setSource(data.source || "");
    } catch (err) {
      console.error("Failed to fetch vacancies:", err);
      setVacancies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeIndustry, debouncedSearch]);

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  // Force refresh from Carerix (invalidates cache)
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await client.apiCall.invoke({
        url: "/api/v1/vacancies/refresh",
        method: "POST",
      });
      await fetchVacancies();
    } catch (err) {
      console.error("Failed to refresh vacancies:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Get unique locations for display
  const locations = [...new Set(vacancies.map((v) => v.location).filter(Boolean))];

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-[#222c4a] py-20 md:py-28 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-[#fbc134] blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#407df1] blur-[120px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">
            Careers
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">
            Open Vacancies
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Explore career opportunities across aviation, maritime, and offshore energy.
            Find your next role with Confair.
          </p>

          {/* Quick stats */}
          {!loading && total > 0 && (
            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Briefcase className="w-4 h-4" />
                <span className="font-semibold text-white">{total}</span> open positions
              </div>
              {locations.length > 0 && (
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span className="font-semibold text-white">{locations.length}</span> locations
                </div>
              )}
              {source === "carerix" && (
                <div className="flex items-center gap-1.5 text-emerald-400/80 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live from Carerix
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Filters & Content */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Filter bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-10 -mt-12 relative z-20">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by job title, keyword, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#407df1] focus:ring-2 focus:ring-[#407df1]/20 outline-none transition-all text-sm"
                />
              </div>

              {/* Industry filters + Refresh */}
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="w-4 h-4 text-gray-400 mr-1 hidden lg:block" />
                {INDUSTRIES.map((ind) => {
                  const Icon = ind.icon;
                  const isActive = activeIndustry === ind.value;
                  return (
                    <button
                      key={ind.value}
                      onClick={() => setActiveIndustry(ind.value)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? `${ind.color} text-white shadow-md`
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {ind.label}
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="ml-2 gap-1.5 rounded-xl"
                  title="Refresh vacancies from Carerix"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {loading
                ? "Loading..."
                : `Showing ${vacancies.length} of ${total} ${total === 1 ? "vacancy" : "vacancies"}`}
              {activeIndustry !== "all" && !loading && (
                <span className="text-gray-400"> in {activeIndustry}</span>
              )}
              {debouncedSearch && !loading && (
                <span className="text-gray-400">
                  {" "}matching &ldquo;{debouncedSearch}&rdquo;
                </span>
              )}
            </p>
          </div>

          {/* Vacancy grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse"
                >
                  <div className="flex justify-between mb-4">
                    <div className="h-6 w-20 bg-gray-200 rounded-full" />
                    <div className="h-4 w-16 bg-gray-100 rounded" />
                  </div>
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-3" />
                  <div className="h-4 w-1/2 bg-gray-100 rounded mb-3" />
                  <div className="h-16 bg-gray-100 rounded mb-4" />
                  <div className="h-4 w-28 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : vacancies.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No vacancies found
              </h3>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                {debouncedSearch || activeIndustry !== "all"
                  ? "No vacancies match your current filters. Try adjusting your search or industry filter."
                  : "There are currently no open vacancies. Please check back later."}
              </p>
              {(debouncedSearch || activeIndustry !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveIndustry("all");
                  }}
                  className="gap-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vacancies.map((vacancy) => (
                <VacancyCard key={vacancy.id} vacancy={vacancy} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}