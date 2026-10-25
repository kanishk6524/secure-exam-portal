import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"

/** Full incident timeline of one session, including the stored webcam snapshots. */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const session = await prisma.examSession.findFirst({
    where: { id: sessionId, ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) },
    include: { user: { select: { fullName: true, email: true } }, exam: { select: { title: true } }, incidents: { orderBy: { createdAt: "asc" } } },
  })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  return NextResponse.json({ session })
}
