import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { assessIntegrity } from "@/lib/integrity-model"

/** Full incident timeline of one session, including the stored webcam snapshots. */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const session = await prisma.examSession.findFirst({
    where: { id: sessionId, ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) },
    include: { user: { select: { fullName: true, email: true } }, exam: { select: { title: true } }, incidents: { orderBy: { createdAt: "asc" } }, answers: { select: { updatedAt: true, isCorrect: true, selectedOption: true } } },
  })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  const { answers, ...rest } = session
  // Stage 3: machine-learning integrity assessment with the factors that drove it.
  return NextResponse.json({ session: { ...rest, integrity: assessIntegrity({ startedAt: session.startedAt, incidents: session.incidents, answers }) } })
}
