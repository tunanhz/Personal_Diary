"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthProvider";
import { io as socketIO, Socket } from "socket.io-client";

type Reaction = { user: string; emoji: string };

type Diary = {
  _id: string;
  title: string;
  content: string;
  author: { _id: string; username: string; fullName?: string; avatar?: string };
  tags: string[];
  images: { url: string; publicId: string }[];
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
  const socketRef = useRef<Socket | null>(null);

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

  // Socket.IO for real-time feed reactions
  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const socket = socketIO(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-feed");
    });

    socket.on("feed-diary-reaction", (data: { diaryId: string; reactions: Reaction[] }) => {
      setDiaries((prev) =>
        prev.map((d) =>
          d._id === data.diaryId ? { ...d, reactions: data.reactions } : d
        )
      );
    });

    return () => {
      socket.emit("leave-feed");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPublic(1, search);
  };

  const handleReact = async (diaryId: string, emoji: string) => {
    if (!token) return alert("Please login to react!");
    try {
      await apiFetch(
        `/diaries/${diaryId}/react`,
        { method: "POST", body: JSON.stringify({ emoji }) },
        token
      );
      // Real-time update via Socket.IO
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
      {/* Hero Section */}
      <div className="text-center mb-10 relative">
        <div className="absolute inset-0 hero-pattern rounded-3xl -z-10 opacity-60" />
        <div className="py-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 text-sm text-indigo-600 font-medium mb-4 animate-fade-in">
            Discover stories from the community
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 animate-fade-in-delay-1">
            Explore <span className="gradient-text">Public Diaries</span>
          </h1>
          <p className="text-slate-500 mt-3 text-lg max-w-xl mx-auto animate-fade-in-delay-2">Read stories and thoughts shared by writers around the world</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-0 mb-8 max-w-xl mx-auto animate-fade-in-delay-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search diaries by title..." className="w-full h-12 pl-10 pr-4 border-1.5 border-slate-200 rounded-l-2xl bg-white text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
        </div>
        <button type="submit" className="h-12 px-7 gradient-bg text-white text-sm font-semibold rounded-r-2xl hover:shadow-lg hover:shadow-indigo-200/50 transition-all">Search</button>
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
          <div className="grid gap-4">
            {diaries.map((d) => {
              const summary = getReactionSummary(d.reactions);
              const totalReactions = d.reactions?.length || 0;
              const userEmoji = getUserReaction(d.reactions);
              return (
                <div key={d._id} id={`diary-${d._id}`} className="card scroll-mt-24 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <Link href={`/user/${d.author?._id}`} title={d.author?.fullName || d.author?.username} style={{ flexShrink: 0 }}>
                    {d.author?.avatar ? (
                      <img src={d.author.avatar} alt={d.author.username} className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 shadow-sm hover:ring-2 hover:ring-indigo-300 transition-all" />
                    ) : (
                      <span className="avatar hover:ring-2 hover:ring-indigo-300 transition-all" style={{ width: "2.5rem", height: "2.5rem", fontSize: "0.85rem" }}>
                        {d.author?.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/user/${d.author?._id}`} className="font-semibold text-sm text-slate-700 hover:text-indigo-600 transition-colors">{d.author?.fullName || d.author?.username}</Link>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                      </div>
                      <Link href={`/diary/${d._id}`} className="block mt-1">
                        <h3 className="font-bold text-lg text-slate-800 hover:text-indigo-600 transition-colors leading-snug">{d.title}</h3>
                      </Link>
                      <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{d.content.slice(0, 200)}{d.content.length > 200 ? "..." : ""}</p>

                      {/* Diary Images - Facebook style gallery */}
                      {d.images?.length > 0 && (
                        <Link href={`/diary/${d._id}`} className="block mt-3 rounded-xl overflow-hidden border border-slate-200">
                          {d.images.length === 1 ? (
                            <img
                              src={d.images[0].url}
                              alt=""
                              className="w-full max-h-80 object-cover hover:opacity-95 transition-opacity"
                            />
                          ) : d.images.length === 2 ? (
                            <div className="grid grid-cols-2 gap-0.5">
                              {d.images.map((img) => (
                                <img
                                  key={img.publicId}
                                  src={img.url}
                                  alt=""
                                  className="w-full h-48 object-cover hover:opacity-95 transition-opacity"
                                />
                              ))}
                            </div>
                          ) : d.images.length === 3 ? (
                            <div className="grid grid-cols-2 gap-0.5">
                              <img
                                src={d.images[0].url}
                                alt=""
                                className="w-full h-full object-cover row-span-2 hover:opacity-95 transition-opacity"
                                style={{ minHeight: "240px" }}
                              />
                              <img
                                src={d.images[1].url}
                                alt=""
                                className="w-full h-[119px] object-cover hover:opacity-95 transition-opacity"
                              />
                              <img
                                src={d.images[2].url}
                                alt=""
                                className="w-full h-[119px] object-cover hover:opacity-95 transition-opacity"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-0.5">
                              <img
                                src={d.images[0].url}
                                alt=""
                                className="w-full h-[140px] object-cover hover:opacity-95 transition-opacity"
                              />
                              <img
                                src={d.images[1].url}
                                alt=""
                                className="w-full h-[140px] object-cover hover:opacity-95 transition-opacity"
                              />
                              <img
                                src={d.images[2].url}
                                alt=""
                                className="w-full h-[140px] object-cover hover:opacity-95 transition-opacity"
                              />
                              <div className="relative">
                                <img
                                  src={d.images[3].url}
                                  alt=""
                                  className="w-full h-[140px] object-cover"
                                />
                                {d.images.length > 4 && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                                    +{d.images.length - 4}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Link>
                      )}

                      {d.tags?.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
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
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary">← Previous</button>
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
