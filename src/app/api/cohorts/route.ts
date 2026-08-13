import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest, unauthorized, forbidden } from '@/lib/auth'

export async function GET(request: Request) {
  const user = getUserFromRequest(request)

  if (!user) return unauthorized()
  if (user.role !== 'MENTOR') return forbidden()

  const cohorts = await prisma.cohort.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ cohorts })
}