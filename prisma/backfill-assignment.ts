// One-off repair script for the TaskAssignment backfill bug (see the
// "Task Assignment Backfill Bug" writeup): before the fix in
// src/app/api/cohorts/[id]/members/route.ts, any intern added to a cohort
// *after* a task had already been published ended up with an active
// Membership but zero TaskAssignment rows for that task, so their task
// list rendered empty.
//
// This script is safe to re-run (createMany uses skipDuplicates), and only
// ever creates missing rows — it never touches or deletes anything.

import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'


const projectRoot = path.resolve(import.meta.dirname, '..')
loadEnv({ path: path.join(projectRoot, '.env') })
loadEnv({ path: path.join(projectRoot, '.env.local'), override: true })

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  console.error(
    `Checked ${path.join(projectRoot, '.env')} and ${path.join(projectRoot, '.env.local')} — neither DATABASE_URL nor DIRECT_URL was found. Open whichever of those two files actually has your Neon connection string and confirm the variable name matches.`
  )
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const activeMemberships = await prisma.membership.findMany({
    where: { isActive: true },
    select: { id: true, cohortId: true },
  })

  let totalCreated = 0

  for (const membership of activeMemberships) {
    const publishedTasks = await prisma.task.findMany({
      where: { cohortId: membership.cohortId, state: 'PUBLISHED' },
      select: { id: true },
    })

    if (publishedTasks.length === 0) continue

    const result = await prisma.taskAssignment.createMany({
      data: publishedTasks.map((t) => ({
        taskId: t.id,
        membershipId: membership.id,
      })),
      skipDuplicates: true,
    })

    if (result.count > 0) {
      console.log(
        `Membership ${membership.id}: created ${result.count} missing assignment(s)`
      )
    }
    totalCreated += result.count
  }

  console.log(
    totalCreated > 0
      ? `Done — created ${totalCreated} missing TaskAssignment row(s) total.`
      : 'Done — nothing was missing, no rows created.'
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })