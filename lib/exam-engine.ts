import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/lib/audit"
import { resolveQuestion } from "@/lib/question-variants"

export function seededShuffle<T>(items: T[], seed: string) {
  let state = 2166136261
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619)
  const random = () => {
    state += state << 13
    state ^= state >>> 17
    state += state << 5
    return ((state >>> 0) % 1000000) / 1000000
  }
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export async function submitSession(sessionId: string, forcedStatus: "SUBMITTED" | "AUTO_SUBMITTED" | "BLOCKED" = "SUBMITTED") {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { answers: true },
  })
  if (!session || session.status !== "IN_PROGRESS") return session

  const questions = await prisma.question.findMany({ where: { id: { in: session.questionOrder as string[] } } })
  const questionMap = new Map(questions.map((question) => [question.id, question]))
  let score = 0
  const results: Array<{ id: string; isCorrect: boolean }> = []
  for (const answer of session.answers) {
    const question = questionMap.get(answer.questionId)
    const isCorrect = Boolean(answer.selectedOption && question && answer.selectedOption === resolveQuestion(question, session.id).correctOption)
    if (question) score += isCorrect ? question.marks : answer.selectedOption ? -question.negativeMarks : 0
    results.push({ id: answer.id, isCorrect })
  }

  // Grade exactly once even if the student's submit, the auto-submit on violations and the timer all fire together:
  // only the call that flips IN_PROGRESS to the final status writes the score.
  let graded = false
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.examSession.updateMany({ where: { id: session.id, status: "IN_PROGRESS" }, data: { score, status: forcedStatus, submittedAt: new Date() } })
    if (claimed.count === 0) return
    for (const result of results) await tx.answer.update({ where: { id: result.id }, data: { isCorrect: result.isCorrect } })
    graded = true
  }, { timeout: 30_000 })
  if (graded) await recordAudit({ action: `session.${forcedStatus.toLowerCase()}`, actorId: session.userId, sessionId: session.id, details: { score } })
  return prisma.examSession.findUnique({ where: { id: session.id }, include: { answers: true } })
}

export async function autoSubmitExpiredSessions() {
  const sessions = await prisma.examSession.findMany({ where: { status: "IN_PROGRESS", pausedAt: null, serverEndsAt: { lt: new Date() } }, select: { id: true } })
  for (const session of sessions) await submitSession(session.id, "AUTO_SUBMITTED")
  return sessions.length
}