import { NextResponse } from "next/server"
import { ExamStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"

export async function GET() {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const exams = await prisma.exam.findMany({ where: scope.collegeId ? { collegeId: scope.collegeId } : undefined, include: { subjects: { include: { _count: { select: { questions: true } } } }, _count: { select: { sessions: true } } }, orderBy: { startTime: "desc" } })
  return NextResponse.json({ exams })
}

export async function POST(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const body = await request.json()
  if (!body.title || !body.durationMins || !body.startTime || !body.endTime) return NextResponse.json({ error: "Title, duration, start time, and end time are required" }, { status: 400 })
  const startTime = new Date(body.startTime)
  const endTime = new Date(body.endTime)
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) return NextResponse.json({ error: "End time must be after the start time" }, { status: 400 })
  if (!(Number(body.durationMins) > 0)) return NextResponse.json({ error: "Duration must be a positive number of minutes" }, { status: 400 })
  // College admins can only create exams for their own college.
  const collegeId = scope.collegeId ?? (body.collegeId || null)
  const exam = await prisma.exam.create({ data: { title: body.title, description: body.description || null, durationMins: Number(body.durationMins), startTime, endTime, status: body.status ?? ExamStatus.DRAFT, collegeId, subjects: { create: (body.subjects ?? []).map((subject: { name: string }) => ({ name: subject.name })) } }, include: { subjects: true } })
  return NextResponse.json({ exam }, { status: 201 })
}
