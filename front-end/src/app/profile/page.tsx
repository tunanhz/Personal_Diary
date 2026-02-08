"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthProvider";
import { apiFetch } from "../../lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, token, loading, updateUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !token) {
      router.push("/login");
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setPreview(user.avatar || "");
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPG, PNG, GIF and WebP images are allowed");
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    setAvatarFile(file);

    // Create local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await apiFetch(
        "/auth/profile",
        {
          method: "PUT",
          body: formData,
        },
        token
      );

      updateUser({ fullName: res.data.fullName, avatar: res.data.avatar });
      setAvatarFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 mt-4">
        <div className="card">
          <div className="skeleton h-7 w-1/3 mb-6" />
          <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4" />
          <div className="skeleton h-4 w-2/3 mx-auto mb-3" />
          <div className="skeleton h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto mt-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors mb-4"
      >
        {"\u2190"} Back to Dashboard
      </Link>

      <div className="card">
        <h1 className="text-xl font-bold text-slate-800 mb-6">
          {"\u2699\uFE0F"} Edit Profile
        </h1>

        {/* Avatar Preview */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            {preview ? (
              <img
                src={preview}
                alt="Avatar preview"
                className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow-md"
                onError={() => setPreview("")}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                {(fullName || user.username).charAt(0).toUpperCase()}
              </div>
            )}

            {/* Overlay on hover */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <span className="text-white text-sm font-medium">
                {"\uD83D\uDCF7"}
              </span>
            </button>
          </div>

          <p className="text-sm text-slate-500 mt-2">@{user.username}</p>
          <p className="text-xs text-slate-400">{user.email}</p>

          {/* File actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              {preview ? "Change photo" : "Upload photo"}
            </button>
            {preview && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                >
                  Remove
                </button>
              </>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {avatarFile && (
            <p className="text-xs text-indigo-500 mt-1">
              {"\u2705"} {avatarFile.name} ({(avatarFile.size / 1024).toFixed(0)} KB) ready to upload
            </p>
          )}
        </div>

        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg border border-green-200 mb-4 text-center">
            {"\u2705"} Profile updated successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="input"
              maxLength={100}
            />
            <p className="text-xs text-slate-400 mt-1">
              This will be displayed alongside your username.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setFullName(user.fullName || "");
                setAvatarFile(null);
                setPreview(user.avatar || "");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="btn-secondary flex-1"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
