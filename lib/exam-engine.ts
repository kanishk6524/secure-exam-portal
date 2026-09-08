import { prisma } from "@/lib/prisma"

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

export async function submitSession(sessionId: string, forcedStatus: "SUBMITTED" | "AUTO_SUBMITTED" = "SUBMITTED") {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { answers: true },
  })
  if (!session || session.status !== "IN_PROGRESS") return session

  const questions = await prisma.question.findMany({ where: { id: { in: session.questionOrder as string[] } } })
  const questionMap = new Map(questions.map((question) => [question.id, question]))
  let score = 0
  for (const answer of session.answers) {
    const question = questionMap.get(answer.questionId)
    const isCorrect = Boolean(answer.selectedOption && question && answer.selectedOption === question.correctOption)
    if (question) score += isCorrect ? question.marks : answer.selectedOption ? -question.negativeMarks : 0
    await prisma.answer.update({ where: { id: answer.id }, data: { isCorrect } })
  }

  return prisma.examSession.update({
    where: { id: session.id },
    data: { score, status: forcedStatus, submittedAt: new Date() },
    include: { answers: true },
  })
}

export async function autoSubmitExpiredSessions() {
  const sessions = await prisma.examSession.findMany({ where: { status: "IN_PROGRESS", serverEndsAt: { lt: new Date() } }, select: { id: true } })
  for (const session of sessions) await submitSession(session.id, "AUTO_SUBMITTED")
  return sessions.length
}