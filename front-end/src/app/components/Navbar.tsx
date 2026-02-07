"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthProvider";

export default function Navbar() {
  const { user, token, logout } = useAuth();

  return (
    <nav className="w-full border-b border-zinc-200 bg-white/80 backdrop-blur py-3 px-6 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          📓 Personal Diary
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Public Feed
          </Link>

          {token && user ? (
            <>
              <Link href="/dashboard" className="hover:underline font-medium">
                Dashboard
              </Link>
              <span className="text-zinc-400">|</span>
              <span className="text-zinc-600">Hi, {user.username}</span>
              <button onClick={logout} className="btn-ghost text-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Login
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
