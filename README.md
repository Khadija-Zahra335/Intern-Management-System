# Intern Management Platform

A full-stack internal platform built for Musketeer Tech to manage and scale its software development internship program. The system replaces an ad-hoc, manual process — weekly task assignment, progress tracking, mentor feedback, and LinkedIn cadence monitoring handled week by week over chat and spreadsheets — with a single structured tool that works across cohorts, not just the current one.

Mentors manage batches, assign weekly tasks, review submissions and progress, and leave rated feedback, with dashboards surfacing cohort-wide progress and individual intern trends. Interns get a scoped view of their own assignments, submissions, and feedback, enforced at the API layer through role-based, JWT-protected routes rather than in the UI alone.

## Overview

Two roles, one application:

- **Mentor** — admin-style role. Manages cohorts, assigns tasks, reviews submissions, leaves weekly feedback with a 1–5 rating, and tracks LinkedIn posting cadence across all interns.
- **Intern** — sees only their own tasks, attendance, feedback, and ratings. Submits work, updates progress, logs attendance, and logs LinkedIn posts.

Full functional requirements are in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | Next.js API routes — same project, not a separate server |
| Database | PostgreSQL via Prisma 7, hosted on Neon |
| Auth | JWT (`jsonwebtoken`), role-based, verified per-route |
| Validation | Zod |
| AI | Groq API (Llama) for AI-assisted task drafting |
| File storage | Cloudinary (submission attachments) |
| Deployment | Vercel |

## Status


Backend, database, and full frontend are built for both roles. Mentor-side: cohort management, AI-assisted and manual task creation/publishing, submission review, weekly feedback with rating trends, attendance monitoring (including a "Force Check-out" override for sessions an intern forgot to close), a cross-cohort dashboard with aggregate stats and pending-review queue, and a cross-cohort interns list. Intern-side: weekly task view, submission with file attachments, attendance clock-in/out, LinkedIn post logging, and feedback history. Both roles use a shared sidebar-based layout (no more top navbar).

Not yet done: **Vercel deployment** — the app currently only runs locally against Neon. The Week 7 stretch goal (a conversational analytics assistant) was explicitly optional and isn't built.



## Access control

Enforced at the API level, not just in the UI:

- Every route except `/api/auth/register` and `/api/auth/login` requires a valid JWT.
- Mentor-only routes reject interns with `403 Forbidden`. Missing or invalid tokens return `401 Unauthorized`.
- Identity is always resolved from the verified token, never from the request body or query string.
- Ownership is enforced on every intern-facing route via shared `getOwnedAssignment` and `getOwnedMembership` helpers (`src/lib/ownership.ts`). An intern reaching for a record that isn't theirs gets a `404`, not a `403` — the API never confirms that another intern's record exists in the first place.
- `403` is reserved for cases where the record is genuinely the caller's own but the specific action isn't allowed for their role — e.g. an intern can see their own assignment but can't set its status to `COMPLETED` (mentor-only).

## Mentor accounts are seeded, not registered

`POST /api/auth/register` creates `INTERN` accounts only — the role is a literal in the create call, so there is no code path that produces a mentor.

Mentor accounts are created by `prisma/seed.ts` from credentials in `.env`, and the credentials are handed over privately. The mentor then logs in through the same endpoint interns use.

This is a deliberate deviation from the task specification, which asked for registration supporting both roles. Without email verification (notifications are out of scope), any self-service mentor signup can be claimed by whoever registers the address first — a guessable address like `mentor@company.com` is a race, not a gate. Seeding closes it permanently and matches how internal admin tools actually work.

## Auth endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | Creates an intern account |
| POST | `/api/auth/login` | — | Verifies credentials, returns a JWT |
| GET | `/api/auth/me` | JWT | Returns the current user, read fresh from the database |

Protected requests send the token as a header:

```
Authorization: Bearer <token>
```


Tokens carry `{ userId, role }` and expire after 7 days. The payload is readable by anyone — the signature, computed with `JWT_SECRET`, is what prevents tampering.

`/api/auth/me` deliberately re-reads the user from the database rather than trusting the token payload, since a token is frozen at issue time and a role or account can change within its 7-day life.

## Feature endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/cohorts` | Mentor | Create a cohort |
| GET | `/api/cohorts` | Mentor | List all cohorts |
| POST | `/api/cohorts/[id]/members` | Mentor | Add an intern to a cohort by email (blocked if the cohort is archived) |
| GET | `/api/cohorts/[id]/members` | Mentor | List a cohort's active members |
| GET | `/api/cohorts/[id]/progress` | Mentor | One efficient query for per-member task completion %, LinkedIn weeks logged, and rating history |
| GET | `/api/me/memberships` | JWT | Lets a logged-in user discover their own cohort membership(s) |
| GET | `/api/interns` | Mentor | Every intern account across every cohort |
| POST | `/api/tasks` | Mentor | Create a task (starts in `DRAFT`; blocked if the cohort is archived) |
| GET | `/api/tasks` | Mentor | List tasks, optionally filtered by `cohortId` |
| POST | `/api/tasks/draft` | Mentor | AI-drafts a `{title, description}` from a plain-language topic — see above |
| PATCH | `/api/tasks/[id]` | Mentor | Edit a task — only `endDate` can change once published |
| POST | `/api/tasks/[id]/publish` | Mentor | Publish a task — auto-assigns it to every active member of its cohort in one transaction (blocked if the cohort is archived) |
| GET | `/api/tasks/[id]/assignments` | Mentor | Every intern's assignment status for one task |
| GET | `/api/assignment` | Mentor, Intern (own) | List assignments for a membership |
| PATCH | `/api/assignment/[id]/status` | Mentor, Intern (own) | Update an assignment's status (`COMPLETED` is mentor-only) |
| POST | `/api/assignment/[id]/activity` | Mentor, Intern (own) | Post an update to an assignment's activity thread |
| GET | `/api/assignment/[id]/activity` | Mentor, Intern (own) | Read an assignment's activity thread |
| POST | `/api/assignment/[id]/submissions` | Intern (own) | Submit work for review |
| GET | `/api/assignment/[id]/submissions` | Mentor, Intern (own) | List an assignment's submission history, including attachments |
| PATCH | `/api/submissions/[id]/review` | Mentor | Approve or reject a submission |
| POST | `/api/submissions/[id]/attachments` | Intern (own) | Upload a file (PDF/image/ZIP/Word/text, ≤4MB) to Cloudinary and attach it to a submission |
| GET | `/api/submissions/[id]/attachments` | Mentor, Intern (own) | List a submission's attachments |
| POST | `/api/attendance` | Intern, or Mentor (force-checkout only) | Log an attendance event. A mentor may only submit `CHECK_OUT`, to close a session an intern forgot to end |
| GET | `/api/attendance` | Mentor, Intern (own) | Read attendance history for a membership |
| POST | `/api/feedback` | Mentor | Give or revise feedback for a membership + week (1–5 rating) |
| GET | `/api/feedback` | Mentor, Intern (own) | Read feedback history for a membership |
| POST | `/api/linkedIn-posts` | Intern | Log a LinkedIn post for a membership + week |
| GET | `/api/linkedIn-posts` | Mentor, Intern (own) | Read LinkedIn post history for a membership |
| GET | `/api/dashboard/summary` | Mentor | Aggregate stats (active interns, tasks published this week, avg rating, LinkedIn posts this week) plus a per-cohort progress table |
| GET | `/api/dashboard/pending-reviews` | Mentor | Submissions awaiting review, across every cohort |

A few behaviors worth knowing before calling these:

- **Submissions are single-cycle**: submit → mentor approves (→ `COMPLETED`, locked) or rejects (→ `IN_PROGRESS`, resubmission allowed). No further submissions or attachments are accepted once `COMPLETED`.
- **Feedback is an upsert** keyed on `(membershipId, weekNumber)` — calling it again for the same week revises the existing rating and comment rather than creating a duplicate.
- **LinkedIn posts allow multiple entries per week** (only exact duplicate URLs are blocked) — counting posting cadence means counting distinct weeks, not rows.
- **Attendance timestamps are stored in UTC, but every day-boundary calculation is anchored to Pakistan time** (`src/lib/timezone.ts`), not the viewer's browser timezone — kept consistent between the late-checkout rule and the hours chart. A checkout at or after **8 PM PKT** requires a note of at least 5 words (mentor-forced checkouts are exempt — they get an automatic note instead). Daily/weekly/monthly/yearly work-hours aggregation (`src/lib/attendanceHours.ts`) sums check-in-to-check-out spans minus any lunch/AFK/break intervals, and **caps a single continuous session at the end of the PKT day it started on** — without that cap, a forgotten check-out would accrue hours indefinitely against that day every time the chart re-rendered. The attendance state machine (`CHECK_IN` → `IN` → `LUNCH_START` → `LUNCH`, etc.) is validated server-side against the membership's actual last-recorded event, not just gated by disabling buttons in the UI.

## Data model

Eleven models. Full ERD: [`docs/erd.svg`](docs/erd.svg) — generated from `schema.prisma` via `prisma-erd-generator`, so it stays in sync with the real schema.

| Model | Purpose |
|---|---|
| `User` | Anyone who logs in, with a `Role` enum |
| `Cohort` | One batch of interns, with an `isActive` flag for archiving |
| `Membership` | One person's enrollment in one cohort |
| `Task` | The instruction, written once by the mentor (manually or AI-drafted) |
| `TaskAssignment` | One intern's copy of a task, carrying their status |
| `TaskActivity` | Running update thread on one assignment |
| `Submission` | A finished deliverable |
| `Attachment` | File metadata on a submission (the file itself lives on Cloudinary) |
| `Attendance` | One row per clock event (check-in/out, lunch, AFK, break) |
| `Feedback` | Weekly 1–5 rating with comment |
| `LinkedInPost` | A logged LinkedIn post |

## Project structure


```
intern-management-platform/
├── prisma/
│   ├── schema.prisma          # 11 models, enums, relations
│   ├── migrations/            # version-controlled schema history
│   └── seed.ts                # mentor + cohorts + interns + tasks + attendance + feedback + LinkedIn posts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── cohorts/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/members/route.ts
│   │   │   ├── tasks/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/publish/route.ts
│   │   │   ├── assignments/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── status/route.ts
│   │   │   │       ├── activity/route.ts
│   │   │   │       └── submissions/route.ts
│   │   │   ├── submissions/[id]/review/route.ts
│   │   │   ├── attendance/route.ts
│   │   │   ├── feedback/route.ts
│   │   │   └── linkedin-posts/route.ts
│   │   ├── (auth)/            # login, register pages
│   │   └── (dashboard)/       # mentor + intern pages
│   ├── lib/
│   │   ├── prisma.ts          # shared Prisma client (hot-reload safe)
│   │   ├── password.ts        # hashPassword, verifyPassword
│   │   ├── jwt.ts              # signToken, verifyToken
│   │   ├── auth.ts             # getUserFromRequest, unauthorized, forbidden
│   │   ├── ownership.ts        # getOwnedAssignment, getOwnedMembership — shared 404-not-403 checks
│   │   ├── timezone.ts         # getPktHour — late-checkout rule support
│   │   └── validators/         # Zod schemas, one file per resource
│   ├── generated/prisma/       # Prisma client output (gitignored)
│   └── components/
├── docs/
│   ├── REQUIREMENTS.md
│   └── erd.svg
├── prisma.config.ts            # Prisma 7 — CLI datasource config
├── .env                        # not committed
└── package.json
```

## Getting started

```bash
git clone https://github.com/Khadija-Zahra335/Intern-Management-Platform.git
cd Intern-Management-Platform
npm install
```

Create `.env`:

```env
# Neon — pooled endpoint, used by the running app
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/DB?sslmode=require"

# Neon — direct endpoint, used by the Prisma CLI for migrations
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/DB?sslmode=require"

JWT_SECRET="a-long-random-secret"

# Seeded mentor account
MENTOR_EMAIL="mentor@example.com"
MENTOR_PASSWORD="a-strong-password"
MENTOR_NAME="Mentor Name"

GROQ_API_KEY=""
```

Generate a real secret rather than typing one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then set up the database, run migrations, and seed:

```bash
npx prisma generate
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev          # http://localhost:3000
```


## Progress log

- [x] Requirements broken down into epics and user stories
- [x] Initial ERD sketch
- [x] Repo initialized
- [x] `schema.prisma` written and migrated to Neon
- [x] Seed script — mentor account
- [x] Auth — register, login, `/me`, JWT issuing and verification
- [x] Role-based route protection, verified against intern and mentor tokens
- [x] Feature routes — cohorts, membership, tasks, assignments, submissions, attendance, feedback, LinkedIn posts
- [x] Ownership scoping on intern-facing routes (404-not-403)
- [x] Seed data — realistic multi-cohort dataset
- [x] Postman collection — full endpoint coverage, happy path + negative cases
- [ ] Submission attachments (Cloudinary)
- [ ] Dashboards — mentor cohort view, per-intern progress
- [ ] Frontend
- [ ] AI task drafting
- [ ] Deployed to Vercel