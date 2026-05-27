import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = search ? { search } : {};
        const res = await api.get("/news/", { params });
        setArticles(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [search]);

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">News & Announcements</h1>
          <p className="page-subtitle">Stay updated with campus happenings</p>
        </div>
      </div>

      <div className="search-container max-w-md">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" className="search-input" placeholder="Search news..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
          </div>
          <p className="empty-state-title">No announcements</p>
          <p className="empty-state-desc">Check back later for campus news</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Link key={article.id} to={`/news/${article.id}`} className="card-interactive p-4 flex gap-4">
              {article.image && (
                <div className="w-20 h-20 rounded-lg bg-surface-100 overflow-hidden flex-shrink-0">
                  <img src={article.image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {article.category && <span className="badge-primary">{article.category}</span>}
                  <span className="text-xs text-surface-400">
                    {article.created_at ? new Date(article.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-surface-800 line-clamp-1">{article.title}</h3>
                <p className="text-xs text-surface-400 mt-1 line-clamp-2">{article.summary || article.content?.slice(0, 150)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
