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

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!diary) return <p>Diary not found.</p>;

  const isOwner = user && diary.author?._id === user._id;

  return (
    <div>
      <Link href={isOwner ? "/dashboard" : "/"} className="text-sm text-blue-600 hover:underline">
        ← Back
      </Link>

      <article className="card mt-4">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{diary.title}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              diary.isPublic
                ? "bg-green-100 text-green-700"
                : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {diary.isPublic ? "Public" : "Private"}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
          <span>by <strong>{diary.author?.username}</strong></span>
          <span>•</span>
          <span>{new Date(diary.createdAt).toLocaleString()}</span>
          {diary.tags?.length > 0 && (
            <>
              <span>•</span>
              {diary.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 text-zinc-800 whitespace-pre-wrap leading-relaxed">
          {diary.content}
        </div>
      </article>

      {/* Comments Section */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">
          💬 Comments ({comments.length})
        </h2>

        {/* Add comment form */}
        {token ? (
          diary.isPublic ? (
            <form onSubmit={handleComment} className="flex gap-2 mb-6">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="input flex-1"
                required
              />
              <button
                type="submit"
                disabled={commentLoading}
                className="btn-primary"
              >
                {commentLoading ? "..." : "Post"}
              </button>
            </form>
          ) : (
            isOwner && (
              <p className="text-sm text-zinc-400 mb-4">
                Comments are disabled for private diaries.
              </p>
            )
          )
        ) : (
          <p className="text-sm text-zinc-500 mb-4">
            <Link href="/login" className="underline text-blue-600">
              Login
            </Link>{" "}
            to leave a comment.
          </p>
        )}

        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-zinc-400 text-sm">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c._id} className="card py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-medium text-sm">
                      {c.author?.username}
                    </span>
                    <span className="text-xs text-zinc-400 ml-2">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                    <p className="text-sm mt-1">{c.content}</p>
                  </div>
                  {/* Can delete if comment owner or diary owner */}
                  {user &&
                    (c.author?._id === user._id || isOwner) && (
                      <button
                        onClick={() => handleDeleteComment(c._id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Delete
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
