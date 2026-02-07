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
      <h1 className="text-2xl font-bold mb-1">📖 Public Diaries</h1>
      <p className="text-zinc-500 mb-4 text-sm">
        Read public diary entries shared by the community.
      </p>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : diaries.length === 0 ? (
        <p className="text-zinc-500">No public diaries found.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {diaries.map((d) => (
              <li key={d._id} className="card">
                <Link href={`/diary/${d._id}`} className="block">
                  <div className="flex items-start justify-between">
                    <h2 className="font-semibold text-lg hover:underline">
                      {d.title}
                    </h2>
                    <span className="text-xs text-zinc-400 whitespace-nowrap ml-2">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-sm mt-1">
                    {d.content.slice(0, 200)}
                    {d.content.length > 200 ? "..." : ""}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-zinc-500">
                      by <strong>{d.author?.username}</strong>
                    </span>
                    {d.tags?.length > 0 && (
                      <div className="flex gap-1">
                        {d.tags.map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-ghost"
              >
                ← Prev
              </button>
              <span className="px-3 py-1 text-sm">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-ghost"
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
