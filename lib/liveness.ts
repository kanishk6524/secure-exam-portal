// Anti-spoofing. Two layers, with honest limits:
//  1. A RANDOM challenge before the exam (blink twice, open mouth, smile, turn left/right, look up), in random order.
//     A photo cannot blink or smile, and a pre-recorded video cannot know which actions will be asked, or in what order.
//  2. A passive check during the exam: a live face blinks and its expression changes. Two minutes with no blink and no
//     expression change while a face is present looks like a photo or a frozen picture. A person who stares without
//     blinking or speaking for two minutes would also trigger it, which is why it only goes to a human reviewer.
// NOT defended: a real-time deepfake or a live person on a second screen answering the challenge, or an OS-level
// virtual camera (the exam has a separate virtual-camera check). Treat this as one signal for a human reviewer.

export type ChallengeId = "blink2" | "mouth" | "smile" | "left" | "right" | "up"
export const CHALLENGE_TEXT: Record<ChallengeId, string> = {
  blink2: "Blink twice", mouth: "Open your mouth wide, then close it", smile: "Smile", left: "Turn your head to your left", right: "Turn your head to your right", up: "Look up",
}
/** One frame of face measurements (blendshape scores 0..1, head angles in degrees). */
export type LivenessFrame = { t: number; blink: number; mouthOpen: number; smile: number; yaw: number; pitch: number }

const NON_RIGID: ChallengeId[] = ["blink2", "mouth", "smile"] // actions a flat photo cannot do even if it is moved or tilted
const RIGID: ChallengeId[] = ["left", "right", "up"]

/** 3 distinct challenges in random order; at least one is an expression a photo cannot fake. */
export function pickChallenges(random: () => number = Math.random): ChallengeId[] {
  const shuffle = <T,>(items: T[]) => { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  const first = shuffle(NON_RIGID)[0]
  const rest = shuffle([...NON_RIGID.filter((c) => c !== first), ...RIGID]).slice(0, 2)
  return shuffle([first, ...rest])
}

export const STEP_SECONDS = 8

/** Tracks progress through the challenge list as frames arrive. */
export class ChallengeTracker {
  private index = 0
  private stepStart: number | null = null
  private blinks = 0
  private eyesClosed = false
  private mouthWasOpen = false
  private base: LivenessFrame | null = null
  failed = false
  constructor(readonly challenges: ChallengeId[]) {}
  get current(): ChallengeId | null { return this.index < this.challenges.length ? this.challenges[this.index] : null }
  get done() { return this.index >= this.challenges.length }
  get completed() { return this.index }

  update(frame: LivenessFrame) {
    if (this.done || this.failed) return
    if (this.stepStart === null) { this.stepStart = frame.t; this.base = frame }
    if (frame.t - this.stepStart > STEP_SECONDS * 1000) { this.failed = true; return }
    const c = this.current
    let ok = false
    if (c === "blink2") {
      if (frame.blink > 0.5) this.eyesClosed = true
      else if (this.eyesClosed && frame.blink < 0.3) { this.eyesClosed = false; this.blinks += 1 }
      ok = this.blinks >= 2
    } else if (c === "mouth") {
      if (frame.mouthOpen > 0.45) this.mouthWasOpen = true
      ok = this.mouthWasOpen && frame.mouthOpen < 0.15
    } else if (c === "smile") ok = frame.smile > 0.5
    else if (c === "left") ok = frame.yaw - (this.base?.yaw ?? 0) < -12
    else if (c === "right") ok = frame.yaw - (this.base?.yaw ?? 0) > 12
    else if (c === "up") ok = frame.pitch - (this.base?.pitch ?? 0) < -10
    if (ok) { this.index += 1; this.stepStart = null; this.blinks = 0; this.eyesClosed = false; this.mouthWasOpen = false; this.base = null }
  }
}

/** Passive check during the exam. Feed every frame in which exactly one face is visible. */
export class PassiveLiveness {
  private faceSince: number | null = null
  private lastBlink = 0
  private lastChange = 0
  private prev: LivenessFrame | null = null
  constructor(private readonly windowMs = 120_000) {}
  /** Returns a reason string when the face looks like a photo or frozen picture, otherwise null. */
  update(frame: LivenessFrame): string | null {
    if (this.faceSince === null) { this.faceSince = frame.t; this.lastBlink = frame.t; this.lastChange = frame.t }
    if (frame.blink > 0.5) this.lastBlink = frame.t
    if (this.prev) {
      // Only EXPRESSION changes count as life. Head position is ignored on purpose: a hand-held photo also drifts and trembles.
      const move = Math.abs(frame.mouthOpen - this.prev.mouthOpen) + Math.abs(frame.smile - this.prev.smile) + Math.abs(frame.blink - this.prev.blink)
      if (move > 0.12) this.lastChange = frame.t
    }
    this.prev = frame
    const noBlink = frame.t - this.lastBlink, still = frame.t - this.lastChange
    if (frame.t - this.faceSince >= this.windowMs && noBlink >= this.windowMs && still >= this.windowMs) {
      this.lastBlink = frame.t; this.lastChange = frame.t // report once per window
      return `No blink and no facial movement for ${Math.round(Math.min(noBlink, still) / 1000)} seconds while a face was present`
    }
    return null
  }
  reset() { this.faceSince = null; this.prev = null }
}

/** Convert a MediaPipe result (blendshapes + transformation matrix) into a LivenessFrame, or null when not exactly one face. */
export function frameFromResult(result: import("@mediapipe/tasks-vision").FaceLandmarkerResult, t: number): LivenessFrame | null {
  if (result.faceLandmarks.length !== 1) return null
  const shapes = new Map((result.faceBlendshapes?.[0]?.categories ?? []).map((c) => [c.categoryName, c.score]))
  const s = (n: string) => shapes.get(n) ?? 0
  const m = result.facialTransformationMatrixes?.[0]?.data
  if (!m || !shapes.size) return null
  return {
    t,
    blink: (s("eyeBlinkLeft") + s("eyeBlinkRight")) / 2,
    mouthOpen: s("jawOpen"),
    smile: (s("mouthSmileLeft") + s("mouthSmileRight")) / 2,
    yaw: (Math.atan2(m[2], m[10]) * 180) / Math.PI,
    pitch: (Math.atan2(-m[6], Math.sqrt(m[4] ** 2 + m[5] ** 2)) * 180) / Math.PI,
  }
}
