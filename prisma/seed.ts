import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/password'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── Mentor (unchanged) ──────────────────────────────────────────────
  const email = process.env.MENTOR_EMAIL?.toLowerCase()
  const password = process.env.MENTOR_PASSWORD
  const name = process.env.MENTOR_NAME ?? 'Mentor'

  if (!email || !password) {
    throw new Error('MENTOR_EMAIL and MENTOR_PASSWORD must be set in .env')
  }

  const mentorPasswordHash = await hashPassword(password)

  const mentor = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash: mentorPasswordHash, role: 'MENTOR' },
  })

  console.log(`Mentor ready: ${mentor.email} (${mentor.role})`)

  // ── Cohorts ──────────────────────────────────────────────────────────
  const activeCohort = await prisma.cohort.upsert({
    where: { id: 'seed-cohort-active' }, // fixed id so reseeding is idempotent
    update: {},
    create: {
      id: 'seed-cohort-active',
      name: 'Summer 2026 Cohort',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-21'),
      isActive: true,
    },
  })

  const archivedCohort = await prisma.cohort.upsert({
    where: { id: 'seed-cohort-archived' },
    update: {},
    create: {
      id: 'seed-cohort-archived',
      name: 'Spring 2026 Cohort',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-01'),
      isActive: false,
    },
  })

  console.log(`Cohorts ready: ${activeCohort.name}, ${archivedCohort.name}`)

  // ── Interns ──────────────────────────────────────────────────────────
  const internPasswordHash = await hashPassword('Password123!')

  const internSeeds = [
    { name: 'Ali Raza', email: 'ali.raza@example.com' },
    { name: 'Sara Khan', email: 'sara.khan@example.com' },
    { name: 'Bilal Ahmed', email: 'bilal.ahmed@example.com' },
    { name: 'Hina Malik', email: 'hina.malik@example.com' },
    { name: 'Usman Tariq', email: 'usman.tariq@example.com' },
    { name: 'Ayesha Noor', email: 'ayesha.noor@example.com' },
  ]

  const interns: Record<string, { id: string }> = {}
  for (const i of internSeeds) {
    const user = await prisma.user.upsert({
      where: { email: i.email },
      update: {},
      create: { name: i.name, email: i.email, passwordHash: internPasswordHash, role: 'INTERN' },
    })
    interns[i.email] = user
  }

  console.log(`${Object.keys(interns).length} interns ready (password: Password123!)`)

  // ── Memberships ─────────────────────────────────────────────────────
  async function upsertMembership(userEmail: string, cohortId: string, isActive = true) {
    const userId = interns[userEmail].id
    return prisma.membership.upsert({
      where: { userId_cohortId: { userId, cohortId } },
      update: {},
      create: { userId, cohortId, isActive },
    })
  }

  const mAli = await upsertMembership('ali.raza@example.com', activeCohort.id)
  const mSara = await upsertMembership('sara.khan@example.com', activeCohort.id)
  const mBilal = await upsertMembership('bilal.ahmed@example.com', activeCohort.id)
  const mHina = await upsertMembership('hina.malik@example.com', activeCohort.id)
  await upsertMembership('usman.tariq@example.com', archivedCohort.id, false)
  await upsertMembership('ayesha.noor@example.com', archivedCohort.id, false)

  console.log('Memberships ready')

  // ── Tasks ────────────────────────────────────────────────────────────

  // 1. DRAFT — never published, should be invisible to interns
  await prisma.task.upsert({
    where: { id: 'seed-task-draft' },
    update: {},
    create: {
      id: 'seed-task-draft',
      cohortId: activeCohort.id,
      createdById: mentor.id,
      title: 'Week 8: Deployment Prep',
      description: 'Prepare your project for Vercel deployment — env vars, build checks, final polish.',
      state: 'DRAFT',
      startDate: new Date('2026-08-24'),
      endDate: new Date('2026-08-30'),
    },
  })

  // 2. PUBLISHED — statuses spread across interns
  const taskSpread = await prisma.task.upsert({
    where: { id: 'seed-task-spread' },
    update: {},
    create: {
      id: 'seed-task-spread',
      cohortId: activeCohort.id,
      createdById: mentor.id,
      title: 'Week 6: Build Auth',
      description: 'Implement JWT auth with register/login/me routes and a role guard.',
      state: 'PUBLISHED',
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-16'),
    },
  })

  await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskSpread.id, membershipId: mAli.id } },
    update: {},
    create: { taskId: taskSpread.id, membershipId: mAli.id, status: 'NOT_STARTED' },
  })
  await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskSpread.id, membershipId: mSara.id } },
    update: {},
    create: { taskId: taskSpread.id, membershipId: mSara.id, status: 'IN_PROGRESS' },
  })
  await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskSpread.id, membershipId: mBilal.id } },
    update: {},
    create: { taskId: taskSpread.id, membershipId: mBilal.id, status: 'BLOCKED' },
  })
  await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskSpread.id, membershipId: mHina.id } },
    update: {},
    create: { taskId: taskSpread.id, membershipId: mHina.id, status: 'IN_PROGRESS' },
  })

  // 3. PUBLISHED — full submission history on Sara: rejected, then resubmitted + approved
  const taskHistory = await prisma.task.upsert({
    where: { id: 'seed-task-history' },
    update: {},
    create: {
      id: 'seed-task-history',
      cohortId: activeCohort.id,
      createdById: mentor.id,
      title: 'Week 5: Schema Design',
      description: 'Design the Prisma schema for the core entities and get mentor sign-off.',
      state: 'PUBLISHED',
      startDate: new Date('2026-08-03'),
      endDate: new Date('2026-08-09'),
    },
  })

  const saraHistoryAssignment = await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskHistory.id, membershipId: mSara.id } },
    update: {},
    create: { taskId: taskHistory.id, membershipId: mSara.id, status: 'COMPLETED' },
  })
  await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskHistory.id, membershipId: mAli.id } },
    update: {},
    create: { taskId: taskHistory.id, membershipId: mAli.id, status: 'NOT_STARTED' },
  })
  await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskHistory.id, membershipId: mBilal.id } },
    update: {},
    create: { taskId: taskHistory.id, membershipId: mBilal.id, status: 'NOT_STARTED' },
  })
  await prisma.taskAssignment.upsert({
    where: { taskId_membershipId: { taskId: taskHistory.id, membershipId: mHina.id } },
    update: {},
    create: { taskId: taskHistory.id, membershipId: mHina.id, status: 'NOT_STARTED' },
  })

  // Only create the submission history once (skip if it already exists from a prior seed run)
  const existingSubmissions = await prisma.submission.findMany({
    where: { assignmentId: saraHistoryAssignment.id },
  })
  if (existingSubmissions.length === 0) {
    await prisma.submission.create({
      data: {
        assignmentId: saraHistoryAssignment.id,
        content: 'Initial schema draft — 8 models, no Attendance yet.',
        links: ['https://github.com/example/repo/pull/2'],
        submittedAt: new Date('2026-08-04T10:00:00Z'),
        reviewNote: 'Good start, but we need an Attendance model for check-in/out tracking. Please add it.',
        reviewedAt: new Date('2026-08-04T15:00:00Z'),
      },
    })
    await prisma.submission.create({
      data: {
        assignmentId: saraHistoryAssignment.id,
        content: 'Added Attendance model with event-log pattern, ready for final review.',
        links: ['https://github.com/example/repo/pull/2'],
        submittedAt: new Date('2026-08-05T09:00:00Z'),
        reviewNote: 'Great — approved.',
        reviewedAt: new Date('2026-08-05T11:00:00Z'),
      },
    })
  }

  console.log('Tasks + assignments ready')

  // ── Attendance ───────────────────────────────────────────────────────
  const attendanceSeeds = [
    { membershipId: mAli.id, dayOffset: 0 },
    { membershipId: mSara.id, dayOffset: 0 },
    { membershipId: mSara.id, dayOffset: -1 },
  ]

  for (const { membershipId, dayOffset } of attendanceSeeds) {
    const day = new Date()
    day.setUTCDate(day.getUTCDate() + dayOffset)
    const at = (h: number, m = 0) => {
      const d = new Date(day)
      d.setUTCHours(h, m, 0, 0)
      return d
    }

    const events: { type: any; occurredAt: Date; note?: string }[] = [
      { type: 'CHECK_IN', occurredAt: at(4) }, // ~9 AM PKT
      { type: 'AFK_START', occurredAt: at(5, 30) },
      { type: 'AFK_END', occurredAt: at(5, 40) },
      { type: 'LUNCH_START', occurredAt: at(7) },
      { type: 'LUNCH_END', occurredAt: at(7, 30) },
      { type: 'AFK_START', occurredAt: at(9) },
      { type: 'AFK_END', occurredAt: at(9, 10) },
      { type: 'CHECK_OUT', occurredAt: at(13) }, // ~6 PM PKT
    ]

    for (const e of events) {
      const already = await prisma.attendance.findFirst({
        where: { membershipId, type: e.type, occurredAt: e.occurredAt },
      })
      if (!already) {
        await prisma.attendance.create({ data: { membershipId, ...e } })
      }
    }
  }

  console.log('Attendance events ready')

  // ── Feedback ─────────────────────────────────────────────────────────
  await prisma.feedback.upsert({
    where: { membershipId_weekNumber: { membershipId: mSara.id, weekNumber: 5 } },
    update: {},
    create: { membershipId: mSara.id, mentorId: mentor.id, weekNumber: 5, rating: 5, comment: 'Excellent schema work, great iteration on feedback.' },
  })
  await prisma.feedback.upsert({
    where: { membershipId_weekNumber: { membershipId: mSara.id, weekNumber: 6 } },
    update: {},
    create: { membershipId: mSara.id, mentorId: mentor.id, weekNumber: 6, rating: 4, comment: 'Good progress on auth, keep going.' },
  })
  await prisma.feedback.upsert({
    where: { membershipId_weekNumber: { membershipId: mBilal.id, weekNumber: 5 } },
    update: {},
    create: { membershipId: mBilal.id, mentorId: mentor.id, weekNumber: 5, rating: 3, comment: 'Schema needs more thought on relationships — let\'s discuss.' },
  })
  await prisma.feedback.upsert({
    where: { membershipId_weekNumber: { membershipId: mBilal.id, weekNumber: 6 } },
    update: {},
    create: { membershipId: mBilal.id, mentorId: mentor.id, weekNumber: 6, rating: 4, comment: 'Much improved this week.' },
  })

  console.log('Feedback ready')

  // ── LinkedIn posts ───────────────────────────────────────────────────
  const linkedInSeeds = [
    { membershipId: mSara.id, weekNumber: 6, url: 'https://www.linkedin.com/posts/sara-khan_week6-part1-activity-1111' },
    { membershipId: mSara.id, weekNumber: 6, url: 'https://www.linkedin.com/posts/sara-khan_week6-part2-activity-1112' },
    { membershipId: mAli.id, weekNumber: 6, url: 'https://www.linkedin.com/posts/ali-raza_week6-activity-2222' },
  ]

  for (const p of linkedInSeeds) {
    await prisma.linkedInPost.upsert({
      where: { membershipId_url: { membershipId: p.membershipId, url: p.url } },
      update: {},
      create: p,
    })
  }

  console.log('LinkedIn posts ready')
  console.log('\nSeed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())