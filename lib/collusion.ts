// Stage 4: answer-similarity analytics. If two candidates choose the SAME WRONG option on many of the questions they
// both got wrong, that is much more than chance would give (a wrong answer has 3 alternatives, so by luck only
// about 1 in 3 shared wrong answers should match). The z-score says how far above chance the pair is.
export type PairInput = { sessionId: string; name: string; email: string; answers: Map<string, { option: string; correct: boolean }> }
export type SuspiciousPair = { a: { sessionId: string; name: string; email: string }; b: { sessionId: string; name: string; email: string }; bothWrong: number; sameWrong: number; expectedByChance: number; zScore: number; severity: "MEDIUM" | "HIGH" }

export function findSuspiciousPairs(candidates: PairInput[], options = { minBothWrong: 5, minSameWrong: 4, minZ: 2.5 }): SuspiciousPair[] {
  const pairs: SuspiciousPair[] = []
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      let bothWrong = 0
      let sameWrong = 0
      for (const [questionId, first] of candidates[i].answers) {
        const second = candidates[j].answers.get(questionId)
        if (!second || first.correct || second.correct) continue
        bothWrong += 1
        if (first.option === second.option) sameWrong += 1
      }
      if (bothWrong < options.minBothWrong || sameWrong < options.minSameWrong) continue
      const expected = bothWrong / 3
      const z = (sameWrong - expected) / Math.sqrt(bothWrong * (1 / 3) * (2 / 3))
      if (z < options.minZ) continue
      pairs.push({
        a: { sessionId: candidates[i].sessionId, name: candidates[i].name, email: candidates[i].email },
        b: { sessionId: candidates[j].sessionId, name: candidates[j].name, email: candidates[j].email },
        bothWrong, sameWrong, expectedByChance: Math.round(expected * 10) / 10, zScore: Math.round(z * 10) / 10,
        severity: z >= 4 ? "HIGH" : "MEDIUM",
      })
    }
  }
  return pairs.sort((x, y) => y.zScore - x.zScore)
}
