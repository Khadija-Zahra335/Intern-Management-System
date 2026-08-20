"use client";

import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-border bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-extrabold text-lg tracking-tight text-foreground">Musketeer Tech</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{user?.name}</span>
          <button onClick={logout} className="text-sm font-medium text-primary hover:underline">
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}