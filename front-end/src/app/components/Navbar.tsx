"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthProvider";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/60 py-2.5 px-6 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <div className="w-15 h-15 rounded-xl gradient-bg flex items-center justify-center shadow-md shadow-indigo-200/50 group-hover:shadow-lg group-hover:shadow-indigo-300/50 transition-all">
            <span className="text-white text-lg">
              <img src="/icons/logo.png" alt="" />
            </span>
          </div>
          <span className="font-bold text-lg gradient-text">
            Personal Diary
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="px-3.5 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1.5 font-medium"
          >
            🌍 Explore
          </Link>

          {token && user ? (
            <>
              <Link
                href="/dashboard"
                className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-1.5"
              >
                📝 My Diaries
              </Link>

              <div className="w-px h-5 bg-slate-200 mx-2" />

              <Link href="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity px-2 py-1 rounded-lg hover:bg-slate-50">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
                  />
                ) : (
                  <span className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{user.username.charAt(0)}</span>
                )}
                <span className="text-sm font-medium text-slate-700 hidden lg:inline">
                  {user.fullName || user.username}
                </span>
              </Link>

              <button
                onClick={logout}
                className="ml-1 px-3 py-2 text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-2 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all font-medium"
              >
                Sign In
              </Link>
              <Link href="/register" className="btn-primary text-sm ml-1">
                ✨ Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          <span className={`block w-5 h-0.5 bg-slate-600 transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-5 h-0.5 bg-slate-600 transition-all duration-300 ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-slate-600 transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden mt-3 pb-3 border-t border-slate-100 pt-3 animate-fade-in">
          <div className="flex flex-col gap-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all font-medium">
              🌍 Explore
            </Link>

            {token && user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  📝 My Diaries
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{user.username.charAt(0)}</span>
                  )}
                  {user.fullName || user.username}
                </Link>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="px-3 py-2.5 text-sm text-left text-red-500 hover:bg-red-50 rounded-lg transition-all font-medium">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all font-medium">
                  Sign In
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="btn-primary text-sm mx-3 mt-1">
                  ✨ Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
