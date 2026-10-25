import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

/**
 * Optional enforcement of the Secure Exam Client (the Electron kiosk app in /desktop-client).
 *
 * The desktop app signs every request to the portal with `X-Secure-Client: <unix-ms>.<hmac-sha256(secret, unix-ms)>`.
 * When REQUIRE_SECURE_CLIENT=1 the exam cannot be started, and questions cannot be downloaded, from an ordinary browser.
 *
 * Be honest about the limit: the secret ships inside the app, so a determined attacker can extract it. This stops
 * casual use of a normal browser; real tamper-proofing needs OS-level attestation (managed devices / MDM).
 */
const MAX_SKEW_MS = 10 * 60 * 1000

export function secureClientRequired() {
  return process.env.REQUIRE_SECURE_CLIENT === "1"
}

export function verifySecureClientHeader(header: string | null) {
  const secret = process.env.SECURE_CLIENT_SECRET
  if (!secret || !header) return false
  const [timestamp, signature] = header.split(".")
  const sentAt = Number(timestamp)
  if (!signature || !Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > MAX_SKEW_MS) return false
  const expected = createHmac("sha256", secret).update(timestamp).digest("hex")
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Returns an error response when the secure client is required but missing; null when the request may continue. */
export function requireSecureClient(request: Request) {
  if (!secureClientRequired()) return null
  if (!process.env.SECURE_CLIENT_SECRET) return NextResponse.json({ error: "Server misconfigured: SECURE_CLIENT_SECRET is not set", code: "SECURE_CLIENT_MISCONFIGURED" }, { status: 500 })
  if (verifySecureClientHeader(request.headers.get("x-secure-client"))) return null
  return NextResponse.json({ error: "This exam must be taken in the Secure Exam Client app. Open the exam from the installed app, not from a web browser.", code: "SECURE_CLIENT_REQUIRED" }, { status: 403 })
}
