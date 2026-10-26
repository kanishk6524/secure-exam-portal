import { PrismaClient, ExamStatus } from "@prisma/client"
import type { ExamPack } from "./exam-packs"

const LETTERS = ["A", "B", "C", "D"]

export async function installPack(client: PrismaClient, pack: ExamPack, window = { days: 30 }) {
  const startTime = new Date(Date.now() - 60 * 60 * 1000)
  const endTime = new Date(Date.now() + window.days * 24 * 60 * 60 * 1000)
  // collegeId null: every registered student can see the pack.
  await client.exam.upsert({
    where: { id: pack.id },
    update: { title: pack.title, description: pack.description, durationMins: pack.durationMins, startTime, endTime, status: ExamStatus.SCHEDULED },
    create: { id: pack.id, title: pack.title, description: pack.description, durationMins: pack.durationMins, startTime, endTime, status: ExamStatus.SCHEDULED },
  })
  for (const [subjectIndex, subject] of pack.subjects.entries()) {
    const subjectId = `${pack.id}-s${subjectIndex + 1}`
    await client.subject.upsert({ where: { id: subjectId }, update: { name: subject.name }, create: { id: subjectId, name: subject.name, examId: pack.id } })
    for (const [index, question] of subject.questions.entries()) {
      const data = {
        subjectId,
        text: question.text,
        options: question.options.map((text, optionIndex) => ({ id: LETTERS[optionIndex], text })),
        correctOption: LETTERS[question.answer],
        marks: pack.marks,
        negativeMarks: pack.negative,
      }
      await client.question.upsert({ where: { id: `${subjectId}-q${index + 1}` }, update: data, create: { id: `${subjectId}-q${index + 1}`, ...data } })
    }
  }
}

