import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Keyboard shortcut: Cmd/Ctrl + K
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleSearch = (value) => {
    setQuery(value);
    if (!value.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get("/search/", { params: { q: value } });
        setResults(res.data?.results || res.data || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  const handleSelect = (item) => {
    setOpen(false);
    setQuery("");
    const routes = { resource: "/resources", coding_question: "/coding", news: "/news", assignment: "/assignments", roadmap: "/roadmaps" };
    const base = routes[item.type] || "/dashboard";
    navigate(item.id ? `${base}/${item.id}` : base);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 rounded-lg border border-transparent focus-within:border-primary-200 focus-within:bg-white focus-within:shadow-sm transition-all w-56 lg:w-72">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400 flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { handleSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none"
          aria-label="Search"
        />
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-surface-200 rounded text-2xs text-surface-400 font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Results dropdown */}
      {open && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-elevated py-2 z-50 max-h-80 overflow-y-auto animate-fade-down">
          {loading ? (
            <div className="px-4 py-3 text-sm text-surface-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-surface-400">No results for "{query}"</div>
          ) : (
            results.slice(0, 8).map((item, idx) => (
              <button key={idx} onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-50 text-left transition-colors">
                <div className="w-7 h-7 rounded-md bg-surface-100 flex items-center justify-center text-surface-500 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{item.title}</p>
                  <p className="text-xs text-surface-400">{item.type?.replace("_", " ")}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
