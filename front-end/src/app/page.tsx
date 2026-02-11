"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthProvider";

type Reaction = { user: string; emoji: string };

type Diary = {
  _id: string;
  title: string;
  content: string;
  author: { _id: string; username: string; fullName?: string; avatar?: string };
  tags: string[];
  reactions: Reaction[];
  commentCount: number;
  createdAt: string;
};

const EMOJIS = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE2E", "\uD83D\uDE22", "\uD83D\uDC4F"];
const EMOJI_LABELS: Record<string, string> = {
  "\u2764\uFE0F": "Love",
  "\uD83D\uDE02": "Haha",
  "\uD83D\uDE2E": "Wow",
  "\uD83D\uDE22": "Sad",
  "\uD83D\uDC4F": "Bravo",
  "\uD83D\uDC4D": "Like",
};

export default function PublicFeedPage() {
  const { token, user } = useAuth();
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

  const handleReact = async (diaryId: string, emoji: string) => {
    if (!token) return alert("Please login to react!");
    try {
      const res = await apiFetch(
        `/diaries/${diaryId}/react`,
        { method: "POST", body: JSON.stringify({ emoji }) },
        token
      );
      setDiaries((prev) =>
        prev.map((d) =>
          d._id === diaryId ? { ...d, reactions: res.data.reactions } : d
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getReactionSummary = (reactions: Reaction[]) => {
    const summary: Record<string, number> = {};
    reactions?.forEach((r) => {
      summary[r.emoji] = (summary[r.emoji] || 0) + 1;
    });
    return summary;
  };

  const getUserReaction = (reactions: Reaction[]) => {
    if (!user) return null;
    return reactions?.find((r) => r.user === user._id)?.emoji || null;
  };

  useEffect(() => {
    if (!loading && window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
      }
    }
  }, [loading]);

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2"><img src="/icons/icons8-open-book.gif" alt="" className="w-9 h-9" /> Explore Public Diaries</h1>
        <p className="text-slate-500 mt-2">Read stories and thoughts shared by the community</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-0 mb-8 max-w-xl mx-auto">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{"\uD83D\uDD0D"}</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search diaries..." className="w-full h-11 pl-10 pr-4 border-1.5 border-slate-200 rounded-l-full bg-white text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
        </div>
        <button type="submit" className="h-11 px-6 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-r-full transition-colors">Search</button>
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
          <div className="icon">{"\uD83D\uDCED"}</div>
          <h3>No public diaries found</h3>
          <p>Be the first to share your story with the world!</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-200">
            {diaries.map((d) => {
              const summary = getReactionSummary(d.reactions);
              const totalReactions = d.reactions?.length || 0;
              const userEmoji = getUserReaction(d.reactions);
              return (
                <li key={d._id} id={`diary-${d._id}`} className="py-4 first:pt-0 last:pb-0 scroll-mt-24">
                  <div className="flex items-start gap-3">
                    <Link href={`/user/${d.author?._id}`} title={d.author?.fullName || d.author?.username} style={{ flexShrink: 0 }}>
                    {d.author?.avatar ? (
                      <img src={d.author.avatar} alt={d.author.username} className="w-8 h-8 rounded-full object-cover border border-slate-200 mt-0.5 hover:ring-2 hover:ring-indigo-300 transition-all" />
                    ) : (
                      <span className="avatar mt-0.5 hover:ring-2 hover:ring-indigo-300 transition-all" style={{ width: "2rem", height: "2rem", fontSize: "0.75rem" }}>
                        {d.author?.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/diary/${d._id}`} className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors">{d.title}</Link>
                        <span className="text-xs text-slate-400">by <Link href={`/user/${d.author?._id}`} className="font-medium text-slate-500 hover:text-indigo-600 transition-colors">{d.author?.fullName || d.author?.username}</Link></span>
                        <span className="text-xs text-slate-300">{"\u2022"}</span>
                        <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{d.content.slice(0, 180)}{d.content.length > 180 ? "..." : ""}</p>
                      {d.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {d.tags.map((t) => (<span key={t} className="tag">{t}</span>))}
                        </div>
                      )}

                      {(totalReactions > 0 || d.commentCount > 0) && (
                        <div className="flex items-center justify-between mt-2.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            {totalReactions > 0 && (
                              <>
                                <div className="flex -space-x-0.5">
                                  {Object.keys(summary).slice(0, 3).map((emoji) => (
                                    <span key={emoji} className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-white shadow-sm text-[12px]">{emoji}</span>
                                  ))}
                                </div>
                                <span className="ml-0.5">{totalReactions}</span>
                              </>
                            )}
                          </div>
                          {d.commentCount > 0 && (
                            <Link href={`/diary/${d._id}`} className="hover:underline">{d.commentCount} {d.commentCount === 1 ? "comment" : "comments"}</Link>
                          )}
                        </div>
                      )}

                      <div className="border-t border-slate-200 mt-2" />

                      <div className="flex items-center mt-0.5 -mx-1">
                        <div className="relative flex-1 group/like">
                          <button
                            onClick={() => { if (userEmoji) { handleReact(d._id, userEmoji); } else { handleReact(d._id, "\u2764\uFE0F"); } }}
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${userEmoji ? "text-indigo-600 hover:bg-indigo-50" : "text-slate-600 hover:bg-slate-100"}`}
                          >
                            {userEmoji ? <span className="text-base">{userEmoji}</span> : <img src="/icons/icons8-like-48.png" alt="Like" className="w-[18px] h-[18px]" />}
                            {userEmoji ? (EMOJI_LABELS[userEmoji] || "Liked") : "Like"}
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover/like:flex flex-col items-center z-30">
                            <div className="flex items-center gap-1 bg-white rounded-full shadow-xl border border-slate-200 px-2 py-1.5">
                              {EMOJIS.map((emoji) => (
                                <button key={emoji} onClick={() => handleReact(d._id, emoji)} className="w-9 h-9 text-2xl flex items-center justify-center hover:scale-[1.4] hover:-translate-y-1.5 transition-all duration-200 cursor-pointer rounded-full" title={emoji}>{emoji}</button>
                              ))}
                            </div>
                            <div className="h-2 w-full" />
                          </div>
                        </div>
                        <Link href={`/diary/${d._id}`} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                          <img src="/icons/icons8-comment.gif" alt="" className="w-[18px] h-[18px]" />Comment
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary">{"\u2190"} Previous</button>
              <span className="text-sm font-medium text-slate-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary">Next {"\u2192"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
