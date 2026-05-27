import { useState, useEffect } from "react";
import api from "../services/api";

export default function CGPAPage() {
  const [semesters, setSemesters] = useState([]);
  const [cgpa, setCgpa] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/cgpa/");
        const data = res.data;
        setSemesters(data.semesters || data.results || []);
        setCgpa(data.cgpa || data.cumulative_gpa || 0);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Academic Performance</h1>
        <p className="page-subtitle">Your GPA and semester-wise breakdown</p>
      </div>

      {/* CGPA Overview */}
      <div className="card-padded">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-primary-600 tabular-nums">{cgpa.toFixed(2)}</p>
            <p className="text-sm text-surface-500 mt-1">Cumulative GPA</p>
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-end gap-2 h-24">
              {semesters.map((sem, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary-100 rounded-t-md relative overflow-hidden" style={{ height: `${(sem.gpa / 10) * 100}%` }}>
                    <div className="absolute inset-0 bg-primary-500 rounded-t-md" style={{ height: `${(sem.gpa / 10) * 100}%` }} />
                  </div>
                  <span className="text-2xs text-surface-400">S{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Semester Details */}
      {semesters.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <p className="empty-state-title">No academic records</p>
          <p className="empty-state-desc">Your semester results will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {semesters.map((sem, idx) => (
            <div key={idx} className="card-padded">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-surface-800">Semester {sem.semester || idx + 1}</h3>
                <span className="text-lg font-bold text-primary-600 tabular-nums">{sem.gpa?.toFixed(2) || "—"}</span>
              </div>
              {sem.subjects && (
                <div className="space-y-2">
                  {sem.subjects.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-surface-100 last:border-0">
                      <span className="text-sm text-surface-700">{sub.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-surface-400">{sub.credits} cr</span>
                        <span className="text-sm font-semibold text-surface-800">{sub.grade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
