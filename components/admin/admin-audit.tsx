"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, ShieldAlert } from "lucide-react"

type Entry = { seq: number; action: string; actor: string; sessionId: string | null; details: Record<string, unknown> | null; createdAt: string; hash: string }
type Chain = { ok: boolean; checked: number; brokenAtSeq: number | null; reason: string | null; headHash: string | null }

export default function AdminAudit() {
  const [data, setData] = useState<{ chain: Chain; entries: Entry[] } | null>(null)
  const [error, setError] = useState("")
  useEffect(() => {
    fetch("/api/admin/audit").then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "Failed"); setData(j) }).catch((e) => setError(String(e.message ?? e)))
  }, [])
  if (error) return <p className="text-red-600">{error}</p>
  if (!data) return <p className="text-gray-500">Checking the audit chain...</p>
  const { chain, entries } = data
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
      <div className={`flex items-start gap-3 rounded-lg border p-4 ${chain.ok ? "border-green-200 bg-green-50" : "border-red-300 bg-red-50"}`}>
        {chain.ok ? <ShieldCheck className="h-6 w-6 text-green-600" /> : <ShieldAlert className="h-6 w-6 text-red-600" />}
        <div className="text-sm">
          <p className="font-semibold">{chain.ok ? `Chain intact: ${chain.checked} entries verified` : `Chain BROKEN at entry #${chain.brokenAtSeq}`}</p>
          {chain.reason && <p className="text-red-700">{chain.reason}</p>}
          {chain.headHash && (
            <p className="mt-1 break-all text-gray-600">
              Anchor (latest hash): <code>{chain.headHash}</code>. Copy it somewhere the database administrator cannot edit (email it to yourself, put it in a report). A later mismatch with this value proves the whole log was rewritten.
            </p>
          )}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-2">#</th><th className="p-2">Time</th><th className="p-2">Who</th><th className="p-2">Action</th><th className="p-2">Details</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.seq} className="border-t align-top">
                <td className="p-2 text-gray-500">{e.seq}</td>
                <td className="p-2 whitespace-nowrap">{new Date(e.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                <td className="p-2">{e.actor}</td>
                <td className="p-2 font-mono">{e.action}</td>
                <td className="p-2 text-xs text-gray-600">{e.sessionId ? `session ${e.sessionId.slice(0, 8)}… ` : ""}{e.details ? JSON.stringify(e.details) : ""}</td>
              </tr>
            ))}
            {!entries.length && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No actions recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
