// Ablation study: old fixed-threshold gaze rule vs the personal-baseline method.
//
//   npm run ablation            (writes docs/ablation-results.md and docs/ablation-results.json)
//
// IMPORTANT: this is a SIMULATION. Nobody was filmed. It shows how the two decision rules behave on
// synthetic candidates whose habits and behaviour are drawn from the assumptions listed in SCENARIOS and in
// the generator below. It is evidence about the method under stated assumptions, not a measured accuracy on
// real students. Real recorded sessions with labelled cheating are needed before any real-world claim.
//
// Both arms run the real code: fixedRuleAnomalous (lib/fixed-gaze-rule.ts) and fitBaseline /
// envelopeDeviation (lib/gaze-baseline.ts). The autoencoder is NOT part of this study (it needs TensorFlow.js
// in a browser); this compares the envelope (personal range) against the global thresholds.
import { mkdirSync, writeFileSync } from "node:fs"
import { fitBaseline, envelopeDeviation, type Features, type GazeBaseline } from "../lib/gaze-baseline"
import { fixedRuleAnomalous } from "../lib/fixed-gaze-rule"

// ---------- seeded randomness ----------
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type Rand = () => number
const uni = (r: Rand, lo: number, hi: number) => lo + (hi - lo) * r()
const gauss = (r: Rand) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
const sign = (r: Rand) => (r() < 0.5 ? -1 : 1)

// ---------- scenario assumptions (all of them are visible and can be changed) ----------
type Scenario = {
  name: string
  description: string
  wideShare: number // share of candidates with big natural head movement (talk with the head, big screen, sit close)
  wideFactor: number
  glancePerMin: number // honest glances away while thinking
  longThinkPerMin: number // honest long look away (ceiling / wall)
  calibrationContamination: number // share of calibration frames in which the candidate was already looking off-screen
  cheatStrength: number // 1 = default amplitudes, <1 = a more careful cheater
  subtleShare: number // share of cheating episodes done with the eyes only
}
const BASE: Scenario = {
  name: "default",
  description: "Mixed population, normal honest glances, standard cheating",
  wideShare: 0.15, wideFactor: 2.5, glancePerMin: 0.33, longThinkPerMin: 0.08,
  calibrationContamination: 0, cheatStrength: 1, subtleShare: 0.25,
}
const SCENARIOS: Scenario[] = [
  BASE,
  { ...BASE, name: "homogeneous", description: "Everyone sits like the average student (no wide-movement users) - the fixed rule's best case", wideShare: 0 },
  { ...BASE, name: "restless-honest", description: "Honest candidates look away twice as often", glancePerMin: 0.66, longThinkPerMin: 0.16 },
  { ...BASE, name: "careful-cheater", description: "Cheaters make smaller movements (60% amplitude) and use the eyes more", cheatStrength: 0.6, subtleShare: 0.5 },
  { ...BASE, name: "dirty-calibration", description: "10% of the calibration frames were taken while already looking off-screen (candidate gaming the baseline)", calibrationContamination: 0.1 },
]

const FPS = 2 // the engine checks every 500 ms
const EXAM_MIN = 60
const FRAMES = EXAM_MIN * 60 * FPS
const SUSTAIN = 9 // engine raises GAZE_AWAY after more than 8 consecutive anomalous checks
const N_USERS = 500

type Frame = { yaw: number; pitch: number; eyeH: number; eyeV: number }
type User = {
  bias: Frame; spread: Frame; noise: Frame; wide: boolean
}
type Episode = { start: number; end: number }

function makeUser(r: Rand, s: Scenario): User {
  const wide = r() < s.wideShare
  const k = wide ? s.wideFactor : 1
  return {
    wide,
    bias: { yaw: gauss(r) * 6, pitch: gauss(r) * 6, eyeH: gauss(r) * 0.05, eyeV: gauss(r) * 0.05 },
    spread: { yaw: uni(r, 3, 9) * k, pitch: uni(r, 2, 7) * k, eyeH: uni(r, 0.05, 0.18) * k, eyeV: uni(r, 0.05, 0.18) * k },
    noise: { yaw: 1.5, pitch: 1.5, eyeH: 0.04, eyeV: 0.04 },
  }
}

/** Calibration: centre + four corners, ~100 frames; the user looks at screen positions covering their own range. */
function calibrate(r: Rand, u: User, s: Scenario): Features[] {
  const out: Features[] = []
  const targets: [number, number][] = [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]]
  for (let i = 0; i < 100; i++) {
    const [cx, cy] = targets[Math.floor(i / 20)]
    const f: Features = [
      u.bias.yaw + u.spread.yaw * cx + gauss(r) * u.noise.yaw,
      u.bias.pitch + u.spread.pitch * cy + gauss(r) * u.noise.pitch,
      u.bias.eyeH + u.spread.eyeH * cx + gauss(r) * u.noise.eyeH,
      u.bias.eyeV + u.spread.eyeV * cy + gauss(r) * u.noise.eyeV,
    ]
    if (r() < s.calibrationContamination) { // already looking at the other source
      f[0] += sign(r) * uni(r, 25, 40); f[2] += sign(r) * uni(r, 0.3, 0.6)
    }
    out.push(f)
  }
  return out
}

/** One exam: reading the screen (mean-reverting around the user's own centre) plus honest glances; optional cheating. */
function simulate(r: Rand, u: User, s: Scenario, cheat: boolean): { frames: Frame[]; episodes: Episode[] } {
  const frames: Frame[] = []
  const state = { ...u.bias }
  const keys: (keyof Frame)[] = ["yaw", "pitch", "eyeH", "eyeV"]
  const offset: Frame = { yaw: 0, pitch: 0, eyeH: 0, eyeV: 0 }
  let until = -1
  const episodes: Episode[] = []
  const cheatStarts: number[] = []
  if (cheat) {
    const count = 3
    for (let i = 0; i < count; i++) cheatStarts.push(Math.floor(((i + 0.3 + 0.4 * r()) / count) * FRAMES))
  }
  let cheatEnd = -1
  const glanceP = s.glancePerMin / (60 * FPS)
  const thinkP = s.longThinkPerMin / (60 * FPS)
  for (let t = 0; t < FRAMES; t++) {
    for (const key of keys) state[key] = u.bias[key] + 0.9 * (state[key] - u.bias[key]) + gauss(r) * u.spread[key] * 0.18
    if (t > until) { for (const key of keys) offset[key] = 0 }
    const startsCheat = cheatStarts.includes(t) && t > cheatEnd
    if (startsCheat) {
      const len = Math.floor(uni(r, 20, 80)); until = t + len; cheatEnd = until; episodes.push({ start: t, end: until })
      for (const key of keys) offset[key] = 0
      const a = s.cheatStrength
      const kind = r() < s.subtleShare ? "subtle" : r() < 0.47 ? "side" : "down"
      if (kind === "side") { const d = sign(r); offset.yaw = d * uni(r, 22, 45) * a; offset.eyeH = d * uni(r, 0.25, 0.6) * a }
      else if (kind === "down") { offset.pitch = uni(r, 10, 25) * a; offset.eyeV = uni(r, 0.3, 0.65) * a }
      else if (r() < 0.5) { offset.eyeH = sign(r) * uni(r, 0.3, 0.5) * a; offset.yaw = sign(r) * uni(r, 0, 4) }
      else { offset.eyeV = uni(r, 0.3, 0.5) * a; offset.pitch = uni(r, 0, 4) }
    } else if (t > until && t > cheatEnd) {
      if (r() < glanceP) { // quick glance while thinking: 1-4 s
        until = t + Math.floor(uni(r, 2, 8))
        if (r() < 0.6) offset.yaw = sign(r) * uni(r, 8, 28)
        if (r() < 0.4) offset.pitch = sign(r) * uni(r, 5, 18)
        if (r() < 0.6) offset.eyeH = sign(r) * uni(r, 0.15, 0.5)
        if (r() < 0.4) offset.eyeV = sign(r) * uni(r, 0.1, 0.4)
      } else if (r() < thinkP) { // long look at the ceiling / wall: 8-15 s
        until = t + Math.floor(uni(r, 16, 30))
        offset.yaw = sign(r) * uni(r, 10, 30); offset.pitch = -uni(r, 5, 15); offset.eyeV = -uni(r, 0.15, 0.4)
      }
    }
    frames.push({
      yaw: state.yaw + offset.yaw + gauss(r) * u.noise.yaw,
      pitch: state.pitch + offset.pitch + gauss(r) * u.noise.pitch,
      eyeH: state.eyeH + offset.eyeH + gauss(r) * u.noise.eyeH,
      eyeV: state.eyeV + offset.eyeV + gauss(r) * u.noise.eyeV,
    })
  }
  return { frames, episodes }
}

// ---------- the two detectors, with a sensitivity knob so the whole trade-off curve can be drawn ----------
type Detector = (frames: Frame[]) => number[] // frame indexes where an alert was raised

function onsets(flags: (i: number) => boolean): number[] {
  const out: number[] = []
  let run = 0
  for (let i = 0; i < FRAMES; i++) {
    if (flags(i)) { run += 1; if (run === SUSTAIN) out.push(i) } else run = 0
  }
  return out
}
const fixedDetector = (scale: number): Detector => (frames) => onsets((i) => {
  const f = frames[i]
  const sideways = Math.abs(f.eyeH)
  const down = Math.max(f.eyeV, 0)
  return fixedRuleAnomalous(f.yaw, f.pitch, sideways, down, { yaw: scale, pitch: scale, side: scale, down: scale }).anomalous
})
function widen(baseline: GazeBaseline, m: number): GazeBaseline {
  const lo = baseline.lo.map((v, i) => v + baseline.margin[i] - baseline.margin[i] * m)
  const hi = baseline.hi.map((v, i) => v - baseline.margin[i] + baseline.margin[i] * m)
  return { ...baseline, lo, hi, margin: baseline.margin.map((v) => v * m) }
}
const personalDetector = (baseline: GazeBaseline, m: number): Detector => {
  const b = widen(baseline, m)
  return (frames) => onsets((i) => {
    const f = frames[i]
    return envelopeDeviation(b, [f.yaw, f.pitch, f.eyeH, f.eyeV]).deviation > 0
  })
}

// ---------- evaluation ----------
const FIXED_SCALES = [0.6, 0.8, 1, 1.2, 1.4, 1.7, 2, 2.5, 3]
const PERSONAL_MULT = [0.4, 0.6, 0.8, 1, 1.25, 1.5, 2, 2.5, 3.5]

type Cohort = { honest: { frames: Frame[]; baseline: GazeBaseline; wide: boolean }[]; cheaters: { frames: Frame[]; episodes: Episode[]; baseline: GazeBaseline }[] }
function makeCohort(seed: number, s: Scenario): Cohort {
  const r = rng(seed)
  const honest: Cohort["honest"] = []
  const cheaters: Cohort["cheaters"] = []
  for (let i = 0; i < N_USERS; i++) {
    const u = makeUser(r, s)
    const baseline = fitBaseline(calibrate(r, u, s))
    honest.push({ frames: simulate(r, u, s, false).frames, baseline, wide: u.wide })
  }
  for (let i = 0; i < N_USERS; i++) {
    const u = makeUser(r, s)
    const baseline = fitBaseline(calibrate(r, u, s))
    const sim = simulate(r, u, s, true)
    cheaters.push({ frames: sim.frames, episodes: sim.episodes, baseline })
  }
  return { honest, cheaters }
}

type Point = { setting: number; falseAlertsPerHour: number; honestFlaggedShare: number; episodeRecall: number; honestAlerts: number[]; caught: number[] }
function evaluate(cohort: Cohort, make: (baseline: GazeBaseline) => Detector): Point {
  const honestAlerts = cohort.honest.map((h) => make(h.baseline)(h.frames).length)
  const caught: number[] = []
  let episodes = 0
  let detected = 0
  cohort.cheaters.forEach((c) => {
    const alerts = make(c.baseline)(c.frames)
    let hit = 0
    c.episodes.forEach((e) => { episodes += 1; if (alerts.some((a) => a >= e.start && a <= e.end + 4)) { detected += 1; hit += 1 } })
    caught.push(hit)
  })
  return {
    setting: 0,
    falseAlertsPerHour: honestAlerts.reduce((a, b) => a + b, 0) / honestAlerts.length / (EXAM_MIN / 60),
    honestFlaggedShare: honestAlerts.filter((n) => n > 0).length / honestAlerts.length,
    episodeRecall: detected / episodes,
    honestAlerts,
    caught,
  }
}

/** Recall at the same false-alarm rate: interpolate the curve of one arm at a given false-alerts-per-hour. */
function recallAt(curve: Point[], falseRate: number) {
  const pts = [...curve].sort((a, b) => a.falseAlertsPerHour - b.falseAlertsPerHour)
  if (falseRate <= pts[0].falseAlertsPerHour) return pts[0].falseAlertsPerHour === falseRate ? pts[0].episodeRecall : null // cannot reach this low
  for (let i = 1; i < pts.length; i++) {
    if (falseRate <= pts[i].falseAlertsPerHour) {
      const a = pts[i - 1], b = pts[i]
      const w = (falseRate - a.falseAlertsPerHour) / Math.max(1e-9, b.falseAlertsPerHour - a.falseAlertsPerHour)
      return a.episodeRecall + w * (b.episodeRecall - a.episodeRecall)
    }
  }
  return pts[pts.length - 1].episodeRecall
}

function bootstrapDiff(a: number[], b: number[], seed: number, reps = 1000) {
  // paired difference (fixed - personal) of mean alerts per honest user, resampling users
  const r = rng(seed)
  const diffs: number[] = []
  for (let k = 0; k < reps; k++) {
    let sum = 0
    for (let i = 0; i < a.length; i++) { const j = Math.floor(r() * a.length); sum += a[j] - b[j] }
    diffs.push(sum / a.length)
  }
  diffs.sort((x, y) => x - y)
  return { mean: diffs.reduce((p, q) => p + q, 0) / reps, lo: diffs[Math.floor(0.025 * reps)], hi: diffs[Math.floor(0.975 * reps)] }
}

const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`)
const num = (v: number) => v.toFixed(2)

type Row = {
  scenario: Scenario
  fixed: Point; personal: Point
  fixedCurve: Point[]; personalCurve: Point[]
  recallFixedAtPersonalFA: number | null; recallPersonalAtFixedFA: number | null
  faDiff: { mean: number; lo: number; hi: number }
  wideFixedFA: number; wideRestFixedFA: number; widePersonalFA: number; wideRestPersonalFA: number
}

function runScenario(s: Scenario, seed: number): Row {
  const cohort = makeCohort(seed, s)
  const fixedCurve = FIXED_SCALES.map((scale) => ({ ...evaluate(cohort, () => fixedDetector(scale)), setting: scale }))
  const personalCurve = PERSONAL_MULT.map((m) => ({ ...evaluate(cohort, (b) => personalDetector(b, m)), setting: m }))
  const fixed = fixedCurve.find((p) => p.setting === 1)!
  const personal = personalCurve.find((p) => p.setting === 1)!
  const wideIdx = cohort.honest.map((h, i) => (h.wide ? i : -1)).filter((i) => i >= 0)
  const restIdx = cohort.honest.map((h, i) => (h.wide ? -1 : i)).filter((i) => i >= 0)
  const mean = (arr: number[], idx: number[]) => (idx.length ? idx.reduce((p, i) => p + arr[i], 0) / idx.length : NaN)
  return {
    scenario: s, fixed, personal, fixedCurve, personalCurve,
    recallFixedAtPersonalFA: recallAt(fixedCurve, personal.falseAlertsPerHour),
    recallPersonalAtFixedFA: recallAt(personalCurve, fixed.falseAlertsPerHour),
    faDiff: bootstrapDiff(fixed.honestAlerts, personal.honestAlerts, seed + 99),
    wideFixedFA: mean(fixed.honestAlerts, wideIdx), wideRestFixedFA: mean(fixed.honestAlerts, restIdx),
    widePersonalFA: mean(personal.honestAlerts, wideIdx), wideRestPersonalFA: mean(personal.honestAlerts, restIdx),
  }
}

// ---------- run + report ----------
const SEEDS = [11, 23, 37]
console.log(`Ablation: ${N_USERS} honest + ${N_USERS} cheating candidates per scenario, ${EXAM_MIN}-min exams, ${SEEDS.length} seeds`)
const results: Record<string, Row[]> = {}
for (const s of SCENARIOS) {
  results[s.name] = SEEDS.map((seed) => runScenario(s, seed))
  const r = results[s.name][0]
  console.log(`  ${s.name.padEnd(18)} fixed: ${num(r.fixed.falseAlertsPerHour)} false/h, recall ${pct(r.fixed.episodeRecall)} | personal: ${num(r.personal.falseAlertsPerHour)} false/h, recall ${pct(r.personal.episodeRecall)}`)
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const sd = (xs: number[]) => { const m = avg(xs); return Math.sqrt(avg(xs.map((x) => (x - m) ** 2))) }
const ms = (xs: number[], f: (v: number) => string = num) => `${f(avg(xs))} ± ${f(sd(xs))}`

let md = `# Ablation: fixed threshold vs personal baseline\n\n`
md += `> **This is a simulation, not a measurement on real students.** ${N_USERS} synthetic honest and ${N_USERS} synthetic cheating candidates per scenario, ${EXAM_MIN}-minute exams checked every 500 ms, ${SEEDS.length} random seeds (mean ± sd across seeds). Habits, glances and cheating movements are drawn from the assumptions below. It shows how the two decision rules behave under those assumptions. Real recorded sessions are needed to make a real-world claim.\n\n`
md += `Both arms run the real project code: \`lib/fixed-gaze-rule.ts\` (control: yaw > 25°, pitch > 20°, eyes sideways > 0.55, eyes down > 0.6) and \`lib/gaze-baseline.ts\` (personal range from a 5-point calibration, with margin). An alert needs more than 8 consecutive anomalous checks (about 4.5 s), exactly like the engine. The neural-network autoencoder is not included here; this isolates the personal **range** against the **global** thresholds.\n\n`
md += `Metrics: **false alerts per honest candidate-hour** (lower is better); **honest candidates flagged at least once** (lower is better); **episode recall** = share of cheating episodes (20-80 frames, about 10-40 s, 3 per exam) that raised an alert (higher is better).\n\n`
md += `## Headline results at the shipped operating points\n\n`
md += `| Scenario | Fixed: false alerts/h | Personal: false alerts/h | Fixed: honest flagged | Personal: honest flagged | Fixed: recall | Personal: recall |\n|---|---|---|---|---|---|---|\n`
for (const s of SCENARIOS) {
  const rows = results[s.name]
  md += `| ${s.name} | ${ms(rows.map((r) => r.fixed.falseAlertsPerHour))} | ${ms(rows.map((r) => r.personal.falseAlertsPerHour))} | ${ms(rows.map((r) => r.fixed.honestFlaggedShare), pct)} | ${ms(rows.map((r) => r.personal.honestFlaggedShare), pct)} | ${ms(rows.map((r) => r.fixed.episodeRecall), pct)} | ${ms(rows.map((r) => r.personal.episodeRecall), pct)} |\n`
}
md += `\n## Fair comparison: recall at the same false-alarm rate\n\nComparing single points can mislead, because either arm can trade recall for fewer false alarms by changing its sensitivity. Each arm's sensitivity was swept (fixed: thresholds × ${FIXED_SCALES[0]}..${FIXED_SCALES[FIXED_SCALES.length - 1]}; personal: margin × ${PERSONAL_MULT[0]}..${PERSONAL_MULT[PERSONAL_MULT.length - 1]}) and the other arm's recall was interpolated at the same false-alert rate. "n/a" means that arm cannot reach that low a false-alarm rate within the sweep.\n\n`
md += `| Scenario | Personal recall when fixed rule is held to its false-alarm rate... | |\n|---|---|---|\n`
md = md.replace(`| Scenario | Personal recall when fixed rule is held to its false-alarm rate... | |\n|---|---|---|\n`, `| Scenario | Fixed recall at personal's false-alarm rate | Personal recall at fixed rule's false-alarm rate | Personal's own recall | Fixed rule's own recall |\n|---|---|---|---|---|\n`)
for (const s of SCENARIOS) {
  const rows = results[s.name]
  const f = (v: number | null) => (v === null ? "n/a" : pct(v))
  md += `| ${s.name} | ${f(rows[0].recallFixedAtPersonalFA)} | ${f(rows[0].recallPersonalAtFixedFA)} | ${pct(rows[0].personal.episodeRecall)} | ${pct(rows[0].fixed.episodeRecall)} |\n`
}
md += `\n## Paired difference in false alerts (fixed − personal), per honest candidate-hour, seed ${SEEDS[0]}\n\nBootstrap 95% interval over candidates (positive = personal baseline raises fewer false alerts).\n\n| Scenario | Difference | 95% CI |\n|---|---|---|\n`
for (const s of SCENARIOS) { const d = results[s.name][0].faDiff; md += `| ${s.name} | ${num(d.mean)} | [${num(d.lo)}, ${num(d.hi)}] |\n` }
md += `\n## Who gets falsely flagged (default scenario, seed ${SEEDS[0]})\n\n`
const d0 = results.default[0]
md += `| Candidate group | Fixed: false alerts per candidate-hour | Personal: false alerts per candidate-hour |\n|---|---|---|\n| Wide natural movement (15%) | ${num(d0.wideFixedFA)} | ${num(d0.widePersonalFA)} |\n| Everyone else | ${num(d0.wideRestFixedFA)} | ${num(d0.wideRestPersonalFA)} |\n`
md += `\n## Assumptions (change them in \`scripts/ablation.ts\`)\n\n`
for (const s of SCENARIOS) md += `- **${s.name}**: ${s.description}. Wide-movement share ${pct(s.wideShare)} (×${s.wideFactor}), glances ${s.glancePerMin}/min, long looks away ${s.longThinkPerMin}/min, cheat strength ${s.cheatStrength}, eyes-only share ${pct(s.subtleShare)}, calibration contamination ${pct(s.calibrationContamination)}.\n`
md += `- Each candidate has a random head/eye offset and range (posture, camera height, screen size). Tracker noise 1.5° / 0.04. Cheating: head turned to the side, eyes down to a lap, or eyes only. Honest glances and long looks away use the same movement sizes, so the two classes overlap by design.\n`
md += `\n## Threats to validity (say these in the viva)\n\n- The result depends on how realistic the synthetic users are. The real test is recorded sessions with labelled behaviour.\n- The cheating model could be easier or harder than real cheating. The careful-cheater and dirty-calibration scenarios probe this, and they are where the personal baseline can lose.\n- Only gaze is compared. The system's other signals (identity checks, second face, phone camera, audio) are not part of this study.\n- A personal baseline is only as honest as the calibration. A candidate who cheats during calibration widens their own range (see dirty-calibration).\n`
mkdirSync("docs", { recursive: true })
writeFileSync("docs/ablation-results.md", md)
const slim = Object.fromEntries(Object.entries(results).map(([k, rows]) => [k, rows.map((r) => ({
  fixed: { ...r.fixed, honestAlerts: undefined, caught: undefined }, personal: { ...r.personal, honestAlerts: undefined, caught: undefined },
  fixedCurve: r.fixedCurve.map((p) => ({ ...p, honestAlerts: undefined, caught: undefined })), personalCurve: r.personalCurve.map((p) => ({ ...p, honestAlerts: undefined, caught: undefined })),
  recallFixedAtPersonalFA: r.recallFixedAtPersonalFA, recallPersonalAtFixedFA: r.recallPersonalAtFixedFA, faDiff: r.faDiff,
}))]))
writeFileSync("docs/ablation-results.json", JSON.stringify({ seeds: SEEDS, users: N_USERS, examMinutes: EXAM_MIN, scenarios: SCENARIOS, results: slim }, null, 2))
console.log("Wrote docs/ablation-results.md and docs/ablation-results.json")
