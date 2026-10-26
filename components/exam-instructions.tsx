"use client"

import { useState } from "react"
import { useExam } from "@/context/exam-context"

interface ExamInstructionsProps {
  onStartExam: () => void
}

export default function ExamInstructions({ onStartExam }: ExamInstructionsProps) {
  const { exam } = useExam()
  const [accepted, setAccepted] = useState(false)

  // Built from the selected exam, so the screen always matches what the student will actually get.
  const minutes = exam?.durationMins ?? 0
  const duration = minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? "" : "s"} (${minutes} minutes)` : `${minutes} minutes`
  const sections = exam?.subjects ?? []
  const instructions = {
    pattern: [
      sections.length
        ? `The exam has ${sections.length} section${sections.length === 1 ? "" : "s"}: ${sections.map((section) => `${section.name} (${section.questions} question${section.questions === 1 ? "" : "s"})`).join(", ")}.`
        : "The exam is made of multiple-choice questions.",
      ...(exam?.totalQuestions ? [`There are ${exam.totalQuestions} questions in total.`] : []),
      `The total duration is ${duration}. The timer is controlled by the server and keeps running if you refresh the page.`,
    ],
    marking: [
      ...(exam?.marking?.length
        ? exam.marking.map((scheme) => `${scheme.count} question${scheme.count === 1 ? "" : "s"}: +${scheme.marks} for a correct answer${scheme.negative ? `, -${scheme.negative} for a wrong answer` : ", no negative marking"}.`)
        : ["Marks for each question are shown above the question."]),
      "Unattempted questions receive 0 marks.",
      "Every answer you select is saved straight away. Answered questions are counted, including those marked for review.",
    ],
    rules: [
      "You can move between questions and change answers until you submit or the time is over.",
      "The exam runs in fullscreen. Leaving fullscreen, switching tabs or windows, and copy/paste are recorded; repeated violations submit your exam automatically.",
      "Your camera and microphone must stay on. Keep your face visible, sit alone, and do not use phones, books or other screens.",
      "Your identity is checked against your registration photo during the exam, and your name is watermarked on every screen.",
      "The exam is submitted automatically when the time ends. Ensure a stable internet connection.",
    ],
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-3xl p-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-center">{exam?.title} - Exam Instructions</h2>

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

