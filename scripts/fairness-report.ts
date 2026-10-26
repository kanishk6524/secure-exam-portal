// Fairness check: do honest candidates in some conditions get more false alerts than in others?
//
//   npm run fairness          reads docs/fairness-tags.csv + the database, writes docs/fairness-report.md
//
// docs/fairness-tags.csv (one row per test session, filled in by hand, volunteers only, with their consent):
//   sessionId,lighting,glasses,skinTone,honest
//   cl123...,bright,no,I-II,yes
// lighting: bright | dim | backlit      glasses: no | yes | sunglasses-or-tinted
// skinTone: Fitzpatrick group the volunteer chose for themselves: I-II | III-IV | V-VI
// honest: yes = the volunteer took the exam without cheating (only these rows count for false alerts)
// The tags stay in this CSV on your computer. They are never stored in the exam database.
import { readFileSync, writeFileSync, existsSync } from "node:fs"

export type Row = { lighting: string; glasses: string; skinTone: string; honest: boolean; counts: Record<string, number> }
const TYPES = ["NO_FACE", "GAZE_AWAY", "IDENTITY_MISMATCH", "MULTIPLE_FACES"] as const

/** 95% Wilson interval for a proportion. */
export function wilson(successes: number, n: number) {
  if (n === 0) return { lo: NaN, hi: NaN }
  const z = 1.96, p = successes / n
  const d = 1 + (z * z) / n
  const c = p + (z * z) / (2 * n)
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return { lo: (c - m) / d, hi: (c + m) / d }
}

export function summarise(rows: Row[], key: "lighting" | "glasses" | "skinTone") {
  const groups = new Map<string, Row[]>()
  rows.filter((r) => r.honest).forEach((r) => groups.set(r[key], [...(groups.get(r[key]) ?? []), r]))
  return [...groups.entries()].map(([group, items]) => {
    const flagged = items.filter((r) => TYPES.some((t) => (r.counts[t] ?? 0) > 0)).length
    const ci = wilson(flagged, items.length)
    return {
      group, n: items.length, flagged, share: flagged / items.length, ci,
      perType: Object.fromEntries(TYPES.map((t) => [t, items.reduce((s, r) => s + (r.counts[t] ?? 0), 0) / items.length])),
    }
  }).sort((a, b) => a.group.localeCompare(b.group))
}

const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(0)}%` : "n/a")

export function render(rows: Row[]) {
  let md = `# Fairness report\n\nHonest test sessions only: ${rows.filter((r) => r.honest).length} of ${rows.length}. "Flagged" = at least one NO_FACE, GAZE_AWAY, IDENTITY_MISMATCH or MULTIPLE_FACES alert in a session where the volunteer did nothing wrong. Intervals are 95% Wilson intervals; with few sessions they are wide, so read the interval, not just the percentage.\n\n`
  for (const [title, key] of [["Lighting", "lighting"], ["Glasses", "glasses"], ["Skin tone (self-reported Fitzpatrick group)", "skinTone"]] as const) {
    const s = summarise(rows, key)
    md += `## ${title}\n\n| Group | Honest sessions | Falsely flagged | 95% interval | Avg NO_FACE | Avg GAZE_AWAY | Avg IDENTITY_MISMATCH | Avg MULTIPLE_FACES |\n|---|---|---|---|---|---|---|---|\n`
    s.forEach((g) => { md += `| ${g.group}${g.n < 5 ? " (too few)" : ""} | ${g.n} | ${g.flagged} (${pct(g.share)}) | ${pct(g.ci.lo)}-${pct(g.ci.hi)} | ${g.perType.NO_FACE.toFixed(1)} | ${g.perType.GAZE_AWAY.toFixed(1)} | ${g.perType.IDENTITY_MISMATCH.toFixed(1)} | ${g.perType.MULTIPLE_FACES.toFixed(1)} |\n` })
    const ok = s.filter((g) => g.n >= 5)
    if (ok.length >= 2) {
      const hi = ok.reduce((a, b) => (b.share > a.share ? b : a)), lo = ok.reduce((a, b) => (b.share < a.share ? b : a))
      const overlap = hi.ci.lo <= lo.ci.hi
      md += `\nLargest gap: ${hi.group} ${pct(hi.share)} vs ${lo.group} ${pct(lo.share)}. ${overlap ? "The intervals overlap, so this data does not show a real difference (it also cannot rule one out)." : "The intervals do not overlap: this is a likely real disparity and needs a fix (lighting guidance, a per-group threshold check, or a different detector)."}\n`
    } else md += `\nNot enough groups with 5+ honest sessions to compare.\n`
    md += `\n`
  }
  md += `## Limits\n\nSmall volunteer samples cannot support a claim of fairness; they can only reveal problems. Face detection, landmark and face-matching models are known to perform differently across skin tones and lighting, so report any gap you find as a finding, not a failure.\n`
  return md
}

async function main() {
  const csvPath = "docs/fairness-tags.csv"
  if (!existsSync(csvPath)) {
    writeFileSync(csvPath, "sessionId,lighting,glasses,skinTone,honest\n")
    console.log(`Created ${csvPath}. Add one row per test session (see the header comment in scripts/fairness-report.ts), then run again.`)
    return
  }
  const tags = readFileSync(csvPath, "utf8").trim().split("\n").slice(1).filter(Boolean).map((line) => line.split(",").map((c) => c.trim()))
  if (!tags.length) { console.log("fairness-tags.csv has no rows yet."); return }
  const { PrismaClient } = await import("@prisma/client")
  const prisma = new PrismaClient()
  const sessions = await prisma.examSession.findMany({ where: { id: { in: tags.map((t) => t[0]) } }, include: { incidents: { select: { type: true } } } })
  const byId = new Map(sessions.map((s) => [s.id, s]))
  const rows: Row[] = []
  for (const [id, lighting, glasses, skinTone, honest] of tags) {
    const session = byId.get(id)
    if (!session) { console.log(`Skipping ${id}: session not found`); continue }
    const counts: Record<string, number> = {}
    session.incidents.forEach((i) => { counts[i.type] = (counts[i.type] ?? 0) + 1 })
    rows.push({ lighting, glasses, skinTone, honest: honest?.toLowerCase() === "yes", counts })
  }
  writeFileSync("docs/fairness-report.md", render(rows))
  console.log(`Wrote docs/fairness-report.md from ${rows.length} sessions`)
  await prisma.$disconnect()
}

if (process.argv[1]?.endsWith("fairness-report.ts")) main().catch((e) => { console.error(e); process.exit(1) })
