import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { submitSession } from "@/lib/exam-engine"

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id }, include: { answers: { select: { questionId: true, selectedOption: true, descriptiveText: true, visited: true, markedForReview: true } } } })
  if (!examSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  let status = examSession.status
  // Out of time for more than a grace period (the browser normally submits first): finalize it here.
  if (status === "IN_PROGRESS" && !examSession.pausedAt && Date.now() > examSession.serverEndsAt.getTime() + 30_000) status = (await submitSession(sessionId, "AUTO_SUBMITTED"))?.status ?? status
  return NextResponse.json({ serverEndsAt: examSession.serverEndsAt.toISOString(), pausedAt: examSession.pausedAt?.toISOString() ?? null, status, answers: examSession.answers })
}