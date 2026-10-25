import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const query = new URL(request.url).searchParams.get("q")?.trim()
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(scope.collegeId ? { collegeId: scope.collegeId } : {}),
      ...(query ? { OR: [{ fullName: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] } : {}),
    },
    select: { id: true, fullName: true, email: true, emailVerified: true, createdAt: true, faceEmbedding: true, college: { select: { name: true, code: true } }, examSessions: { select: { status: true, score: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  })
  return NextResponse.json({
    students: students.map((student) => {
      const scored = student.examSessions.filter((session) => typeof session.score === "number")
      return {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        emailVerified: student.emailVerified,
        createdAt: student.createdAt,
        hasFaceId: Array.isArray(student.faceEmbedding),
        college: student.college,
        attempts: student.examSessions.length,
        averageScore: scored.length ? scored.reduce((sum, session) => sum + (session.score ?? 0), 0) / scored.length : null,
      }
    }),
  })
}
