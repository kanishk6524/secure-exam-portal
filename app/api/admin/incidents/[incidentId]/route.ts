import { NextResponse } from "next/server"
import { ReviewStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { recordAudit } from "@/lib/audit"

/** Mark one incident as CONFIRMED (real) or DISMISSED (false alarm), with an optional note. */
export async function PATCH(request: Request, { params }: { params: Promise<{ incidentId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { incidentId } = await params
  const body = await request.json().catch(() => ({}))
  const reviewStatus = String(body.reviewStatus ?? "") as ReviewStatus
  if (!Object.values(ReviewStatus).includes(reviewStatus)) return NextResponse.json({ error: "Invalid reviewStatus" }, { status: 400 })
  const target = await prisma.incident.findFirst({ where: { id: incidentId, session: scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {} }, select: { id: true } })
  if (!target) return NextResponse.json({ error: "Incident not found" }, { status: 404 })
  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: { reviewStatus, reviewNote: typeof body.note === "string" ? body.note.slice(0, 1000) : null, reviewedById: reviewStatus === "PENDING" ? null : scope.session.user.id, reviewedAt: reviewStatus === "PENDING" ? null : new Date() },
    select: { id: true, reviewStatus: true, reviewNote: true, reviewedAt: true },
  })
  await recordAudit({ action: "incident.review", actorId: scope.session.user.id, details: { incidentId, reviewStatus } })
  return NextResponse.json({ incident })
}
