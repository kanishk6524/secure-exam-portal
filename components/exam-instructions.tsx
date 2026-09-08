"use client"

import { useState } from "react"
import { useExam } from "@/context/exam-context"

interface ExamInstructionsProps {
  onStartExam: () => void
}

export default function ExamInstructions({ onStartExam }: ExamInstructionsProps) {
  const { exam } = useExam()
  const [accepted, setAccepted] = useState(false)

  // Instructions would typically come from the backend based on the selected exam
  const instructions = {
    pattern: [
      "The exam consists of 3 subjects: Physics, Chemistry, and Mathematics.",
      "Each subject has 25 multiple-choice questions.",
      "Total duration of the exam is 3 hours (180 minutes).",
    ],
    marking: [
      "Each correct answer awards 4 marks.",
      "Each incorrect answer deducts 1 mark (negative marking).",
      "Unattempted questions receive 0 marks.",
    ],
    rules: [
      "You cannot return to a question once skipped or submitted.",
      "The timer cannot be paused once the exam starts.",
      "Any form of malpractice will result in disqualification.",
      "Ensure stable internet connectivity throughout the exam.",
    ],
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-3xl p-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-center">{exam?.name} - Exam Instructions</h2>

        <div className="mb-8 space-y-6">
          <div>
            <h3 className="mb-2 text-xl font-semibold">Exam Pattern</h3>
            <ul className="pl-5 space-y-1 list-disc">
              {instructions.pattern.map((item, index) => (
                <li key={index} className="text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xl font-semibold">Marking Scheme</h3>
            <ul className="pl-5 space-y-1 list-disc">
              {instructions.marking.map((item, index) => (
                <li key={index} className="text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xl font-semibold">Rules and Guidelines</h3>
            <ul className="pl-5 space-y-1 list-disc">
              {instructions.rules.map((item, index) => (
                <li key={index} className="text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 mb-6 border border-yellow-300 rounded-md bg-yellow-50">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="accept"
                name="accept"
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="accept" className="font-medium text-gray-700">
                I have read and understood all the instructions
              </label>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onStartExam}
            disabled={!accepted}
            className={`px-6 py-2 text-white rounded-md ${
              accepted ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  )
}

