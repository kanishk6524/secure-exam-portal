import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const question = await prisma.question.update({ where: { id }, data: { subjectId: body.subjectId, text: body.text, options: body.options, correctOption: body.correctOption, marks: Number(body.marks ?? 1), negativeMarks: Number(body.negativeMarks ?? 0), difficulty: Number(body.difficulty ?? 1) } })
  return NextResponse.json({ question })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  await prisma.question.delete({ where: { id } })
  return NextResponse.json({ success: true })
}