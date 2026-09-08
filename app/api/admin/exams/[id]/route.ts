import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const exam = await prisma.exam.update({ where: { id }, data: { title: body.title, description: body.description || null, durationMins: Number(body.durationMins), startTime: new Date(body.startTime), endTime: new Date(body.endTime), status: body.status, subjects: body.subjects ? { deleteMany: {}, create: body.subjects.map((subject: { name: string }) => ({ name: subject.name })) } : undefined }, include: { subjects: true } })
  return NextResponse.json({ exam })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  const exam = await prisma.exam.findUnique({ where: { id }, include: { subjects: { select: { id: true } } } })
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  const subjectIds = exam.subjects.map((subject) => subject.id)
  await prisma.question.deleteMany({ where: { subjectId: { in: subjectIds } } })
  await prisma.subject.deleteMany({ where: { examId: id } })
  await prisma.exam.delete({ where: { id } })
  return NextResponse.json({ success: true })
}