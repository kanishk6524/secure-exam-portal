import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"

/** The reviewer's final call on a session: CLEARED (no cheating), FLAGGED (suspected), or null to reopen it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const body = await request.json().catch(() => ({}))
  const verdict = body.verdict === null ? null : String(body.verdict ?? "")
  if (verdict !== null && verdict !== "CLEARED" && verdict !== "FLAGGED") return NextResponse.json({ error: "verdict must be CLEARED, FLAGGED or null" }, { status: 400 })
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : null
  const target = await prisma.examSession.findFirst({ where: { id: sessionId, ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) }, select: { id: true } })
  if (!target) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  const session = await prisma.examSession.update({ where: { id: sessionId }, data: { verdict, reviewNote: note, reviewedById: verdict ? scope.session.user.id : null, reviewedAt: verdict ? new Date() : null } })
  return NextResponse.json({ session })
}
