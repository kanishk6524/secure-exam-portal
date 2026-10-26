"use client"

import { useEffect, useState } from "react"

type Exam = { id: string; title: string; _count: { sessions: number } }
type Pair = { a: { sessionId: string; name: string; email: string }; b: { sessionId: string; name: string; email: string }; bothWrong: number; sameWrong: number; expectedByChance: number; zScore: number; severity: "MEDIUM" | "HIGH" }

export default function AdminCollusion() {
  const [exams, setExams] = useState<Exam[]>([])
  const [examId, setExamId] = useState("")
  const [result, setResult] = useState<{ candidates: number; pairs: Pair[] } | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/admin/exams").then((response) => response.json()).then((data) => setExams(data.exams ?? [])).catch(() => setMessage("Unable to load exams"))
  }, [])

  async function analyse(id: string) {
    setExamId(id)
    setResult(null)
    setMessage("")
    if (!id) return
    setLoading(true)
    const response = await fetch(`/api/admin/collusion?examId=${encodeURIComponent(id)}`)
    const data = await response.json()
    setLoading(false)
    if (!response.ok) return setMessage(data.error ?? "Analysis failed")
    setResult(data)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Collusion analysis</h1>
        <p className="text-sm text-gray-600">Finds pairs of candidates who chose the same <i>wrong</i> option far more often than chance. Each wrong answer has three alternatives, so luck alone should match about one in three. Options are shuffled per candidate, so a match is the same answer text, not the same position.</p>
      </div>
      <select value={examId} onChange={(event) => void analyse(event.target.value)} className="w-full max-w-md rounded border p-2 text-sm">
        <option value="">Select an exam…</option>
        {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title} ({exam._count.sessions} sessions)</option>)}
      </select>
      {loading && <p className="text-sm text-gray-500">Analysing…</p>}
      {message && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{message}</p>}
      {result && (
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">{result.candidates} submitted sessions compared · {result.pairs.length} suspicious pair{result.pairs.length === 1 ? "" : "s"}</p>
          {result.pairs.length === 0 ? <p className="mt-3 text-sm text-green-700">No pair stands out from chance.</p> : (
            <table className="mt-3 w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase text-gray-500"><th className="p-2">Candidate A</th><th className="p-2">Candidate B</th><th className="p-2">Same wrong / both wrong</th><th className="p-2">Expected by chance</th><th className="p-2">z-score</th><th className="p-2">Level</th></tr></thead>
              <tbody>
                {result.pairs.map((pair) => (
                  <tr key={pair.a.sessionId + pair.b.sessionId} className="border-b">
                    <td className="p-2">{pair.a.name}<br /><span className="text-xs text-gray-500">{pair.a.email}</span></td>
                    <td className="p-2">{pair.b.name}<br /><span className="text-xs text-gray-500">{pair.b.email}</span></td>
                    <td className="p-2">{pair.sameWrong} / {pair.bothWrong}</td>
                    <td className="p-2">{pair.expectedByChance}</td>
                    <td className="p-2">{pair.zScore}</td>
                    <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${pair.severity === "HIGH" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{pair.severity}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-gray-500">This is statistical evidence only. Two candidates who studied together can also match. Compare with seating, proctoring incidents and the Incident Review before acting.</p>
        </div>
      )}
    </div>
  )
}
