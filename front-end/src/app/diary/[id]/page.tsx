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
  author: { _id: string; username: string };
  createdAt: string;
  updatedAt: string;
};

type Comment = {
  _id: string;
  content: string;
  author: { _id: string; username: string };
  createdAt: string;
};

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
        href={isOwner ? "/dashboard" : "/"}
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mb-4"
      >
        ← {isOwner ? "Back to Dashboard" : "Back to Feed"}
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
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c._id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1">
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
                      {c.author?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-700">
                          {c.author?.username}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                  {/* Can delete if comment owner or diary owner */}
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
