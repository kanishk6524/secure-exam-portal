import { NextResponse } from "next/server"
import { IncidentType, Severity } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { emitIncident } from "@/lib/realtime"
import { readPhoneToken } from "@/lib/side-camera"

const RISK_WEIGHT: Record<Severity, number> = { LOW: 1, MEDIUM: 3, HIGH: 7, CRITICAL: 15 }
// What the side camera is allowed to report, and how seriously.
const ALLOWED: Partial<Record<IncidentType, Severity>> = { MULTIPLE_FACES: "HIGH", OBJECT_DETECTED: "HIGH", SIDE_CAMERA_LOST: "MEDIUM" }
const lastSent = new Map<string, number>()

// Called by the paired phone when its own detector sees another person, a phone/book, or the candidate leaving the view.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const pairing = readPhoneToken(token)
  if (!pairing) return NextResponse.json({ error: "This pairing link is invalid or has expired" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const type = String(body.type ?? "") as IncidentType
  const severity = ALLOWED[type]
  if (!severity) return NextResponse.json({ error: "Event type not allowed" }, { status: 400 })
  const rateKey = `${pairing.userId}:${pairing.examId}:${type}`
  if (Date.now() - (lastSent.get(rateKey) ?? 0) < 10_000) return NextResponse.json({ ok: true, skipped: true })
  lastSent.set(rateKey, Date.now())
  const examSession = await prisma.examSession.findFirst({ where: { examId: pairing.examId, userId: pairing.userId, status: "IN_PROGRESS" } })
  if (!examSession) return NextResponse.json({ ok: true, skipped: "no running exam" })
  if (JSON.stringify(body.metadata ?? null).length > 1500) return NextResponse.json({ error: "Metadata too large" }, { status: 400 })
  const snapshot = typeof body.snapshot === "string" && body.snapshot.length <= 90_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(body.snapshot) ? body.snapshot : null
  const stored = snapshot ? await prisma.incident.count({ where: { sessionId: examSession.id, evidence: { not: null } } }) : 0
  const incident = await prisma.incident.create({
    data: { sessionId: examSession.id, type, severity, confidence: typeof body.confidence === "number" ? body.confidence : null, metadata: { ...(body.metadata ?? {}), source: "side-camera" }, evidence: snapshot && stored < Number(process.env.MAX_EVIDENCE_SNAPSHOTS ?? 80) ? snapshot : null },
  })
  await prisma.examSession.update({ where: { id: examSession.id }, data: { riskScore: { increment: RISK_WEIGHT[severity] } } })
  const { evidence, ...live } = incident
  emitIncident({ ...live, hasEvidence: Boolean(evidence), examId: examSession.examId })
  return NextResponse.json({ ok: true })
}
