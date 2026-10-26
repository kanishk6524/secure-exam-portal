import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { recordAudit } from "@/lib/audit"

/** Decide an appeal. UPHELD = the original outcome stands. OVERTURNED = the candidate is cleared. A written reason is required. */
export async function PATCH(request: Request, { params }: { params: Promise<{ appealId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { appealId } = await params
  const body = await request.json().catch(() => ({}))
  const status = String(body.status ?? "")
  const response = typeof body.response === "string" ? body.response.trim().slice(0, 2000) : ""
  if (status !== "UPHELD" && status !== "OVERTURNED") return NextResponse.json({ error: "status must be UPHELD or OVERTURNED" }, { status: 400 })
  if (response.length < 5) return NextResponse.json({ error: "Please write the reason for your decision" }, { status: 400 })
  const target = await prisma.appeal.findFirst({ where: { id: appealId, ...(scope.collegeId ? { session: { exam: { collegeId: scope.collegeId } } } : {}) }, select: { id: true, sessionId: true } })
  if (!target) return NextResponse.json({ error: "Appeal not found" }, { status: 404 })
  const adminId = scope.session.user.id
  const appeal = await prisma.$transaction(async (tx) => {
    if (status === "OVERTURNED") await tx.examSession.update({ where: { id: target.sessionId }, data: { verdict: "CLEARED", reviewNote: `Cleared on appeal: ${response}`, reviewedById: adminId, reviewedAt: new Date() } })
    return tx.appeal.update({ where: { id: appealId }, data: { status, response, respondedById: adminId, respondedAt: new Date() } })
  })
  await recordAudit({ action: "appeal.decide", actorId: adminId, sessionId: target.sessionId, details: { appealId, status } })
  return NextResponse.json({ appeal })
}
