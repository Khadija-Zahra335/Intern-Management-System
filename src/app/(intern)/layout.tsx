"use client";

import { Navbar } from "@/components/Navbar";
import { RouteGuard } from "@/components/RouteGuard";

export default function InternLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["INTERN"]}>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">{children}</main>
      </div>
    </RouteGuard>
  );
}