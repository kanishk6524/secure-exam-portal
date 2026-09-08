import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const exams = await prisma.exam.findMany({ where: { status: { in: ["SCHEDULED", "ACTIVE"] } }, select: { id: true, title: true, description: true, durationMins: true, startTime: true, endTime: true }, orderBy: { startTime: "asc" } })
  return NextResponse.json({ exams })
}