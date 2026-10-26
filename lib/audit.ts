// Tamper-evident audit log. Every row stores the SHA-256 of (previous row's hash + this row's content), so changing,
// deleting or re-ordering any past row breaks every hash after it, and verifyAuditChain() finds where.
// Honest limit: someone with full database access could rewrite the WHOLE chain from the start. To defend against
// that, publish the latest hash somewhere the database admin cannot edit (see the "anchor" shown in the Audit Log tab).
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auditHash } from "@/lib/audit-chain"

const LOCK_KEY = 727_001 // Postgres advisory lock so two simultaneous writers cannot fork the chain

export type AuditEntry = { action: string; actorId?: string | null; sessionId?: string | null; details?: Record<string, string | number | boolean | null> }

/** Append one entry and return its sequence number (null if it could not be written). Never throws: an audit failure must not break the action being recorded, but it is logged loudly. */
export async function recordAudit(entry: AuditEntry): Promise<number | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`
      const last = await tx.auditLog.findFirst({ orderBy: { seq: "desc" }, select: { hash: true } })
      const createdAt = new Date(Math.floor(Date.now() / 1000) * 1000) // whole seconds survive any storage round trip
      const row = { action: entry.action, actorId: entry.actorId ?? null, sessionId: entry.sessionId ?? null, details: entry.details ?? null, createdAt }
      const created = await tx.auditLog.create({ data: { ...row, details: (row.details ?? Prisma.JsonNull) as Prisma.InputJsonValue, prevHash: last?.hash ?? null, hash: auditHash(last?.hash ?? null, row) } })
      return created.seq
    })
  } catch (error) {
    console.error("AUDIT LOG WRITE FAILED", entry.action, error)
    return null
  }
}

export type ChainStatus = { ok: boolean; checked: number; brokenAtSeq: number | null; reason: string | null; headHash: string | null }

/** Walk the whole chain in order and recompute every hash. */
export async function verifyAuditChain(): Promise<ChainStatus> {
  let prev: string | null = null
  let checked = 0
  let cursor = 0
  for (;;) {
    const rows = await prisma.auditLog.findMany({ where: { seq: { gt: cursor } }, orderBy: { seq: "asc" }, take: 1000 })
    if (!rows.length) break
    for (const row of rows) {
      if ((row.prevHash ?? null) !== prev) return { ok: false, checked, brokenAtSeq: row.seq, reason: "A previous entry was removed or changed (link to the entry before it does not match)", headHash: prev }
      const expected = auditHash(prev, { action: row.action, actorId: row.actorId, sessionId: row.sessionId, details: row.details, createdAt: row.createdAt })
      if (expected !== row.hash) return { ok: false, checked, brokenAtSeq: row.seq, reason: "This entry's content does not match its recorded hash (it was edited)", headHash: prev }
      prev = row.hash
      checked += 1
      cursor = row.seq
    }
  }
  return { ok: true, checked, brokenAtSeq: null, reason: null, headHash: prev }
}
