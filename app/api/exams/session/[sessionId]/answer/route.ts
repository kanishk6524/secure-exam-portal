import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const body = await request.json()
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id } })
  if (!examSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (examSession.status !== "IN_PROGRESS") return NextResponse.json({ error: "This exam is no longer accepting answers" }, { status: 409 })
  if (new Date() > examSession.serverEndsAt) return NextResponse.json({ error: "The exam deadline has passed" }, { status: 409 })
  const questionId = String(body.questionId ?? "")
  if (!(examSession.questionOrder as string[]).includes(questionId)) return NextResponse.json({ error: "Question is not part of this session" }, { status: 400 })
  // Only touch the fields the client actually sent, so e.g. toggling "mark for review"
  // never wipes the selected option.
  const data: { selectedOption?: string | null; descriptiveText?: string | null; visited?: boolean; markedForReview?: boolean } = { visited: true }
  if ("selectedOption" in body) data.selectedOption = body.selectedOption ?? null
  if ("descriptiveText" in body) data.descriptiveText = body.descriptiveText ?? null
  if (typeof body.markedForReview === "boolean") data.markedForReview = body.markedForReview
  const answer = await prisma.answer.upsert({ where: { sessionId_questionId: { sessionId, questionId } }, update: data, create: { sessionId, questionId, ...data } })
  return NextResponse.json({ answer })
}