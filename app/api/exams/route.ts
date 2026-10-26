import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const student = await prisma.user.findUnique({ where: { id: session.user.id }, select: { collegeId: true } })
  // Only exams that are still open or upcoming, and either for everyone or for this student's college.
  const exams = await prisma.exam.findMany({
    where: {
      status: { in: ["SCHEDULED", "ACTIVE"] },
      endTime: { gt: new Date() },
      OR: [{ collegeId: null }, ...(student?.collegeId ? [{ collegeId: student.collegeId }] : [])],
    },
    select: { id: true, title: true, description: true, durationMins: true, startTime: true, endTime: true, subjects: { select: { name: true, questions: { select: { marks: true, negativeMarks: true } } } } },
    orderBy: { startTime: "asc" },
  })
  // The instructions screen shows the real pattern of each exam (sections, question count, marking), not fixed text.
  return NextResponse.json({
    exams: exams.map(({ subjects, ...exam }) => {
      const marking = new Map<string, { marks: number; negative: number; count: number }>()
      for (const question of subjects.flatMap((subject) => subject.questions)) {
        const key = `${question.marks}/${question.negativeMarks}`
        const entry = marking.get(key) ?? { marks: question.marks, negative: question.negativeMarks, count: 0 }
        entry.count += 1
        marking.set(key, entry)
      }
      return { ...exam, subjects: subjects.map((subject) => ({ name: subject.name, questions: subject.questions.length })), totalQuestions: subjects.reduce((sum, subject) => sum + subject.questions.length, 0), marking: [...marking.values()] }
    }),
  })
}
