// Fits the integrity model's logistic-regression weights to the verdicts your reviewers have given
// (FLAGGED = cheating, CLEARED = clean). Usage: npm run train:integrity
import { PrismaClient } from "@prisma/client"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { extractIntegrityFeatures, FEATURES } from "../lib/integrity-model"

const prisma = new PrismaClient()

async function main() {
  const sessions = await prisma.examSession.findMany({
    where: { verdict: { in: ["FLAGGED", "CLEARED"] } },
    include: { incidents: { select: { type: true, severity: true, createdAt: true } }, answers: { select: { updatedAt: true, isCorrect: true, selectedOption: true } } },
  })
  const flagged = sessions.filter((session) => session.verdict === "FLAGGED").length
  if (sessions.length < 20 || flagged < 5 || sessions.length - flagged < 5) {
    console.log(`Need at least 20 reviewed sessions with 5+ flagged and 5+ cleared. You have ${sessions.length} (${flagged} flagged). Keep using Incident Review to label sessions, then train again.`)
    return
  }
  const data = sessions.map((session) => ({ x: FEATURES.map((name) => extractIntegrityFeatures(session)[name]), y: session.verdict === "FLAGGED" ? 1 : 0 }))
  let bias = 0
  const w = new Array(FEATURES.length).fill(0)
  const rate = 0.1
  const l2 = 0.01 // keeps the weights small and stable with little data
  for (let epoch = 0; epoch < 3000; epoch += 1) {
    const gradient = new Array(FEATURES.length).fill(0)
    let gradientBias = 0
    for (const { x, y } of data) {
      const p = 1 / (1 + Math.exp(-(bias + x.reduce((sum, value, index) => sum + value * w[index], 0))))
      gradientBias += p - y
      x.forEach((value, index) => { gradient[index] += (p - y) * value })
    }
    bias -= (rate * gradientBias) / data.length
    w.forEach((_, index) => { w[index] -= rate * (gradient[index] / data.length + l2 * w[index]) })
  }
  const output = { note: `Fitted to ${data.length} reviewed sessions on ${new Date().toISOString()}.`, trained: true, samples: data.length, bias, weights: Object.fromEntries(FEATURES.map((name, index) => [name, Math.max(0, w[index])])) }
  writeFileSync(join(process.cwd(), "lib", "integrity-weights.json"), JSON.stringify(output, null, 2) + "\n")
  console.log("Saved lib/integrity-weights.json", output)
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1) })
