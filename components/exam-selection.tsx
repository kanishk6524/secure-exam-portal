"use client"

import { useState } from "react"
import { useExam } from "@/context/exam-context"

interface ExamSelectionProps {
  onSelectExam: () => void
}

export default function ExamSelection({ onSelectExam }: ExamSelectionProps) {
  const { setExam } = useExam()
  const [selectedExam, setSelectedExam] = useState("")

  const exams = [
    { id: "viteee", name: "VITEEE", description: "VIT Engineering Entrance Examination" },
    { id: "mit", name: "MIT Entrance Exam", description: "Manipal Institute of Technology Entrance Test" },
    { id: "bitsat", name: "BITSAT", description: "Birla Institute of Technology and Science Admission Test" },
    { id: "jee", name: "JEE Mains", description: "Joint Entrance Examination - Main" },
  ]

  const handleExamSelect = () => {
    if (selectedExam) {
      const exam = exams.find((e) => e.id === selectedExam)
      if (exam) {
        setExam(exam)
        onSelectExam()
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-center">Select an Exam</h2>

        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className={`p-4 border rounded-md cursor-pointer transition-colors ${
                selectedExam === exam.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
              }`}
              onClick={() => setSelectedExam(exam.id)}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  id={exam.id}
                  name="exam"
                  value={exam.id}
                  checked={selectedExam === exam.id}
                  onChange={() => setSelectedExam(exam.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor={exam.id} className="block ml-3 text-sm font-medium text-gray-700">
                  <span className="font-bold">{exam.name}</span>
                  <p className="text-gray-500">{exam.description}</p>
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

