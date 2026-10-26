// Screen-coordinate gaze: learn, from the calibration (the candidate looks at dots whose screen positions we know),
// a mapping from [head yaw, head pitch, eye horizontal, eye vertical] to where on the screen they are looking.
// Coordinates are percentages of the screen: x 0 = left edge, 100 = right edge; y 0 = top, 100 = bottom.
// A webcam estimate like this is coarse (see `error`), so it is used as extra evidence for a human reviewer,
// not as a stand-alone decision.
import type { Features } from "./gaze-baseline"

export type ScreenMap = {
  mean: number[]; scale: number[]
  coefX: number[]; coefY: number[] // [bias, f1..f4] on normalised features
  error: number // leave-one-target-out root-mean-square error, in screen percent: how far off the estimate is for a point it was not trained on
}
export type LabelledSample = { features: Features; x: number; y: number; target: number }

const LAMBDA = 1.0

function solve(a: number[][], b: number[]) { // Gaussian elimination for the small ridge system
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r
    ;[m[c], m[p]] = [m[p], m[c]]
    const pivot = m[c][c] || 1e-9
    for (let r = c + 1; r < n; r++) { const f = m[r][c] / pivot; for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k] }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) { let s = m[r][n]; for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k]; x[r] = s / (m[r][r] || 1e-9) }
  return x
}

function ridge(rows: number[][], y: number[]) {
  const d = rows[0].length
  const ata = Array.from({ length: d }, () => new Array(d).fill(0))
  const aty = new Array(d).fill(0)
  rows.forEach((row, i) => { for (let j = 0; j < d; j++) { aty[j] += row[j] * y[i]; for (let k = 0; k < d; k++) ata[j][k] += row[j] * row[k] } })
  for (let j = 1; j < d; j++) ata[j][j] += LAMBDA // do not penalise the bias term
  return solve(ata, aty)
}

const design = (f: number[], mean: number[], scale: number[]) => [1, ...f.map((v, i) => (v - mean[i]) / scale[i])]
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0)

function fitCoef(samples: LabelledSample[], mean: number[], scale: number[]) {
  const rows = samples.map((s) => design(s.features, mean, scale))
  return { coefX: ridge(rows, samples.map((s) => s.x)), coefY: ridge(rows, samples.map((s) => s.y)) }
}

export function fitScreenMap(samples: LabelledSample[]): ScreenMap | null {
  const targets = new Set(samples.map((s) => s.target))
  if (samples.length < 40 || targets.size < 4) return null
  const cols = [0, 1, 2, 3].map((i) => samples.map((s) => s.features[i]))
  const mean = cols.map((c) => c.reduce((a, b) => a + b, 0) / c.length)
  const scale = cols.map((c, i) => Math.max(Math.sqrt(c.reduce((a, b) => a + (b - mean[i]) ** 2, 0) / c.length), 1e-3))
  // Honest error estimate: leave each calibration dot out in turn and predict it from the others.
  let sq = 0, count = 0
  for (const t of targets) {
    const train = samples.filter((s) => s.target !== t), test = samples.filter((s) => s.target === t)
    if (new Set(train.map((s) => s.target)).size < 3) continue
    const { coefX, coefY } = fitCoef(train, mean, scale)
    test.forEach((s) => { const d = design(s.features, mean, scale); sq += (dot(coefX, d) - s.x) ** 2 + (dot(coefY, d) - s.y) ** 2; count += 1 })
  }
  const { coefX, coefY } = fitCoef(samples, mean, scale)
  return { mean, scale, coefX, coefY, error: count ? Math.sqrt(sq / count / 2) : Number.POSITIVE_INFINITY }
}

export function predictScreenPoint(map: ScreenMap, features: Features) {
  const d = design(features, map.mean, map.scale)
  return { x: dot(map.coefX, d), y: dot(map.coefY, d) }
}

/** A readable place name for the estimated point; "off-screen" only beyond the screen edge plus the method's own error. */
export function describePoint(map: ScreenMap, point: { x: number; y: number }) {
  const slack = Math.max(10, map.error)
  const horizontal = point.x < -slack ? "left" : point.x > 100 + slack ? "right" : ""
  const vertical = point.y < -slack ? "above" : point.y > 100 + slack ? "below" : ""
  if (horizontal || vertical) return { offScreen: true, zone: `off-screen ${[vertical, horizontal].filter(Boolean).join(" and ")}` }
  const col = point.x < 33 ? "left" : point.x > 66 ? "right" : "centre"
  const row = point.y < 33 ? "top" : point.y > 66 ? "bottom" : "middle"
  return { offScreen: false, zone: `${row} ${col}`.replace("middle centre", "centre") }
}
