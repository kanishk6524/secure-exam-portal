// Phone as a second (side-view) camera. The candidate scans a QR code; the phone page sends a small picture every
// couple of seconds and runs its own object / person detection. Pairing uses a signed, expiring token (no database).
import { createHmac, timingSafeEqual } from "node:crypto"

const secret = () => process.env.AUTH_SECRET ?? "dev-only-secret-change-me"
const b64 = (value: string) => Buffer.from(value).toString("base64url")

export function makePhoneToken(userId: string, examId: string, ttlMs = 4 * 60 * 60 * 1000) {
  const payload = b64(JSON.stringify({ u: userId, e: examId, x: Date.now() + ttlMs }))
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readPhoneToken(token: string): { userId: string; examId: string } | null {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url")
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u: string; e: string; x: number }
    if (!data.u || !data.e || Date.now() > data.x) return null
    return { userId: data.u, examId: data.e }
  } catch {
    return null
  }
}

// The latest picture per candidate and exam, kept in server memory (it is a live view, not a recording).
type Frame = { image: string; at: number }
const globalStore = globalThis as unknown as { __sideFrames?: Map<string, Frame> }
const frames = (globalStore.__sideFrames ??= new Map<string, Frame>())
const key = (userId: string, examId: string) => `${userId}:${examId}`
export const CONNECTED_WITHIN_MS = 20_000

export function putFrame(userId: string, examId: string, image: string) {
  frames.set(key(userId, examId), { image, at: Date.now() })
  // Keep memory bounded: forget pictures nobody has refreshed for an hour.
  if (frames.size > 500) for (const [k, frame] of frames) if (Date.now() - frame.at > 3_600_000) frames.delete(k)
}
export function getFrame(userId: string, examId: string) {
  return frames.get(key(userId, examId)) ?? null
}
export function sideCameraStatus(userId: string, examId: string) {
  const frame = getFrame(userId, examId)
  return { everConnected: Boolean(frame), connected: Boolean(frame && Date.now() - frame.at < CONNECTED_WITHIN_MS), ageSeconds: frame ? Math.round((Date.now() - frame.at) / 1000) : null }
}

/** Base address the phone must open. A phone needs HTTPS for its camera, so set PUBLIC_BASE_URL to a tunnel or deployed address. */
export function phoneBaseUrl(request: Request) {
  return (process.env.PUBLIC_BASE_URL ?? new URL(request.url).origin).replace(/\/$/, "")
}
