import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { autoSubmitExpiredSessions } from "@/lib/exam-engine"
import { assessIntegrity } from "@/lib/integrity-model"

const DAY = 24 * 60 * 60 * 1000

/** Everything on the admin home page. All numbers are computed from the database on every request. */
export async function GET() {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  await autoSubmitExpiredSessions()
  const examWhere = scope.collegeId ? { collegeId: scope.collegeId } : {}
  const sessionWhere = scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}
  const now = new Date()
  const dayAgo = new Date(now.getTime() - DAY)
  const weekAgo = new Date(now.getTime() - 7 * DAY)

  const [students, exams, activeSessions, finishedSessions, incidents24h, flaggedSessions, pendingIncidents, recentSessions, weekSessions, weekIncidents, finishedScores] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", ...(scope.collegeId ? { collegeId: scope.collegeId } : {}) } }),
    prisma.exam.findMany({ where: examWhere, orderBy: { startTime: "desc" }, select: { id: true, title: true, status: true, startTime: true, endTime: true, durationMins: true, subjects: { select: { questions: { select: { marks: true } } } }, _count: { select: { sessions: true } } } }),
    prisma.examSession.count({ where: { ...sessionWhere, status: "IN_PROGRESS" } }),
    prisma.examSession.count({ where: { ...sessionWhere, NOT: { status: "IN_PROGRESS" } } }),
    prisma.incident.count({ where: { createdAt: { gte: dayAgo }, session: sessionWhere } }),
    prisma.examSession.count({ where: { ...sessionWhere, verdict: "FLAGGED" } }),
    prisma.incident.count({ where: { reviewStatus: "PENDING", severity: { in: ["HIGH", "CRITICAL"] }, session: sessionWhere } }),
    prisma.examSession.findMany({
      where: sessionWhere, orderBy: { startedAt: "desc" }, take: 8,
      select: {
        id: true, status: true, startedAt: true, submittedAt: true, score: true, riskScore: true, verdict: true, questionOrder: true, examId: true,
        user: { select: { fullName: true, email: true } },
        exam: { select: { title: true } },
        answers: { select: { updatedAt: true, isCorrect: true, selectedOption: true, descriptiveText: true } },
        incidents: { select: { type: true, severity: true, createdAt: true } },
      },
    }),
    prisma.examSession.findMany({ where: { ...sessionWhere, startedAt: { gte: weekAgo } }, select: { startedAt: true } }),
    prisma.incident.findMany({ where: { createdAt: { gte: weekAgo }, session: sessionWhere }, select: { type: true } }),
    prisma.examSession.findMany({ where: { ...sessionWhere, NOT: { status: "IN_PROGRESS" }, score: { not: null } }, select: { examId: true, score: true }, take: 1000 }),
  ])

  const totalMarks = new Map(exams.map((exam) => [exam.id, exam.subjects.reduce((sum, subject) => sum + subject.questions.reduce((inner, question) => inner + question.marks, 0), 0)]))
  const percent = (score: number | null, examId: string) => {
    const marks = totalMarks.get(examId) ?? 0
    return score === null || !marks ? null : Math.round(Math.max(0, (score / marks) * 100))
  }
  const percents = finishedScores.map((row) => percent(row.score, row.examId)).filter((value): value is number => value !== null)
  const averagePercent = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null

  const phase = (exam: (typeof exams)[number]) => {
    if (exam.status === "DRAFT") return "DRAFT"
    if (exam.status === "COMPLETED" || exam.endTime <= now) return "CLOSED"
    return exam.startTime > now ? "UPCOMING" : "LIVE"
  }

  // Sessions started per day (last 7 days, oldest first) and the incident mix of the last 7 days.
  const perDay = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now.getTime() - (6 - index) * DAY)
    const key = day.toISOString().slice(0, 10)
    return { date: key, label: day.toLocaleDateString("en-IN", { weekday: "short" }), attempts: 0 }
  })
  for (const session of weekSessions) {
    const entry = perDay.find((day) => day.date === session.startedAt.toISOString().slice(0, 10))
    if (entry) entry.attempts += 1
  }
  const mix = new Map<string, number>()
  for (const incident of weekIncidents) mix.set(incident.type, (mix.get(incident.type) ?? 0) + 1)

  const attempts = recentSessions.map((session) => {
    const total = Array.isArray(session.questionOrder) ? session.questionOrder.length : 0
    const ml = assessIntegrity({ startedAt: session.startedAt, incidents: session.incidents, answers: session.answers })
    return {
      id: session.id,
      student: session.user.fullName,
      email: session.user.email,
      exam: session.exam.title,
      status: session.status,
      startedAt: session.startedAt,
      submittedAt: session.submittedAt,
      secondsUsed: session.submittedAt ? Math.round((session.submittedAt.getTime() - session.startedAt.getTime()) / 1000) : null,
      attempted: session.answers.filter((answer) => answer.selectedOption || answer.descriptiveText).length,
      totalQuestions: total,
      score: session.score,
      totalMarks: totalMarks.get(session.examId) ?? 0,
      percent: percent(session.score, session.examId),
      incidents: session.incidents.length,
      riskScore: session.riskScore,
      verdict: session.verdict,
      mlLevel: ml.level,
      mlProbability: ml.probability,
    }
  })

  const liveExams = exams.filter((exam) => phase(exam) === "LIVE").length
  const upcomingExams = exams.filter((exam) => phase(exam) === "UPCOMING").length
  return NextResponse.json({
    generatedAt: now.toISOString(),
    stats: { students, exams: exams.length, liveExams, upcomingExams, activeSessions, finishedSessions, incidents24h, flaggedSessions, pendingIncidents, averagePercent },
    attempts,
    exams: exams.slice(0, 30).map((exam) => ({
      id: exam.id, title: exam.title, phase: phase(exam), startTime: exam.startTime, endTime: exam.endTime, durationMins: exam.durationMins,
      questions: exam.subjects.reduce((sum, subject) => sum + subject.questions.length, 0), totalMarks: totalMarks.get(exam.id) ?? 0, attempts: exam._count.sessions,
    })),
    activity: perDay,
    incidentMix: [...mix.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 8),
  })
}
