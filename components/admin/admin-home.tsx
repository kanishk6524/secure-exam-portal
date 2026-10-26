"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, BookOpen, CheckCircle, Clock, Flag, RefreshCw, Shield, Users, Percent, Eye } from "lucide-react"

type Attempt = { id: string; student: string; email: string; exam: string; status: string; startedAt: string; submittedAt: string | null; secondsUsed: number | null; attempted: number; totalQuestions: number; score: number | null; totalMarks: number; percent: number | null; incidents: number; riskScore: number; verdict: string | null; mlLevel: "LOW" | "ELEVATED" | "HIGH"; mlProbability: number }
type ExamRow = { id: string; title: string; phase: "LIVE" | "UPCOMING" | "CLOSED" | "DRAFT"; startTime: string; endTime: string; durationMins: number; questions: number; totalMarks: number; attempts: number }
type Data = {
  generatedAt: string
  stats: { students: number; exams: number; liveExams: number; upcomingExams: number; activeSessions: number; finishedSessions: number; incidents24h: number; flaggedSessions: number; pendingIncidents: number; averagePercent: number | null }
  attempts: Attempt[]
  exams: ExamRow[]
  activity: Array<{ date: string; label: string; attempts: number }>
  incidentMix: Array<{ type: string; count: number }>
}

const STATUS: Record<string, { label: string; style: string }> = {
  IN_PROGRESS: { label: "Live", style: "bg-blue-100 text-blue-800" },
  SUBMITTED: { label: "Submitted", style: "bg-green-100 text-green-800" },
  AUTO_SUBMITTED: { label: "Auto-submitted", style: "bg-yellow-100 text-yellow-800" },
  BLOCKED: { label: "Ended by invigilator", style: "bg-red-100 text-red-800" },
}
const PHASE: Record<ExamRow["phase"], { label: string; style: string }> = {
  LIVE: { label: "Open now", style: "bg-green-100 text-green-800" },
  UPCOMING: { label: "Upcoming", style: "bg-blue-100 text-blue-800" },
  CLOSED: { label: "Closed", style: "bg-gray-200 text-gray-700" },
  DRAFT: { label: "Draft", style: "bg-yellow-100 text-yellow-800" },
}

function ago(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}
const duration = (seconds: number | null) => (seconds === null ? "-" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`)

export default function AdminHome({ onNavigate, adminName }: { onNavigate: (tab: string) => void; adminName?: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/stats")
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error ?? "Unable to load dashboard")
      setData(body)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(timer)
  }, [load])

  if (error && !data) return <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>
  if (!data) return <p className="text-sm text-gray-500">Loading dashboard...</p>

  const { stats } = data
  const cards: Array<{ name: string; value: string | number; hint: string; icon: typeof Users; color: string; tab: string }> = [
    { name: "Registered students", value: stats.students, hint: "Open the student list", icon: Users, color: "bg-blue-500", tab: "students" },
    { name: "Exams", value: stats.exams, hint: `${stats.liveExams} open now · ${stats.upcomingExams} upcoming`, icon: BookOpen, color: "bg-green-500", tab: "exams" },
    { name: "Students taking exams now", value: stats.activeSessions, hint: "Watch them live", icon: Eye, color: "bg-indigo-500", tab: "aiflags" },
    { name: "Attempts finished", value: stats.finishedSessions, hint: "See all results", icon: CheckCircle, color: "bg-purple-500", tab: "reports" },
    { name: "Average score", value: stats.averagePercent === null ? "-" : `${stats.averagePercent}%`, hint: "Of finished attempts", icon: Percent, color: "bg-teal-500", tab: "reports" },
    { name: "Alerts in last 24 hours", value: stats.incidents24h, hint: "Proctoring alerts", icon: AlertTriangle, color: "bg-orange-500", tab: "aiflags" },
    { name: "Waiting for your review", value: stats.pendingIncidents, hint: "High-severity alerts not yet reviewed", icon: Shield, color: "bg-red-500", tab: "review" },
    { name: "Candidates flagged", value: stats.flaggedSessions, hint: "Marked as suspected cheating", icon: Flag, color: "bg-rose-600", tab: "review" },
  ]
  const peakDay = Math.max(1, ...data.activity.map((day) => day.attempts))
  const peakMix = Math.max(1, ...data.incidentMix.map((item) => item.count))

  // Needs attention: the things an invigilator should open first.
  const attention: Array<{ text: string; tab: string }> = []
  if (stats.activeSessions > 0) attention.push({ text: `${stats.activeSessions} candidate${stats.activeSessions === 1 ? " is" : "s are"} taking an exam right now`, tab: "aiflags" })
  if (stats.pendingIncidents > 0) attention.push({ text: `${stats.pendingIncidents} high-severity alert${stats.pendingIncidents === 1 ? "" : "s"} waiting for review`, tab: "review" })
  for (const attempt of data.attempts.filter((item) => item.mlLevel === "HIGH" && !item.verdict).slice(0, 3)) attention.push({ text: `${attempt.student} has a high AI integrity risk (${Math.round(attempt.mlProbability * 100)}%) in "${attempt.exam}"`, tab: "review" })

  // Exams with the same title (for example repeated demo copies) are shown once with a count.
  const grouped = new Map<string, ExamRow & { copies: number }>()
  for (const exam of data.exams) {
    const key = `${exam.title}|${exam.phase}`
    const existing = grouped.get(key)
    if (existing) { existing.attempts += exam.attempts; existing.copies += 1 } else grouped.set(key, { ...exam, copies: 1 })
  }
  const examRows = [...grouped.values()].slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{adminName ? `Welcome, ${adminName}` : "Dashboard"}</h1>
          <p className="text-sm text-gray-500">Live overview of your exams, candidates and proctoring. Updates every 15 seconds.</p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh · {new Date(data.generatedAt).toLocaleTimeString()}
        </button>
      </div>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error} (showing the last loaded data)</p>}

      {attention.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">Needs your attention</h2>
          <ul className="space-y-1">
            {attention.map((item) => (
              <li key={item.text} className="flex items-center justify-between gap-3 text-sm text-amber-900">
                <span>{item.text}</span>
                <button onClick={() => onNavigate(item.tab)} className="shrink-0 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700">Open</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button key={card.name} onClick={() => onNavigate(card.tab)} className="rounded-lg bg-white p-5 text-left shadow transition hover:shadow-md">
            <div className="flex items-center">
              <div className={`rounded-full p-3 ${card.color}`}><card.icon className="h-5 w-5 text-white" /></div>
              <div className="ml-4 min-w-0">
                <h3 className="truncate text-sm font-medium text-gray-500">{card.name}</h3>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">{card.hint}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Exam attempts, last 7 days</h2>
          <div className="flex h-32 items-end gap-3">
            {data.activity.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs text-gray-600">{day.attempts}</span>
                <div className="w-full rounded-t bg-blue-500" style={{ height: `${day.attempts ? 8 + (day.attempts / peakDay) * 80 : 3}px`, opacity: day.attempts ? 1 : 0.25 }} />
                <span className="text-xs text-gray-500">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-base font-semibold text-gray-900">Proctoring alerts by type, last 7 days</h2>
          {data.incidentMix.length === 0 ? <p className="py-6 text-sm text-gray-500">No alerts recorded in the last 7 days.</p> : (
            <div className="space-y-2">
              {data.incidentMix.map((item) => (
                <div key={item.type} className="flex items-center gap-3 text-sm">
                  <span className="w-44 shrink-0 text-gray-700">{item.type.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</span>
                  <span className="h-3 rounded bg-orange-500" style={{ width: `${(item.count / peakMix) * 160}px` }} />
                  <span className="text-gray-600">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Latest attempts</h2>
          <button onClick={() => onNavigate("reports")} className="text-sm text-blue-600 hover:underline">All results</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-gray-500"><th className="py-2 pr-3 font-medium">Candidate</th><th className="py-2 pr-3 font-medium">Exam</th><th className="py-2 pr-3 font-medium">Started</th><th className="py-2 pr-3 font-medium">Answered</th><th className="py-2 pr-3 font-medium">Time used</th><th className="py-2 pr-3 font-medium">Score</th><th className="py-2 pr-3 font-medium">Alerts</th><th className="py-2 pr-3 font-medium">AI risk</th><th className="py-2 font-medium">Status</th></tr></thead>
            <tbody className="divide-y">
              {data.attempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-3">{attempt.student}<br /><span className="text-xs text-gray-500">{attempt.email}</span></td>
                  <td className="max-w-[220px] truncate py-2 pr-3" title={attempt.exam}>{attempt.exam}</td>
                  <td className="py-2 pr-3 text-xs text-gray-600">{ago(attempt.startedAt)}</td>
                  <td className="py-2 pr-3">{attempt.attempted} / {attempt.totalQuestions}</td>
                  <td className="py-2 pr-3">{duration(attempt.secondsUsed)}</td>
                  <td className="py-2 pr-3">{attempt.score === null ? "-" : <>{attempt.score}{attempt.totalMarks ? ` / ${attempt.totalMarks}` : ""}{attempt.percent !== null && <span className="ml-1 text-xs text-gray-500">({attempt.percent}%)</span>}</>}</td>
                  <td className="py-2 pr-3">{attempt.incidents}</td>
                  <td className="py-2 pr-3"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${attempt.mlLevel === "HIGH" ? "bg-red-600 text-white" : attempt.mlLevel === "ELEVATED" ? "bg-orange-400 text-white" : "bg-green-100 text-green-800"}`}>{Math.round(attempt.mlProbability * 100)}%</span>{attempt.verdict && <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${attempt.verdict === "FLAGGED" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{attempt.verdict.toLowerCase()}</span>}</td>
                  <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[attempt.status]?.style ?? "bg-gray-100 text-gray-800"}`}>{STATUS[attempt.status]?.label ?? attempt.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.attempts.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No candidate has taken an exam yet.</p>}
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Exams</h2>
          <button onClick={() => onNavigate("exams")} className="text-sm text-blue-600 hover:underline">Manage exams</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-gray-500"><th className="py-2 pr-3 font-medium">Exam</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Open window</th><th className="py-2 pr-3 font-medium">Duration</th><th className="py-2 pr-3 font-medium">Questions</th><th className="py-2 font-medium">Attempts</th></tr></thead>
            <tbody className="divide-y">
              {examRows.map((exam) => (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="py-2 pr-3">{exam.title}{exam.copies > 1 && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{exam.copies} copies</span>}</td>
                  <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PHASE[exam.phase].style}`}>{PHASE[exam.phase].label}</span></td>
                  <td className="py-2 pr-3 text-xs text-gray-600">{new Date(exam.startTime).toLocaleDateString()} to {new Date(exam.endTime).toLocaleDateString()}</td>
                  <td className="py-2 pr-3">{exam.durationMins} min</td>
                  <td className="py-2 pr-3">{exam.questions}{exam.totalMarks ? <span className="text-xs text-gray-500"> ({exam.totalMarks} marks)</span> : null}</td>
                  <td className="py-2">{exam.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {examRows.length === 0 && <p className="py-6 text-center text-sm text-gray-500">No exams yet. Create one from the Exams page.</p>}
        </div>
      </div>
    </div>
  )
}
