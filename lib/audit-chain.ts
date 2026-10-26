// Pure hashing helpers for the audit chain (no database access, so they can be unit-tested).
import { createHash } from "node:crypto"

/** JSON with sorted keys, so the same details always hash the same (Postgres JSONB does not keep key order). */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : 1))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`
}

export function auditHash(prevHash: string | null, row: { action: string; actorId: string | null; sessionId: string | null; details: unknown; createdAt: Date }) {
  const payload = [prevHash ?? "GENESIS", row.action, row.actorId ?? "", row.sessionId ?? "", canonical(row.details ?? null), row.createdAt.toISOString()].join("|")
  return createHash("sha256").update(payload).digest("hex")
}

