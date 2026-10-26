"use client"

import { useCallback, useEffect, useState } from "react"

type Counts = { eye: number; head: number; people: number; identity: number; object: number; sound: number; movement: number; tabs: number; camera: number }
type Row = { sessionId: string; student: string; email: string; status: string; startedAt: string; submittedAt: string | null; score: number | null; attempted: number; totalQuestions: number; riskScore: number; verdict: string | null; sideCamera?: { everConnected: boolean; connected: boolean; ageSeconds: number | null }; counts: Counts; timeline: number[]; ml: { probability: number; level: "LOW" | "ELEVATED" | "HIGH" } }
type Exam = { id: string; title: string; startTime?: string }

const COLUMNS: Array<{ key: keyof Counts; label: string; defaultLimit: number }> = [
  { key: "eye", label: "Eye movement", defaultLimit: 3 },
  { key: "head", label: "Head turn", defaultLimit: 3 },
  { key: "people", label: "Other person", defaultLimit: 1 },
  { key: "identity", label: "Face mismatch", defaultLimit: 1 },
  { key: "object", label: "Phone / object", defaultLimit: 1 },
  { key: "sound", label: "Sound", defaultLimit: 3 },
  { key: "movement", label: "Surrounding movement", defaultLimit: 3 },
  { key: "tabs", label: "Tab / window", defaultLimit: 3 },
  { key: "camera", label: "Camera lost", defaultLimit: 2 },
]
const STORAGE_KEY = "aiFlagThresholds"

export default function AdminAiFlags() {
  const [exams, setExams] = useState<Exam[]>([])
  const [examId, setExamId] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [message, setMessage] = useState("")
  const [live, setLive] = useState(true)
  const [sideView, setSideView] = useState<{ row: Row; image: string | null; connected: boolean } | null>(null)
  const [limits, setLimits] = useState<Record<string, number>>(() => Object.fromEntries(COLUMNS.map((column) => [column.key, column.defaultLimit])))

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setLimits((previous) => ({ ...previous, ...JSON.parse(saved) })) } catch { /* defaults */ }
    fetch("/api/admin/exams").then((response) => response.json()).then((data) => {
      const list: Exam[] = data.exams ?? []
      setExams(list)
      if (list[0]) setExamId(list[0].id)
    }).catch(() => setMessage("Unable to load exams"))
  }, [])

  const load = useCallback(async () => {
    if (!examId) return
    const response = await fetch(`/api/admin/ai-flags?examId=${encodeURIComponent(examId)}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return setMessage(data.error ?? "Unable to load monitoring data")
    setMessage("")
    setRows(data.rows)
  }, [examId])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(timer)
  }, [live, load])

  function setLimit(key: string, value: number) {
    const next = { ...limits, [key]: Math.max(1, value || 1) }
    setLimits(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* optional */ }
  }
  const exceeded = (row: Row) => COLUMNS.filter((column) => row.counts[column.key] >= limits[column.key]).map((column) => column.label)
  const isFlagged = (row: Row) => exceeded(row).length > 0 || row.ml.level === "HIGH"

  async function setVerdict(row: Row, verdict: "FLAGGED" | "CLEARED" | null) {
    const response = await fetch(`/api/admin/sessions/${row.sessionId}/verdict`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict, note: verdict === "FLAGGED" ? `Flagged from AI flag dashboard: ${exceeded(row).join(", ") || "ML score high"}` : "" }) })
    if (!response.ok) return setMessage("Unable to save the decision")
    setRows((previous) => previous.map((item) => (item.sessionId === row.sessionId ? { ...item, verdict } : item)))
  }

  // Live side-camera picture of one candidate (refreshes every 3 s while the window is open).
  useEffect(() => {
    if (!sideView) return
    const sessionId = sideView.row.sessionId
    let cancelled = false
    const refresh = async () => {
      const response = await fetch(`/api/admin/sessions/${sessionId}/side-camera`).catch(() => null)
      const data = await response?.json().catch(() => null)
      if (!cancelled && data) setSideView((previous) => (previous && previous.row.sessionId === sessionId ? { ...previous, image: data.image, connected: Boolean(data.connected) } : previous))
    }
    void refresh()
    const timer = window.setInterval(refresh, 3000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [sideView?.row.sessionId])

  const submitted = rows.filter((row) => row.status !== "IN_PROGRESS").length
  const flaggedNow = rows.filter(isFlagged).length
  const totals = COLUMNS.map((column) => ({ ...column, total: rows.reduce((sum, row) => sum + row.counts[column.key], 0) }))
  const maxTotal = Math.max(1, ...totals.map((item) => item.total))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Flag Dashboard</h1>
          <p className="text-sm text-gray-600">Live proctoring pattern per candidate. A cell turns red when the candidate reaches your threshold; you decide whether to flag.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={examId} onChange={(event) => setExamId(event.target.value)} className="rounded border p-2 text-sm">
            {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
          </select>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={live} onChange={(event) => setLive(event.target.checked)} /> Live (5 s)</label>
        </div>
      </div>
      {message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{message}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow"><p className="text-xs text-gray-500">Candidates</p><p className="text-2xl font-bold">{rows.length}</p></div>
        <div className="rounded-lg bg-white p-4 shadow"><p className="text-xs text-gray-500">In progress</p><p className="text-2xl font-bold text-blue-600">{rows.length - submitted}</p></div>
        <div className="rounded-lg bg-white p-4 shadow"><p className="text-xs text-gray-500">Submitted</p><p className="text-2xl font-bold text-green-600">{submitted}</p></div>
        <div className="rounded-lg bg-white p-4 shadow"><p className="text-xs text-gray-500">Over threshold / AI flagged</p><p className="text-2xl font-bold text-red-600">{flaggedNow}</p></div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <h2 className="text-sm font-semibold">Flag thresholds (alerts per candidate before the cell turns red)</h2>
        <div className="mt-2 flex flex-wrap gap-3">
          {COLUMNS.map((column) => (
            <label key={column.key} className="text-xs text-gray-600">{column.label}
              <input type="number" min={1} value={limits[column.key]} onChange={(event) => setLimit(column.key, Number(event.target.value))} className="ml-1 w-14 rounded border p-1 text-sm" />
            </label>
          ))}
        </div>
        <h2 className="mt-4 text-sm font-semibold">All candidates: alerts by type</h2>
        <div className="mt-2 space-y-1">
          {totals.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-xs"><span className="w-40">{item.label}</span><span className="h-3 rounded bg-indigo-500" style={{ width: `${(item.total / maxTotal) * 240}px` }} /><span className="text-gray-600">{item.total}</span></div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <th className="p-2">Candidate</th><th className="p-2">Status</th><th className="p-2">Attempted</th><th className="p-2">Submitted at</th><th className="p-2">Score</th>
              {COLUMNS.map((column) => <th key={column.key} className="p-2 text-center">{column.label}</th>)}
              <th className="p-2">Side cam</th><th className="p-2">ML</th><th className="p-2">Pattern over time</th><th className="p-2">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={18} className="p-6 text-center text-gray-500">No candidate has started this exam yet.</td></tr>}
            {rows.map((row) => {
              const over = exceeded(row)
              const peak = Math.max(1, ...row.timeline)
              return (
                <tr key={row.sessionId} className={`border-b ${isFlagged(row) ? "bg-red-50/60" : ""}`}>
                  <td className="p-2">{row.student}<br /><span className="text-xs text-gray-500">{row.email}</span></td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs ${row.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>{row.status === "IN_PROGRESS" ? "Live" : row.status.replaceAll("_", " ").toLowerCase()}</span></td>
                  <td className="p-2">{row.attempted} / {row.totalQuestions}</td>
                  <td className="p-2 text-xs">{row.submittedAt ? new Date(row.submittedAt).toLocaleTimeString() : "-"}</td>
                  <td className="p-2">{row.score ?? "-"}</td>
                  {COLUMNS.map((column) => <td key={column.key} className={`p-2 text-center ${row.counts[column.key] >= limits[column.key] ? "bg-red-100 font-bold text-red-700" : row.counts[column.key] ? "text-orange-600" : "text-gray-400"}`}>{row.counts[column.key]}</td>)}
                  <td className="p-2"><button onClick={() => setSideView({ row, image: null, connected: false })} className={`rounded border px-2 py-1 text-xs ${row.sideCamera?.connected ? "border-green-500 text-green-700" : row.sideCamera?.everConnected ? "border-red-400 text-red-700" : "text-gray-500"}`}>{row.sideCamera?.connected ? "Live" : row.sideCamera?.everConnected ? "Lost" : "None"}</button></td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${row.ml.level === "HIGH" ? "bg-red-600 text-white" : row.ml.level === "ELEVATED" ? "bg-orange-400 text-white" : "bg-green-100 text-green-800"}`}>{Math.round(row.ml.probability * 100)}%</span></td>
                  <td className="p-2"><div className="flex h-8 items-end gap-0.5">{row.timeline.map((value, index) => <span key={index} className={`w-1.5 rounded-t ${value ? "bg-red-500" : "bg-gray-200"}`} style={{ height: `${value ? 6 + (value / peak) * 26 : 3}px` }} />)}</div></td>
                  <td className="p-2">
                    {over.length > 0 && <p className="mb-1 max-w-[160px] text-[11px] text-red-700">Over: {over.join(", ")}</p>}
                    {row.verdict ? <span className={`mr-1 rounded px-2 py-0.5 text-xs font-semibold ${row.verdict === "FLAGGED" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>{row.verdict.toLowerCase()}</span> : null}
                    <button onClick={() => void setVerdict(row, "FLAGGED")} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Flag</button>
                    <button onClick={() => void setVerdict(row, "CLEARED")} className="ml-1 rounded border px-2 py-1 text-xs">Clear</button>
                    <a href={`/api/admin/sessions/${row.sessionId}/report`} target="_blank" rel="noreferrer" className="ml-1 text-xs text-blue-600 underline">Report</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sideView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSideView(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-semibold">Side camera: {sideView.row.student}</h3><button onClick={() => setSideView(null)} className="text-sm text-gray-500">Close</button></div>
            {sideView.image ? <img src={sideView.image} alt="Live side camera" className="mt-3 w-full rounded border" /> : <p className="mt-3 rounded bg-gray-100 p-6 text-center text-sm text-gray-500">No side camera picture yet. The candidate has not paired a phone.</p>}
            <p className={`mt-2 text-xs ${sideView.connected ? "text-green-700" : "text-red-700"}`}>{sideView.connected ? "Live (updates every 3 seconds)" : "Not sending pictures right now"}</p>
          </div>
        </div>
      )}
    </div>
  )
}
