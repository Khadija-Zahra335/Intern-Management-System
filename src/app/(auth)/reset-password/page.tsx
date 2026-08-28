"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api";
import { AuthCard } from "@/components/AuthCard";
import { PasswordInput } from "@/components/PasswordInput";
import { FormLabel } from "@/components/FormLabel";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        This reset link is missing its token. Please request a new one from the{" "}
        <Link href="/forgot-password" className="underline font-medium">forgot password</Link> page.
      </p>
    );
  }

  if (done) {
    return (
      <div>
        <p className="mb-6 text-sm text-foreground bg-accent-soft border border-border rounded-lg px-3 py-3">
          Your password has been updated.
        </p>
        <Link href="/login" className="w-full inline-block text-center rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <FormLabel required>New password</FormLabel>
      <PasswordInput required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} wrapperClassName="mb-4" />

      <FormLabel required>Confirm new password</FormLabel>
      <PasswordInput required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} wrapperClassName="mb-2" />
      <p className="text-xs text-muted mb-6">At least 8 characters.</p>

      <button type="submit" disabled={loading}
        className="w-full rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60">
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Set a new password" subtitle="Intern Management Platform">
      <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}