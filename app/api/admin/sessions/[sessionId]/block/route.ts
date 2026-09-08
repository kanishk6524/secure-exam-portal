import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { emitSessionBlocked } from "@/lib/realtime"

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const admin = await auth()
  if (!admin?.user || (admin.user.role !== "ADMIN" && admin.user.role !== "COLLEGE_ADMIN")) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { sessionId } = await params
  const session = await prisma.examSession.update({ where: { id: sessionId }, data: { status: "BLOCKED", submittedAt: new Date() } })
  emitSessionBlocked(sessionId)
  return NextResponse.json({ session })
}