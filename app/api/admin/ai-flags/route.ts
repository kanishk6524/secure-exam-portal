import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"
import { assessIntegrity } from "@/lib/integrity-model"

const BUCKETS = 12

type Counts = { eye: number; head: number; people: number; identity: number; object: number; sound: number; movement: number; tabs: number; camera: number }

/** One row per candidate of an exam: progress, submission and the AI flag pattern (eye / head / other person / ...). */
export async function GET(request: Request) {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const examId = new URL(request.url).searchParams.get("examId")
  if (!examId) return NextResponse.json({ error: "examId is required" }, { status: 400 })
  const exam = await prisma.exam.findFirst({ where: { id: examId, ...(scope.collegeId ? { collegeId: scope.collegeId } : {}) }, select: { id: true, title: true, durationMins: true } })
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 })

  const sessions = await prisma.examSession.findMany({
    where: { examId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true, status: true, startedAt: true, submittedAt: true, serverEndsAt: true, score: true, riskScore: true, verdict: true, questionOrder: true,
      user: { select: { fullName: true, email: true } },
      answers: { select: { updatedAt: true, isCorrect: true, selectedOption: true, descriptiveText: true } },
      incidents: { select: { type: true, severity: true, createdAt: true, metadata: true }, orderBy: { createdAt: "asc" } },
    },
  })

  const rows = sessions.map((session) => {
    const counts: Counts = { eye: 0, head: 0, people: 0, identity: 0, object: 0, sound: 0, movement: 0, tabs: 0, camera: 0 }
    const windowMs = Math.max(60_000, session.serverEndsAt.getTime() - session.startedAt.getTime())
    const timeline = new Array(BUCKETS).fill(0)
    for (const incident of session.incidents) {
      const meta = (incident.metadata ?? {}) as Record<string, unknown>
      switch (incident.type) {
        case "GAZE_AWAY": {
          // Head turn when the head itself moved; otherwise the eyes alone moved.
          const head = meta.headTurned === true || String(meta.feature ?? "").startsWith("head")
          if (head) counts.head += 1
          else counts.eye += 1
          break
        }
        case "MULTIPLE_FACES": counts.people += 1; break
        case "IDENTITY_MISMATCH": counts.identity += 1; break
        case "OBJECT_DETECTED": counts.object += 1; break
        case "AUDIO_ANOMALY": counts.sound += 1; break
        case "SURROUNDING_MOVEMENT": counts.movement += 1; break
        case "TAB_SWITCH": case "FULLSCREEN_EXIT": case "BACKGROUND_APP": counts.tabs += 1; break
        case "NO_FACE": case "CAMERA_LOST": case "VIRTUAL_CAMERA": counts.camera += 1; break
      }
      const offset = incident.createdAt.getTime() - session.startedAt.getTime()
      timeline[Math.min(BUCKETS - 1, Math.max(0, Math.floor((offset / windowMs) * BUCKETS)))] += 1
    }
    const ml = assessIntegrity({ startedAt: session.startedAt, incidents: session.incidents, answers: session.answers })
    const total = Array.isArray(session.questionOrder) ? session.questionOrder.length : 0
    return {
      sessionId: session.id,
      student: session.user.fullName,
      email: session.user.email,
      status: session.status,
      startedAt: session.startedAt,
      submittedAt: session.submittedAt,
      score: session.score,
      attempted: session.answers.filter((answer) => answer.selectedOption || answer.descriptiveText).length,
      totalQuestions: total,
      riskScore: session.riskScore,
      verdict: session.verdict,
      counts,
      timeline,
      ml: { probability: ml.probability, level: ml.level },
    }
  })
  return NextResponse.json({ exam, rows })
}
