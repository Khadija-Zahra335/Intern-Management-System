# Intern Management Platform

A full-stack internal platform built for [Musketeer Tech](https://musketeerstech.com) to manage and scale its software development internship program. The system replaces an ad-hoc, manual process — weekly task assignment, progress tracking, mentor feedback, and LinkedIn cadence monitoring handled week by week over chat and spreadsheets — with a single structured tool that works across cohorts, not just the current one. Mentors manage batches, assign weekly tasks, review submissions and check-ins, and leave rated feedback, with dashboards surfacing cohort-wide progress and individual intern trends. Interns get a scoped view of their own assignments, submissions, and feedback, enforced at the API layer through role-based, JWT-protected routes rather than in the UI alone. 


## Overview

Two roles, one application:

- **Mentor** — admin-style role. Manages cohorts, assigns tasks, reviews
  submissions and check-ins, leaves weekly feedback with a 1–5 rating, and
  tracks LinkedIn posting cadence across all interns.
- **Intern** — sees only their own tasks, check-ins, feedback, and ratings.
  Submits work, logs progress, and logs LinkedIn posts.

Full functional requirements are in [`docs/REQUIREMENTS.md`](docs/RequirementDoc.docx).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Backend  | Next.js API routes — same project, not a separate server |
| Database | PostgreSQL via Prisma, hosted on Neon for deployment |
| Auth | JWT, role-based, verified per-route |
| AI | Groq API (Llama) for AI-assisted task drafting |
| Deployment | Vercel |



## Access control

Enforced at the API level, not just in the UI:

- Every route except `/api/auth/register` and `/api/auth/login` requires a
  valid JWT.
- Mentor-only routes reject interns with `403`.
- An intern can only ever read their own tasks, check-ins, and feedback.
  Attempting to read another intern's record returns `404`, not `403` — the
  API doesn't confirm that the record exists.
- Identity is always resolved from the verified token, never from the
  request body or query string.



Three decisions shape the schema:

- **`Membership`, not `User`, is what everything else attaches to.** An
  intern's identity within a cohort is a `Membership` row. This is what
  makes multi-cohort support (a person joining a future batch) work without
  merging their history together.
- **`Week` is a table, not an integer column.** Tasks, check-ins, feedback,
  and LinkedIn posts are all "per week" — a real `Week` row owned by a
  `Cohort` gives all of them one shared, queryable time axis.
- **`Task` and `TaskAssignment` are separate.** A `Task` is the content,
  written once by the mentor. A `TaskAssignment` is one intern's copy of it,
  carrying that intern's status. This is what makes the completion-rate
  dashboard a single query instead of a mess of duplicated task rows.

`schema.prisma` has not been written yet — this is the sketch stage.

## Project structure

```
intern-management-platform/
├── prisma/
│   ├── schema.prisma      # not yet written
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── api/           # backend — route handlers
│   │   ├── (auth)/        # login, register pages
│   │   └── (dashboard)/   # mentor + intern pages
│   ├── lib/
│   │   ├── prisma.ts      # shared Prisma client
│   │   ├── auth.ts        # withAuth wrapper
│   │   └── ownership.ts   # membership → user resolution
│   ├── validators/        # Zod schemas
│   └── components/
├── docs/
│   ├── REQUIREMENTS.md
│   ├── BACKLOG.md
│   └── erd.svg
├── .env                    # not committed
└── package.json
```

## Getting started

```bash
git clone https://github.com/Khadija-Zahra335/Intern-Management-Platform.git
cd Intern-Management-Platform
npm install
```

Create `.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/intern_platform?schema=public"
JWT_SECRET="a-long-random-secret"
GROQ_API_KEY=""
```

Database setup and `npx prisma migrate dev` will be added here once the
schema is written.

```bash
npm run dev
# http://localhost:3000
```

## Progress log

- [x] Requirements broken down into epics and user stories
- [x] Initial ERD sketch
- [x] Repo initialized
- [ ] `schema.prisma` written and migrated
- [ ] Seed data
- [ ] Auth (`withAuth`, JWT issuing/verification)
- [ ] API routes per epic
- [ ] Frontend
- [ ] AI task drafting
- [ ] Deployed to Vercel