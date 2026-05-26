import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchService } from "../../services/searchService";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "resources", label: "Resources" },
  { value: "coding", label: "Coding" },
  { value: "news", label: "News" },
  { value: "assignments", label: "Assignments" },
  { value: "lost_found", label: "Lost & Found" },
  { value: "roadmaps", label: "Roadmaps" },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchService.search(query, category);
        setResults(res.data.data);
        setOpen(true);
      } catch { setResults(null); }
      finally { setLoading(false); }
    }, 300);
  }, [query, category]);

  const navigateTo = (type, item) => {
    setOpen(false); setQuery("");
    const routes = { resources: `/resources/${item.id}`, coding_questions: `/coding/${item.id}`, news: `/news/${item.id}`, assignments: `/assignments`, roadmaps: `/roadmaps/${item.slug || item.id}`, lost_found: `/lost-found`, notes: `/notes/${item.id}` };
    navigate(routes[type] || "/dashboard");
  };

  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 bg-surface-50 rounded-xl px-3 py-2 border border-surface-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => results && setOpen(true)} placeholder="Search everything..." className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="text-xs bg-transparent border-none outline-none text-gray-500">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {open && results && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-surface-200 max-h-96 overflow-y-auto z-50">
          {loading && <div className="p-4 text-center text-sm text-gray-400">Searching...</div>}
          {!loading && totalResults === 0 && <div className="p-4 text-center text-sm text-gray-400">No results found</div>}
          {!loading && Object.entries(results).map(([type, items]) => items.length > 0 && (
            <div key={type} className="border-b last:border-b-0">
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-50">{type.replace("_", " ")}</p>
              {items.map(item => (
                <button key={item.id} onClick={() => navigateTo(type, item)} className="w-full px-4 py-2 text-left hover:bg-primary-50 transition-colors flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-800">{item.title || item.item_name || item.name}</span>
                  {item.category && <span className="text-xs text-gray-400">{item.category}</span>}
                  {item.difficulty && <span className="text-xs text-gray-400">{item.difficulty}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
