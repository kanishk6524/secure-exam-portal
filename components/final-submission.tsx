"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useExam } from "@/context/exam-context"

type AppealState = { status: string; response: string | null } | null

interface FinalSubmissionProps {
  onGoHome: () => void
}

export default function FinalSubmission({ onGoHome }: FinalSubmissionProps) {
  const { exam, examResults, clearExam } = useExam()
  // Inside the Secure Exam Client the app stays locked until the exam is over; this screen unlocks it.
  const [inClient, setInClient] = useState(false)
  useEffect(() => {
    const client = window.secureClient
    if (!client?.allowExit) return
    setInClient(true)
    void client.allowExit()
  }, [])

  const sessionId = examResults?.sessionId
  const [appeal, setAppeal] = useState<AppealState>(null)
  const [appealText, setAppealText] = useState("")
  const [appealError, setAppealError] = useState("")
  const [showAppeal, setShowAppeal] = useState(false)
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/exams/session/${sessionId}/appeal`).then((r) => r.json()).then((j) => { if (j.appeal) setAppeal(j.appeal) }).catch(() => undefined)
  }, [sessionId])
  async function submitAppeal() {
    setAppealError("")
    const r = await fetch(`/api/exams/session/${sessionId}/appeal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: appealText }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setAppealError(j.error ?? "Could not send your appeal"); return }
    setAppeal({ status: "PENDING", response: null })
    setShowAppeal(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-center">Exam Submission Summary</h2>

        <div className="mb-8">
          <h3 className="mb-4 text-xl font-semibold">{exam?.title}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-500">Total Questions</p>
              <p className="text-2xl font-bold">{examResults?.totalQuestions ?? 0}</p>
            </div>

            <div className="p-4 bg-green-100 rounded-md">
              <p className="text-sm text-gray-500">Attempted</p>
              <p className="text-2xl font-bold text-green-700">{examResults?.attempted ?? 0}</p>
            </div>

            <div className="p-4 bg-yellow-100 rounded-md">
              <p className="text-sm text-gray-500">Skipped</p>
              <p className="text-2xl font-bold text-yellow-700">{examResults?.skipped ?? 0}</p>
            </div>

            <div className="p-4 bg-red-100 rounded-md">
              <p className="text-sm text-gray-500">Unattempted</p>
              <p className="text-2xl font-bold text-red-700">{examResults?.unattempted ?? 0}</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-md">
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-2xl font-bold text-blue-700">{examResults?.score ?? 0}</p>
            </div>
          </div>
        </div>

        {examResults?.reason && (
          <div className="p-4 mb-6 text-sm border rounded-md border-slate-300 bg-slate-50 text-slate-800">
            <p className="font-semibold">
              {examResults.reason === "MANUAL" && `Submitted by you after ${examResults.secondsUsed ?? 0} seconds.`}
              {examResults.reason === "TIME_UP" && `Submitted automatically because the timer ran out (${examResults.secondsUsed ?? 0} seconds used).`}
              {examResults.reason === "VIOLATION_LIMIT" && `Submitted automatically because the violation limit was reached (${examResults.lockdownCount} of ${examResults.maxViolations} allowed) after ${examResults.secondsUsed ?? 0} seconds.`}
              {examResults.reason === "INVIGILATOR" && "The invigilator ended this session."}
            </p>
            {examResults.breakdown && Object.keys(examResults.breakdown).length > 0 && (
              <p className="mt-1 text-xs text-slate-600">Alerts recorded: {Object.entries(examResults.breakdown).map(([type, count]) => `${type.replaceAll("_", " ").toLowerCase()} x${count}`).join(", ")}</p>
            )}
          </div>
        )}

        <div className="p-4 mb-6 text-center border border-green-300 rounded-md bg-green-50">
          <p className="text-green-800">
            Your exam has been successfully submitted. You will receive your results via email.
          </p>
        </div>

        {sessionId && (
          <div className="p-4 mb-6 text-sm border rounded-md border-gray-200">
            {appeal ? (
              <p><b>Your appeal:</b> {appeal.status === "PENDING" ? "received, waiting for a reviewer." : appeal.status === "OVERTURNED" ? `decided in your favour. ${appeal.response ?? ""}` : `reviewed; the original outcome stands. ${appeal.response ?? ""}`}</p>
            ) : showAppeal ? (
              <div className="space-y-2">
                <p>Tell the reviewer what you think went wrong (for example a false alert, a connection problem, or a mistake in a question).</p>
                <textarea className="w-full p-2 border rounded" rows={4} value={appealText} onChange={(e) => setAppealText(e.target.value)} maxLength={2000} />
                {appealError && <p className="text-red-600">{appealError}</p>}
                <div className="flex gap-2"><button onClick={() => void submitAppeal()} className="px-4 py-1.5 text-white bg-blue-600 rounded hover:bg-blue-700">Send appeal</button><button onClick={() => setShowAppeal(false)} className="px-4 py-1.5 border rounded">Cancel</button></div>
              </div>
            ) : (
              <p>Do you think an alert or the outcome was wrong? <button onClick={() => setShowAppeal(true)} className="text-blue-600 underline">Appeal this result</button>. A person will review it.</p>
            )}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={async () => {
              // Sign out so the next person on a shared computer does not inherit this session.
              await signOut({ redirect: false })
              clearExam()
              onGoHome()
            }}
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Sign out and return home
          </button>
          {inClient && (
            <p className="mt-4 text-sm text-gray-500">You can now close the Secure Exam Client (Alt+F4 or Cmd+Q).</p>
          )}
        </div>
      </div>
    </div>
  )
}

