"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyMagicLink, saveToken } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthCard } from "@/components/AuthCard";

function VerifyMagicLink() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const token = searchParams.get("token") ?? "";

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("This sign-in link is missing its token.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await verifyMagicLink(token);
        if (cancelled) return;
        saveToken(data.token);
        await refreshUser();
        router.push(data.user.role === "MENTOR" ? "/dashboard" : "/my-tasks");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div>
        <p className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        <Link href="/login" className="w-full inline-block text-center rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold py-2.5 transition-colors">
          Back to sign in
        </Link>
      </div>
    );
  }

  return <p className="text-sm text-muted text-center">Signing you in...</p>;
}

export default function VerifyMagicLinkPage() {
  return (
    <AuthCard title="Signing in" subtitle="Verifying your sign-in link...">
      <Suspense fallback={<p className="text-sm text-muted text-center">Loading...</p>}>
        <VerifyMagicLink />
      </Suspense>
    </AuthCard>
  );
}
