"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import { apiFetch } from "../../lib/api";

export default function DashboardPage() {
  const { token, user, logout } = useAuth();
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchMy = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/diaries/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setDiaries(data.data || []);
      } catch (e: any) {
        setError(e.message || "Failed to load diaries");
      } finally {
        setLoading(false);
      }
    };
    fetchMy();
  }, [token]);

  if (!token) {
    return <div>Please login to view your dashboard.</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Hi, {user?.username}</h1>
        <div>
          <button onClick={logout} className="btn-ghost">Logout</button>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-2">Your Diaries</h2>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : diaries.length === 0 ? (
          <div>No diaries yet. Create one from the app later.</div>
        ) : (
          <ul className="space-y-3">
            {diaries.map((d) => (
              <li key={d._id} className="p-3 border rounded bg-white">
                <div className="flex justify-between">
                  <strong>{d.title}</strong>
                  <span className="text-sm text-zinc-500">{new Date(d.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-zinc-700 mt-1">{d.content?.slice(0, 120)}{d.content?.length>120?"...":""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
