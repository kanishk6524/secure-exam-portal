import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { autoSubmitExpiredSessions } from "@/lib/exam-engine"

export async function GET() {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  await autoSubmitExpiredSessions()
  const examWhere = scope.collegeId ? { collegeId: scope.collegeId } : {}
  const sessionWhere = scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const [students, exams, upcomingExams, activeSessions, completedSessions, incidents24h, recentSessions, recentExams] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", ...(scope.collegeId ? { collegeId: scope.collegeId } : {}) } }),
    prisma.exam.count({ where: examWhere }),
    prisma.exam.count({ where: { ...examWhere, status: { in: ["SCHEDULED", "ACTIVE"] }, endTime: { gt: now } } }),
    prisma.examSession.count({ where: { ...sessionWhere, status: "IN_PROGRESS" } }),
    prisma.examSession.count({ where: { ...sessionWhere, NOT: { status: "IN_PROGRESS" } } }),
    prisma.incident.count({ where: { createdAt: { gte: dayAgo }, session: sessionWhere } }),
    prisma.examSession.findMany({ where: sessionWhere, orderBy: { startedAt: "desc" }, take: 8, include: { user: { select: { fullName: true, email: true } }, exam: { select: { title: true } }, _count: { select: { incidents: true } } } }),
    prisma.exam.findMany({ where: examWhere, orderBy: { startTime: "desc" }, take: 6, select: { id: true, title: true, status: true, startTime: true, endTime: true, _count: { select: { sessions: true } } } }),
  ])
  return NextResponse.json({
    stats: { students, exams, upcomingExams, activeSessions, completedSessions, incidents24h },
    recentSessions: recentSessions.map((session) => ({ id: session.id, student: session.user.fullName, email: session.user.email, exam: session.exam.title, status: session.status, score: session.score, startedAt: session.startedAt, incidents: session._count.incidents })),
    recentExams: recentExams.map((exam) => ({ id: exam.id, title: exam.title, status: exam.status, startTime: exam.startTime, endTime: exam.endTime, attempts: exam._count.sessions })),
  })
}
