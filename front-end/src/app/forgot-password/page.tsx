"use client";

import React, { useState } from "react";
import { apiFetch } from "../../lib/api";
import Link from "next/link";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(res.message);
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, newPassword }),
      });
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage("New OTP sent! Check your email.");
      setOtp("");
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 animate-fade-in">
      <div className="card overflow-hidden">
        {/* Gradient header */}
        <div
          className="gradient-bg -mx-6 -mt-6 px-6 pt-8 pb-6 mb-6 text-center"
          style={{ marginLeft: "-1.5rem", marginRight: "-1.5rem", marginTop: "-1.5rem" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">{step === "done" ? "✅" : "🔐"}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {step === "email" && "Forgot Password"}
            {step === "otp" && "Verify & Reset"}
            {step === "done" && "All Done!"}
          </h1>
          <p className="text-indigo-100 text-sm mt-1">
            {step === "email" && "We'll send a verification code to your email"}
            {step === "otp" && `Enter the code sent to ${email}`}
            {step === "done" && "Your password has been reset successfully"}
          </p>
        </div>

        {/* Step 1: Enter Email */}
        {step === "email" && (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                className="input"
                required
              />
            </div>

            <button disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send Reset Code →"
              )}
            </button>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 text-center">
                {error}
              </div>
            )}
          </form>
        )}

        {/* Step 2: Enter OTP + New Password */}
        {step === "otp" && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            {message && (
              <div className="bg-green-50 text-green-600 text-sm p-3 rounded-xl border border-green-200 text-center flex items-center justify-center gap-2">
                <span>✉️</span> {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code (OTP)</label>
              <input
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(val);
                }}
                placeholder="Enter 6-digit code"
                className="input text-center text-2xl font-bold tracking-[0.5em] placeholder:text-sm placeholder:tracking-normal placeholder:font-normal"
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  type={showPassword ? "text" : "password"}
                  className="input pr-11"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button disabled={loading || otp.length !== 6} className="btn-primary w-full py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : (
                "Reset Password →"
              )}
            </button>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 text-center">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); setMessage(null); }}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Password Reset Successful!</h3>
            <p className="text-sm text-slate-500 mb-6">You can now sign in with your new password.</p>
            <Link href="/login" className="btn-primary inline-flex py-2.5 px-8">
              Go to Login →
            </Link>
          </div>
        )}

        {step !== "done" && (
          <>
            <div className="divider" />
            <p className="text-center text-sm text-slate-500">
              Remember your password?{" "}
              <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
