import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { submitSession } from "@/lib/exam-engine"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const owned = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id } })
  if (!owned) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  const submitted = await submitSession(sessionId)
  if (!submitted) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  // Counts come from the server, so the summary is right even if the page lost its in-memory state.
  const totalQuestions = Array.isArray(submitted.questionOrder) ? submitted.questionOrder.length : 0
  const attempted = submitted.answers.filter((answer) => answer.selectedOption || answer.descriptiveText).length
  // Why did the exam end? Shown on the summary screen so an unexpected submission can be explained.
  const incidents = await prisma.incident.groupBy({ by: ["type"], where: { sessionId }, _count: { _all: true } })
  const breakdown = Object.fromEntries(incidents.map((item) => [item.type, item._count._all]))
  const lockdownCount = ["TAB_SWITCH", "COPY_ATTEMPT", "PASTE_ATTEMPT", "CUT_ATTEMPT", "FULLSCREEN_EXIT", "MULTIPLE_MONITORS", "CLIENT_INTEGRITY"].reduce((sum, type) => sum + (breakdown[type] ?? 0), 0)
  const maxViolations = Number(process.env.MAX_LOCKDOWN_VIOLATIONS ?? 5)
  const timeUp = new Date().getTime() >= owned.serverEndsAt.getTime() - 2000
  const reason = lockdownCount >= maxViolations ? "VIOLATION_LIMIT" : timeUp ? "TIME_UP" : submitted.status === "BLOCKED" ? "INVIGILATOR" : "MANUAL"
  const secondsUsed = Math.round(((submitted.submittedAt ?? new Date()).getTime() - owned.startedAt.getTime()) / 1000)
  return NextResponse.json({ reason, secondsUsed, breakdown, lockdownCount, maxViolations, totalQuestions, attempted, score: submitted.score, status: submitted.status, submittedAt: submitted.submittedAt, answers: submitted.answers })
}