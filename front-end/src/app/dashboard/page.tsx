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

  if (authLoading) return <p>Loading...</p>;
  if (!token) return <p>Please <Link href="/login" className="underline">login</Link> to view your dashboard.</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📝 My Diaries</h1>
        <button onClick={openNewForm} className="btn-primary">
          + New Diary
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card mb-6 border-2 border-blue-300">
          <h2 className="font-semibold text-lg mb-3">
            {editingId ? "Edit Diary" : "New Diary"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Title"
              className="input"
              required
            />
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write your diary content..."
              className="input min-h-[150px] resize-y"
              required
            />
            <input
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="Tags (comma separated, e.g. daily, personal)"
              className="input"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formPublic}
                onChange={(e) => setFormPublic(e.target.checked)}
              />
              Make this diary public (others can read & comment)
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="btn-primary"
              >
                {formLoading
                  ? "Saving..."
                  : editingId
                  ? "Update"
                  : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
            {formError && <p className="text-red-600 text-sm">{formError}</p>}
          </form>
        </div>
      )}

      {/* Diary List */}
      {loading ? (
        <p>Loading diaries...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : diaries.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-lg">No diaries yet.</p>
          <p className="text-sm mt-1">Click &quot;+ New Diary&quot; to create your first entry!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {diaries.map((d) => (
            <li key={d._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/diary/${d._id}`}
                      className="font-semibold hover:underline"
                    >
                      {d.title}
                    </Link>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        d.isPublic
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {d.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">
                    {d.content.slice(0, 150)}
                    {d.content.length > 150 ? "..." : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-zinc-400">
                      {new Date(d.createdAt).toLocaleString()}
                    </span>
                    {d.tags?.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 ml-3">
                  <button
                    onClick={() => handleToggle(d._id)}
                    className="btn-ghost text-xs"
                    title={d.isPublic ? "Make Private" : "Make Public"}
                  >
                    {d.isPublic ? "🔒" : "🌐"}
                  </button>
                  <button
                    onClick={() => openEditForm(d)}
                    className="btn-ghost text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(d._id)}
                    className="btn-ghost text-xs text-red-500"
                  >
                    🗑️
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
