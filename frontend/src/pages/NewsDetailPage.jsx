import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function NewsDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get(`/news/${id}/`); setArticle(res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="page-container"><div className="skeleton h-64 rounded-xl" /></div>;
  if (!article) return <div className="page-container empty-state"><p className="empty-state-title">Article not found</p><Link to="/news" className="btn-primary mt-4">Back to News</Link></div>;

  return (
    <div className="page-container max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/news" className="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></Link>
        <div>
          {article.category && <span className="badge-primary mb-1">{article.category}</span>}
          <h1 className="page-title">{article.title}</h1>
          <p className="text-xs text-surface-400 mt-1">
            {article.author?.username || "Admin"} • {article.created_at ? new Date(article.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
          </p>
        </div>
      </div>
      {article.image && (
        <div className="rounded-xl overflow-hidden h-56 bg-surface-100">
          <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="card-padded">
        <div className="prose prose-sm max-w-none text-surface-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: article.content || article.body || "" }} />
      </div>
    </div>
  );
}
