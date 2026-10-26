import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/lib/audit"

/** The candidate's own appeal for this session (if any). */
export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const appeal = await prisma.appeal.findFirst({ where: { sessionId, userId: session.user.id }, select: { status: true, message: true, response: true, createdAt: true, respondedAt: true } })
  return NextResponse.json({ appeal })
}

/** A candidate disputes the outcome of a finished exam. One appeal per session; a person answers it. */
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { sessionId } = await params
  const examSession = await prisma.examSession.findFirst({ where: { id: sessionId, userId: session.user.id }, select: { id: true, status: true } })
  if (!examSession) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (examSession.status === "IN_PROGRESS") return NextResponse.json({ error: "You can appeal after the exam has ended" }, { status: 409 })
  const body = await request.json().catch(() => ({}))
  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (message.length < 10 || message.length > 2000) return NextResponse.json({ error: "Please explain your appeal in 10 to 2000 characters" }, { status: 400 })
  if (await prisma.appeal.findUnique({ where: { sessionId }, select: { id: true } })) return NextResponse.json({ error: "You have already appealed this exam" }, { status: 409 })
  const appeal = await prisma.appeal.create({ data: { sessionId, userId: session.user.id, message } })
  await recordAudit({ action: "appeal.create", actorId: session.user.id, sessionId, details: { appealId: appeal.id } })
  return NextResponse.json({ appeal: { status: appeal.status, createdAt: appeal.createdAt } }, { status: 201 })
}
