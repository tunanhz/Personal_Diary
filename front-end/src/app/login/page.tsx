"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="card">
        <div className="text-center mb-6">
          <span className="text-4xl">🔐</span>
          <h1 className="text-2xl font-bold mt-2 text-slate-800">Welcome Back</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your Personal Diary</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              className="input"
              required
            />
          </div>

          <button disabled={loading} className="btn-primary w-full mt-1">
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
        </form>

        <div className="divider" />

        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-indigo-600 font-medium hover:underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
