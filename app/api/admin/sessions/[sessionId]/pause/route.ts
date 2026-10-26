import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { recordAudit } from "@/lib/audit"
import { emitToSession } from "@/lib/realtime"

/** Pause or resume one candidate's exam clock. On resume the end time moves later by exactly the paused time. */
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const body = await request.json().catch(() => ({}))
  const pause = body.paused === true
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 200) : ""
  const target = await prisma.examSession.findFirst({ where: { id: sessionId, status: "IN_PROGRESS", ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) } })
  if (!target) return NextResponse.json({ error: "No active session found" }, { status: 404 })
  const now = new Date()
  if (pause) {
    if (target.pausedAt) return NextResponse.json({ session: { pausedAt: target.pausedAt, serverEndsAt: target.serverEndsAt } })
    const session = await prisma.examSession.update({ where: { id: sessionId }, data: { pausedAt: now } })
    await recordAudit({ action: "invigilator.pause", actorId: scope.session.user.id, sessionId, details: { reason } })
    emitToSession(sessionId, "session:paused", { pausedAt: now.toISOString(), reason })
    return NextResponse.json({ session: { pausedAt: session.pausedAt, serverEndsAt: session.serverEndsAt } })
  }
  if (!target.pausedAt) return NextResponse.json({ session: { pausedAt: null, serverEndsAt: target.serverEndsAt } })
  const pausedFor = Math.max(0, Math.round((now.getTime() - target.pausedAt.getTime()) / 1000))
  const session = await prisma.examSession.update({ where: { id: sessionId }, data: { pausedAt: null, pausedSeconds: { increment: pausedFor }, serverEndsAt: new Date(target.serverEndsAt.getTime() + pausedFor * 1000) } })
  await recordAudit({ action: "invigilator.resume", actorId: scope.session.user.id, sessionId, details: { pausedSeconds: pausedFor } })
  emitToSession(sessionId, "session:resumed", { serverEndsAt: session.serverEndsAt.toISOString() })
  return NextResponse.json({ session: { pausedAt: null, serverEndsAt: session.serverEndsAt } })
}
