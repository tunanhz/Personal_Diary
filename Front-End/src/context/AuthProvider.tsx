"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

type User = {
  _id: string;
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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
        setToken(parsed.token || null);
      } catch (e) {
        localStorage.removeItem("pd_auth");
      }
    }
    setLoading(false);
  }, []);

  const save = (u: User | null, t: string | null) => {
    setUser(u);
    setToken(t);
    if (u && t) {
      localStorage.setItem("pd_auth", JSON.stringify({ user: u, token: t }));
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
    save({ _id: d._id, username: d.username, email: d.email }, d.token);
    router.push("/dashboard");
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await apiFetch(`/auth/register`, {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    const d = res.data;
    save({ _id: d._id, username: d.username, email: d.email }, d.token);
    router.push("/dashboard");
  };

  const logout = () => {
    save(null, null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
