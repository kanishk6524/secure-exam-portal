import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { findSuspiciousPairs } from "@/lib/collusion"

/** Pairs of candidates in one exam whose wrong answers match far more often than chance. */
export async function GET(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const examId = new URL(request.url).searchParams.get("examId")
  if (!examId) return NextResponse.json({ error: "examId is required" }, { status: 400 })
  const exam = await prisma.exam.findFirst({ where: { id: examId, ...(scope.collegeId ? { collegeId: scope.collegeId } : {}) }, select: { id: true, title: true } })
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  const sessions = await prisma.examSession.findMany({
    where: { examId, status: { not: "IN_PROGRESS" } },
    select: { id: true, user: { select: { fullName: true, email: true } }, answers: { select: { questionId: true, selectedOption: true, isCorrect: true } } },
  })
  const candidates = sessions.map((session) => ({
    sessionId: session.id,
    name: session.user.fullName,
    email: session.user.email,
    answers: new Map(session.answers.filter((answer) => answer.selectedOption).map((answer) => [answer.questionId, { option: answer.selectedOption as string, correct: answer.isCorrect === true }])),
  }))
  return NextResponse.json({ exam, candidates: candidates.length, pairs: findSuspiciousPairs(candidates) })
}
