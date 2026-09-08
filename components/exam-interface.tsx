"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useExam } from "@/context/exam-context"
import { useStudentRealtime } from "@/lib/socket-client"
import ProctorEngine from "@/components/proctor/proctor-engine"

type Option = { id: string; text: string }
type Question = { id: string; subject: { id: string; name: string }; text: string; options: Option[]; marks: number; negativeMarks: number }
type Answer = { questionId: string; selectedOption: string | null; descriptiveText: string | null }

export default function ExamInterface({ onFinishExam }: { onFinishExam: () => void }) {
  const { exam, setExamResults } = useExam()
  const [sessionId, setSessionId] = useState("")
  const [serverEndsAt, setServerEndsAt] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [error, setError] = useState("")
  const [blocked, setBlocked] = useState(false)
  const submitting = useRef(false)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const currentQuestion = questions[currentIndex]
  const subjects = useMemo(() => Array.from(new Map(questions.map((question) => [question.subject.id, question.subject])).values()), [questions])
  const handleBlocked = useCallback(() => setBlocked(true), [])
  useStudentRealtime(sessionId, handleBlocked)

  async function loadSession() {
    if (!exam?.id) return
    const startResponse = await fetch(`/api/exams/${exam.id}/start`, { method: "POST" })
    const start = await startResponse.json()
    if (!startResponse.ok) throw new Error(start.error ?? "Unable to start exam")
    setSessionId(start.sessionId)
    setServerEndsAt(start.serverEndsAt)
    const [questionResponse, answerResponse] = await Promise.all([fetch(`/api/exams/session/${start.sessionId}/questions`), fetch(`/api/exams/session/${start.sessionId}/answers`)]);
    const questionData = await questionResponse.json()
    const answerData = await answerResponse.json()
    if (!questionResponse.ok) throw new Error(questionData.error ?? "Unable to load questions")
    setQuestions(questionData.questions)
    setServerEndsAt(questionData.serverEndsAt)
    const restored: Record<string, Answer> = {}
    for (const answer of answerData.answers ?? []) restored[answer.questionId] = answer
    setAnswers(restored)
  }

  useEffect(() => {
    loadSession().catch((loadError) => setError(loadError.message))
  }, [exam?.id])

  useEffect(() => {
    const sync = () => setTimeLeft(Math.max(0, Math.floor((new Date(serverEndsAt).getTime() - Date.now()) / 1000)))
    if (!serverEndsAt) return
    sync()
    const timer = setInterval(sync, 1000)
    return () => clearInterval(timer)
  }, [serverEndsAt])

  async function submitExam() {
    if (!sessionId || submitting.current) return
    submitting.current = true
    const response = await fetch(`/api/exams/session/${sessionId}/submit`, { method: "POST" })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error ?? "Unable to submit exam")
      submitting.current = false
      return
    }
    const attempted = Object.values(answers).filter((answer) => answer.selectedOption || answer.descriptiveText).length
    setExamResults({ attempted, skipped: questions.length - attempted, unattempted: questions.length - attempted, totalQuestions: questions.length, answers, score: data.score, status: data.status })
    onFinishExam()
  }

  useEffect(() => {
    if (timeLeft !== 0 || !sessionId || submitting.current) return
    submitExam()
  }, [timeLeft, sessionId])

  useEffect(() => {
    if (!sessionId) return
    const sync = async () => {
      const response = await fetch(`/api/exams/session/${sessionId}/questions`)
      if (response.ok) setServerEndsAt((await response.json()).serverEndsAt)
    }
    const interval = setInterval(sync, 30000)
    return () => clearInterval(interval)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    const reportTabSwitch = () => {
      if (document.visibilityState === "hidden") {
        void fetch(`/api/exams/session/${sessionId}/incident`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "TAB_SWITCH", severity: "MEDIUM", metadata: { visibilityState: document.visibilityState } }) })
      }
    }
    document.addEventListener("visibilitychange", reportTabSwitch)
    return () => document.removeEventListener("visibilitychange", reportTabSwitch)
  }, [sessionId])

  function selectAnswer(questionId: string, selectedOption: string) {
    if (blocked) return
    const answer = { questionId, selectedOption, descriptiveText: null }
    setAnswers((previous) => ({ ...previous, [questionId]: answer }))
    clearTimeout(saveTimers.current[questionId])
    saveTimers.current[questionId] = setTimeout(() => {
      fetch(`/api/exams/session/${sessionId}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answer) }).catch(() => setError("Answer could not be saved"))
    }, 300)
  }

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
  if (blocked) return <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6"><div className="max-w-lg rounded-lg bg-white p-10 text-center shadow-xl"><h1 className="text-2xl font-bold text-red-700">Your session has been ended by the invigilator</h1><p className="mt-3 text-gray-600">This exam is no longer accepting answers.</p></div></div>
  if (error) return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="rounded-lg bg-white p-8 text-red-700 shadow">{error}</div></div>
  if (!currentQuestion) return <div className="flex min-h-screen items-center justify-center bg-gray-50">Loading exam...</div>

  return <div className="flex h-screen flex-col bg-gray-50"><ProctorEngine sessionId={sessionId} /><header className="flex items-center justify-between border-b bg-white p-4 shadow-sm"><h1 className="text-xl font-bold">{exam?.title}</h1><div className="flex items-center gap-4"><div className={`rounded-md px-4 py-2 font-medium text-white ${timeLeft < 300 ? "bg-red-600" : "bg-blue-600"}`}>Time Left: {formatTime(timeLeft)}</div><button onClick={submitExam} className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">Finish Exam</button></div></header><div className="flex flex-1 overflow-hidden"><main className="flex-1 overflow-y-auto p-6"><div className="mx-auto max-w-3xl"><div className="mb-6 flex flex-wrap gap-2">{subjects.map((subject) => <button key={subject.id} onClick={() => setCurrentIndex(questions.findIndex((question) => question.subject.id === subject.id))} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-blue-100">{subject.name}</button>)}</div><p className="mb-4 text-sm text-gray-500">Question {currentIndex + 1} of {questions.length} · {currentQuestion.subject.name}</p><div className="rounded-lg bg-white p-6 shadow-md"><p className="mb-6 text-lg">{currentQuestion.text}</p><div className="space-y-3">{currentQuestion.options.map((option) => <label key={option.id} className={`flex cursor-pointer items-center rounded-md border p-3 ${answers[currentQuestion.id]?.selectedOption === option.id ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-300"}`}><input type="radio" name={currentQuestion.id} checked={answers[currentQuestion.id]?.selectedOption === option.id} onChange={() => selectAnswer(currentQuestion.id, option.id)} /><span className="ml-3">{option.text}</span></label>)}</div><div className="mt-8 flex justify-between"><button disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} className="rounded-md bg-gray-200 px-4 py-2 disabled:opacity-50">Previous</button><button disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))} className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50">Save & Next</button></div></div></div></main><aside className="w-64 overflow-y-auto border-l bg-white p-4"><h3 className="mb-4 text-lg font-semibold">Question Navigator</h3><div className="grid grid-cols-5 gap-2">{questions.map((question, index) => <button key={question.id} onClick={() => setCurrentIndex(index)} className={`h-8 rounded-md text-xs font-medium text-white ${answers[question.id]?.selectedOption ? "bg-green-500" : "bg-red-500"}`}>{index + 1}</button>)}</div></aside></div></div>
}