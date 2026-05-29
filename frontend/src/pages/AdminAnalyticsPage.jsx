import { useState, useEffect, useRef } from "react";
import adminService from "../services/adminService";
import { useAdminWebSocket } from "../hooks/useAdminWebSocket";

/* Simple SVG chart components (no external deps) */
function MiniBarChart({ data, color = "#3B82F6", height = 120 }) {
  if (!data || data.length === 0) return <div className="h-20 flex items-center justify-center text-xs text-surface-400">No data</div>;
  const max = Math.max(...data.map((d) => d.count || 0), 1);
  const barWidth = Math.max(4, Math.min(20, (300 / data.length) - 2));
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${data.length * (barWidth + 2)} ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = ((d.count || 0) / max) * (height - 20);
        return <rect key={i} x={i * (barWidth + 2)} y={height - h - 10} width={barWidth} height={h} rx={2} fill={color} opacity={0.8} />;
      })}
    </svg>
  );
}

function MiniLineChart({ data, color = "#10B981", height = 100 }) {
  if (!data || data.length < 2) return <div className="h-20 flex items-center justify-center text-xs text-surface-400">No data</div>;
  const max = Math.max(...data.map((d) => d.count || 0), 1);
  const w = 300;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - 10 - ((d.count || 0) / max) * (height - 20);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${height} ${points} ${w},${height}`} fill={color} opacity="0.1" />
    </svg>
  );
}

function DonutChart({ data, size = 120 }) {
  if (!data || data.length === 0) return <div className="h-20 flex items-center justify-center text-xs text-surface-400">No data</div>;
  const total = data.reduce((s, d) => s + (d.count || 0), 0);
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
  let cumulative = 0;
  const radius = size / 2 - 10;
  const cx = size / 2, cy = size / 2;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size}>
        {data.map((d, i) => {
          const pct = (d.count || 0) / total;
          const startAngle = cumulative * 2 * Math.PI;
          cumulative += pct;
          const endAngle = cumulative * 2 * Math.PI;
          const x1 = cx + radius * Math.cos(startAngle - Math.PI / 2);
          const y1 = cy + radius * Math.sin(startAngle - Math.PI / 2);
          const x2 = cx + radius * Math.cos(endAngle - Math.PI / 2);
          const y2 = cy + radius * Math.sin(endAngle - Math.PI / 2);
          const largeArc = pct > 0.5 ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return <path key={i} d={path} fill={colors[i % colors.length]} />;
        })}
        <circle cx={cx} cy={cy} r={radius * 0.55} fill="white" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold" fill="#1F2937">{total}</text>
      </svg>
      <div className="space-y-1">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-xs text-surface-600">{d.branch || d.status || d.file_type || `Item ${i + 1}`}: {d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isConnected } = useAdminWebSocket();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminService.getLiveAnalytics();
        setAnalytics(res.data?.data || res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="page-container space-y-6">
      <div className="skeleton h-10 w-64 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-56 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="page-subtitle">Real-time campus analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-success-500 animate-pulse" : "bg-surface-300"}`} />
          <span className="text-xs text-surface-500">{isConnected ? "Live" : "Polling"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Student Growth */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Student Growth (30 days)</h3>
          <MiniBarChart data={analytics?.student_growth} color="#3B82F6" />
        </div>

        {/* Faculty Activity */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Faculty Activity (7 days)</h3>
          <MiniLineChart data={analytics?.faculty_activity} color="#8B5CF6" />
        </div>

        {/* Attendance Trends */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Attendance Trends (30 days)</h3>
          <MiniLineChart data={analytics?.attendance_trend} color="#10B981" />
        </div>

        {/* Assignment Completion */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Assignment Submissions (30 days)</h3>
          <MiniBarChart data={analytics?.assignment_trend} color="#F59E0B" />
        </div>

        {/* Resource Uploads */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Resource Uploads (30 days)</h3>
          <MiniBarChart data={analytics?.resource_trend} color="#06B6D4" />
        </div>

        {/* Study Group Activity */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Study Group Creation (30 days)</h3>
          <MiniLineChart data={analytics?.group_trend} color="#EC4899" />
        </div>

        {/* Event Participation */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Event Registrations (30 days)</h3>
          <MiniBarChart data={analytics?.event_trend} color="#8B5CF6" />
        </div>

        {/* Placement Activity */}
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Placement Applications (30 days)</h3>
          <MiniLineChart data={analytics?.placement_trend} color="#EF4444" />
        </div>

        {/* Department Distribution */}
        <div className="card-padded lg:col-span-2">
          <h3 className="text-sm font-semibold text-surface-700 mb-3">Student Distribution by Department</h3>
          <DonutChart data={analytics?.dept_distribution} size={140} />
        </div>
      </div>
    </div>
  );
}
