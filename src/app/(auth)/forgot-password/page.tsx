"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";
import { AuthCard } from "@/components/AuthCard";
import { FormLabel } from "@/components/FormLabel";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Forgot password" subtitle="We'll email you a link to reset it.">
      {sent ? (
        <div>
          <p className="mb-6 text-sm text-foreground bg-accent-soft border border-border rounded-lg px-3 py-3">
            If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a password reset link. It expires in 30 minutes.
          </p>
          <Link href="/login" className="w-full inline-block text-center rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <FormLabel required>Email</FormLabel>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@musketeertech.com"
            className="w-full mb-6 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60">
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <p className="text-sm text-muted text-center mt-5">
            Remembered it?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
