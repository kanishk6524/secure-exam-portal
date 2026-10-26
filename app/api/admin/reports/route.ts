import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { autoSubmitExpiredSessions } from "@/lib/exam-engine"

// Stop spreadsheet apps from running a cell as a formula (CSV injection) and quote fields properly.
function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  await autoSubmitExpiredSessions()
  const params = new URL(request.url).searchParams
  const examId = params.get("examId")
  const examWhere = scope.collegeId ? { collegeId: scope.collegeId } : {}

  if (!examId) {
    const exams = await prisma.exam.findMany({ where: examWhere, orderBy: { startTime: "desc" }, select: { id: true, title: true, status: true, startTime: true, sessions: { select: { status: true, score: true } } } })
    return NextResponse.json({
      exams: exams.map((exam) => {
        const finished = exam.sessions.filter((session) => session.status !== "IN_PROGRESS")
        const scores = finished.map((session) => session.score).filter((score): score is number => typeof score === "number")
        return { id: exam.id, title: exam.title, status: exam.status, startTime: exam.startTime, attempts: exam.sessions.length, finished: finished.length, average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null, highest: scores.length ? Math.max(...scores) : null, lowest: scores.length ? Math.min(...scores) : null }
      }),
    })
  }

  const exam = await prisma.exam.findFirst({ where: { id: examId, ...examWhere }, select: { id: true, title: true } })
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  const sessions = await prisma.examSession.findMany({ where: { examId }, orderBy: { startedAt: "asc" }, include: { user: { select: { fullName: true, email: true } }, _count: { select: { incidents: true } } } })
  const questionIds = [...new Set(sessions.flatMap((session) => session.questionOrder as string[]))]
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds } }, select: { id: true, marks: true } })
  const marks = new Map(questions.map((question) => [question.id, question.marks]))
  const rows = sessions.map((session) => {
    const totalMarks = (session.questionOrder as string[]).reduce((sum, id) => sum + (marks.get(id) ?? 0), 0)
    return { sessionId: session.id, student: session.user.fullName, email: session.user.email, status: session.status, score: session.score, totalMarks, percentage: session.score !== null && totalMarks ? Math.round((session.score / totalMarks) * 1000) / 10 : null, incidents: session._count.incidents, riskScore: session.riskScore, submittedAt: session.submittedAt }
  })

  if (params.get("format") === "csv") {
    const header = ["Student", "Email", "Status", "Score", "Total marks", "Percentage", "Incidents", "Risk score", "Submitted at"]
    const lines = [header, ...rows.map((row) => [row.student, row.email, row.status, row.score, row.totalMarks, row.percentage, row.incidents, row.riskScore, row.submittedAt?.toISOString() ?? ""])]
    return new NextResponse(lines.map((line) => line.map(csvCell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="results-${exam.id}.csv"` } })
  }
  return NextResponse.json({ exam, rows })
}
