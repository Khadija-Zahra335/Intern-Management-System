# Intern Management Platform

A full-stack internal platform built for Musketeer Tech to manage and scale its software development internship program. The system replaces an ad-hoc, manual process — weekly task assignment, progress tracking, mentor feedback, and LinkedIn cadence monitoring handled week by week over chat and spreadsheets — with a single structured tool that works across cohorts, not just the current one.

Mentors manage cohorts, assign weekly tasks, review submissions and progress, and leave rated feedback, with dashboards surfacing cohort-wide progress and individual intern trends — plus an AI analytics assistant they can ask open-ended questions about any intern. Interns get a scoped view of their own assignments, submissions, and feedback, enforced at the API layer through role-based, JWT-protected routes rather than in the UI alone.

**Live:** deployed on Vercel, running against a Neon Postgres database. *(Add the deployed URL here.)*

## Overview

Two roles, one application:

- **Mentor** — admin-style role. Manages cohorts, assigns tasks (manually or AI-drafted), reviews submissions, leaves weekly feedback with a 1–5 rating, tracks LinkedIn posting cadence, and can ask a RAG-powered assistant open-ended questions about any intern's progress.
- **Intern** — sees only their own tasks, attendance, feedback, and ratings. Submits work with file attachments, updates progress, logs attendance, and logs LinkedIn posts.

Full functional requirements are in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS v4 (`@theme inline`, no config file) |
| Backend | Next.js API routes — same project, not a separate server |
| Database | PostgreSQL via Prisma 7, hosted on Neon |
| Auth | JWT (`jsonwebtoken`), role-based, verified per-route; password reset & magic-link sign-in via single-use emailed tokens |
| Validation | Zod |
| Task drafting AI | Groq API (Llama) — drafts a task title/description from a plain-language topic |
| Analytics assistant AI | RAG pipeline: Cohere embeddings + rerank, Pinecone vector store, Groq for the final answer, streamed via SSE |
| Email | Resend (password reset & magic-link emails) |
| File storage | Cloudinary (submission attachments) |
| Deployment | Vercel |

## Status

**Backend, database, and full frontend are built and deployed for both roles.**

Mentor-side: cohort management, intern add/remove (soft, history-preserving) at the cohort level and add/remove at the individual task level, AI-assisted and manual task creation/publishing, submission review, weekly feedback with rating trends (plus an optional AI-generated weekly insight summarizing an intern's week before the mentor writes it), attendance monitoring (including a "Force Check-out" override for sessions an intern forgot to close), a cross-cohort dashboard with aggregate stats and pending-review queue, a cross-cohort interns list, and a conversational analytics assistant for open-ended questions about any intern.

Intern-side: weekly task view, submission with file attachments, attendance clock-in/out, LinkedIn post logging, and feedback history.

Both roles use a shared sidebar-based layout (Linear/Notion-style admin dashboard, no top navbar) over a custom "Periwinkle" design system.

**Deployed to Vercel**, connected to the same Neon database used in development.


## AI features

Two independent AI features, kept deliberately separate because they solve different problems:

- **AI-assisted task drafting** (`POST /api/tasks/draft`) — a mentor types a plain-language topic and Groq drafts a structured `{title, description}` (Markdown, with Overview / Hands-on / Deliverable sections). Nothing is saved until the mentor reviews it in the same create-task form and clicks Create/Publish — there's no path where AI output reaches the database unreviewed.
- **Mentor analytics assistant** (`POST /api/assistant/chat`, `src/components/AssistantPanel.tsx`) — an open-ended chat panel on the mentor dashboard for questions like "who's blocked or falling behind?" Real RAG pipeline: intern data is periodically converted to natural-language chunks (`npm run rag:generate-chunks`) and embedded into Pinecone (`npm run rag:embed-upsert`, Cohere `embed-english-v3.0`); at query time the question is embedded, the top candidates are pulled from Pinecone and reranked with Cohere, and Groq generates a grounded answer streamed word-by-word over SSE. The assistant answers only from retrieved records — it's instructed never to guess or fall back on general knowledge, and says so plainly when nothing relevant is on file. Mentor-only, rate-limited per user (10/min, 60/hour).
- **AI weekly insight** (`GET /api/insights/weekly`) — a smaller, deliberately non-RAG feature on the Feedback tab: a "Get AI insight for this week" button that summarizes one intern's one week (tasks completed/blocked, check-in notes) directly from Postgres, since the data needed is always known in advance. Read-only — it informs the mentor's rating and comment, it never writes them.

The assistant's Pinecone index is refreshed manually (`npm run rag:generate-chunks` then `npm run rag:embed-upsert`) rather than on a schedule — anything added after the last run won't be searchable until it's re-run.

## Access control

Enforced at the API level, not just in the UI:

- Every route except `/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`, and `/api/auth/magic-link/*` requires a valid JWT.
- Mentor-only routes reject interns with `403 Forbidden`. Missing or invalid tokens return `401 Unauthorized`.
- Identity is always resolved from the verified token, never from the request body or query string.
- Ownership is enforced on every intern-facing route via shared `getOwnedAssignment`, `getOwnedMembership`, and `getOwnedSubmission` helpers (`src/lib/ownership.ts`). An intern reaching for a record that isn't theirs gets a `404`, not a `403` — the API never confirms that another intern's record exists in the first place.
- `403` is reserved for cases where the record is genuinely the caller's own but the specific action isn't allowed for their role — e.g. an intern can see their own assignment but can't set its status to `COMPLETED` (mentor-only).

## Mentor accounts are seeded, not registered

`POST /api/auth/register` creates `INTERN` accounts only — the role is a literal in the create call, so there is no code path that produces a mentor.

Mentor accounts are created by `prisma/seed.ts` from credentials in `.env`, and the credentials are handed over privately. The mentor then logs in through the same endpoint interns use (password or magic link — both work identically for either role, since there's no special-cased mentor login path).

This is a deliberate deviation from the task specification, which asked for registration supporting both roles. Without email verification (notifications are out of scope), any self-service mentor signup can be claimed by whoever registers the address first — a guessable address like `mentor@company.com` is a race, not a gate. Seeding closes it permanently and matches how internal admin tools actually work.

## Auth endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | Creates an intern account |
| POST | `/api/auth/login` | — | Verifies credentials, returns a JWT |
| GET | `/api/auth/me` | JWT | Returns the current user, read fresh from the database |
| POST | `/api/auth/forgot-password` | — | Emails a password-reset link if the address is registered; always returns the same generic message either way |
| POST | `/api/auth/reset-password` | — | Sets a new password from a valid, unexpired reset token |
| POST | `/api/auth/magic-link/request` | — | Emails a passwordless sign-in link if the address is registered; same generic-message behavior as forgot-password |
| POST | `/api/auth/magic-link/verify` | — | Exchanges a valid magic-link token for a JWT |

Protected requests send the token as a header:

```
Authorization: Bearer <token>
```

Tokens carry `{ userId, role }` and expire after 7 days. The payload is readable by anyone — the signature, computed with `JWT_SECRET`, is what prevents tampering.

`/api/auth/me` deliberately re-reads the user from the database rather than trusting the token payload, since a token is frozen at issue time and a role or account can change within its 7-day life.

Password-reset and magic-link tokens are single-use, opaque, and only ever stored as a sha256 hash — the raw token exists only in the emailed link. Reset tokens expire in 30 minutes, magic-link tokens in 15. Requesting a new one invalidates any other unused token of the same purpose for that user. Registered passwords require 8+ characters with an uppercase letter, a lowercase letter, a number, and a symbol (not enforced on login, so existing accounts can't be locked out by a rule change).

## Feature endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/cohorts` | Mentor | Create a cohort |
| GET | `/api/cohorts` | Mentor | List all cohorts |
| POST | `/api/cohorts/[id]/members` | Mentor | Add an intern to a cohort by email, or reactivate a previously-removed one (blocked if the cohort is archived) |
| GET | `/api/cohorts/[id]/members` | Mentor | List a cohort's active members |
| DELETE | `/api/cohorts/[id]/members/[membershipId]` | Mentor | Soft-remove an intern from a cohort — flips `Membership.isActive` to `false`; all their history (assignments, submissions, attendance, feedback, LinkedIn posts) is kept |
| GET | `/api/cohorts/[id]/progress` | Mentor | One efficient query for per-member task completion %, LinkedIn weeks logged, and rating history |
| GET | `/api/me/memberships` | JWT | Lets a logged-in user discover their own cohort membership(s) |
| GET | `/api/interns` | Mentor | Every intern account across every cohort |
| POST | `/api/tasks` | Mentor | Create a task (starts in `DRAFT`; blocked if the cohort is archived) |
| GET | `/api/tasks` | Mentor | List tasks, optionally filtered by `cohortId` |
| POST | `/api/tasks/draft` | Mentor | AI-drafts a `{title, description}` from a plain-language topic — see AI features above |
| PATCH | `/api/tasks/[id]` | Mentor | Edit a task — only `endDate` can change once published |
| POST | `/api/tasks/[id]/publish` | Mentor | Publish a task — auto-assigns it to every active member of its cohort in one transaction (blocked if the cohort is archived) |
| GET | `/api/tasks/[id]/assignments` | Mentor | Every intern's assignment status for one task |
| POST | `/api/tasks/[id]/assignments` | Mentor | Assign one specific intern to one specific already-published task |
| DELETE | `/api/tasks/[id]/assignments/[membershipId]` | Mentor | Remove one intern from one task — hard-deletes the `TaskAssignment` row, cascading its submissions, attachments, and activity thread |
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
| GET | `/api/insights/weekly` | Mentor | AI-generated summary of one intern's one week, to inform (not replace) written feedback — see AI features above |
| POST | `/api/linkedIn-posts` | Intern | Log a LinkedIn post for a membership + week |
| GET | `/api/linkedIn-posts` | Mentor, Intern (own) | Read LinkedIn post history for a membership |
| GET | `/api/dashboard/summary` | Mentor | Aggregate stats (active interns, tasks published this week, avg rating, LinkedIn posts this week) plus a per-cohort progress table |
| GET | `/api/dashboard/pending-reviews` | Mentor | Submissions awaiting review, across every cohort |
| POST | `/api/assistant/chat` | Mentor | RAG-based analytics assistant — see AI features above (streamed via SSE) |



## Data model

Twelve models. ERD: [`docs/erd.svg`](docs/erd.svg) — was generated from `schema.prisma` via `prisma-erd-generator`; that generator was later removed from the schema (it failed on Vercel's build) so the diagram no longer regenerates automatically and may lag behind schema changes made since.

| Model | Purpose |
|---|---|
| `User` | Anyone who logs in, with a `Role` enum |
| `AuthToken` | Single-use, time-limited token behind password reset and magic-link sign-in; only a hash is stored |
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
│   ├── schema.prisma            # 12 models, enums, relations
│   ├── migrations/               # version-controlled schema history
│   ├── backfill-assignments.ts   # one-off repair script for pre-fix cohorts (safe to re-run)
│   └── seed.ts                   # mentor + cohorts + interns + tasks + attendance + feedback + LinkedIn posts
├── scripts/
│   └── rag/
│       ├── generate-chunks.ts    # Postgres → natural-language chunks (npm run rag:generate-chunks)
│       └── embed-upsert.ts       # chunks → Cohere embeddings → Pinecone (npm run rag:embed-upsert)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/             # register, login, me, forgot-password, reset-password, magic-link/*
│   │   │   ├── cohorts/          # cohorts + members (add/remove) + progress
│   │   │   ├── tasks/            # tasks, draft (AI), publish, assignments (add/remove)
│   │   │   ├── assignment/       # status, activity, submissions
│   │   │   ├── submissions/      # review, attachments
│   │   │   ├── attendance/
│   │   │   ├── feedback/
│   │   │   ├── linkedIn-posts/
│   │   │   ├── dashboard/        # summary, pending-reviews
│   │   │   ├── assistant/chat/   # RAG analytics assistant (SSE)
│   │   │   └── insights/weekly/  # AI weekly insight (non-RAG)
│   │   ├── (auth)/                # login, register, forgot-password, reset-password, login/verify
│   │   ├── (dashboard)/           # mentor-only: cohorts, tasks, interns, dashboard
│   │   └── (intern)/              # intern-only: my-tasks, attendance, linkedin, feedback
│   ├── components/
│   │   ├── Sidebar.tsx            # role-conditional sidebar shell (replaces the old top navbar)
│   │   ├── AssistantPanel.tsx     # mentor RAG chat panel
│   │   ├── MarkdownText.tsx       # hand-rolled Markdown renderer, used for task descriptions + assistant replies
│   │   ├── AuthCard.tsx           # shared layout for all (auth) pages
│   │   ├── ActivityThread.tsx     # shared task-activity comment thread
│   │   ├── RatingTrendChart.tsx   # shared feedback-rating line chart (mentor + intern views)
│   │   └── WorkHoursChart.tsx     # shared attendance hours chart
│   ├── lib/
│   │   ├── prisma.ts              # shared Prisma client (adapter cached across dev hot-reloads)
│   │   ├── password.ts            # hashPassword, verifyPassword (bcrypt)
│   │   ├── jwt.ts                 # signToken, verifyToken
│   │   ├── auth.ts                # getUserFromRequest, unauthorized, forbidden
│   │   ├── authTokens.ts          # createAuthToken / consume — shared by reset + magic-link
│   │   ├── email.ts               # sendPasswordResetEmail, sendMagicLoginEmail (Resend)
│   │   ├── cloudinary.ts          # submission attachment uploads
│   │   ├── ownership.ts           # getOwnedAssignment, getOwnedMembership, getOwnedSubmission — shared 404-not-403 checks
│   │   ├── ragRetrieval.ts        # embed → Pinecone query → Cohere rerank → context formatting
│   │   ├── assistantRateLimiter.ts# per-mentor sliding-window rate limit for the chat assistant
│   │   ├── weeklyInsight.ts       # buildWeeklyInsight() — direct-query AI insight
│   │   ├── week.ts / weeks.ts     # week-number ↔ date-range helpers
│   │   ├── timezone.ts            # PKT-anchored day-boundary helpers for attendance
│   │   ├── attendanceHours.ts     # work-hours aggregation
│   │   ├── format.ts              # app-wide date formatting
│   │   └── validators/            # Zod schemas, one file per resource
│   └── generated/prisma/          # Prisma client output (gitignored)
├── docs/
│   ├── REQUIREMENTS.md
│   └── erd.svg
├── prisma.config.ts                # Prisma 7 — CLI datasource config
├── .env                             # not committed
└── package.json
```

## Getting started

```bash
git clone https://github.com/Khadija-Zahra335/Intern-Management-System.git
cd Intern-Management-System
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

# AI task drafting
GROQ_API_KEY=""

# Analytics assistant (RAG)
COHERE_API_KEY=""
PINECONE_API_KEY=""
PINECONE_INDEX=""
PINECONE_NAMESPACE="capstone-analytics"   # optional, defaults to this

# Transactional email (forgot password, magic link)
RESEND_API_KEY=""
EMAIL_FROM="onboarding@resend.dev"        # sandbox sender until a custom domain is verified in Resend
APP_URL="http://localhost:3000"           # used to build links inside emails — update to the real deployed URL in production

# File uploads
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
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

The RAG scripts read from `.env.local` rather than `.env` — copy the same values in if you want to run them locally:

```bash
npm run rag:generate-chunks   # Postgres → chunks.json
npm run rag:embed-upsert      # chunks.json → Pinecone
```

Re-run both any time you want the assistant's answers to reflect newly-added tasks, feedback, or check-in notes — the index does not refresh on its own.

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
- [x] Submission attachments (Cloudinary)
- [x] Dashboards — mentor cohort view, per-intern progress
- [x] Frontend — mentor + intern, sidebar-based layout
- [x] AI task drafting
- [x] Forgot password + magic-link sign-in
- [x] Cohort/task-level intern add & remove
- [x] Mentor analytics assistant (RAG) + AI weekly insight
- [x] Deployed to Vercel
