"use client"

import { useCallback, useEffect, useState } from "react"

type Appeal = {
  id: string; sessionId: string; message: string; status: "PENDING" | "UPHELD" | "OVERTURNED"; response: string | null; createdAt: string
  session: { verdict: string | null; riskScore: number; exam: { title: string }; user: { fullName: string; email: string }; _count: { incidents: number } }
}

export default function AdminAppeals() {
  const [appeals, setAppeals] = useState<Appeal[] | null>(null)
  const [error, setError] = useState("")
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const load = useCallback(() => {
    fetch("/api/admin/appeals").then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "Failed"); setAppeals(j.appeals) }).catch((e) => setError(String(e.message ?? e)))
  }, [])
  useEffect(load, [load])
  async function decide(id: string, status: "UPHELD" | "OVERTURNED") {
    setError("")
    const r = await fetch(`/api/admin/appeals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, response: reasons[id] ?? "" }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error ?? "Could not save the decision")
    else load()
  }
  if (!appeals) return <p className="text-gray-500">{error || "Loading appeals..."}</p>
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Appeals</h2>
      <p className="text-sm text-gray-600">A candidate disputes the outcome. Review the session in Incident Review, then decide. <b>Upheld</b> = the original outcome stands. <b>Overturned</b> = the candidate is cleared. Your written reason is recorded and shown to the candidate.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!appeals.length && <p className="rounded-lg border bg-white p-6 text-center text-gray-500">No appeals yet.</p>}
      {appeals.map((a) => (
        <div key={a.id} className="space-y-2 rounded-lg border bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{a.session.user.fullName} <span className="font-normal text-gray-500">({a.session.user.email})</span> - {a.session.exam.title}</p>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${a.status === "PENDING" ? "bg-yellow-100 text-yellow-800" : a.status === "OVERTURNED" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"}`}>{a.status}</span>
          </div>
          <p className="text-xs text-gray-500">Session {a.sessionId.slice(0, 8)}… | verdict: {a.session.verdict ?? "none"} | risk {a.session.riskScore} | {a.session._count.incidents} alerts | filed {new Date(a.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
          <p className="whitespace-pre-wrap rounded bg-gray-50 p-3">{a.message}</p>
          {a.status === "PENDING" ? (
            <div className="space-y-2">
              <textarea className="w-full rounded border p-2" rows={2} placeholder="Reason for your decision (required, the candidate will see it)" value={reasons[a.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [a.id]: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={() => void decide(a.id, "OVERTURNED")} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">Overturn (clear candidate)</button>
                <button onClick={() => void decide(a.id, "UPHELD")} className="rounded bg-gray-700 px-3 py-1.5 text-white hover:bg-gray-800">Uphold</button>
              </div>
            </div>
          ) : <p className="text-gray-700"><b>Decision:</b> {a.response}</p>}
        </div>
      ))}
    </div>
  )
}
