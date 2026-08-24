"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register, login, saveToken } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      const data = await login(email, password);
      saveToken(data.token);
      await refreshUser();
      router.push("/my-tasks");
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
        <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
        <p className="text-sm text-muted mb-7">Intern Management Platform</p>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full mb-4 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />

        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@musketeertech.com"
          className="w-full mb-4 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />

        <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-2 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
        <p className="text-xs text-muted mb-6">At least 8 characters.</p>

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60">
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-muted text-center mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}