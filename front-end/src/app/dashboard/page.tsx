"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import { apiFetch } from "../../lib/api";
import Link from "next/link";

type Diary = {
  _id: string;
  title: string;
  content: string;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
};

export default function DashboardPage() {
  const { token, user, loading: authLoading } = useAuth();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPublic, setFormPublic] = useState(false);
  const [formTags, setFormTags] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchMyDiaries = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch("/diaries/my?limit=50", {}, token);
      setDiaries(res.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchMyDiaries();
  }, [token, fetchMyDiaries]);

  // Open form for new diary
  const openNewForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormContent("");
    setFormPublic(false);
    setFormTags("");
    setFormError(null);
    setShowForm(true);
  };

  // Open form for editing
  const openEditForm = (d: Diary) => {
    setEditingId(d._id);
    setFormTitle(d.title);
    setFormContent(d.content);
    setFormPublic(d.isPublic);
    setFormTags(d.tags?.join(", ") || "");
    setFormError(null);
    setShowForm(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const body = {
      title: formTitle,
      content: formContent,
      isPublic: formPublic,
      tags: formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        await apiFetch(`/diaries/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        }, token);
      } else {
        await apiFetch("/diaries", {
          method: "POST",
          body: JSON.stringify(body),
        }, token);
      }
      setShowForm(false);
      fetchMyDiaries();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete diary
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this diary?")) return;
    try {
      await apiFetch(`/diaries/${id}`, { method: "DELETE" }, token);
      fetchMyDiaries();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle visibility
  const handleToggle = async (id: string) => {
    try {
      await apiFetch(`/diaries/${id}/toggle-visibility`, {
        method: "PATCH",
      }, token);
      fetchMyDiaries();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading) return (
    <div className="divide-y divide-slate-200">
      {[1, 2, 3].map((i) => (
        <div key={i} className="py-4">
          <div className="skeleton h-4 w-1/2 mb-2" />
          <div className="skeleton h-3 w-full mb-1.5" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      ))}
    </div>
  );

  if (!token) return (
    <div className="empty-state mt-12">
      <div className="icon"><img src="/icons/icons8-lock-30.png" alt="" className="w-14 h-14 mx-auto" /></div>
      <h3>Please sign in</h3>
      <p>You need to log in to view your dashboard</p>
      <Link href="/login" className="btn-primary mt-4 inline-flex">Sign In</Link>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><img src="/icons/icons8-note-26.png" alt="" className="w-7 h-7" /> My Diaries</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {diaries.length} {diaries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <button onClick={openNewForm} className="btn-primary flex items-center gap-1.5">
          <img src="/icons/icons8-edit-24.png" alt="" className="w-[18px] h-[18px] invert" /> New Entry
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card-highlight mb-6">
          <h2 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2">
            <img src={editingId ? "/icons/icons8-edit-24.png" : "/icons/icons8-edit-24.png"} alt="" className="w-5 h-5" />
            {editingId ? "Edit Diary" : "New Diary Entry"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Give your entry a title..."
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Write your thoughts, feelings, experiences..."
                className="input min-h-[180px] resize-y"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tags <span className="text-slate-400 font-normal">(comma separated)</span>
              </label>
              <input
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="e.g. daily, travel, thoughts"
                className="input"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={formPublic}
                onChange={(e) => setFormPublic(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <div>
                <span className="font-medium text-slate-700">Make public</span>
                <span className="text-slate-400 ml-1">(others can read &amp; comment)</span>
              </div>
            </label>

            <div className="flex gap-2">
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? "Saving..." : editingId ? "💾 Update" : "🚀 Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
            {formError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {formError}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Diary List */}
      {loading ? (
        <div className="divide-y divide-slate-200">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-4">
              <div className="skeleton h-4 w-1/2 mb-2" />
              <div className="skeleton h-3 w-full mb-1.5" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>
      ) : diaries.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><img src="/icons/icons8-open-book.gif" alt="" className="w-14 h-14 mx-auto" /></div>
          <h3>Your diary is empty</h3>
          <p>Click &quot;New Entry&quot; to start writing your first diary!</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {diaries.map((d) => (
            <li key={d._id} className="py-4 first:pt-0 last:pb-0 group">
              <div className="flex items-start justify-between gap-3">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/diary/${d._id}`}
                      className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
                    >
                      {d.title}
                    </Link>
                    <span className={d.isPublic ? "badge-public" : "badge-private"}>
                      {d.isPublic ? "🌐 Public" : <><img src="/icons/icons8-lock-30.png" alt="" className="w-3.5 h-3.5 inline mr-0.5" />Private</>}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    {d.content.slice(0, 180)}
                    {d.content.length > 180 ? "..." : ""}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">
                      📅 {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                    {d.tags?.map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggle(d._id)}
                    className="btn-ghost"
                    title={d.isPublic ? "Make Private" : "Make Public"}
                  >
                    {d.isPublic ? <img src="/icons/icons8-lock-30.png" alt="Lock" className="w-[18px] h-[18px]" /> : "🌐"}
                  </button>
                  <button
                    onClick={() => openEditForm(d)}
                    className="btn-ghost"
                    title="Edit"
                  >
                    <img src="/icons/icons8-edit-24.png" alt="Edit" className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    onClick={() => handleDelete(d._id)}
                    className="btn-danger"
                    title="Delete"
                  >
                    <img src="/icons/icons8-garbage.gif" alt="Delete" className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
