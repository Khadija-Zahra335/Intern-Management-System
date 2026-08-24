"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, saveToken, requestMagicLink } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";

type Mode = "password" | "magic-link";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState<Mode>("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      saveToken(data.token);
      await refreshUser();
      router.push(data.user.role === "MENTOR" ? "/dashboard" : "/my-tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMagicLinkSent(false);
  }

  return (
    <AuthCard title="Sign in" subtitle="Intern Management Platform">
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {mode === "password" && (
        <form onSubmit={handlePasswordSubmit}>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@musketeertech.com"
            className="w-full mb-4 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />

          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60">
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button type="button" onClick={() => switchMode("magic-link")}
            className="w-full text-center text-xs font-medium text-primary hover:underline mt-4">
            Email me a sign-in link instead
          </button>
        </form>
      )}

      {mode === "magic-link" && magicLinkSent && (
        <div>
          <p className="mb-6 text-sm text-foreground bg-accent-soft border border-border rounded-lg px-3 py-3">
            If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a sign-in link. It expires in 15 minutes.
          </p>
          <button type="button" onClick={() => switchMode("password")}
            className="w-full text-center text-xs font-medium text-primary hover:underline">
            Use your password instead
          </button>
        </div>
      )}

      {mode === "magic-link" && !magicLinkSent && (
        <form onSubmit={handleMagicLinkSubmit}>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@musketeertech.com"
            className="w-full mb-6 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60">
            {loading ? "Sending..." : "Email me a sign-in link"}
          </button>

          <button type="button" onClick={() => switchMode("password")}
            className="w-full text-center text-xs font-medium text-primary hover:underline mt-4">
            Use your password instead
          </button>
        </form>
      )}

      <p className="text-sm text-muted text-center mt-5">
        New intern?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">Create an account</Link>
      </p>
    </AuthCard>
  );
}
