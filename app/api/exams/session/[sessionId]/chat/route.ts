import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/lib/audit"
import { emitToExamAdmins } from "@/lib/realtime"

/** The candidate answers the invigilator. Short text only; shown on the admin monitoring card. */
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id, status: "IN_PROGRESS" }, select: { id: true, examId: true } })
  if (!examSession) return NextResponse.json({ error: "Session not active" }, { status: 404 })
  const body = await request.json().catch(() => ({}))
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 300) : ""
  if (!text) return NextResponse.json({ error: "Write a message first" }, { status: 400 })
  const recent = await prisma.auditLog.count({ where: { sessionId, action: "student.message", createdAt: { gte: new Date(Date.now() - 60_000) } } })
  if (recent >= 5) return NextResponse.json({ error: "Please wait a moment before sending another message" }, { status: 429 })
  await recordAudit({ action: "student.message", actorId: session.user.id, sessionId, details: { text } })
  emitToExamAdmins(examSession.examId, "chat:message", { sessionId, text, at: new Date().toISOString() })
  return NextResponse.json({ ok: true })
}
