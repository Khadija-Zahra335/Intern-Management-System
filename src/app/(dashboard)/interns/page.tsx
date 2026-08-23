"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCohorts, getCohortMembers, type Membership } from "@/lib/api";
import { formatDate } from "@/lib/format";

type InternRow = Membership & { cohortName: string; cohortId: string };

const AVATAR_PALETTES = [
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function avatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

export default function InternsPage() {
  const [rows, setRows] = useState<InternRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const cohorts = await getCohorts();
        const memberLists = await Promise.all(
          cohorts.map((c) => getCohortMembers(c.id).then((members) => ({ cohort: c, members })))
        );
        const flat: InternRow[] = memberLists.flatMap(({ cohort, members }) =>
          members.map((m) => ({ ...m, cohortName: cohort.name, cohortId: cohort.id }))
        );
        flat.sort((a, b) => a.user.name.localeCompare(b.user.name));
        setRows(flat);
      } catch (err: any) {
        setError(err.message ?? "Failed to load interns");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Interns</h1>
        <p className="text-sm text-muted">All interns across every cohort. Click one to view their progress.</p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading interns…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No interns yet — add members from a cohort's detail page.</p>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted uppercase tracking-wide bg-accent-soft/30">
                <th className="px-5 py-3">Intern</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Cohort</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const palette = avatarPalette(r.id);
                return (
                  <tr key={r.id} className="hover:bg-accent-soft/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full ${palette.bg} ${palette.text} flex items-center justify-center text-sm font-bold shrink-0`}>
                          {r.user.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-semibold text-foreground truncate">{r.user.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted">{r.user.email}</td>
                    <td className="px-5 py-4 text-foreground">{r.cohortName}</td>
                    <td className="px-5 py-4 text-muted">{formatDate(r.joinedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/cohorts/${r.cohortId}/dashboard/${r.id}`}
                        className="rounded-lg border border-border text-foreground text-xs font-semibold px-3 py-1.5 hover:border-primary hover:text-primary transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}