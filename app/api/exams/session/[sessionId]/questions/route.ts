import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { seededShuffle } from "@/lib/exam-engine"
import { requireSecureClient } from "@/lib/secure-client"

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const clientBlock = requireSecureClient(request)
  if (clientBlock) return clientBlock
  const { sessionId } = await params
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id } })
  if (!examSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  const ids = examSession.questionOrder as string[]
  const questions = await prisma.question.findMany({ where: { id: { in: ids } }, include: { subject: { select: { id: true, name: true } } } })
  const questionMap = new Map(questions.map((question) => [question.id, question]))
  // Every student sees the options in their own order (stable for the session), so a neighbour's
  // "answer is the 2nd option" is useless. Option ids never change, so grading is unaffected.
  const shuffleOptions = (question: { id: string; options: unknown }) => (Array.isArray(question.options) ? seededShuffle(question.options as Array<{ id: string; text: string }>, `${sessionId}:${question.id}`) : [])
  const candidate = await prisma.user.findUnique({ where: { id: session.user.id }, select: { fullName: true, email: true } })
  return NextResponse.json({ candidate, serverEndsAt: examSession.serverEndsAt.toISOString(), status: examSession.status, questions: ids.map((id) => questionMap.get(id)).filter(Boolean).map((question) => ({ id: question!.id, subject: question!.subject, text: question!.text, options: shuffleOptions(question!), marks: question!.marks, negativeMarks: question!.negativeMarks })) })
}