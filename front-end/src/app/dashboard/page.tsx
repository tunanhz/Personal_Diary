"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import { apiFetch } from "../../lib/api";
import Link from "next/link";

type DiaryImage = {
  url: string;
  publicId: string;
};

type Diary = {
  _id: string;
  title: string;
  content: string;
  visibility: "public" | "private" | "friends";
  isPublic?: boolean; // backwards compatibility if needed
  tags: string[];
  images: DiaryImage[];
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
  const [formVisibility, setFormVisibility] = useState<"public" | "private" | "friends">("private");
  const [formTags, setFormTags] = useState("");
  const [formImages, setFormImages] = useState<File[]>([]);
  const [formImagePreviews, setFormImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<DiaryImage[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);
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
    setFormVisibility("private");
    setFormTags("");
    setFormImages([]);
    setFormImagePreviews([]);
    setExistingImages([]);
    setRemoveImageIds([]);
    setFormError(null);
    setShowForm(true);
  };

  // Open form for editing
  const openEditForm = (d: Diary) => {
    setEditingId(d._id);
    setFormTitle(d.title);
    setFormContent(d.content);
    setFormVisibility(d.visibility || (d.isPublic ? "public" : "private"));
    setFormTags(d.tags?.join(", ") || "");
    setFormImages([]);
    setFormImagePreviews([]);
    setExistingImages(d.images || []);
    setRemoveImageIds([]);
    setFormError(null);
    setShowForm(true);
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length - removeImageIds.length + formImages.length + files.length;
    if (totalImages > 5) {
      setFormError("Maximum 5 images allowed per diary entry.");
      return;
    }
    setFormImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setFormImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(formImagePreviews[index]);
    setFormImages((prev) => prev.filter((_, i) => i !== index));
    setFormImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const markExistingImageForRemoval = (publicId: string) => {
    setRemoveImageIds((prev) => [...prev, publicId]);
  };

  const undoRemoveExistingImage = (publicId: string) => {
    setRemoveImageIds((prev) => prev.filter((id) => id !== publicId));
  };

  // Submit form (create or update) - using FormData
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const formData = new FormData();
    formData.append("title", formTitle);
    formData.append("content", formContent);
    formData.append("visibility", formVisibility);
    formData.append(
      "tags",
      JSON.stringify(
        formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );

    // Append new images
    formImages.forEach((file) => {
      formData.append("images", file);
    });

    // Append image removal list (only for edit)
    if (editingId && removeImageIds.length > 0) {
      formData.append("removeImageIds", JSON.stringify(removeImageIds));
    }

    try {
      if (editingId) {
        await apiFetch(`/diaries/${editingId}`, {
          method: "PUT",
          body: formData,
        }, token);
      } else {
        await apiFetch("/diaries", {
          method: "POST",
          body: formData,
        }, token);
      }
      // Cleanup preview URLs
      formImagePreviews.forEach((url) => URL.revokeObjectURL(url));
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
    <div className="empty-state mt-12 animate-fade-in">
      <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200/50">
        <span className="text-3xl">🔒</span>
      </div>
      <h3 className="text-xl">Please sign in</h3>
      <p>You need to log in to view your dashboard</p>
      <Link href="/login" className="btn-primary mt-4 inline-flex">Sign In →</Link>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            📝 <span className="gradient-text">My Diaries</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {diaries.length} {diaries.length === 1 ? "entry" : "entries"} total
          </p>
        </div>
        <button onClick={openNewForm} className="btn-primary flex items-center gap-1.5">
          ✏️ New Entry
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card-highlight mb-6 animate-fade-in">
          <h2 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2">
            {editingId ? "✏️" : "🚀"} {editingId ? "Edit Diary" : "New Diary Entry"}
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

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                📷 Images <span className="text-slate-400 font-normal">(max 5, up to 5MB each)</span>
              </label>

              {/* Existing images (edit mode) */}
              {existingImages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {existingImages.map((img) => {
                    const isMarkedForRemoval = removeImageIds.includes(img.publicId);
                    return (
                      <div key={img.publicId} className="relative group">
                        <img
                          src={img.url}
                          alt=""
                          className={`w-20 h-20 object-cover rounded-lg border-2 transition-all ${
                            isMarkedForRemoval
                              ? "opacity-30 border-red-300"
                              : "border-slate-200"
                          }`}
                        />
                        {isMarkedForRemoval ? (
                          <button
                            type="button"
                            onClick={() => undoRemoveExistingImage(img.publicId)}
                            className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-500/30 transition-all"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markExistingImageForRemoval(img.publicId)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New image previews */}
              {formImagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formImagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={src}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg border-2 border-indigo-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {(existingImages.length - removeImageIds.length + formImages.length) < 5 && (
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg cursor-pointer transition-colors border border-dashed border-slate-300">
                  <span>📎 Add Images</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-3">Who can see this?</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "private", label: "Private", icon: "🔒", desc: "Only you" },
                  { value: "friends", label: "Friends", icon: "👥", desc: "Your friends" },
                  { value: "public", label: "Public", icon: "🌍", desc: "Everyone" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormVisibility(opt.value as any)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                      formVisibility === opt.value
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-transparent bg-white hover:border-slate-200"
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span className="text-xs font-bold text-slate-700">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 leading-none">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

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
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">📖</span>
          </div>
          <h3>Your diary is empty</h3>
          <p>Click &quot;New Entry&quot; to start writing your first diary!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {diaries.map((d) => (
            <div key={d._id} className="card group animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/diary/${d._id}`}
                      className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-[15px]"
                    >
                      {d.title}
                    </Link>
                    <span className={
                      d.visibility === "public" ? "badge-public" : 
                      d.visibility === "friends" ? "badge-friends" : "badge-private"
                    }>
                      {d.visibility === "public" ? "🌍 Public" : 
                       d.visibility === "friends" ? "👥 Friends" : "🔒 Private"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    {d.content.slice(0, 180)}
                    {d.content.length > 180 ? "..." : ""}
                  </p>

                  {/* Image thumbnails */}
                  {d.images?.length > 0 && (
                    <div className="flex gap-2 mt-2.5">
                      {d.images.slice(0, 3).map((img, i) => (
                        <div key={img.publicId} className="relative rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                          <img
                            src={img.url}
                            alt=""
                            className="w-20 h-20 object-cover hover:scale-105 transition-transform duration-200"
                          />
                          {i === 2 && d.images.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                              +{d.images.length - 3}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-slate-400">
                      📅 {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                    {d.tags?.map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggle(d._id)}
                    className="btn-ghost"
                    title={`Current: ${d.visibility}. Click to toggle.`}
                  >
                    {d.visibility === "public" ? "🔒" : "🌍"}
                  </button>
                  <button
                    onClick={() => openEditForm(d)}
                    className="btn-ghost"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(d._id)}
                    className="btn-danger"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
