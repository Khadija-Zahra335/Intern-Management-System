"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const MENTOR_LINKS = [{ href: "/cohorts", label: "Cohorts" }];

const INTERN_LINKS = [
  { href: "/my-tasks", label: "My Tasks" },
  { href: "/attendance", label: "Attendance" },
  { href: "/linkedin", label: "LinkedIn" },
  { href: "/feedback", label: "Feedback" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const links = user?.role === "MENTOR" ? MENTOR_LINKS : user?.role === "INTERN" ? INTERN_LINKS : [];

  return (
    <nav className="border-b border-border bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-extrabold text-lg tracking-tight text-foreground">Musketeer Tech</span>
          </div>

          {links.length > 0 && (
            <div className="flex items-center gap-1">
              {links.map((link) => {
                const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      active
                        ? "bg-accent-soft text-primary"
                        : "text-muted hover:text-foreground hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            <div className="w-8 h-8 rounded-full bg-accent-soft text-primary flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
} 