import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { IncidentType, Severity } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { emitIncident } from "@/lib/realtime"
import { submitSession } from "@/lib/exam-engine"

// Browser-lockdown violations. Reaching the limit auto-submits the exam (enforced here, not just in the browser).
const LOCKDOWN_TYPES: IncidentType[] = ["TAB_SWITCH", "COPY_ATTEMPT", "PASTE_ATTEMPT", "CUT_ATTEMPT", "FULLSCREEN_EXIT", "MULTIPLE_MONITORS", "CLIENT_INTEGRITY"]
// A webcam frame attached to an incident as evidence: small JPEG data URL only, and a bounded number per session.
const MAX_SNAPSHOT_CHARS = 90_000
const MAX_SNAPSHOTS_PER_SESSION = Number(process.env.MAX_EVIDENCE_SNAPSHOTS ?? 80)
const MAX_VIOLATIONS = Number(process.env.MAX_LOCKDOWN_VIOLATIONS ?? 5)
const RISK_WEIGHT: Record<Severity, number> = { LOW: 1, MEDIUM: 3, HIGH: 7, CRITICAL: 15 }

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const userSession = await auth()
  if (!userSession?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: userSession.user.id } })
  if (!examSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (examSession.status !== "IN_PROGRESS") return NextResponse.json({ error: "Session is not active" }, { status: 409 })
  const body = await request.json()
  const type = String(body.type ?? "") as IncidentType
  const severity = String(body.severity ?? "MEDIUM") as Severity
  if (!Object.values(IncidentType).includes(type)) return NextResponse.json({ error: "Invalid incident type" }, { status: 400 })
  if (!Object.values(Severity).includes(severity)) return NextResponse.json({ error: "Invalid severity" }, { status: 400 })
  if (JSON.stringify(body.metadata ?? null).length > 2000) return NextResponse.json({ error: "Incident metadata is too large" }, { status: 400 })
  // A browser reporting dozens of incidents per second is broken or malicious: stop writing to the database.
  const recent = await prisma.incident.count({ where: { sessionId, createdAt: { gte: new Date(Date.now() - 10_000) } } })
  if (recent >= 30) return NextResponse.json({ error: "Too many incidents reported" }, { status: 429 })
  let evidence: string | null = null
  if (typeof body.snapshot === "string" && body.snapshot.length <= MAX_SNAPSHOT_CHARS && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.snapshot)) {
    const stored = await prisma.incident.count({ where: { sessionId, evidence: { not: null } } })
    if (stored < MAX_SNAPSHOTS_PER_SESSION) evidence = body.snapshot
  }
  const incident = await prisma.incident.create({ data: { sessionId, type, severity, confidence: typeof body.confidence === "number" ? body.confidence : null, metadata: body.metadata ?? undefined, evidence } })
  await prisma.examSession.update({ where: { id: sessionId }, data: { riskScore: { increment: RISK_WEIGHT[severity] } } })
  // The live feed carries a flag, not the image; the review page loads the picture on demand.
  const { evidence: storedEvidence, ...liveIncident } = incident
  emitIncident({ ...liveIncident, hasEvidence: Boolean(storedEvidence), examId: examSession.examId })
  let violations = 0
  let autoSubmitted = false
  if (LOCKDOWN_TYPES.includes(type)) {
    violations = await prisma.incident.count({ where: { sessionId, type: { in: LOCKDOWN_TYPES } } })
    if (violations >= MAX_VIOLATIONS) {
      await submitSession(sessionId, "AUTO_SUBMITTED")
      autoSubmitted = true
    }
  }
  return NextResponse.json({ incident: liveIncident, violations, maxViolations: MAX_VIOLATIONS, autoSubmitted }, { status: 201 })
}