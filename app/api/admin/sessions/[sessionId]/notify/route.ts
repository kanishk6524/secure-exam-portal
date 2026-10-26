import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { recordAudit } from "@/lib/audit"
import { emitToSession } from "@/lib/realtime"

/**
 * Live invigilator actions toward one candidate.
 *   kind "message"   - a warning or note shown on the candidate's screen
 *   kind "deskcheck" - asks the candidate to show their desk to the camera; 3 pictures come back as evidence
 * Each action is saved in the tamper-evident audit log. The candidate's browser receives it instantly over the live
 * socket when available, and otherwise on its next 10-second check.
 */
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const body = await request.json().catch(() => ({}))
  const kind = body.kind === "deskcheck" ? "deskcheck" : body.kind === "message" ? "message" : null
  if (!kind) return NextResponse.json({ error: "kind must be message or deskcheck" }, { status: 400 })
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 300) : ""
  if (kind === "message" && text.length < 2) return NextResponse.json({ error: "Write a message first" }, { status: 400 })
  const target = await prisma.examSession.findFirst({ where: { id: sessionId, status: "IN_PROGRESS", ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) }, select: { id: true } })
  if (!target) return NextResponse.json({ error: "No active session found" }, { status: 404 })
  const seq = await recordAudit({ action: `invigilator.${kind}`, actorId: scope.session.user.id, sessionId, details: { text } })
  emitToSession(sessionId, kind === "message" ? "invigilator:message" : "invigilator:deskcheck", { seq, text, at: new Date().toISOString() })
  return NextResponse.json({ ok: true })
}
