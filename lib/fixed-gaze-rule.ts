// The original "one threshold for everybody" gaze rule. It is kept as the control arm of the ablation study
// (scripts/ablation.ts) and as the fallback when a candidate has no personal baseline.
export const EYE_SIDE_THRESHOLD = 0.55
export const EYE_DOWN_THRESHOLD = 0.6
export const HEAD_YAW_LIMIT = 25 // degrees
export const HEAD_PITCH_LIMIT = 20 // degrees
export const EYES_DOWN_MIN_PITCH = 8 // degrees

export type FixedRuleScale = { yaw: number; pitch: number; side: number; down: number }
export const DEFAULT_SCALE: FixedRuleScale = { yaw: 1, pitch: 1, side: 1, down: 1 }

/**
 * @param sideways strongest sideways eye-direction score, 0..1
 * @param down     average look-down eye score, 0..1
 * @param scale    multiplies each threshold (used only by the ablation to sweep sensitivity)
 */
export function fixedRuleAnomalous(yaw: number, pitch: number, sideways: number, down: number, scale: FixedRuleScale = DEFAULT_SCALE) {
  const eyesSideways = sideways > EYE_SIDE_THRESHOLD * scale.side
  const eyesDown = down > EYE_DOWN_THRESHOLD * scale.down && pitch > EYES_DOWN_MIN_PITCH
  const headTurned = Math.abs(yaw) > HEAD_YAW_LIMIT * scale.yaw || Math.abs(pitch) > HEAD_PITCH_LIMIT * scale.pitch
  return { anomalous: headTurned || eyesSideways || eyesDown, headTurned, eyesSideways, eyesDown }
}
