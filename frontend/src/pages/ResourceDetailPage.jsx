import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchResource } from "../store/slices/resourceSlice";
import { resourceService } from "../services/resourceService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

const YEAR_LABELS = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };

const FILE_ICONS = {
  pdf:          { icon: "📄", color: "bg-red-100 text-red-700" },
  presentation: { icon: "📊", color: "bg-orange-100 text-orange-700" },
  document:     { icon: "📝", color: "bg-blue-100 text-blue-700" },
  spreadsheet:  { icon: "📈", color: "bg-green-100 text-green-700" },
  other:        { icon: "📁", color: "bg-gray-100 text-gray-700" },
};

export default function ResourceDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentResource: r, loading } = useSelector((s) => s.resources);

  useEffect(() => { dispatch(fetchResource(id)); }, [id, dispatch]);

  const handleDownload = async () => {
    try {
      const res = await resourceService.getDownloadUrl(id);
      const url = res.data.data.download_url;
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.data.file_name || r?.title || "resource";
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Download failed");
    }
  };

  const handlePreview = async () => {
    try {
      const res = await resourceService.getPreviewUrl(id);
      window.open(res.data.data.preview_url, "_blank");
    } catch {
      toast.error("Preview not available");
    }
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!r) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-4xl mb-2">📁</p>
      <p>Resource not found</p>
    </div>
  );

  const ft = FILE_ICONS[r.file_type] || FILE_ICONS.other;
  const tags = r.tags_list || [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Back to Resources
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${ft.color}`}>
            {ft.icon}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{r.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{r.subject}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ft.color}`}>
                {r.file_type?.toUpperCase()}
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                {YEAR_LABELS[r.academic_year]}
              </span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                Semester {r.semester}
              </span>
              {r.branch && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {r.branch}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {r.description && (
          <p className="text-gray-600 text-sm leading-relaxed">{r.description}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-gray-100">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{r.download_count}</p>
            <p className="text-xs text-gray-500">Downloads</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{r.view_count}</p>
            <p className="text-xs text-gray-500">Views</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">{r.uploaded_by_name || "Admin"}</p>
            <p className="text-xs text-gray-500">Uploaded by</p>
          </div>
        </div>

        {/* File info */}
        {r.file_name && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
            <span className="text-xl">{ft.icon}</span>
            <div>
              <p className="font-medium text-gray-800">{r.file_name}</p>
              {r.file_size > 0 && (
                <p className="text-xs text-gray-500">
                  {r.file_size < 1024 * 1024
                    ? `${(r.file_size / 1024).toFixed(1)} KB`
                    : `${(r.file_size / (1024 * 1024)).toFixed(1)} MB`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {(r.file_name || r.external_url) && (
            <button onClick={handleDownload} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
              ⬇ Download
            </button>
          )}
          {r.preview_supported && (
            <button onClick={handlePreview} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
              👁 Preview
            </button>
          )}
          {r.external_url && !r.file_name && (
            <a href={r.external_url} target="_blank" rel="noreferrer"
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
              🔗 Open Link
            </a>
          )}
        </div>

        <p className="text-xs text-gray-400 text-right">
          Uploaded on {new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
