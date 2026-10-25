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
    select: { id: true, title: true, description: true, durationMins: true, startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  })
  return NextResponse.json({ exams })
}
