import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { autoSubmitExpiredSessions } from "@/lib/exam-engine"

export async function GET() {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  await autoSubmitExpiredSessions()
  const sessions = await prisma.examSession.findMany({ where: { status: "IN_PROGRESS", ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) }, include: { user: { select: { id: true, fullName: true, email: true } }, exam: { select: { id: true, title: true, startTime: true, durationMins: true } }, incidents: { orderBy: { createdAt: "desc" }, take: 20, omit: { evidence: true } }, _count: { select: { incidents: true } } }, orderBy: { startedAt: "desc" } })
  const replies = await prisma.auditLog.findMany({ where: { action: "student.message", sessionId: { in: sessions.map((s) => s.id) } }, orderBy: { seq: "desc" }, take: 100 })
  const lastReply = new Map<string, { text: string; at: Date }>()
  for (const row of replies) if (row.sessionId && !lastReply.has(row.sessionId)) lastReply.set(row.sessionId, { text: String((row.details as { text?: string } | null)?.text ?? ""), at: row.createdAt })
  return NextResponse.json({ sessions: sessions.map(({ _count, ...session }) => ({ ...session, incidentCount: _count.incidents, lastReply: lastReply.get(session.id) ?? null })) })
}
