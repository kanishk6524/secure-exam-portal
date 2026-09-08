"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Ban, Camera, CheckCircle, Clock, RefreshCw, Users } from "lucide-react"
import { useAdminIncidentFeed } from "@/lib/socket-client"

type Session = { id: string; examId: string; serverEndsAt: string; user: { id: string; fullName: string; email: string }; exam: { id: string; title: string }; incidents: Array<{ id: string; type: string; severity: string; createdAt: string; metadata?: Record<string, unknown> }>; incidentCount: number }
type LiveIncident = { id: string; sessionId: string; examId: string; type: string; severity: string; createdAt: string; metadata?: Record<string, unknown> }

export default function AdminMonitoring() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string>()
  const [message, setMessage] = useState("")
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null)
  const { incidents: liveIncidents, connected } = useAdminIncidentFeed(selectedExamId)

  async function load() {
    const response = await fetch("/api/admin/monitoring/active")
    const data = await response.json()
    if (response.ok) { setSessions(data.sessions); if (!selectedExamId && data.sessions[0]) setSelectedExamId(data.sessions[0].examId) }
    else setMessage(data.error ?? "Unable to load monitoring data")
  }
  useEffect(() => { load() }, [])
  const activeIncidents = useMemo(() => {
    const initial = sessions.flatMap((session) => session.incidents.map((incident) => ({ ...incident, sessionId: session.id, examId: session.examId })))
    const seen = new Set<string>()
    return [...liveIncidents as LiveIncident[], ...initial].filter((incident) => !seen.has(incident.id) && seen.add(incident.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [sessions, liveIncidents])
  async function block(sessionId: string) {
    const response = await fetch(`/api/admin/sessions/${sessionId}/block`, { method: "POST" })
    if (response.ok) { setMessage("Session ended"); setSessions((previous) => previous.filter((session) => session.id !== sessionId)) } else setMessage("Unable to end session")
  }
  const exams = Array.from(new Map(sessions.map((session) => [session.examId, session.exam])).values())
  return <div><div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800">Exam Monitoring</h1><p className="text-sm text-gray-500">{connected ? "Live incident feed connected" : "Connecting to live incident feed..."}</p></div><button onClick={load} className="rounded-md border bg-white px-4 py-2 text-sm"><RefreshCw className="mr-1 inline h-4 w-4" />Refresh</button></div>{message && <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{message}</p>}<div className="mb-8 grid gap-4 md:grid-cols-2">{sessions.map((session) => <article key={session.id} className="rounded-lg bg-white p-5 shadow"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">{session.exam.title}</h2><p className="text-sm text-gray-500">{session.user.fullName} · {session.user.email}</p></div><span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">IN PROGRESS</span></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><Users className="inline h-4 w-4" /> Student</div><div><Clock className="inline h-4 w-4" /> Ends {new Date(session.serverEndsAt).toLocaleTimeString()}</div><div><AlertTriangle className="inline h-4 w-4 text-yellow-500" /> {session.incidentCount} incidents</div></div><div className="mt-4 flex justify-end"><button onClick={() => block(session.id)} className="rounded-md bg-red-600 px-3 py-2 text-sm text-white"><Ban className="mr-1 inline h-4 w-4" />End exam</button></div></article>)}</div><div className="mb-4 flex items-center gap-3"><h2 className="text-lg font-semibold text-gray-700">Live Incidents</h2><select value={selectedExamId ?? ""} onChange={(event) => setSelectedExamId(event.target.value)} className="rounded border p-2 text-sm"><option value="">Select exam</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></div><div className="overflow-x-auto rounded-lg bg-white shadow"><table className="min-w-full divide-y"><thead><tr className="bg-gray-50 text-left text-xs uppercase text-gray-500"><th className="p-3">Type</th><th className="p-3">Student</th><th className="p-3">Severity</th><th className="p-3">Time</th><th className="p-3">Status</th><th className="p-3">Evidence</th></tr></thead><tbody className="divide-y">{activeIncidents.map((incident) => { const session = sessions.find((item) => item.id === incident.sessionId); const evidence = typeof incident.metadata?.snapshotUrl === "string" ? incident.metadata.snapshotUrl : null; return <tr key={incident.id}><td className="p-3"><AlertTriangle className="mr-2 inline h-4 w-4 text-yellow-500" />{incident.type}</td><td className="p-3">{session?.user.fullName ?? incident.sessionId}</td><td className="p-3">{incident.severity}</td><td className="p-3">{new Date(incident.createdAt).toLocaleTimeString()}</td><td className="p-3"><CheckCircle className="mr-1 inline h-4 w-4 text-green-600" />Received live</td><td className="p-3">{evidence && (incident.severity === "HIGH" || incident.severity === "CRITICAL") ? <button onClick={() => setEvidenceUrl(evidence)} className="text-blue-600 underline">View evidence</button> : "-"}</td></tr> })}</tbody></table>{activeIncidents.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No incidents received.</p>}</div><div className="mt-8 rounded-lg bg-white p-6 shadow"><h2 className="mb-4 text-lg font-semibold">Proctoring Settings</h2><p className="text-sm text-gray-500"><Camera className="mr-2 inline h-4 w-4" />Browser incidents and connection-loss events are persisted and streamed to this dashboard.</p></div>{evidenceUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setEvidenceUrl(null)}><div className="max-w-3xl rounded-lg bg-white p-4" onClick={(event) => event.stopPropagation()}><img src={evidenceUrl} alt="Proctoring evidence" className="max-h-[75vh] max-w-full" /><button onClick={() => setEvidenceUrl(null)} className="mt-3 rounded bg-gray-800 px-4 py-2 text-white">Close</button></div></div>}</div>
}