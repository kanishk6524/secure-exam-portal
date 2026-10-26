import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { Prisma } from "@prisma/client"
import { validateSpec } from "@/lib/question-variants"
import { recordAudit } from "@/lib/audit"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  const inScope = scope.collegeId ? { subject: { exam: { collegeId: scope.collegeId } } } : {}
  if (!await prisma.question.findFirst({ where: { id, ...inScope }, select: { id: true } })) return NextResponse.json({ error: "Question not found" }, { status: 404 })
  const body = await request.json()
  // Moving a question to another subject is only allowed within the admin's own college.
  if (body.subjectId && scope.collegeId && !await prisma.subject.findFirst({ where: { id: String(body.subjectId), exam: { collegeId: scope.collegeId } }, select: { id: true } })) return NextResponse.json({ error: "Unknown subject ID" }, { status: 400 })
  const hasSpec = body.variantSpec !== null && body.variantSpec !== undefined
  if (hasSpec) { try { validateSpec(body.variantSpec, String(body.text ?? "")) } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }) } }
  const question = await prisma.question.update({ where: { id }, data: { variantSpec: hasSpec ? (body.variantSpec as Prisma.InputJsonValue) : Prisma.JsonNull, subjectId: body.subjectId, text: body.text, options: body.options, correctOption: body.correctOption, marks: Number(body.marks ?? 1), negativeMarks: Number(body.negativeMarks ?? 0), difficulty: Number(body.difficulty ?? 1) } })
  await recordAudit({ action: "question.update", actorId: scope.session.user.id, details: { questionId: id } })
  return NextResponse.json({ question })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  const inScope = scope.collegeId ? { subject: { exam: { collegeId: scope.collegeId } } } : {}
  if (!await prisma.question.findFirst({ where: { id, ...inScope }, select: { id: true } })) return NextResponse.json({ error: "Question not found" }, { status: 404 })
  await prisma.question.delete({ where: { id } })
  await recordAudit({ action: "question.delete", actorId: scope.session.user.id, details: { questionId: id } })
  return NextResponse.json({ success: true })
}
