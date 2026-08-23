"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
type NavItem = { href: string; label: string; icon: (props: { className?: string }) => React.JSX.Element };

const MENTOR_LINKS: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: IconGrid },
    { href: "/cohorts", label: "Cohorts", icon: IconUsers },
    { href: "/tasks", label: "Tasks", icon: TasksIcon },
    { href: "/interns", label: "Interns", icon: InternsIcon },
];

const INTERN_LINKS: NavItem[] = [
    { href: "/my-tasks", label: "My Tasks", icon: IconChecklist },
    { href: "/attendance", label: "Attendance", icon: IconClock },
    { href: "/linkedin", label: "LinkedIn", icon: IconLink },
    { href: "/feedback", label: "Feedback", icon: IconStar },
];

export function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const links = user?.role === "MENTOR" ? MENTOR_LINKS : user?.role === "INTERN" ? INTERN_LINKS : [];
    const portalLabel = user?.role === "MENTOR" ? "Mentor Portal" : user?.role === "INTERN" ? "Intern Portal" : "";

    return (
        <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-dark-bg border-r border-dark-border">
            <div className="px-5 pt-6 pb-5 flex items-center gap-3 border-b border-dark-border">
                <div className="w-10 h-10 shrink-0 relative">
                    <Image src="/logo.png" alt="Musketeer Tech logo" fill className="object-contain" priority />
                </div>
                <div className="leading-tight">
                    <p className="font-extrabold text-white tracking-tight">Musketeer Tech</p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-dark-muted">{portalLabel}</p>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {links.map((link) => {
                    const active = pathname === link.href || pathname?.startsWith(link.href + "/");
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-primary text-white" : "text-dark-muted hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-3 py-4 border-t border-dark-border">
                <div className="flex items-center gap-3 px-2 pb-3">
                    <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="leading-tight min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                        <p className="text-xs text-dark-muted capitalize">{user?.role?.toLowerCase()}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-dark-muted hover:bg-white/5 hover:text-white transition-colors"
                >
                    <IconSignOut className="w-5 h-5 shrink-0" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}


function IconGrid({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <rect x="2.5" y="2.5" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
            <rect x="11.5" y="2.5" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
            <rect x="2.5" y="11.5" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
            <rect x="11.5" y="11.5" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    );
}

function IconUsers({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12.8 11.7c2.1.2 3.7 1.8 3.7 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

function IconChecklist({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="3" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7.5 3V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M6.5 10l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconClock({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 6v4.2l2.8 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconLink({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M8 12l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8.5 5.5H6a3.5 3.5 0 0 0 0 7h2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M11.5 12.5H14a3.5 3.5 0 0 0 0-7h-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

function IconStar({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <path
                d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L10 2.5z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconSignOut({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
            <path d="M7.5 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 13.5L17 10l-4-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 10H7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}


function TasksIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function InternsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}