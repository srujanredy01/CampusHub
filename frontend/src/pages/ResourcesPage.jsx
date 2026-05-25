import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchResources, fetchResourceCounts } from "../store/slices/resourceSlice";
import { resourceService } from "../services/resourceService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

// ── Constants ─────────────────────────────────────────────────────────────────
const YEAR_LABELS = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };
const YEAR_SEMESTERS = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] };

const FILE_TYPES = [
  { value: "",             label: "All Files",     icon: "📁" },
  { value: "pdf",          label: "PDFs",          icon: "📄" },
  { value: "presentation", label: "Presentations", icon: "📊" },
  { value: "document",     label: "Documents",     icon: "📝" },
  { value: "spreadsheet",  label: "Spreadsheets",  icon: "📈" },
];

const FILE_ICONS = {
  pdf:          { icon: "📄", color: "bg-red-100 text-red-600" },
  presentation: { icon: "📊", color: "bg-orange-100 text-orange-600" },
  document:     { icon: "📝", color: "bg-blue-100 text-blue-600" },
  spreadsheet:  { icon: "📈", color: "bg-green-100 text-green-600" },
  other:        { icon: "📁", color: "bg-gray-100 text-gray-600" },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Resource Card ─────────────────────────────────────────────────────────────
function ResourceCard({ resource, onDownload, onPreview }) {
  const ft = FILE_ICONS[resource.file_type] || FILE_ICONS.other;
  const tags = resource.tags_list || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-primary-200 transition-all duration-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${ft.color}`}>
          {ft.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{resource.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{resource.subject}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${ft.color}`}>
          {resource.file_type?.toUpperCase()}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
          {YEAR_LABELS[resource.academic_year]}
        </span>
        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
          Semester {resource.semester}
        </span>
        {resource.branch && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {resource.branch}
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <div className="flex gap-3">
            <span>⬇ {resource.download_count}</span>
            <span>👁 {resource.view_count}</span>
            {resource.file_size > 0 && <span>{formatSize(resource.file_size)}</span>}
          </div>
          <span>{formatDate(resource.created_at)}</span>
        </div>
        <div className="flex gap-2">
          {(resource.file_name || resource.external_url) && (
            <button
              onClick={() => onDownload(resource)}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              ⬇ Download
            </button>
          )}
          {resource.preview_supported && (
            <button
              onClick={() => onPreview(resource)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              👁 Preview
            </button>
          )}
          {resource.external_url && !resource.file_name && (
            <a
              href={resource.external_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              🔗 Open Link
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ url, title, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-2xl">
          <iframe src={url} title={title} className="w-full h-full border-0" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const dispatch = useDispatch();
  const { items, loading, counts } = useSelector((s) => s.resources);
  const { user } = useSelector((s) => s.auth);

  const [search, setSearch]           = useState("");
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSem, setSelectedSem]   = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [previewData, setPreviewData]   = useState(null); // { url, title }
  const [page, setPage]                 = useState(1);

  // Load counts once
  useEffect(() => {
    dispatch(fetchResourceCounts(user?.branch || ""));
  }, [dispatch, user?.branch]);

  // Fetch resources whenever filters change
  const loadResources = useCallback(() => {
    const params = { page };
    if (search)       params.search        = search;
    if (selectedYear) params.academic_year = selectedYear;
    if (selectedSem)  params.semester      = selectedSem;
    if (selectedType) params.file_type     = selectedType;
    dispatch(fetchResources(params));
  }, [dispatch, search, selectedYear, selectedSem, selectedType, page]);

  useEffect(() => { loadResources(); }, [loadResources]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, selectedYear, selectedSem, selectedType]);

  // Reset semester when year changes
  useEffect(() => { setSelectedSem(""); }, [selectedYear]);

  const handleDownload = async (resource) => {
    try {
      const res = await resourceService.getDownloadUrl(resource.id);
      const url = res.data.data.download_url;
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.data.file_name || resource.title;
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Download failed. Please try again.");
    }
  };

  const handlePreview = async (resource) => {
    try {
      const res = await resourceService.getPreviewUrl(resource.id);
      setPreviewData({ url: res.data.data.preview_url, title: resource.title });
    } catch {
      toast.error("Preview not available.");
    }
  };

  const yearCount = (y) => counts?.years?.[String(y)] || 0;
  const typeCount = (t) => t ? (counts?.file_types?.[t] || 0) : Object.values(counts?.file_types || {}).reduce((a, b) => a + b, 0);

  const availableSemesters = selectedYear ? YEAR_SEMESTERS[selectedYear] : [];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <p className="text-sm text-gray-500 mt-0.5">Study materials, notes, and files for all years</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          placeholder="Search resources by keyword or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
        )}
      </div>

      {/* Academic Year filter */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Academic Year</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedYear(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedYear === null
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600"
            }`}
          >
            All Years
          </button>
          {[1, 2, 3, 4].map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(selectedYear === y ? null : y)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedYear === y
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600"
              }`}
            >
              {YEAR_LABELS[y]}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                selectedYear === y ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {yearCount(y)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Semester filter — only shown when a year is selected */}
      {selectedYear && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {YEAR_LABELS[selectedYear]} Resources — Semester
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSem("")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedSem === ""
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
              }`}
            >
              All Semesters
            </button>
            {availableSemesters.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSem(selectedSem === String(s) ? "" : String(s))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedSem === String(s)
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
              >
                Semester {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File type filter */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">File Type</p>
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((ft) => (
            <button
              key={ft.value}
              onClick={() => setSelectedType(ft.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedType === ft.value
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              <span>{ft.icon}</span>
              {ft.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedType === ft.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {typeCount(ft.value)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading ? "Loading..." : `${items.length} resource${items.length !== 1 ? "s" : ""} found`}
          {selectedYear && ` · ${YEAR_LABELS[selectedYear]}`}
          {selectedSem && ` · Semester ${selectedSem}`}
          {selectedType && ` · ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`}
        </p>
        {(selectedYear || selectedSem || selectedType || search) && (
          <button
            onClick={() => { setSelectedYear(null); setSelectedSem(""); setSelectedType(""); setSearch(""); }}
            className="text-xs text-primary-600 hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Resource grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-5xl mb-4">📂</p>
          <h3 className="text-lg font-semibold text-gray-700">No Files Found</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Your search did not match any available resources.
          </p>
          <button
            onClick={() => { setSelectedYear(null); setSelectedSem(""); setSelectedType(""); setSearch(""); }}
            className="mt-4 text-sm text-primary-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onDownload={handleDownload}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewData && (
        <PreviewModal
          url={previewData.url}
          title={previewData.title}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
}
