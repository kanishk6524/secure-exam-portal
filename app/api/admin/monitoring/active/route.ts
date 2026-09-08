import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const sessions = await prisma.examSession.findMany({ where: { status: "IN_PROGRESS" }, include: { user: { select: { id: true, fullName: true, email: true } }, exam: { select: { id: true, title: true, startTime: true, durationMins: true } }, incidents: { orderBy: { createdAt: "desc" }, take: 20 } }, orderBy: { startedAt: "desc" } })
  return NextResponse.json({ sessions: sessions.map((session) => ({ ...session, incidentCount: session.incidents.length })) })
}