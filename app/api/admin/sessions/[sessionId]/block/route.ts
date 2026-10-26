import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { submitSession } from "@/lib/exam-engine"
import { emitSessionBlocked } from "@/lib/realtime"
import { recordAudit } from "@/lib/audit"

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const target = await prisma.examSession.findFirst({ where: { id: sessionId, ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) }, select: { status: true } })
  if (!target) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  // Ending an exam also grades whatever the student had answered, so the result is not left empty.
  if (target.status === "IN_PROGRESS") await submitSession(sessionId, "BLOCKED")
  emitSessionBlocked(sessionId)
  await recordAudit({ action: "session.block", actorId: scope.session.user.id, sessionId })
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } })
  return NextResponse.json({ session })
}
