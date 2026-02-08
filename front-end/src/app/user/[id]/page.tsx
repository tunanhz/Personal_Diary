"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../context/AuthProvider";

type UserProfile = {
  _id: string;
  username: string;
  fullName: string;
  avatar: string;
  createdAt: string;
};

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

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { token, user: currentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaryLoading, setDiaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiFetch(`/auth/users/${id}`);
      setProfile(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "User not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchDiaries = useCallback(
    async (p: number) => {
      setDiaryLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "10" });
        const res = await apiFetch(`/diaries/user/${id}?${params}`);
        setDiaries(res.data || []);
        setTotalPages(res.pagination?.pages || 1);
      } catch {
        /* ignore */
      } finally {
        setDiaryLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchDiaries(page);
  }, [fetchDiaries, page]);

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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
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
    if (!currentUser) return null;
    return reactions?.find((r) => r.user === currentUser._id)?.emoji || null;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-4 space-y-6">
        <div className="card flex flex-col items-center py-8">
          <div className="skeleton w-24 h-24 rounded-full mb-4" />
          <div className="skeleton h-6 w-40 mb-2" />
          <div className="skeleton h-4 w-28 mb-1" />
          <div className="skeleton h-3 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-2/3 mb-2" />
              <div className="skeleton h-3 w-full mb-1" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center">
          {error}
        </div>
        <div className="text-center mt-4">
          <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
            {"\u2190"} Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const isMe = currentUser && currentUser._id === profile._id;

  return (
    <div className="max-w-2xl mx-auto mt-4">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mb-4"
      >
        {"\u2190"} Back to Explore
      </Link>

      {/* Profile Card */}
      <div className="card mb-6">
        <div className="flex flex-col items-center py-4">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.username}
              className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
              {(profile.fullName || profile.username).charAt(0).toUpperCase()}
            </div>
          )}

          <h1 className="text-xl font-bold text-slate-800 mt-3">
            {profile.fullName || profile.username}
          </h1>

          <p className="text-sm text-slate-500">@{profile.username}</p>

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span>
              {"\uD83D\uDCC5"} Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <span className="text-slate-300">{"\u2022"}</span>
            <span>
              {"\uD83D\uDCD6"} {totalPages > 0 ? `${diaries.length > 0 ? ((page - 1) * 10 + diaries.length) : 0}` : "0"} public {diaries.length === 1 ? "diary" : "diaries"}
            </span>
          </div>

          {isMe && (
            <Link
              href="/profile"
              className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {"\u270F\uFE0F"} Edit my profile
            </Link>
          )}
        </div>
      </div>

      {/* Diaries Section */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-slate-800">
          {"\uD83D\uDCD6"} Public Diaries
        </h2>
        <span className="text-sm text-slate-400 font-normal">
          by {profile.fullName || profile.username}
        </span>
      </div>

      {diaryLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-2/3 mb-2" />
              <div className="skeleton h-3 w-full mb-1" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : diaries.length === 0 ? (
        <div className="empty-state">
          <div className="icon">{"\uD83D\uDCED"}</div>
          <h3>No public diaries yet</h3>
          <p>{profile.fullName || profile.username} hasn{"'"}t shared any diaries publicly.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {diaries.map((d) => {
              const summary = getReactionSummary(d.reactions);
              const totalReactions = d.reactions?.length || 0;
              const userEmoji = getUserReaction(d.reactions);

              return (
                <li key={d._id} className="card">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/diary/${d._id}`}
                      className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors text-[15px]"
                    >
                      {d.title}
                    </Link>
                    <span className="text-xs text-slate-400">{timeAgo(d.createdAt)}</span>
                  </div>

                  {/* Content preview */}
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    {d.content.slice(0, 200)}
                    {d.content.length > 200 ? "..." : ""}
                  </p>

                  {/* Tags */}
                  {d.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {d.tags.map((t) => (
                        <span key={t} className="tag">{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Reaction summary + comment count */}
                  {(totalReactions > 0 || d.commentCount > 0) && (
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        {totalReactions > 0 && (
                          <>
                            <div className="flex -space-x-0.5">
                              {Object.keys(summary).slice(0, 3).map((emoji) => (
                                <span
                                  key={emoji}
                                  className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border border-white shadow-sm text-[12px]"
                                >
                                  {emoji}
                                </span>
                              ))}
                            </div>
                            <span className="ml-0.5">{totalReactions}</span>
                          </>
                        )}
                      </div>
                      {d.commentCount > 0 && (
                        <Link href={`/diary/${d._id}`} className="hover:underline">
                          {d.commentCount} {d.commentCount === 1 ? "comment" : "comments"}
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-200 mt-2" />

                  {/* Like / Comment buttons */}
                  <div className="flex items-center mt-0.5 -mx-1">
                    <div className="relative flex-1 group/like">
                      <button
                        onClick={() => {
                          if (userEmoji) handleReact(d._id, userEmoji);
                          else handleReact(d._id, "\u2764\uFE0F");
                        }}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                          userEmoji
                            ? "text-indigo-600 hover:bg-indigo-50"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-base">{userEmoji || "\uD83D\uDC4D"}</span>
                        {userEmoji ? (EMOJI_LABELS[userEmoji] || "Liked") : "Like"}
                      </button>

                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover/like:flex flex-col items-center z-30">
                        <div className="flex items-center gap-1 bg-white rounded-full shadow-xl border border-slate-200 px-2 py-1.5">
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(d._id, emoji)}
                              className="w-9 h-9 text-2xl flex items-center justify-center hover:scale-[1.4] hover:-translate-y-1.5 transition-all duration-200 cursor-pointer rounded-full"
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="h-2 w-full" />
                      </div>
                    </div>

                    <Link
                      href={`/diary/${d._id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <span className="text-base">{"\uD83D\uDCAC"}</span>
                      Comment
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary"
              >
                {"\u2190"} Previous
              </button>
              <span className="text-sm font-medium text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary"
              >
                Next {"\u2192"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
