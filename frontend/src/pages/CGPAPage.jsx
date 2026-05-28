import { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import cgpaService from "../services/cgpaService";
import WebSocketService from "../services/websocketService";
import { toast } from "react-toastify";

// ── Tab Components ────────────────────────────────────────────────────────────
import OverviewTab from "../components/cgpa/OverviewTab";
import SemestersTab from "../components/cgpa/SemestersTab";
import AnalyticsTab from "../components/cgpa/AnalyticsTab";
import CalculatorsTab from "../components/cgpa/CalculatorsTab";
import TargetsTab from "../components/cgpa/TargetsTab";
import WeakSubjectsTab from "../components/cgpa/WeakSubjectsTab";

const TABS = [
  { id: "overview", label: "Overview", icon: OverviewIcon },
  { id: "semesters", label: "Semesters", icon: SemesterIcon },
  { id: "analytics", label: "Analytics", icon: AnalyticsIcon },
  { id: "calculators", label: "Calculators", icon: CalculatorIcon },
  { id: "targets", label: "Goals", icon: TargetIcon },
  { id: "weak", label: "Insights", icon: InsightIcon },
];

export default function CGPAPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const wsRef = useRef(null);
  const { user } = useSelector((s) => s.auth);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, analyticsRes] = await Promise.all([
        cgpaService.getRecord(),
        cgpaService.getAnalytics(),
      ]);
      setProfile(profileRes.data?.data || profileRes.data);
      setAnalytics(analyticsRes.data?.data || analyticsRes.data);
    } catch (err) {
      console.error("Failed to load academic data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // WebSocket real-time sync
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const ws = new WebSocketService();
    wsRef.current = ws;
    ws.connect("/ws/academic/", token);

    ws.on("academic_updated", (data) => {
      toast.info("Academic data updated in real-time");
      setRefreshKey((k) => k + 1);
    });

    ws.on("poll_tick", () => {
      setRefreshKey((k) => k + 1);
    });

    return () => {
      ws.disconnect();
    };
  }, []);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-64 bg-surface-200 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-surface-200 rounded-xl" />
            ))}
          </div>
          <div className="h-80 bg-surface-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Academic Performance</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Track your grades, analyze trends, and set academic goals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live Sync
          </span>
          <button
            onClick={triggerRefresh}
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors"
            title="Refresh data"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-1 overflow-x-auto pb-px scrollbar-hide" aria-label="Academic tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-primary-700 bg-primary-50 border-b-2 border-primary-600"
                  : "text-surface-500 hover:text-surface-700 hover:bg-surface-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === "overview" && (
          <OverviewTab profile={profile} analytics={analytics} />
        )}
        {activeTab === "semesters" && (
          <SemestersTab profile={profile} onRefresh={triggerRefresh} />
        )}
        {activeTab === "analytics" && (
          <AnalyticsTab analytics={analytics} profile={profile} />
        )}
        {activeTab === "calculators" && (
          <CalculatorsTab profile={profile} />
        )}
        {activeTab === "targets" && (
          <TargetsTab onRefresh={triggerRefresh} />
        )}
        {activeTab === "weak" && (
          <WeakSubjectsTab />
        )}
      </div>
    </div>
  );
}

// ── Icon Components ───────────────────────────────────────────────────────────

function OverviewIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SemesterIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function AnalyticsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 5-5" />
    </svg>
  );
}

function CalculatorIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M16 14h0M8 18h2M12 18h6" />
    </svg>
  );
}

function TargetIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function InsightIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  );
}
