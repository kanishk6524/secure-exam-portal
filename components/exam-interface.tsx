"use client"

import { useState, useEffect } from "react"
import { useExam } from "@/context/exam-context"

interface ExamInterfaceProps {
  onFinishExam: () => void
}

interface Question {
  id: number
  subject: string
  text: string
  options: string[]
  correctAnswer?: number // Only used for demo purposes
}

interface QuestionStatus {
  attempted: boolean
  skipped: boolean
  answerId: number | null
}

export default function ExamInterface({ onFinishExam }: ExamInterfaceProps) {
  const { exam, setExamResults } = useExam()
  const [currentSubject, setCurrentSubject] = useState("Physics")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(180 * 60) // 3 hours in seconds
  const [questionStatus, setQuestionStatus] = useState<Record<number, QuestionStatus>>({})
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Generate sample questions for demo
  const generateQuestions = (): Question[] => {
    const subjects = ["Physics", "Chemistry", "Mathematics"]
    const questions: Question[] = []

    subjects.forEach((subject) => {
      for (let i = 1; i <= 25; i++) {
        questions.push({
          id: questions.length + 1,
          subject,
          text: `${subject} Question ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit?`,
          options: [
            "Option A: Lorem ipsum dolor sit amet",
            "Option B: Consectetur adipiscing elit",
            "Option C: Sed do eiusmod tempor incididunt",
            "Option D: Ut labore et dolore magna aliqua",
          ],
          correctAnswer: Math.floor(Math.random() * 4), // Only for demo
        })
      }
    })

    return questions
  }

  const [questions] = useState<Question[]>(generateQuestions())

  // Initialize question status
  useEffect(() => {
    const initialStatus: Record<number, QuestionStatus> = {}
    questions.forEach((q) => {
      initialStatus[q.id] = {
        attempted: false,
        skipped: false,
        answerId: null,
      }
    })
    setQuestionStatus(initialStatus)
  }, [questions])

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleFinishExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const currentQuestions = questions.filter((q) => q.subject === currentSubject)
  const currentQuestion = currentQuestions[currentQuestionIndex]

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleAnswerSelect = (optionIndex: number) => {
    setQuestionStatus((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        attempted: true,
        skipped: false,
        answerId: optionIndex,
      },
    }))
  }

  const handleSkip = () => {
    setQuestionStatus((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        skipped: true,
      },
    }))

    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else if (currentSubject === "Physics") {
      setCurrentSubject("Chemistry")
      setCurrentQuestionIndex(0)
    } else if (currentSubject === "Chemistry") {
      setCurrentSubject("Mathematics")
      setCurrentQuestionIndex(0)
    }
  }

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else if (currentSubject === "Physics") {
      setCurrentSubject("Chemistry")
      setCurrentQuestionIndex(0)
    } else if (currentSubject === "Chemistry") {
      setCurrentSubject("Mathematics")
      setCurrentQuestionIndex(0)
    }
  }

  const handleFinishExam = () => {
    // Calculate results
    const results = {
      attempted: Object.values(questionStatus).filter((q) => q.attempted).length,
      skipped: Object.values(questionStatus).filter((q) => q.skipped).length,
      unattempted: Object.values(questionStatus).filter((q) => !q.attempted && !q.skipped).length,
      totalQuestions: questions.length,
      answers: questionStatus,
    }

    setExamResults(results)
    onFinishExam()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with timer */}
      <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <h1 className="text-xl font-bold">{exam?.name}</h1>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-2 text-white bg-blue-600 rounded-md">
            <span className="font-medium">Time Left: {formatTime(timeLeft)}</span>
          </div>
          <button
            onClick={() => setShowConfirmation(true)}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Finish Exam
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setCurrentSubject("Physics")}
                  className={`px-4 py-2 rounded-md ${
                    currentSubject === "Physics"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Physics
                </button>
                <button
                  onClick={() => setCurrentSubject("Chemistry")}
                  className={`px-4 py-2 rounded-md ${
                    currentSubject === "Chemistry"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Chemistry
                </button>
                <button
                  onClick={() => setCurrentSubject("Mathematics")}
                  className={`px-4 py-2 rounded-md ${
                    currentSubject === "Mathematics"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Mathematics
                </button>
              </div>

              <h2 className="text-xl font-bold">
                Question {currentQuestionIndex + 1} of {currentQuestions.length}
              </h2>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md">
              <p className="mb-6 text-lg">{currentQuestion?.text}</p>

              <div className="space-y-3">
                {currentQuestion?.options.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`p-3 border rounded-md cursor-pointer ${
                      questionStatus[currentQuestion.id]?.answerId === index
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id={`option-${index}`}
                        name="answer"
                        checked={questionStatus[currentQuestion.id]?.answerId === index}
                        onChange={() => handleAnswerSelect(index)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor={`option-${index}`} className="block ml-3 text-gray-700">
                        {option}
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Skip Question
                </button>
                <button
                  onClick={handleSaveAndNext}
                  className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Save & Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question navigation sidebar */}
        <div className="w-64 p-4 overflow-y-auto bg-white border-l">
          <h3 className="mb-4 text-lg font-semibold">Question Navigator</h3>

          <div className="mb-4">
            <h4 className="mb-2 font-medium">Physics</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions
                .filter((q) => q.subject === "Physics")
                .map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentSubject("Physics")
                      setCurrentQuestionIndex(index)
                    }}
                    className={`w-8 h-8 text-xs font-medium rounded-md ${
                      questionStatus[q.id]?.attempted
                        ? "bg-green-500 text-white"
                        : questionStatus[q.id]?.skipped
                          ? "bg-yellow-500 text-white"
                          : "bg-red-500 text-white"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 font-medium">Chemistry</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions
                .filter((q) => q.subject === "Chemistry")
                .map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentSubject("Chemistry")
                      setCurrentQuestionIndex(index)
                    }}
                    className={`w-8 h-8 text-xs font-medium rounded-md ${
                      questionStatus[q.id]?.attempted
                        ? "bg-green-500 text-white"
                        : questionStatus[q.id]?.skipped
                          ? "bg-yellow-500 text-white"
                          : "bg-red-500 text-white"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="mb-2 font-medium">Mathematics</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions
                .filter((q) => q.subject === "Mathematics")
                .map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentSubject("Mathematics")
                      setCurrentQuestionIndex(index)
                    }}
                    className={`w-8 h-8 text-xs font-medium rounded-md ${
                      questionStatus[q.id]?.attempted
                        ? "bg-green-500 text-white"
                        : questionStatus[q.id]?.skipped
                          ? "bg-yellow-500 text-white"
                          : "bg-red-500 text-white"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 mr-2 bg-green-500 rounded-sm"></div>
              <span className="text-sm">Attempted</span>
            </div>
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 mr-2 bg-red-500 rounded-sm"></div>
              <span className="text-sm">Not Attempted</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 bg-yellow-500 rounded-sm"></div>
              <span className="text-sm">Skipped</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-lg">
            <h3 className="mb-4 text-xl font-bold">Finish Exam?</h3>
            <p className="mb-6">Are you sure you want to finish the exam? You won't be able to return to it.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishExam}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Finish Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

