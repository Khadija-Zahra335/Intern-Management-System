"use client";

import { Sidebar } from "@/components/Sidebar";
import { RouteGuard } from "@/components/RouteGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowedRoles={["MENTOR"]}>
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0 px-8 py-8">
          <div className="max-w-7xl">{children}</div>
        </main>
      </div>
    </RouteGuard>
  );
}