"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"

type ExamSummary = { id: string; title: string; status: string; startTime: string; attempts: number; finished: number; average: number | null; highest: number | null; lowest: number | null }
type ResultRow = { sessionId: string; student: string; email: string; status: string; score: number | null; totalMarks: number; percentage: number | null; incidents: number; riskScore: number; submittedAt: string | null }

const fixed = (value: number | null) => (value === null ? "-" : value.toFixed(1))

export default function AdminReports() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [selected, setSelected] = useState<ExamSummary | null>(null)
  const [rows, setRows] = useState<ResultRow[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/admin/reports")
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => (ok ? setExams(data.exams) : setMessage(data.error ?? "Unable to load reports")))
      .catch(() => setMessage("Unable to load reports"))
  }, [])

  async function open(exam: ExamSummary) {
    setSelected(exam)
    setRows([])
    const response = await fetch(`/api/admin/reports?examId=${exam.id}`)
    const data = await response.json()
    if (response.ok) setRows(data.rows)
    else setMessage(data.error ?? "Unable to load results")
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        {selected && <button onClick={() => setSelected(null)} className="rounded-md border bg-white px-4 py-2 text-sm">All exams</button>}
      </div>
      {message && <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{message}</p>}
      {!selected ? (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y">
            <thead><tr className="bg-gray-50 text-left text-xs uppercase text-gray-500"><th className="p-3">Exam</th><th className="p-3">Status</th><th className="p-3">Attempts</th><th className="p-3">Finished</th><th className="p-3">Average</th><th className="p-3">Highest</th><th className="p-3">Lowest</th><th className="p-3"></th></tr></thead>
            <tbody className="divide-y text-sm">
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td className="p-3 font-medium">{exam.title}</td><td className="p-3">{exam.status}</td><td className="p-3">{exam.attempts}</td><td className="p-3">{exam.finished}</td><td className="p-3">{fixed(exam.average)}</td><td className="p-3">{fixed(exam.highest)}</td><td className="p-3">{fixed(exam.lowest)}</td>
                  <td className="p-3"><button onClick={() => void open(exam)} className="text-blue-600 hover:underline">View results</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {exams.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No exams yet.</p>}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">{selected.title}</h2>
            <a href={`/api/admin/reports?examId=${selected.id}&format=csv`} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white"><Download className="mr-1 inline h-4 w-4" />Download CSV</a>
          </div>
          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="min-w-full divide-y">
              <thead><tr className="bg-gray-50 text-left text-xs uppercase text-gray-500"><th className="p-3">Student</th><th className="p-3">Status</th><th className="p-3">Score</th><th className="p-3">Out of</th><th className="p-3">%</th><th className="p-3">Incidents</th><th className="p-3">Risk</th><th className="p-3">Submitted</th></tr></thead>
              <tbody className="divide-y text-sm">
                {rows.map((row) => (
                  <tr key={row.sessionId}>
                    <td className="p-3"><div className="font-medium">{row.student}</div><div className="text-gray-500">{row.email}</div></td>
                    <td className="p-3">{row.status}</td><td className="p-3">{row.score ?? "-"}</td><td className="p-3">{row.totalMarks}</td><td className="p-3">{row.percentage ?? "-"}</td><td className="p-3">{row.incidents}</td><td className="p-3">{row.riskScore}</td><td className="p-3">{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No attempts for this exam yet.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
