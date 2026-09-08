import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const examId = new URL(request.url).searchParams.get("examId")
  const questions = await prisma.question.findMany({ where: examId ? { subject: { examId } } : undefined, include: { subject: { include: { exam: { select: { id: true, title: true } } } } }, orderBy: { id: "desc" } })
  return NextResponse.json({ questions })
}

function normalizeQuestion(input: Record<string, unknown>) {
  const rawOptions = Array.isArray(input.options) ? input.options : String(input.options ?? "").split("|").filter(Boolean).map((text, index) => ({ id: String.fromCharCode(65 + index), text: text.trim() }))
  return { subjectId: String(input.subjectId), text: String(input.text ?? "").trim(), options: rawOptions, correctOption: String(input.correctOption ?? "A"), marks: Number(input.marks ?? 1), negativeMarks: Number(input.negativeMarks ?? 0), difficulty: Number(input.difficulty ?? 1) }
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const body = await request.json()
  const inputs = Array.isArray(body.questions) ? body.questions : [body]
  const questions = await prisma.$transaction(inputs.map((input: Record<string, unknown>) => prisma.question.create({ data: normalizeQuestion(input) })))
  return NextResponse.json({ questions }, { status: 201 })
}