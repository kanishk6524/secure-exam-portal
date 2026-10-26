import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Invigilator messages and desk-check requests for this candidate that are newer than `after` (poll fallback for the live socket). */
export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  if (!await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id }, select: { id: true } })) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  const after = Number(new URL(request.url).searchParams.get("after") ?? 0) || 0
  const rows = await prisma.auditLog.findMany({ where: { sessionId, seq: { gt: after }, action: { in: ["invigilator.message", "invigilator.deskcheck"] } }, orderBy: { seq: "asc" }, take: 20 })
  const latest = await prisma.auditLog.findFirst({ where: { sessionId }, orderBy: { seq: "desc" }, select: { seq: true } })
  return NextResponse.json({
    latestSeq: latest?.seq ?? after,
    notices: rows.map((row) => ({ seq: row.seq, kind: row.action === "invigilator.deskcheck" ? "deskcheck" : "message", text: String((row.details as { text?: string } | null)?.text ?? ""), at: row.createdAt })),
  })
}
