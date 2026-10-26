"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Check, Flag, RefreshCw, ShieldCheck, X } from "lucide-react"

type SessionRow = {
  id: string
  status: string
  riskScore: number
  verdict: string | null
  incidentCount: number
  critical: number
  high: number
  unreviewed: number
  types: string[]
  user: { fullName: string; email: string }
  exam: { id: string; title: string }
}
type IncidentRow = { id: string; type: string; severity: string; confidence: number | null; metadata: Record<string, unknown> | null; evidence: string | null; reviewStatus: "PENDING" | "CONFIRMED" | "DISMISSED"; reviewNote: string | null; createdAt: string }
type Detail = { id: string; status: string; riskScore: number; verdict: string | null; reviewNote: string | null; score: number | null; user: { fullName: string; email: string }; exam: { title: string }; incidents: IncidentRow[]; integrity?: { probability: number; level: "LOW" | "ELEVATED" | "HIGH"; trained: boolean; samples: number; factors: Array<{ feature: string; label: string; contribution: number }> } }

const SEVERITY_STYLE: Record<string, string> = { LOW: "bg-gray-100 text-gray-700", MEDIUM: "bg-yellow-100 text-yellow-800", HIGH: "bg-orange-100 text-orange-800", CRITICAL: "bg-red-100 text-red-800" }
const riskStyle = (risk: number) => (risk >= 60 ? "bg-red-600" : risk >= 25 ? "bg-orange-500" : "bg-yellow-500")

export default function AdminReview() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [pendingOnly, setPendingOnly] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [note, setNote] = useState("")
  const [message, setMessage] = useState("")
  const [zoom, setZoom] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/review${pendingOnly ? "?pending=1" : ""}`)
    const data = await response.json()
    if (response.ok) setSessions(data.sessions)
    else setMessage(data.error ?? "Unable to load sessions")
  }, [pendingOnly])
  useEffect(() => { void load() }, [load])

  async function open(sessionId: string) {
    const response = await fetch(`/api/admin/sessions/${sessionId}/incidents`)
    const data = await response.json()
    if (!response.ok) return setMessage(data.error ?? "Unable to load incidents")
    setDetail(data.session)
    setNote(data.session.reviewNote ?? "")
  }
  async function reviewIncident(incidentId: string, reviewStatus: IncidentRow["reviewStatus"]) {
    const response = await fetch(`/api/admin/incidents/${incidentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewStatus }) })
    if (!response.ok) return setMessage("Unable to save review")
    setDetail((previous) => previous && { ...previous, incidents: previous.incidents.map((incident) => (incident.id === incidentId ? { ...incident, reviewStatus } : incident)) })
  }
  async function setVerdict(verdict: "CLEARED" | "FLAGGED" | null) {
    if (!detail) return
    const response = await fetch(`/api/admin/sessions/${detail.id}/verdict`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict, note }) })
    if (!response.ok) return setMessage("Unable to save verdict")
    setDetail({ ...detail, verdict, reviewNote: note })
    setMessage(verdict ? `Marked as ${verdict.toLowerCase()}` : "Reopened")
    void load()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Incident Review</h1>
          <p className="text-sm text-gray-500">Sessions with proctoring incidents, most suspicious first. Open one to see the timeline and webcam evidence.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} />Only not yet decided</label>
          <button onClick={() => void load()} className="rounded-md border bg-white px-4 py-2"><RefreshCw className="mr-1 inline h-4 w-4" />Refresh</button>
        </div>
      </div>
      {message && <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-2">
          {sessions.map((session) => (
            <button key={session.id} onClick={() => void open(session.id)} className={`w-full rounded-lg border bg-white p-3 text-left shadow-sm hover:border-blue-400 ${detail?.id === session.id ? "border-blue-600" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{session.user.fullName}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${riskStyle(session.riskScore)}`}>risk {session.riskScore}</span>
              </div>
              <p className="text-xs text-gray-500">{session.exam.title} · {session.status}</p>
              <p className="mt-1 text-xs text-gray-600">{session.incidentCount} incidents{session.critical ? ` · ${session.critical} critical` : ""}{session.high ? ` · ${session.high} high` : ""}</p>
              <p className="mt-1 truncate text-xs text-gray-400">{session.types.join(", ")}</p>
              {session.verdict && <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${session.verdict === "FLAGGED" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{session.verdict}</span>}
            </button>
          ))}
          {sessions.length === 0 && <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500">Nothing to review.</p>}
        </div>

        <div className="rounded-lg bg-white p-5 shadow">
          {!detail ? (
            <p className="py-16 text-center text-sm text-gray-500">Select a session to review.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{detail.user.fullName} <span className="text-sm font-normal text-gray-500">· {detail.user.email}</span></h2>
                  <p className="text-sm text-gray-500">{detail.exam.title} · {detail.status} · risk {detail.riskScore}{detail.score !== null ? ` · score ${detail.score}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/admin/sessions/${detail.id}/report`} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-2 text-sm">Integrity report</a>
                  <button onClick={() => void setVerdict("CLEARED")} className="rounded-md bg-green-600 px-3 py-2 text-sm text-white"><ShieldCheck className="mr-1 inline h-4 w-4" />Clear</button>
                  <button onClick={() => void setVerdict("FLAGGED")} className="rounded-md bg-red-600 px-3 py-2 text-sm text-white"><Flag className="mr-1 inline h-4 w-4" />Flag cheating</button>
                  {detail.verdict && <button onClick={() => void setVerdict(null)} className="rounded-md border px-3 py-2 text-sm">Reopen</button>}
                </div>
              </div>
              {detail.integrity && (
                <div className={`mt-3 rounded-md border p-3 text-sm ${detail.integrity.level === "HIGH" ? "border-red-300 bg-red-50" : detail.integrity.level === "ELEVATED" ? "border-orange-300 bg-orange-50" : "border-green-300 bg-green-50"}`}>
                  <p className="font-semibold">ML integrity assessment: {Math.round(detail.integrity.probability * 100)}% likelihood of cheating ({detail.integrity.level.toLowerCase()})</p>
                  {detail.integrity.factors.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {detail.integrity.factors.map((factor) => (
                        <li key={factor.feature} className="flex items-center gap-2 text-xs"><span className="w-64 shrink-0">{factor.label}</span><span className="h-2 rounded bg-gray-700" style={{ width: `${Math.min(100, factor.contribution * 40)}px` }} /><span className="text-gray-500">+{factor.contribution.toFixed(2)}</span></li>
                      ))}
                    </ul>
                  ) : <p className="mt-1 text-xs text-gray-600">No behaviour contributed to the score.</p>}
                  <p className="mt-2 text-[11px] text-gray-500">{detail.integrity.trained ? `Model fitted to ${detail.integrity.samples} reviewed sessions.` : "Model uses starting weights (priors). Review sessions, then run npm run train:integrity to fit it to your own verdicts."} A reviewer always makes the final decision.</p>
                </div>
              )}
              <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reviewer note (saved with the verdict)" className="mt-3 w-full rounded border p-2 text-sm" rows={2} />
              {detail.verdict && <p className="mt-1 text-xs text-gray-500">Current verdict: <b>{detail.verdict}</b></p>}

              <ol className="mt-5 space-y-3 border-l-2 border-gray-200 pl-4">
                {detail.incidents.map((incident) => (
                  <li key={incident.id} className="relative">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gray-400" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-xs text-gray-500">{new Date(incident.createdAt).toLocaleTimeString()}</span>
                      <b><AlertTriangle className="mr-1 inline h-4 w-4 text-yellow-500" />{incident.type.replaceAll("_", " ")}</b>
                      <span className={`rounded px-2 py-0.5 text-xs ${SEVERITY_STYLE[incident.severity] ?? ""}`}>{incident.severity}</span>
                      {incident.reviewStatus !== "PENDING" && <span className={`rounded px-2 py-0.5 text-xs ${incident.reviewStatus === "CONFIRMED" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{incident.reviewStatus.toLowerCase()}</span>}
                    </div>
                    {incident.metadata && Object.keys(incident.metadata).length > 0 && <p className="mt-0.5 break-words text-xs text-gray-500">{Object.entries(incident.metadata).map(([key, value]) => `${key}: ${typeof value === "number" ? Math.round(value * 100) / 100 : String(value)}`).join(" · ")}</p>}
                    <div className="mt-2 flex items-start gap-3">
                      {incident.evidence && <button onClick={() => setZoom(incident.evidence)}><img src={incident.evidence} alt="Webcam frame at the time of the incident" className="h-20 rounded border" /></button>}
                      <div className="flex gap-1">
                        <button onClick={() => void reviewIncident(incident.id, "CONFIRMED")} title="Real violation" className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"><Check className="mr-1 inline h-3 w-3" />Confirm</button>
                        <button onClick={() => void reviewIncident(incident.id, "DISMISSED")} title="False alarm" className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"><X className="mr-1 inline h-3 w-3" />Dismiss</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Evidence" className="max-h-[85vh] max-w-full rounded" />
        </div>
      )}
    </div>
  )
}
