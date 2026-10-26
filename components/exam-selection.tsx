"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { useExam } from "@/context/exam-context"

interface ExamSelectionProps {
  onSelectExam: () => void
  onSignOut?: () => void
}

export default function ExamSelection({ onSelectExam, onSignOut }: ExamSelectionProps) {
  const { setExam, clearExam } = useExam()
  const [selectedExam, setSelectedExam] = useState("")
  const [exams, setExams] = useState<Array<{ id: string; title: string; description?: string | null; durationMins: number; startTime: string; endTime: string; subjects?: Array<{ name: string; questions: number }>; totalQuestions?: number; marking?: Array<{ marks: number; negative: number; count: number }> }>>([])
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/exams")
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load exams")))
      .then((data) => setExams(data.exams))
      .catch((loadError) => setError(loadError.message))
  }, [])

  const isOpen = (exam: { startTime: string }) => new Date(exam.startTime) <= new Date()

  const handleExamSelect = () => {
    if (selectedExam) {
      const exam = exams.find((e) => e.id === selectedExam)
      if (exam && isOpen(exam)) {
        setExam(exam)
        onSelectExam()
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Select an Exam</h2>
          <button
            onClick={async () => {
              await signOut({ redirect: false })
              clearExam()
              onSignOut?.()
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
        {error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}

        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className={`p-4 border rounded-md cursor-pointer transition-colors ${
                selectedExam === exam.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
              }`}
              onClick={() => isOpen(exam) && setSelectedExam(exam.id)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  id={exam.id}
                  name="exam"
                  value={exam.id}
                  checked={selectedExam === exam.id}
                  disabled={!isOpen(exam)}
                  onChange={() => setSelectedExam(exam.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                  <label htmlFor={exam.id} className="block ml-3 text-sm font-medium text-gray-700">
                  <span className="font-bold">{exam.title}</span>
                  <p className="text-gray-500">{exam.description ?? "Scheduled online examination"} · {exam.durationMins} minutes</p>
                  {!isOpen(exam) && <p className="text-amber-700">Opens {new Date(exam.startTime).toLocaleString()}</p>}
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleExamSelect}
            disabled={!selectedExam}
            className={`px-6 py-2 text-white rounded-md ${
              selectedExam ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

