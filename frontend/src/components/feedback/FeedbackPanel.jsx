/**
 * FeedbackPanel — Slide-in side panel for submitting feedback/issues.
 * Inspired by Linear, Notion, and Intercom feedback panels.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import feedbackService from "../../services/feedbackService";

// ── Constants ────────────────────────────────────────────────────────────────
const FEEDBACK_TYPES = [
  { value: "bug", label: "Report Bug", icon: "🐛" },
  { value: "feature", label: "Suggest Feature", icon: "💡" },
  { value: "general", label: "General Feedback", icon: "💬" },
  { value: "ui_ux", label: "UI/UX Feedback", icon: "🎨" },
  { value: "performance", label: "Performance Issue", icon: "⚡" },
  { value: "security", label: "Security Concern", icon: "🔒" },
  { value: "academic", label: "Academic Issue", icon: "📚" },
  { value: "placement", label: "Placement Module", icon: "💼" },
  { value: "chat", label: "Chat/Study Group", icon: "👥" },
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-emerald-100 text-emerald-700" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
];

const QUICK_TAGS = [
  "UI Issue", "Performance", "Broken Button", "Incorrect Data",
  "Feature Request", "Chat Problem", "Assignment Issue", "Notification Bug",
];

const DRAFT_KEY = "campushub_feedback_draft";

// ── Main Component ───────────────────────────────────────────────────────────
export default function FeedbackPanel({ isOpen, onClose }) {
  const { user } = useSelector((s) => s.auth);
  const location = useLocation();
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);

  // Form state
  const [feedbackType, setFeedbackType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: type, 2: details

  // Auto-save draft
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.feedbackType) setFeedbackType(parsed.feedbackType);
        if (parsed.severity) setSeverity(parsed.severity);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.selectedTags) setSelectedTags(parsed.selectedTags);
        if (parsed.feedbackType) setStep(2);
      } catch (e) { /* ignore */ }
    }
  }, []);

  // Save draft on change
  useEffect(() => {
    if (feedbackType || description) {
      const draft = { feedbackType, severity, description, selectedTags };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [feedbackType, severity, description, selectedTags]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  // Get page context
  const getPageContext = useCallback(() => ({
    page_url: window.location.href,
    route_path: location.pathname,
    browser_info: `${navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/)?.[0] || "Unknown"} on ${navigator.platform}`,
    device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
  }), [location.pathname]);

  // File handling
  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files);
    const validFiles = newFiles.filter((f) => {
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
      return validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });

    setFiles((prev) => [...prev, ...validFiles].slice(0, 5));

    // Generate previews
    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews((prev) => [...prev, { name: file.name, url: e.target.result }]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews((prev) => [...prev, { name: file.name, url: null }]);
      }
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle drag & drop
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter((f) => {
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
      return validTypes.includes(f.type) && f.size <= 10 * 1024 * 1024;
    });
    setFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    validFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews((prev) => [...prev, { name: file.name, url: e.target.result }]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews((prev) => [...prev, { name: file.name, url: null }]);
      }
    });
  };

  // Toggle tag
  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Submit
  const handleSubmit = async () => {
    if (!feedbackType) {
      setError("Please select a feedback type.");
      return;
    }
    if (!description || description.trim().length < 10) {
      setError("Please provide a description (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const context = getPageContext();
      const formData = new FormData();
      formData.append("feedback_type", feedbackType);
      formData.append("severity", severity);
      formData.append("description", description.trim());
      formData.append("tags", JSON.stringify(selectedTags));
      formData.append("page_url", context.page_url);
      formData.append("route_path", context.route_path);
      formData.append("browser_info", context.browser_info);
      formData.append("device_type", context.device_type);
      formData.append("screen_resolution", context.screen_resolution);

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await feedbackService.submit(formData);
      const data = res.data?.data || res.data;

      setTrackingId(data.tracking_id || "");
      setSubmitSuccess(true);
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to submit feedback. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFeedbackType("");
    setSeverity("medium");
    setDescription("");
    setSelectedTags([]);
    setFiles([]);
    setFilePreviews([]);
    setSubmitSuccess(false);
    setTrackingId("");
    setError("");
    setStep(1);
    localStorage.removeItem(DRAFT_KEY);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Report Issues & Suggestions"
        className={`
          fixed top-0 right-0 z-[70] h-full w-full sm:w-[420px] md:w-[460px]
          bg-white shadow-2xl border-l border-surface-200/60
          transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          flex flex-col overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-surface-100 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Report Issues & Suggestions</h2>
              <p className="text-sm text-surface-500 mt-0.5">
                Found a bug or have an idea to improve CampusHub?
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              aria-label="Close panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Progress indicator */}
          {!submitSuccess && (
            <div className="flex gap-1.5 mt-3">
              <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-primary-500" : "bg-surface-200"}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-primary-500" : "bg-surface-200"}`} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide">
          {submitSuccess ? (
            /* Success State */
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 animate-[scale-in_0.3s_ease-out]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-1">Thank you!</h3>
              <p className="text-sm text-surface-500 mb-4">
                Thank you for helping improve CampusHub. We'll review your feedback shortly.
              </p>
              {trackingId && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-100 rounded-lg mb-6">
                  <span className="text-xs text-surface-500">Tracking ID:</span>
                  <span className="text-sm font-mono font-medium text-surface-800">{trackingId}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  Submit Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            /* Step 1: Select Type */
            <div className="space-y-4">
              <label className="text-sm font-medium text-surface-700">What would you like to report?</label>
              <div className="grid grid-cols-1 gap-2">
                {FEEDBACK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => { setFeedbackType(type.value); setStep(2); }}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150
                      ${feedbackType === type.value
                        ? "border-primary-300 bg-primary-50 ring-1 ring-primary-200"
                        : "border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                      }
                    `}
                  >
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-medium text-surface-800">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Step 2: Details */
            <div className="space-y-5">
              {/* Selected type badge */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="p-1 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                  aria-label="Go back"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-md text-xs font-medium">
                  {FEEDBACK_TYPES.find((t) => t.value === feedbackType)?.icon}
                  {FEEDBACK_TYPES.find((t) => t.value === feedbackType)?.label}
                </span>
              </div>

              {/* Severity (for bugs) */}
              {feedbackType === "bug" && (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Severity</label>
                  <div className="flex gap-2">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSeverity(opt.value)}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${severity === opt.value
                            ? `${opt.color} ring-1 ring-current/20`
                            : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                          }
                        `}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue or suggestion in detail..."
                  rows={5}
                  className="w-full px-3.5 py-2.5 border border-surface-200 rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 resize-none transition-all"
                />
                <p className="text-xs text-surface-400 mt-1">{description.length} characters (min 10)</p>
              </div>

              {/* Quick Tags */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Quick Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`
                        px-2.5 py-1 rounded-md text-xs font-medium transition-all
                        ${selectedTags.includes(tag)
                          ? "bg-primary-100 text-primary-700 ring-1 ring-primary-200"
                          : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                        }
                      `}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Screenshots / Attachments</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
                    ${isDragging
                      ? "border-primary-400 bg-primary-50"
                      : "border-surface-200 hover:border-surface-300 hover:bg-surface-50"
                    }
                  `}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-surface-400 mb-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-xs text-surface-500">
                    Drag & drop or <span className="text-primary-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">PNG, JPG, PDF — Max 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* File previews */}
                {filePreviews.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {filePreviews.map((preview, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-surface-50 rounded-lg">
                        {preview.url ? (
                          <img src={preview.url} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-surface-200 flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-500">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                        )}
                        <span className="text-xs text-surface-600 flex-1 truncate">{preview.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="p-1 rounded text-surface-400 hover:text-red-500 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-detected context */}
              <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
                <p className="text-xs font-medium text-surface-500 mb-1.5">Auto-detected context</p>
                <div className="space-y-1 text-xs text-surface-600">
                  <div className="flex justify-between">
                    <span>Page:</span>
                    <span className="font-mono text-surface-800">{location.pathname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User:</span>
                    <span className="text-surface-800">{user?.full_name || user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Role:</span>
                    <span className="text-surface-800 capitalize">{user?.role}</span>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitSuccess && step === 2 && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-surface-100 bg-white">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !description || description.trim().length < 10}
              className={`
                w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200
                ${isSubmitting || !description || description.trim().length < 10
                  ? "bg-surface-200 text-surface-400 cursor-not-allowed"
                  : "bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md active:scale-[0.98]"
                }
              `}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
