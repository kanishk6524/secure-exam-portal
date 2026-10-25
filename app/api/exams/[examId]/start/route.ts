import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { seededShuffle } from "@/lib/exam-engine"
import { emitIncident } from "@/lib/realtime"
import { requireSecureClient } from "@/lib/secure-client"

export async function POST(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const clientBlock = requireSecureClient(request)
  if (clientBlock) return clientBlock
  const { examId } = await params
  const existing = await prisma.examSession.findFirst({ where: { examId, userId: session.user.id }, orderBy: { startedAt: "desc" } })
  // An in-progress attempt can always be resumed (its own end time still applies).
  if (existing?.status === "IN_PROGRESS") return NextResponse.json({ sessionId: existing.id, questionOrder: existing.questionOrder, serverEndsAt: existing.serverEndsAt.toISOString(), status: existing.status })
  if (existing) return NextResponse.json({ error: "This exam session is already submitted", status: existing.status }, { status: 409 })

  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { subjects: { include: { questions: { select: { id: true } } } } } })
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  if (exam.status !== "SCHEDULED" && exam.status !== "ACTIVE") return NextResponse.json({ error: "This exam is not open for students" }, { status: 403 })
  const now = new Date()
  if (now < exam.startTime) return NextResponse.json({ error: `This exam has not started yet. It opens at ${exam.startTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.` }, { status: 403 })
  if (now > exam.endTime) return NextResponse.json({ error: "This exam window has closed" }, { status: 403 })

  const student = await prisma.user.findUnique({ where: { id: session.user.id }, select: { collegeId: true, faceEmbedding: true } })
  if (exam.collegeId && exam.collegeId !== student?.collegeId) return NextResponse.json({ error: "This exam is not assigned to your college" }, { status: 403 })

  const questionIds = exam.subjects.flatMap((subject) => subject.questions.map((question) => question.id))
  if (!questionIds.length) return NextResponse.json({ error: "This exam has no questions" }, { status: 400 })
  const startedAt = now
  // The attempt can never outlive the exam window.
  const serverEndsAt = new Date(Math.min(startedAt.getTime() + exam.durationMins * 60 * 1000, exam.endTime.getTime()))
  const created = await prisma.examSession.create({ data: { examId, userId: session.user.id, questionOrder: seededShuffle(questionIds, `${session.user.id}:${examId}:${startedAt.toISOString()}`), startedAt, serverEndsAt } })

  // Students who skipped the registration selfie cannot be identity-checked: tell the invigilator.
  if (!Array.isArray(student?.faceEmbedding)) {
    const incident = await prisma.incident.create({ data: { sessionId: created.id, type: "IDENTITY_MISMATCH", severity: "MEDIUM", metadata: { reason: "No registered face photo, identity could not be verified" } } })
    emitIncident({ ...incident, examId })
  }
  return NextResponse.json({ sessionId: created.id, questionOrder: created.questionOrder, serverEndsAt: created.serverEndsAt.toISOString(), status: created.status }, { status: 201 })
}
