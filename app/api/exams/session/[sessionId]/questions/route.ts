import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id } })
  if (!examSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  const ids = examSession.questionOrder as string[]
  const questions = await prisma.question.findMany({ where: { id: { in: ids } }, include: { subject: { select: { id: true, name: true } } } })
  const questionMap = new Map(questions.map((question) => [question.id, question]))
  return NextResponse.json({ serverEndsAt: examSession.serverEndsAt.toISOString(), status: examSession.status, questions: ids.map((id) => questionMap.get(id)).filter(Boolean).map((question) => ({ id: question!.id, subject: question!.subject, text: question!.text, options: question!.options, marks: question!.marks, negativeMarks: question!.negativeMarks })) })
}