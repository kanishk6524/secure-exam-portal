// Stage 1 + 2 of the portal's own proctoring method: every candidate gets a personal gaze baseline and a small
// neural network (autoencoder) trained on their own calibration data. During the exam, anything outside that
// person's normal range, or that their own model cannot reconstruct, is treated as an anomaly. Nothing here is a
// fixed "one threshold for everybody" rule.
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision"

export const FEATURE_NAMES = ["head yaw", "head pitch", "eye horizontal", "eye vertical"] as const
export type Features = [number, number, number, number]

export type GazeBaseline = {
  version: 1
  createdAt: number
  samples: number
  mean: number[]
  std: number[]
  lo: number[] // lowest normal value per feature (observed range + safety margin)
  hi: number[]
  margin: number[]
  scale: number[] // per-feature scale used to normalise features for the autoencoder
  aeThreshold: number // reconstruction error above this is an anomaly (mean + 3 sigma of the training error)
  aeTrained: boolean
}

export const BASELINE_KEY = "gazeBaseline"
export const MODEL_URL = "indexeddb://gaze-autoencoder"
const MIN_MARGIN = [6, 6, 0.08, 0.08] // degrees, degrees, blendshape units, blendshape units

/** Head pose (degrees) and eye direction (blendshape scores) of one video frame, or null when no single face is visible. */
export function extractFeatures(result: FaceLandmarkerResult): Features | null {
  if (result.faceLandmarks.length !== 1) return null
  const matrix = result.facialTransformationMatrixes?.[0]?.data
  if (!matrix) return null
  const yaw = (Math.atan2(matrix[2], matrix[10]) * 180) / Math.PI
  const pitch = (Math.atan2(-matrix[6], Math.sqrt(matrix[4] ** 2 + matrix[5] ** 2)) * 180) / Math.PI
  const shapes = new Map((result.faceBlendshapes?.[0]?.categories ?? []).map((category) => [category.categoryName, category.score]))
  const s = (name: string) => shapes.get(name) ?? 0
  const blink = (s("eyeBlinkLeft") + s("eyeBlinkRight")) / 2
  if (blink > 0.5) return null // a blink is not a gaze sample
  const lookingRight = (s("eyeLookInLeft") + s("eyeLookOutRight")) / 2
  const lookingLeft = (s("eyeLookOutLeft") + s("eyeLookInRight")) / 2
  const lookingDown = (s("eyeLookDownLeft") + s("eyeLookDownRight")) / 2
  const lookingUp = (s("eyeLookUpLeft") + s("eyeLookUpRight")) / 2
  return [yaw, pitch, lookingRight - lookingLeft, lookingDown - lookingUp]
}

function stats(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length)
  return { mean, std, min: Math.min(...values), max: Math.max(...values) }
}

/** Fit the personal normal range from the calibration samples (the candidate looking at the screen's corners and centre). */
export function fitBaseline(samples: Features[]): GazeBaseline {
  const columns = [0, 1, 2, 3].map((index) => stats(samples.map((sample) => sample[index])))
  const margin = columns.map((column, index) => Math.max(0.2 * (column.max - column.min), 1.5 * column.std, MIN_MARGIN[index]))
  return {
    version: 1,
    createdAt: Date.now(),
    samples: samples.length,
    mean: columns.map((column) => column.mean),
    std: columns.map((column) => column.std),
    lo: columns.map((column, index) => column.min - margin[index]),
    hi: columns.map((column, index) => column.max + margin[index]),
    margin,
    scale: columns.map((column, index) => Math.max(column.std, MIN_MARGIN[index] / 2)),
    aeThreshold: Number.POSITIVE_INFINITY,
    aeTrained: false,
  }
}

/** How far outside this candidate's normal range the frame is: 0 = inside, 1 = one full safety margin outside. */
export function envelopeDeviation(baseline: GazeBaseline, features: Features) {
  let worst = 0
  let worstIndex = -1
  features.forEach((value, index) => {
    const outside = Math.max(baseline.lo[index] - value, value - baseline.hi[index], 0) / baseline.margin[index]
    if (outside > worst) { worst = outside; worstIndex = index }
  })
  return { deviation: worst, feature: worstIndex >= 0 ? FEATURE_NAMES[worstIndex] : null }
}

export function normalise(baseline: GazeBaseline, features: Features) {
  return features.map((value, index) => (value - baseline.mean[index]) / baseline.scale[index])
}

type Tf = typeof import("@tensorflow/tfjs")

/** Train a 4 -> 3 -> 2 -> 3 -> 4 autoencoder on the candidate's own normal frames and store it in the browser. */
export async function trainAutoencoder(tf: Tf, baseline: GazeBaseline, samples: Features[]): Promise<GazeBaseline> {
  const data = samples.map((sample) => normalise(baseline, sample))
  const input = tf.tensor2d(data)
  const model = tf.sequential()
  model.add(tf.layers.dense({ inputShape: [4], units: 3, activation: "tanh" }))
  model.add(tf.layers.dense({ units: 2, activation: "tanh" }))
  model.add(tf.layers.dense({ units: 3, activation: "tanh" }))
  model.add(tf.layers.dense({ units: 4, activation: "linear" }))
  model.compile({ optimizer: tf.train.adam(0.01), loss: "meanSquaredError" })
  await model.fit(input, input, { epochs: 120, batchSize: 32, shuffle: true, verbose: 0 })
  const errors = tf.tidy(() => {
    const reconstructed = model.predict(input) as import("@tensorflow/tfjs").Tensor
    return tf.mean(tf.square(tf.sub(input, reconstructed)), 1).arraySync() as number[]
  })
  const { mean, std } = stats(errors)
  await model.save(MODEL_URL)
  input.dispose()
  model.dispose()
  return { ...baseline, aeTrained: true, aeThreshold: Math.max(mean + 3 * std, 0.15) }
}

export function saveBaseline(baseline: GazeBaseline) {
  try { sessionStorage.setItem(BASELINE_KEY, JSON.stringify(baseline)) } catch { /* private mode: the exam falls back to default thresholds */ }
}

export function loadBaseline(): GazeBaseline | null {
  try {
    const raw = sessionStorage.getItem(BASELINE_KEY)
    const parsed = raw ? (JSON.parse(raw) as GazeBaseline) : null
    return parsed && parsed.version === 1 && parsed.lo?.length === 4 ? { ...parsed, aeThreshold: parsed.aeThreshold ?? Number.POSITIVE_INFINITY } : null
  } catch {
    return null
  }
}

/** Reconstruction error of one frame under the candidate's own autoencoder. */
export function reconstructionError(tf: Tf, model: import("@tensorflow/tfjs").LayersModel, baseline: GazeBaseline, features: Features) {
  return tf.tidy(() => {
    const x = tf.tensor2d([normalise(baseline, features)])
    const y = model.predict(x) as import("@tensorflow/tfjs").Tensor
    return tf.mean(tf.square(tf.sub(x, y))).dataSync()[0]
  })
}
