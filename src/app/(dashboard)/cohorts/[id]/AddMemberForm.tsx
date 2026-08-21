// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { addCohortMember, getInterns, Intern } from "@/lib/api";

// export function AddMemberForm({
//   cohortId,
//   existingEmails,
//   onAdded,
// }: {
//   cohortId: string;
//   existingEmails: string[];
//   onAdded: () => void;
// }) {
//   const [interns, setInterns] = useState<Intern[]>([]);
//   const [loadingInterns, setLoadingInterns] = useState(true);
//   const [query, setQuery] = useState("");
//   const [error, setError] = useState<string | null>(null);
//   const [addingEmail, setAddingEmail] = useState<string | null>(null);

//   useEffect(() => {
//     getInterns()
//       .then(setInterns)
//       .catch((err) => setError(err instanceof Error ? err.message : "Failed to load interns"))
//       .finally(() => setLoadingInterns(false));
//   }, []);

//   const existing = useMemo(() => new Set(existingEmails.map((e) => e.toLowerCase())), [existingEmails]);

//   const available = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     return interns
//       .filter((i) => !existing.has(i.email.toLowerCase()))
//       .filter((i) => !q || i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q));
//   }, [interns, existing, query]);

//   async function handleAdd(email: string) {
//     setError(null);
//     setAddingEmail(email);
//     try {
//       await addCohortMember(cohortId, email);
//       onAdded();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to add member");
//     } finally {
//       setAddingEmail(null);
//     }
//   }

//   return (
//     <div className="bg-white border border-border rounded-2xl p-5 mb-6">
//       <h2 className="font-semibold text-foreground mb-3">Add interns</h2>

//       <input
//         type="text"
//         value={query}
//         onChange={(e) => setQuery(e.target.value)}
//         placeholder="Search registered interns by name or email..."
//         className="w-full mb-3 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
//       />

//       {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

//       {loadingInterns ? (
//         <p className="text-sm text-muted">Loading registered interns...</p>
//       ) : available.length === 0 ? (
//         <p className="text-sm text-muted">
//           {interns.length === 0
//             ? "No intern accounts registered yet."
//             : "No interns match — everyone matching this search is already in the cohort."}
//         </p>
//       ) : (
//         <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
//           {available.map((intern) => (
//             <div key={intern.id} className="flex items-center justify-between px-4 py-2.5">
//               <div>
//                 <p className="text-sm font-medium text-foreground">{intern.name}</p>
//                 <p className="text-xs text-muted">{intern.email}</p>
//               </div>
//               <button
//                 onClick={() => handleAdd(intern.email)}
//                 disabled={addingEmail === intern.email}
//                 className="text-xs font-semibold text-primary hover:underline disabled:opacity-60 disabled:no-underline"
//               >
//                 {addingEmail === intern.email ? "Adding..." : "+ Add"}
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


"use client";

import { useEffect, useMemo, useState } from "react";
import { addCohortMember, getInterns, Intern } from "@/lib/api";

export function AddMemberForm({
  cohortId,
  existingEmails,
  onAdded,
}: {
  cohortId: string;
  existingEmails: string[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loadingInterns, setLoadingInterns] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addingEmail, setAddingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingInterns(true);
    getInterns()
      .then(setInterns)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load interns"))
      .finally(() => setLoadingInterns(false));
  }, [open]);

  const existing = useMemo(() => new Set(existingEmails.map((e) => e.toLowerCase())), [existingEmails]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return interns
      .filter((i) => !existing.has(i.email.toLowerCase()))
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q));
  }, [interns, existing, query]);

  async function handleAdd(email: string) {
    setError(null);
    setAddingEmail(email);
    try {
      await addCohortMember(cohortId, email);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingEmail(null);
    }
  }

  function close() {
    setOpen(false);
    setQuery("");
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold px-4 py-2.5"
      >
        + Add interns
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={close}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Add interns</h2>
              <button onClick={close} className="text-muted hover:text-foreground text-lg leading-none" aria-label="Close">
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search registered interns by name or email..."
                className="w-full mb-3 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />

              {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

              {loadingInterns ? (
                <p className="text-sm text-muted">Loading registered interns...</p>
              ) : available.length === 0 ? (
                <p className="text-sm text-muted">
                  {interns.length === 0
                    ? "No intern accounts registered yet."
                    : "No interns match — everyone matching this search is already in the cohort."}
                </p>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-border">
                  {available.map((intern) => (
                    <div key={intern.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{intern.name}</p>
                        <p className="text-xs text-muted">{intern.email}</p>
                      </div>
                      <button
                        onClick={() => handleAdd(intern.email)}
                        disabled={addingEmail === intern.email}
                        className="text-xs font-semibold text-primary hover:underline disabled:opacity-60 disabled:no-underline"
                      >
                        {addingEmail === intern.email ? "Adding..." : "+ Add"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}