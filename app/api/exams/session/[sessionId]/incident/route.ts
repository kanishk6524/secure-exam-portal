import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { IncidentType, Severity } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { emitIncident } from "@/lib/realtime"

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
  const incident = await prisma.incident.create({ data: { sessionId, type, severity, confidence: typeof body.confidence === "number" ? body.confidence : null, metadata: body.metadata ?? undefined } })
  emitIncident({ ...incident, examId: examSession.examId })
  return NextResponse.json({ incident }, { status: 201 })
}