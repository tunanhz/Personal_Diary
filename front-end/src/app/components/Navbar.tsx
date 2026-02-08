"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthProvider";

export default function Navbar() {
  const { user, token, logout } = useAuth();

  return (
    <nav className="w-full border-b border-slate-200 bg-white/90 backdrop-blur-md py-3 px-6 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">📓</span>
          <span className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">
            Personal Diary
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          >
            🌐 Explore
          </Link>

          {token && user ? (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                📝 My Diaries
              </Link>

              <div className="w-px h-5 bg-slate-200 mx-1" />

              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <span className="avatar">{user.username.charAt(0)}</span>
                )}
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">
                  {user.fullName || user.username}
                </span>
              </Link>

              <button
                onClick={logout}
                className="ml-1 px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                Sign In
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
