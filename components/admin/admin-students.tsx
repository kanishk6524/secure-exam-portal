"use client"

import { useCallback, useEffect, useState } from "react"
import { Search, RefreshCw } from "lucide-react"

type Student = {
  id: string
  fullName: string
  email: string
  emailVerified: boolean
  createdAt: string
  hasFaceId: boolean
  college: { name: string; code: string } | null
  attempts: number
  averageScore: number | null
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [query, setQuery] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (search: string) => {
    setLoading(true)
    const response = await fetch(`/api/admin/students${search ? `?q=${encodeURIComponent(search)}` : ""}`)
    const data = await response.json()
    if (response.ok) setStudents(data.students)
    else setMessage(data.error ?? "Unable to load students")
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void load(query.trim()), 250)
    return () => clearTimeout(timer)
  }, [query, load])

  async function sendReset(email: string) {
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
    const data = await response.json()
    setMessage(response.ok ? `Password reset email requested for ${email}.` : data.error ?? "Unable to send reset email")
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Students</h1>
        <button onClick={() => void load(query.trim())} className="rounded-md border bg-white px-4 py-2 text-sm"><RefreshCw className="mr-1 inline h-4 w-4" />Refresh</button>
      </div>
      {message && <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{message}</p>}
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-3">Student</th><th className="p-3">College</th><th className="p-3">Email verified</th><th className="p-3">Face ID photo</th><th className="p-3">Attempts</th><th className="p-3">Avg. score</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="p-3"><div className="font-medium text-gray-800">{student.fullName}</div><div className="text-gray-500">{student.email}</div></td>
                <td className="p-3">{student.college ? `${student.college.name} (${student.college.code})` : "-"}</td>
                <td className="p-3">{student.emailVerified ? <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Verified</span> : <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Pending</span>}</td>
                <td className="p-3">{student.hasFaceId ? "Yes" : <span className="text-amber-700">Missing</span>}</td>
                <td className="p-3">{student.attempts}</td>
                <td className="p-3">{student.averageScore === null ? "-" : student.averageScore.toFixed(1)}</td>
                <td className="p-3"><button onClick={() => void sendReset(student.email)} className="text-blue-600 hover:underline">Send password reset</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && students.length === 0 && <p className="p-8 text-center text-sm text-gray-500">No students found.</p>}
        {loading && <p className="p-8 text-center text-sm text-gray-500">Loading...</p>}
      </div>
    </div>
  )
}
