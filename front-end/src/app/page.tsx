"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";

type Diary = {
  _id: string;
  title: string;
  content: string;
  author: { _id: string; username: string };
  tags: string[];
  createdAt: string;
};

export default function PublicFeedPage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPublic = async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "10" });
      if (q) params.set("search", q);
      const res = await apiFetch(`/diaries/public?${params}`);
      setDiaries(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublic(page, search);
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPublic(1, search);
  };

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          📖 Explore Public Diaries
        </h1>
        <p className="text-slate-500 mt-2">
          Read stories and thoughts shared by the community
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-xl mx-auto">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search diaries..."
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {loading ? (
        <div className="divide-y divide-slate-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-4 flex items-start gap-3">
              <div className="skeleton rounded-full" style={{ width: "2rem", height: "2rem", flexShrink: 0 }} />
              <div className="flex-1">
                <div className="skeleton h-4 w-1/2 mb-2" />
                <div className="skeleton h-3 w-full mb-1.5" />
                <div className="skeleton h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : diaries.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No public diaries found</h3>
          <p>Be the first to share your story with the world!</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-200">
            {diaries.map((d) => (
              <li key={d._id} className="py-4 first:pt-0 last:pb-0 group">
                <div className="flex items-start gap-3">
                  <span className="avatar mt-0.5" style={{ width: "2rem", height: "2rem", fontSize: "0.75rem", flexShrink: 0 }}>
                    {d.author?.username?.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/diary/${d._id}`}
                        className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
                      >
                        {d.title}
                      </Link>
                      <span className="text-xs text-slate-400">
                        by <span className="font-medium text-slate-500">{d.author?.username}</span>
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {d.content.slice(0, 180)}
                      {d.content.length > 180 ? "..." : ""}
                    </p>
                    {d.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {d.tags.map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary"
              >
                ← Previous
              </button>
              <span className="text-sm font-medium text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
