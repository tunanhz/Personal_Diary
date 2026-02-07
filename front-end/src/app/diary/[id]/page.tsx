"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthProvider";
import { apiFetch } from "../../../lib/api";
import Link from "next/link";

type Diary = {
  _id: string;
  title: string;
  content: string;
  isPublic: boolean;
  tags: string[];
  reactions: { user: string; emoji: string }[];
  author: { _id: string; username: string };
  createdAt: string;
  updatedAt: string;
};

type Comment = {
  _id: string;
  content: string;
  author: { _id: string; username: string };
  reactions: { user: string; emoji: string }[];
  replies?: Comment[];
  parentComment?: string | null;
  createdAt: string;
};

const EMOJIS = ["❤️", "😂", "😮", "😢", "👏"];

export default function DiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();

  const [diary, setDiary] = useState<Diary | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment form
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  // Emoji picker state
  const [diaryEmojiOpen, setDiaryEmojiOpen] = useState(false);
  const [commentEmojiOpen, setCommentEmojiOpen] = useState<string | null>(null);

  const fetchDiary = useCallback(async () => {
    try {
      const res = await apiFetch(`/diaries/${id}`, {}, token);
      setDiary(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiFetch(`/diaries/${id}/comments`, {}, token);
      setComments(res.data || []);
    } catch {
      /* ignore */
    }
  }, [id, token]);

  useEffect(() => {
    fetchDiary();
    fetchComments();
  }, [fetchDiary, fetchComments]);

  // Post comment
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await apiFetch(
        `/diaries/${id}/comments`,
        { method: "POST", body: JSON.stringify({ content: commentText }) },
        token
      );
      setCommentText("");
      fetchComments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  // Post reply
  const handleReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      await apiFetch(
        `/diaries/${id}/comments`,
        {
          method: "POST",
          body: JSON.stringify({ content: replyText, parentComment: parentId }),
        },
        token
      );
      setReplyText("");
      setReplyingTo(null);
      fetchComments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReplyLoading(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await apiFetch(
        `/diaries/${id}/comments/${commentId}`,
        { method: "DELETE" },
        token
      );
      fetchComments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // React to diary
  const handleDiaryReact = async (emoji: string) => {
    if (!token) return alert("Please login to react!");
    try {
      const res = await apiFetch(
        `/diaries/${id}/react`,
        { method: "POST", body: JSON.stringify({ emoji }) },
        token
      );
      setDiary((prev) =>
        prev ? { ...prev, reactions: res.data.reactions } : prev
      );
      setDiaryEmojiOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // React to comment
  const handleCommentReact = async (commentId: string, emoji: string) => {
    if (!token) return alert("Please login to react!");
    try {
      const res = await apiFetch(
        `/diaries/${id}/comments/${commentId}/react`,
        { method: "POST", body: JSON.stringify({ emoji }) },
        token
      );
      // Update reactions in state
      const updateReactions = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c._id === commentId) return { ...c, reactions: res.data.reactions };
          if (c.replies?.length) return { ...c, replies: updateReactions(c.replies) };
          return c;
        });
      setComments(updateReactions);
      setCommentEmojiOpen(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helpers
  const getReactionSummary = (reactions: { user: string; emoji: string }[]) => {
    const s: Record<string, number> = {};
    reactions?.forEach((r) => { s[r.emoji] = (s[r.emoji] || 0) + 1; });
    return s;
  };
  const getUserReaction = (reactions: { user: string; emoji: string }[]) => {
    if (!user) return null;
    return reactions?.find((r) => r.user === user._id)?.emoji || null;
  };

  if (loading) return (
    <div className="space-y-4 mt-4">
      <div className="skeleton h-4 w-20" />
      <div className="card">
        <div className="skeleton h-7 w-2/3 mb-4" />
        <div className="skeleton h-3 w-1/3 mb-6" />
        <div className="skeleton h-3 w-full mb-2" />
        <div className="skeleton h-3 w-full mb-2" />
        <div className="skeleton h-3 w-3/4" />
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 mt-4">{error}</div>
  );

  if (!diary) return (
    <div className="empty-state mt-12">
      <div className="icon">🔍</div>
      <h3>Diary not found</h3>
      <p>This entry may have been deleted or made private.</p>
      <Link href="/" className="btn-primary mt-4 inline-flex">Go Home</Link>
    </div>
  );

  const isOwner = user && diary.author?._id === user._id;

  return (
    <div>
      {/* Back link */}
      <Link
        href={isOwner ? "/dashboard" : `/#diary-${diary._id}`}
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mb-4"
      >
        ← {isOwner ? "Back to Dashboard" : "Back to Explore"}
      </Link>

      {/* Article */}
      <article className="card">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{diary.title}</h1>
          <span className={diary.isPublic ? "badge-public" : "badge-private"}>
            {diary.isPublic ? "🌐 Public" : "🔒 Private"}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
              {diary.author?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700">{diary.author?.username}</span>
          </div>
          <span className="text-slate-300">•</span>
          <span className="text-sm text-slate-400">
            📅 {new Date(diary.createdAt).toLocaleDateString()}
          </span>
          {diary.tags?.length > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <div className="flex gap-1 flex-wrap">
                {diary.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="divider" />

        <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
          {diary.content}
        </div>

        {/* Diary Reactions */}
        {diary.isPublic && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
            {(() => {
              const summary = getReactionSummary(diary.reactions);
              const userEmoji = getUserReaction(diary.reactions);
              return Object.entries(summary).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => handleDiaryReact(emoji)}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                    userEmoji === emoji
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{count}</span>
                </button>
              ));
            })()}
            <div className="relative">
              <button
                onClick={() => setDiaryEmojiOpen(!diaryEmojiOpen)}
                className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                title="Add reaction"
              >
                😀+
              </button>
              {diaryEmojiOpen && (
                <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-10">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleDiaryReact(emoji)}
                      className="text-lg hover:scale-125 transition-transform cursor-pointer p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </article>

      {/* Comments Section */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          💬 Comments <span className="text-slate-400 font-normal">({comments.length})</span>
        </h2>

        {/* Add comment form */}
        {token ? (
          diary.isPublic ? (
            <form onSubmit={handleComment} className="card-highlight mb-6">
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="input flex-1"
                  required
                />
                <button
                  type="submit"
                  disabled={commentLoading}
                  className="btn-primary"
                >
                  {commentLoading ? "..." : "💬 Post"}
                </button>
              </div>
            </form>
          ) : (
            isOwner && (
              <div className="bg-slate-50 text-slate-400 text-sm p-3 rounded-lg border border-slate-200 mb-4">
                🔒 Comments are disabled for private diaries.
              </div>
            )
          )
        ) : (
          <div className="bg-indigo-50 text-sm p-3 rounded-lg border border-indigo-200 mb-4">
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>{" "}
            <span className="text-indigo-400">to leave a comment.</span>
          </div>
        )}

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <div className="icon" style={{ fontSize: "2rem" }}>💭</div>
            <h3 style={{ fontSize: "1rem" }}>No comments yet</h3>
            <p>Be the first to share your thoughts!</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => {
              const cSummary = getReactionSummary(c.reactions);
              const cUserEmoji = getUserReaction(c.reactions);
              return (
                <li key={c._id} className="card">
                  {/* Main comment */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 flex-1">
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
                        {c.author?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-700">
                            {c.author?.username}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{c.content}</p>

                        {/* Comment reactions + reply button */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {Object.entries(cSummary).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleCommentReact(c._id, emoji)}
                              className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                cUserEmoji === emoji
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-medium">{count}</span>
                            </button>
                          ))}
                          <div className="relative">
                            <button
                              onClick={() => setCommentEmojiOpen(commentEmojiOpen === c._id ? null : c._id)}
                              className="text-xs px-1.5 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                              title="React"
                            >
                              😀+
                            </button>
                            {commentEmojiOpen === c._id && (
                              <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-10">
                                {EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleCommentReact(c._id, emoji)}
                                    className="text-base hover:scale-125 transition-transform cursor-pointer p-0.5"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {token && diary.isPublic && (
                            <>
                              <span className="text-slate-200">|</span>
                              <button
                                onClick={() => {
                                  setReplyingTo(replyingTo === c._id ? null : c._id);
                                  setReplyText("");
                                }}
                                className="text-xs text-slate-400 hover:text-indigo-500 font-medium transition-colors cursor-pointer"
                              >
                                ↩ Reply
                              </button>
                            </>
                          )}
                        </div>

                        {/* Reply form */}
                        {replyingTo === c._id && (
                          <form
                            onSubmit={(e) => handleReply(e, c._id)}
                            className="mt-3 flex gap-2"
                          >
                            <input
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to ${c.author?.username}...`}
                              className="input flex-1 text-sm"
                              required
                              autoFocus
                            />
                            <button type="submit" disabled={replyLoading} className="btn-primary text-xs">
                              {replyLoading ? "..." : "Reply"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="btn-secondary text-xs"
                            >
                              Cancel
                            </button>
                          </form>
                        )}

                        {/* Replies */}
                        {c.replies && c.replies.length > 0 && (
                          <ul className="mt-3 space-y-2 pl-2 border-l-2 border-indigo-100">
                            {c.replies.map((r) => {
                              const rSummary = getReactionSummary(r.reactions);
                              const rUserEmoji = getUserReaction(r.reactions);
                              return (
                                <li key={r._id} className="py-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex gap-2 flex-1">
                                      <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}>
                                        {r.author?.username?.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-xs text-slate-700">
                                            {r.author?.username}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            {new Date(r.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{r.content}</p>

                                        {/* Reply reactions */}
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          {Object.entries(rSummary).map(([emoji, count]) => (
                                            <button
                                              key={emoji}
                                              onClick={() => handleCommentReact(r._id, emoji)}
                                              className={`inline-flex items-center gap-0.5 text-xs px-1 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                                rUserEmoji === emoji
                                                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                                              }`}
                                            >
                                              <span style={{ fontSize: 10 }}>{emoji}</span>
                                              <span className="font-medium">{count}</span>
                                            </button>
                                          ))}
                                          <div className="relative">
                                            <button
                                              onClick={() => setCommentEmojiOpen(commentEmojiOpen === r._id ? null : r._id)}
                                              className="text-xs px-1 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                                              style={{ fontSize: 10 }}
                                            >
                                              😀+
                                            </button>
                                            {commentEmojiOpen === r._id && (
                                              <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-10">
                                                {EMOJIS.map((emoji) => (
                                                  <button
                                                    key={emoji}
                                                    onClick={() => handleCommentReact(r._id, emoji)}
                                                    className="text-base hover:scale-125 transition-transform cursor-pointer p-0.5"
                                                  >
                                                    {emoji}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {user &&
                                      (r.author?._id === user._id || isOwner) && (
                                        <button
                                          onClick={() => handleDeleteComment(r._id)}
                                          className="text-red-300 hover:text-red-500 text-xs transition-colors cursor-pointer"
                                          title="Delete reply"
                                        >
                                          🗑️
                                        </button>
                                      )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                    {/* Delete comment button */}
                    {user &&
                      (c.author?._id === user._id || isOwner) && (
                        <button
                          onClick={() => handleDeleteComment(c._id)}
                          className="btn-danger text-xs"
                          title="Delete comment"
                        >
                          🗑️
                        </button>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
