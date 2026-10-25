import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { autoSubmitExpiredSessions } from "@/lib/exam-engine"

/** Sessions that need a human look, most suspicious first. */
export async function GET(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  await autoSubmitExpiredSessions()
  const params = new URL(request.url).searchParams
  const examId = params.get("examId")
  const onlyPending = params.get("pending") === "1"
  const sessions = await prisma.examSession.findMany({
    where: {
      ...(examId ? { examId } : {}),
      ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}),
      ...(onlyPending ? { verdict: null } : {}),
      incidents: { some: {} },
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      exam: { select: { id: true, title: true } },
      incidents: { select: { severity: true, reviewStatus: true, type: true } },
    },
    orderBy: { riskScore: "desc" },
    take: 300,
  })
  return NextResponse.json({
    sessions: sessions.map(({ incidents, ...session }) => ({
      ...session,
      incidentCount: incidents.length,
      critical: incidents.filter((incident) => incident.severity === "CRITICAL").length,
      high: incidents.filter((incident) => incident.severity === "HIGH").length,
      unreviewed: incidents.filter((incident) => incident.reviewStatus === "PENDING").length,
      types: Array.from(new Set(incidents.map((incident) => incident.type))),
    })),
  })
}
