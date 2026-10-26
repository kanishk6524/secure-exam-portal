import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { randomBytes } from "node:crypto"
import { STATIC_PACKS } from "./exam-packs"
import { installPack } from "./install-pack"

const prisma = new PrismaClient()

async function main() {
  // The seed creates admin accounts, so it must never run against production by accident.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "1") {
    throw new Error("Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=1 only if you really mean it.")
  }
  const seedPassword = process.env.SEED_PASSWORD ?? `${randomBytes(9).toString("base64url")}1`
  if (!process.env.SEED_PASSWORD) console.log(`Seed users password (set SEED_PASSWORD to choose your own): ${seedPassword}`)
  const passwordHash = await bcrypt.hash(seedPassword, 12)
  const college = await prisma.college.upsert({
    where: { code: "DEMO-001" },
    update: {},
    create: { name: "Demo Institute of Technology", code: "DEMO-001" },
  })

  const users = [
    { email: "admin@example.com", fullName: "System Administrator", role: Role.ADMIN },
    { email: "college.admin@example.com", fullName: "College Administrator", role: Role.COLLEGE_ADMIN },
    { email: "student@example.com", fullName: "Demo Student", role: Role.STUDENT },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash, fullName: user.fullName, role: user.role, collegeId: college.id, emailVerified: true },
      create: { ...user, passwordHash, collegeId: college.id, emailVerified: true },
    })
  }

  const exam = await prisma.exam.upsert({
    where: { id: "demo-exam" },
    update: { startTime: new Date(Date.now() - 60 * 60 * 1000), endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    create: {
      id: "demo-exam",
      title: "Demo Assessment",
      description: "Seeded assessment for local development.",
      durationMins: 60,
      startTime: new Date(Date.now() - 60 * 60 * 1000),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "SCHEDULED",
      collegeId: college.id,
    },
  })

  for (const subjectName of ["Mathematics", "General Science"]) {
    const subjectId = `demo-${subjectName.toLowerCase().replace(" ", "-")}`
    const subject = await prisma.subject.upsert({
      where: { id: subjectId },
      update: {},
      create: { id: subjectId, name: subjectName, examId: exam.id },
    })

    for (let index = 1; index <= 10; index += 1) {
      await prisma.question.upsert({
        where: { id: `demo-${subject.id}-question-${index}` },
        update: {},
        create: {
          id: `demo-${subject.id}-question-${index}`,
          subjectId: subject.id,
          text: `${subjectName} question ${index}`,
          options: [
            { id: "A", text: "Option A" },
            { id: "B", text: "Option B" },
            { id: "C", text: "Option C" },
            { id: "D", text: "Option D" },
          ],
          correctOption: "A",
        },
      })
    }
  }

  // Pre-installed exam packs: JEE Main mock, college entrance mock and a sample placement drive.
  for (const pack of STATIC_PACKS) await installPack(prisma, pack)
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })