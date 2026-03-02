"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

type User = {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  avatar: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem("pd_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user || null);
        setToken(parsed.accessToken || null);
      } catch (e) {
        localStorage.removeItem("pd_auth");
      }
    }
    setLoading(false);
  }, []);

  // Lắng nghe event token-refreshed từ api.ts để cập nhật state
  useEffect(() => {
    const handleTokenRefreshed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.accessToken) {
        setToken(detail.accessToken);
      }
    };

    const handleForceLogout = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem("pd_auth");
      router.push("/login");
    };

    window.addEventListener("token-refreshed", handleTokenRefreshed);
    window.addEventListener("force-logout", handleForceLogout);

    return () => {
      window.removeEventListener("token-refreshed", handleTokenRefreshed);
      window.removeEventListener("force-logout", handleForceLogout);
    };
  }, [router]);

  const save = (u: User | null, accessToken: string | null, refreshToken: string | null) => {
    setUser(u);
    setToken(accessToken);
    if (u && accessToken && refreshToken) {
      localStorage.setItem("pd_auth", JSON.stringify({ user: u, accessToken, refreshToken }));
    } else {
      localStorage.removeItem("pd_auth");
    }
  };

  const login = async (email: string, password: string) => {
    const res = await apiFetch(`/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const d = res.data;
    save(
      { _id: d._id, username: d.username, email: d.email, fullName: d.fullName || "", avatar: d.avatar || "" },
      d.accessToken,
      d.refreshToken
    );
    router.push("/dashboard");
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await apiFetch(`/auth/register`, {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    const d = res.data;
    save(
      { _id: d._id, username: d.username, email: d.email, fullName: d.fullName || "", avatar: d.avatar || "" },
      d.accessToken,
      d.refreshToken
    );
    router.push("/dashboard");
  };

  const logout = async () => {
    // Gọi API logout để xóa refresh token phía server
    try {
      if (token) {
        await apiFetch(`/auth/logout`, { method: "POST" }, token);
      }
    } catch {
      // Ignore errors khi logout
    }
    save(null, null, null);
    router.push("/");
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      const stored = localStorage.getItem("pd_auth");
      let refreshToken: string | null = null;
      if (stored) {
        try {
          refreshToken = JSON.parse(stored).refreshToken || null;
        } catch {}
      }
      save(updated, token, refreshToken);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
