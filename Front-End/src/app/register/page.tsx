"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthProvider";

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(username, email, password);
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Register</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="input"
          required
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="input"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="input"
          required
        />
        <button disabled={loading} className="btn-primary">
          {loading ? "Registering..." : "Register"}
        </button>
        {error && <div className="text-red-600">{error}</div>}
      </form>
    </div>
  );
}
