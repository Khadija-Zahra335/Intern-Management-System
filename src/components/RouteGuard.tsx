"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function RouteGuard({
  children,
  allowedRoles = ["MENTOR"],
}: {
  children: ReactNode;
  allowedRoles?: Array<"MENTOR" | "INTERN">;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="text-sm text-muted max-w-sm text-center">
          You don&apos;t have access to this area.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}