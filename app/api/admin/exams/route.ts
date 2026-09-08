import { NextResponse } from "next/server"
import { ExamStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const exams = await prisma.exam.findMany({ include: { subjects: { include: { _count: { select: { questions: true } } } }, _count: { select: { sessions: true } } }, orderBy: { startTime: "desc" } })
  return NextResponse.json({ exams })
}

export async function POST(request: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const body = await request.json()
  if (!body.title || !body.durationMins || !body.startTime || !body.endTime) return NextResponse.json({ error: "Title, duration, start time, and end time are required" }, { status: 400 })
  const exam = await prisma.exam.create({ data: { title: body.title, description: body.description || null, durationMins: Number(body.durationMins), startTime: new Date(body.startTime), endTime: new Date(body.endTime), status: body.status ?? ExamStatus.DRAFT, collegeId: body.collegeId || null, subjects: { create: (body.subjects ?? []).map((subject: { name: string }) => ({ name: subject.name })) } }, include: { subjects: true } })
  return NextResponse.json({ exam }, { status: 201 })
}