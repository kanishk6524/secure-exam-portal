import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"

class SubjectInUseError extends Error {}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  if (!await prisma.exam.findFirst({ where: { id, ...(scope.collegeId ? { collegeId: scope.collegeId } : {}) }, select: { id: true } })) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  const body = await request.json()
  const subjects: Array<{ name: string }> | null = Array.isArray(body.subjects)
    ? body.subjects.map((subject: { name?: unknown }) => ({ name: String(subject.name ?? "").trim() })).filter((subject: { name: string }) => subject.name)
    : null
  try {
    const exam = await prisma.$transaction(async (tx) => {
      if (subjects) {
        // Sync subjects by name instead of wiping them: existing subjects (and their questions) are kept.
        const current = await tx.subject.findMany({ where: { examId: id }, include: { _count: { select: { questions: true } } } })
        const wanted = new Set(subjects.map((subject) => subject.name))
        const removed = current.filter((subject) => !wanted.has(subject.name))
        const inUse = removed.filter((subject) => subject._count.questions > 0)
        if (inUse.length) throw new SubjectInUseError(`Cannot remove subject(s) that still have questions: ${inUse.map((subject) => subject.name).join(", ")}. Delete or move their questions first.`)
        await tx.subject.deleteMany({ where: { id: { in: removed.map((subject) => subject.id) } } })
        const present = new Set(current.map((subject) => subject.name))
        for (const subject of subjects) {
          if (present.has(subject.name)) continue
          await tx.subject.create({ data: { name: subject.name, examId: id } })
          present.add(subject.name)
        }
      }
      return tx.exam.update({ where: { id }, data: { title: body.title, description: body.description || null, durationMins: Number(body.durationMins), startTime: new Date(body.startTime), endTime: new Date(body.endTime), status: body.status }, include: { subjects: true } })
    })
    return NextResponse.json({ exam })
  } catch (error) {
    if (error instanceof SubjectInUseError) return NextResponse.json({ error: error.message }, { status: 409 })
    if ((error as { code?: string }).code === "P2025") return NextResponse.json({ error: "Exam not found" }, { status: 404 })
    console.error("Exam update failed", error)
    return NextResponse.json({ error: "Unable to update exam" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const { id } = await params
  const exam = await prisma.exam.findFirst({ where: { id, ...(scope.collegeId ? { collegeId: scope.collegeId } : {}) }, include: { subjects: { select: { id: true } }, sessions: { select: { id: true } } } })
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })
  const subjectIds = exam.subjects.map((subject) => subject.id)
  const sessionIds = exam.sessions.map((session) => session.id)
  // Remove everything that points at the exam, children first, in one transaction.
  await prisma.$transaction([
    prisma.incident.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.answer.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.auditLog.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.examSession.deleteMany({ where: { examId: id } }),
    prisma.question.deleteMany({ where: { subjectId: { in: subjectIds } } }),
    prisma.subject.deleteMany({ where: { examId: id } }),
    prisma.exam.delete({ where: { id } }),
  ])
  return NextResponse.json({ success: true })
}
