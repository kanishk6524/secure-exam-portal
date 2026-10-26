// Readable answer-pattern checks, shown to the reviewer in the integrity report. Deliberately NOT part of the trained
// integrity model: each finding is a plain statement a person can verify, with the numbers behind it.
// Limit: the database keeps only the LAST save time of each answer, so changed answers look like later answers.
export type PatternAnswer = { updatedAt: Date | string; selectedOption: string | null; isCorrect: boolean | null }
export type PatternFinding = { code: "RAPID" | "METRONOME" | "LATE_DUMP" | "STRAIGHT_LINE"; severity: "INFO" | "WARN"; text: string }

const t = (v: Date | string) => new Date(v).getTime()
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

export function analyseAnswerPatterns(input: { startedAt: Date | string; endedAt: Date | string | null; answers: PatternAnswer[] }): PatternFinding[] {
  const answered = input.answers.filter((a) => a.selectedOption).sort((a, b) => t(a.updatedAt) - t(b.updatedAt))
  const findings: PatternFinding[] = []
  if (answered.length < 10) return findings // too few answers to say anything
  const times = answered.map((a) => t(a.updatedAt))
  const gaps = times.map((time, i) => (i === 0 ? time - t(input.startedAt) : time - times[i - 1])).filter((g) => g >= 0)

  const med = median(gaps)
  if (med < 4000) findings.push({ code: "RAPID", severity: "WARN", text: `Half of the answers were saved within ${(med / 1000).toFixed(1)} s of the previous one (median over ${answered.length} answers). Reading and thinking normally takes longer.` })

  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
  const cv = Math.sqrt(gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length) / (mean || 1)
  if (cv < 0.25 && mean < 30_000) findings.push({ code: "METRONOME", severity: "WARN", text: `The time between answers was almost constant (variation ${(cv * 100).toFixed(0)}% around ${(mean / 1000).toFixed(1)} s). People's pace varies far more than that, so this can indicate scripted or copied answering.` })

  if (input.endedAt) {
    const start = t(input.startedAt), end = t(input.endedAt), span = end - start
    if (span > 0) {
      const late = times.filter((time) => time > end - span * 0.1).length
      if (late / answered.length > 0.7) findings.push({ code: "LATE_DUMP", severity: "INFO", text: `${Math.round((late / answered.length) * 100)}% of answers were saved in the last tenth of the exam time. This is common when time runs short, and is only worth a look together with other signs.` })
    }
  }

  let longest = 1, run = 1
  for (let i = 1; i < answered.length; i++) { run = answered[i].selectedOption === answered[i - 1].selectedOption ? run + 1 : 1; longest = Math.max(longest, run) }
  if (longest >= 8) findings.push({ code: "STRAIGHT_LINE", severity: "INFO", text: `The same option letter was chosen ${longest} times in a row. (Options are shuffled per candidate, so this suggests guessing rather than knowing.)` })
  return findings
}
