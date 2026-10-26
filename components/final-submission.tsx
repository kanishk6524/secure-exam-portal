"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useExam } from "@/context/exam-context"

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

