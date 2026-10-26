import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { getFrame, sideCameraStatus } from "@/lib/side-camera"

/** Live side-camera picture (latest frame) of one candidate, for the invigilator. */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const session = await prisma.examSession.findFirst({ where: { id: sessionId, ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) }, select: { userId: true, examId: true } })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  return NextResponse.json({ ...sideCameraStatus(session.userId, session.examId), image: getFrame(session.userId, session.examId)?.image ?? null })
}
