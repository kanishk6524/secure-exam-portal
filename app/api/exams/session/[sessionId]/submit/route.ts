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
  return NextResponse.json({ score: submitted.score, status: submitted.status, submittedAt: submitted.submittedAt, answers: submitted.answers })
}