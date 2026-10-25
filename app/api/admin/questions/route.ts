import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"

export async function GET(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const examId = new URL(request.url).searchParams.get("examId")
  const subjectWhere = { ...(examId ? { examId } : {}), ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) }
  const questions = await prisma.question.findMany({ where: Object.keys(subjectWhere).length ? { subject: subjectWhere } : undefined, include: { subject: { include: { exam: { select: { id: true, title: true } } } } }, orderBy: { id: "desc" } })
  return NextResponse.json({ questions })
}

function normalizeQuestion(input: Record<string, unknown>) {
  const rawOptions = Array.isArray(input.options) ? input.options : String(input.options ?? "").split("|").filter(Boolean).map((text, index) => ({ id: String.fromCharCode(65 + index), text: text.trim() }))
  return { subjectId: String(input.subjectId), text: String(input.text ?? "").trim(), options: rawOptions, correctOption: String(input.correctOption ?? "A"), marks: Number(input.marks ?? 1), negativeMarks: Number(input.negativeMarks ?? 0), difficulty: Number(input.difficulty ?? 1) }
}

export async function POST(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const body = await request.json()
  const inputs = Array.isArray(body.questions) ? body.questions : [body]
  const normalized = inputs.map((input: Record<string, unknown>) => normalizeQuestion(input))
  for (const [index, question] of normalized.entries()) {
    const label = inputs.length > 1 ? `Row ${index + 1}: ` : ""
    if (!question.text) return NextResponse.json({ error: `${label}Question text is required` }, { status: 400 })
    if (question.options.length < 2) return NextResponse.json({ error: `${label}At least two options are required` }, { status: 400 })
    if (!question.options.some((option: { id: string }) => option.id === question.correctOption)) return NextResponse.json({ error: `${label}Correct option "${question.correctOption}" is not one of the options` }, { status: 400 })
  }
  const subjectIds = [...new Set(normalized.map((question: { subjectId: string }) => question.subjectId))] as string[]
  const found = await prisma.subject.count({ where: { id: { in: subjectIds }, ...(scope.collegeId ? { exam: { collegeId: scope.collegeId } } : {}) } })
  if (found !== subjectIds.length) return NextResponse.json({ error: "Unknown subject ID. Copy the subject ID from the exam's subject list." }, { status: 400 })
  const questions = await prisma.$transaction(normalized.map((question: ReturnType<typeof normalizeQuestion>) => prisma.question.create({ data: question })))
  return NextResponse.json({ questions }, { status: 201 })
}