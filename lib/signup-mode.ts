import { firebaseConfigured } from "@/lib/firebase"

/**
 * Local development mode (no Firebase, not production): registration accepts almost any input, the admin
 * invite code and college code are optional, and no photo is required, so the portal can be tried out quickly.
 * Never true in production, where the strict rules (invite code, college code, password rules) always apply.
 */
export function relaxedSignup() {
  return !firebaseConfigured() && process.env.NODE_ENV !== "production"
}
