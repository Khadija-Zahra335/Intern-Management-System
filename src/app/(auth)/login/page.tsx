"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, saveToken } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 relative shrink-0">
          <Image src="/logo.png" alt="Musketeer Tech logo" fill className="object-contain" priority />
        </div>
        <span className="font-extrabold text-lg tracking-tight text-foreground">Musketeer Tech</span>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-border rounded-2xl shadow-lg shadow-primary/5 p-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Sign in</h1>
        <p className="text-sm text-muted mb-7">Intern Management Platform</p>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

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

        <p className="text-sm text-muted text-center mt-5">
          New intern?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">Create an account</Link>
        </p>

      </form>
    </div>
  );
}