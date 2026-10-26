// Stage 3: a behavioural machine-learning score. It turns everything recorded about a session (proctoring incidents
// and answer timing) into a feature vector and a logistic-regression probability that the session contains cheating,
// with the contribution of every feature so a reviewer can see WHY. The weights start as expert priors and are
// re-fitted to the reviewers' own verdicts by scripts/train-integrity.ts, so the model improves with use.
import weights from "./integrity-weights.json"

export type IntegrityIncident = { type: string; severity: string; createdAt: Date | string }
export type IntegrityAnswer = { updatedAt: Date | string; isCorrect: boolean | null; selectedOption?: string | null }
export type IntegrityInput = { startedAt: Date | string; incidents: IntegrityIncident[]; answers: IntegrityAnswer[] }

export const FEATURES = ["gaze", "tabSwitch", "clipboard", "face", "object", "identity", "tamper", "audio", "burst", "fastCorrect"] as const
export type FeatureName = (typeof FEATURES)[number]
export const FEATURE_LABELS: Record<FeatureName, string> = {
  gaze: "Looking away from the screen",
  tabSwitch: "Leaving the exam window",
  clipboard: "Copy, paste or cut attempts",
  face: "Face missing or extra people",
  object: "Phone, book or other object seen",
  identity: "Face does not match registration",
  tamper: "Virtual camera, extra monitor or client tampering",
  audio: "Speech or other voices",
  burst: "Many alerts in a short time",
  fastCorrect: "Correct answers given unusually fast",
}

const GROUPS: Record<Exclude<FeatureName, "burst" | "fastCorrect">, string[]> = {
  gaze: ["GAZE_AWAY"],
  tabSwitch: ["TAB_SWITCH", "FULLSCREEN_EXIT", "BACKGROUND_APP"],
  clipboard: ["COPY_ATTEMPT", "PASTE_ATTEMPT", "CUT_ATTEMPT"],
  face: ["NO_FACE", "MULTIPLE_FACES", "SURROUNDING_MOVEMENT"],
  object: ["OBJECT_DETECTED"],
  identity: ["IDENTITY_MISMATCH"],
  tamper: ["VIRTUAL_CAMERA", "CLIENT_INTEGRITY", "MULTIPLE_MONITORS", "CAMERA_LOST", "SIDE_CAMERA_LOST", "LIVENESS_FAILED", "INPUT_ANOMALY"],
  audio: ["AUDIO_ANOMALY"],
}
const FAST_ANSWER_MS = 8000

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))
const time = (value: Date | string) => new Date(value).getTime()

export function extractIntegrityFeatures(input: IntegrityInput): Record<FeatureName, number> {
  const counts = Object.fromEntries(Object.entries(GROUPS).map(([name, types]) => [name, input.incidents.filter((incident) => types.includes(incident.type)).length])) as Record<keyof typeof GROUPS, number>
  // Burst: the most alerts inside any 2-minute window (a person who is suddenly doing many suspicious things).
  // Desk-check pictures are requested by the invigilator, not caused by the candidate, so they never count as a burst.
  const times = input.incidents.filter((incident) => incident.type !== "DESK_CHECK").map((incident) => time(incident.createdAt)).sort((a, b) => a - b)
  let burst = 0
  for (let start = 0, end = 0; end < times.length; end += 1) {
    while (times[end] - times[start] > 120_000) start += 1
    burst = Math.max(burst, end - start + 1)
  }
  // Answer speed: gap between consecutive answer saves. Many correct answers within a few seconds suggests prior knowledge of the answers.
  const answered = input.answers.filter((answer) => answer.selectedOption !== null && answer.selectedOption !== undefined).sort((a, b) => time(a.updatedAt) - time(b.updatedAt))
  let previous = time(input.startedAt)
  let fastCorrect = 0
  for (const answer of answered) {
    const at = time(answer.updatedAt)
    if (answer.isCorrect && at - previous < FAST_ANSWER_MS) fastCorrect += 1
    previous = at
  }
  const fastShare = answered.length >= 5 ? fastCorrect / answered.length : 0
  return {
    gaze: Math.log1p(counts.gaze),
    tabSwitch: Math.log1p(counts.tabSwitch),
    clipboard: Math.log1p(counts.clipboard),
    face: Math.log1p(counts.face),
    object: Math.log1p(counts.object),
    identity: Math.log1p(counts.identity),
    tamper: Math.log1p(counts.tamper),
    audio: Math.log1p(counts.audio),
    burst: Math.log1p(Math.max(0, burst - 2)),
    fastCorrect: fastShare,
  }
}

export type IntegrityAssessment = {
  probability: number // 0..1, estimated chance that the session contains real cheating
  level: "LOW" | "ELEVATED" | "HIGH"
  factors: Array<{ feature: FeatureName; label: string; contribution: number }>
  trained: boolean
  samples: number
}

export function assessIntegrity(input: IntegrityInput): IntegrityAssessment {
  const features = extractIntegrityFeatures(input)
  const w = weights.weights as Record<FeatureName, number>
  const factors = FEATURES.map((feature) => ({ feature, label: FEATURE_LABELS[feature], contribution: w[feature] * features[feature] }))
  const probability = sigmoid(weights.bias + factors.reduce((sum, factor) => sum + factor.contribution, 0))
  return {
    probability,
    level: probability >= 0.7 ? "HIGH" : probability >= 0.35 ? "ELEVATED" : "LOW",
    factors: factors.filter((factor) => factor.contribution > 0.05).sort((a, b) => b.contribution - a.contribution),
    trained: weights.trained,
    samples: weights.samples,
  }
}
