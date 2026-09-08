import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash("Passw0rd!", 12)
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
    update: {},
    create: {
      id: "demo-exam",
      title: "Demo Assessment",
      description: "Seeded assessment for local development.",
      durationMins: 60,
      startTime: new Date("2026-01-01T09:00:00.000Z"),
      endTime: new Date("2026-01-01T10:00:00.000Z"),
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
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })