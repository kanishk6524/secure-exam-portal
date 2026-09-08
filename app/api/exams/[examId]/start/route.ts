import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { seededShuffle } from "@/lib/exam-engine"

export async function POST(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { examId } = await params
  const existing = await prisma.examSession.findFirst({ where: { examId, userId: session.user.id }, orderBy: { startedAt: "desc" } })
  if (existing?.status === "IN_PROGRESS") return NextResponse.json({ sessionId: existing.id, questionOrder: existing.questionOrder, serverEndsAt: existing.serverEndsAt.toISOString(), status: existing.status })
  if (existing) return NextResponse.json({ error: "This exam session is already submitted", status: existing.status }, { status: 409 })

  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { subjects: { include: { questions: { select: { id: true } } } } } })
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  const questionIds = exam.subjects.flatMap((subject) => subject.questions.map((question) => question.id))
  if (!questionIds.length) return NextResponse.json({ error: "This exam has no questions" }, { status: 400 })
  const startedAt = new Date()
  const created = await prisma.examSession.create({ data: { examId, userId: session.user.id, questionOrder: seededShuffle(questionIds, `${session.user.id}:${examId}:${startedAt.toISOString()}`), startedAt, serverEndsAt: new Date(startedAt.getTime() + exam.durationMins * 60 * 1000) } })
  return NextResponse.json({ sessionId: created.id, questionOrder: created.questionOrder, serverEndsAt: created.serverEndsAt.toISOString(), status: created.status }, { status: 201 })
}