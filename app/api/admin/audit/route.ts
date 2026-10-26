import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { verifyAuditChain } from "@/lib/audit"

/** The audit trail plus a fresh check of the whole hash chain. College admins see only their own college's entries. */
export async function GET() {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const [chain, rows] = await Promise.all([verifyAuditChain(), prisma.auditLog.findMany({ orderBy: { seq: "desc" }, take: 500 })])
  let entries = rows
  if (scope.collegeId) {
    const [sessions, admins] = await Promise.all([
      prisma.examSession.findMany({ where: { exam: { collegeId: scope.collegeId } }, select: { id: true } }),
      prisma.user.findMany({ where: { collegeId: scope.collegeId }, select: { id: true } }),
    ])
    const sessionIds = new Set(sessions.map((s) => s.id))
    const userIds = new Set(admins.map((u) => u.id))
    entries = rows.filter((row) => (row.sessionId && sessionIds.has(row.sessionId)) || (row.actorId && userIds.has(row.actorId)))
  }
  const actorIds = [...new Set(entries.map((e) => e.actorId).filter((id): id is string => Boolean(id)))]
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true, role: true } })
  const names = new Map(actors.map((a) => [a.id, `${a.fullName} (${a.role})`]))
  return NextResponse.json({
    chain,
    entries: entries.map((e) => ({ seq: e.seq, action: e.action, actor: e.actorId ? names.get(e.actorId) ?? e.actorId : "system", sessionId: e.sessionId, details: e.details, createdAt: e.createdAt, hash: e.hash })),
  })
}
