import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id }, include: { answers: { select: { questionId: true, selectedOption: true, descriptiveText: true } } } })
  if (!examSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  return NextResponse.json({ serverEndsAt: examSession.serverEndsAt.toISOString(), status: examSession.status, answers: examSession.answers })
}