"use client"

import { useExam } from "@/context/exam-context"

interface FinalSubmissionProps {
  onGoHome: () => void
}

export default function FinalSubmission({ onGoHome }: FinalSubmissionProps) {
  const { exam, examResults } = useExam()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-center">Exam Submission Summary</h2>

        <div className="mb-8">
          <h3 className="mb-4 text-xl font-semibold">{exam?.name}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-500">Total Questions</p>
              <p className="text-2xl font-bold">{examResults?.totalQuestions || 75}</p>
            </div>

            <div className="p-4 bg-green-100 rounded-md">
              <p className="text-sm text-gray-500">Attempted</p>
              <p className="text-2xl font-bold text-green-700">{examResults?.attempted || 0}</p>
            </div>

            <div className="p-4 bg-yellow-100 rounded-md">
              <p className="text-sm text-gray-500">Skipped</p>
              <p className="text-2xl font-bold text-yellow-700">{examResults?.skipped || 0}</p>
            </div>

            <div className="p-4 bg-red-100 rounded-md">
              <p className="text-sm text-gray-500">Unattempted</p>
              <p className="text-2xl font-bold text-red-700">{examResults?.unattempted || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-4 mb-6 text-center border border-green-300 rounded-md bg-green-50">
          <p className="text-green-800">
            Your exam has been successfully submitted. You will receive your results via email.
          </p>
        </div>

        <div className="text-center">
          <button onClick={onGoHome} className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Return to Home
          </button>
        </div>
      </div>
    </div>
  )
}

