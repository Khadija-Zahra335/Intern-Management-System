import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/password'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.MENTOR_EMAIL?.toLowerCase()
  const password = process.env.MENTOR_PASSWORD
  const name = process.env.MENTOR_NAME ?? 'Mentor'

  if (!email || !password) {
    throw new Error('MENTOR_EMAIL and MENTOR_PASSWORD must be set in .env')
  }

  const passwordHash = await hashPassword(password)

  const mentor = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role: 'MENTOR' },
  })

  console.log(`Mentor ready: ${mentor.email} (${mentor.role})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())