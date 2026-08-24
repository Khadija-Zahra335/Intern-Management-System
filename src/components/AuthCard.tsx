import Image from "next/image";
import { ReactNode } from "react";

// Shared shell for every (auth) page — login, register, forgot-password,
// reset-password, login/verify. Keeps the logo block, spacing, and card
// styling in one place instead of duplicated per page.
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 relative shrink-0">
          <Image src="/logo.png" alt="Musketeer Tech logo" fill className="object-contain" priority />
        </div>
        <span className="font-extrabold text-lg tracking-tight text-foreground">Musketeer Tech</span>
      </div>
      <div className="w-full max-w-sm bg-white border border-border rounded-2xl shadow-lg shadow-primary/5 p-8">
        <h1 className="text-2xl font-bold text-foreground mb-1 text-center">{title}</h1>
        <p className="text-sm text-muted mb-7 text-center">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
