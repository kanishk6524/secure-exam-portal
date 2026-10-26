"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useExam } from "@/context/exam-context"
import { useAuth } from "@/context/auth-context"
import { useStudentRealtime } from "@/lib/socket-client"
import { useExamLockdown } from "@/hooks/use-exam-lockdown"
import dynamic from "next/dynamic"
import ExamWatermark from "@/components/exam-watermark"

type Option = { id: string; text: string }
type Question = { id: string; subject: { id: string; name: string }; text: string; options: Option[]; marks: number; negativeMarks: number }
type Answer = { questionId: string; selectedOption: string | null; descriptiveText: string | null; visited: boolean; markedForReview: boolean }
type Status = "notVisited" | "notAnswered" | "answered" | "marked" | "answeredMarked"
type Section = { id: string; name: string; indexes: number[] }

const blankAnswer = (questionId: string): Answer => ({ questionId, selectedOption: null, descriptiveText: null, visited: false, markedForReview: false })

function statusOf(answer: Answer | undefined): Status {
  if (!answer?.visited) return "notVisited"
  const hasAnswer = Boolean(answer.selectedOption || answer.descriptiveText)
  if (answer.markedForReview) return hasAnswer ? "answeredMarked" : "marked"
  return hasAnswer ? "answered" : "notAnswered"
}

const paletteStyle: Record<Status, string> = {
  notVisited: "rounded border border-gray-300 bg-gray-100 text-gray-800",
  notAnswered: "rounded-t-xl bg-red-500 text-white",
  answered: "rounded-b-xl bg-green-500 text-white",
  marked: "rounded-full bg-purple-600 text-white",
  answeredMarked: "relative rounded-full bg-purple-600 text-white",
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((part) => String(part).padStart(2, "0")).join(":")

function Swatch({ status, size = "h-7 w-7" }: { status: Status; size?: string }) {
  return (
    <span className={`relative inline-flex ${size} shrink-0 items-center justify-center text-xs font-semibold ${paletteStyle[status]}`}>
      {status === "answeredMarked" && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-green-400" />}
    </span>
  )
}

// TensorFlow.js is large and must not be loaded (or clash with the face library) on login/registration pages.
const ProctorEngine = dynamic(() => import("@/components/proctor/proctor-engine"), { ssr: false })

export default function ExamInterface({ onFinishExam, onExit }: { onFinishExam: () => void; onExit?: () => void }) {
  const { exam, setExamResults } = useExam()
  const { user } = useAuth()
  const [started, setStarted] = useState(false)
  const [sessionId, setSessionId] = useState("")
  const [serverEndsAt, setServerEndsAt] = useState("")
  const [candidate, setCandidate] = useState<{ fullName: string; email: string } | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [error, setError] = useState("")
  const [saveWarning, setSaveWarning] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)
  const [finished, setFinished] = useState(false)
  const [cameraOk, setCameraOk] = useState(true)
  const [submitError, setSubmitError] = useState("")
  const [submitRetry, setSubmitRetry] = useState(0)
  const [cameraRetry, setCameraRetry] = useState(0)
  const submitting = useRef(false)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  // Always call the latest closures from long-lived callbacks (intervals, queued saves).
  const submitRef = useRef<() => Promise<void>>(async () => undefined)
  const sessionEndedRef = useRef<() => Promise<void>>(async () => undefined)

  const currentQuestion = questions[currentIndex]
  const handleBlocked = useCallback(() => setBlocked(true), [])
  useStudentRealtime(sessionId, handleBlocked)

  // Questions are grouped into contiguous sections (subjects) so Next/Back walk section by section.
  const sections = useMemo<Section[]>(() => {
    const result: Section[] = []
    questions.forEach((question, index) => {
      let section = result.find((item) => item.id === question.subject.id)
      if (!section) {
        section = { id: question.subject.id, name: question.subject.name, indexes: [] }
        result.push(section)
      }
      section.indexes.push(index)
    })
    return result
  }, [questions])
  const currentSection = sections.find((section) => section.indexes.includes(currentIndex))

  const countStatuses = useCallback(
    (indexes: number[]) => {
      const counts: Record<Status, number> = { notVisited: 0, notAnswered: 0, answered: 0, marked: 0, answeredMarked: 0 }
      for (const index of indexes) counts[statusOf(answers[questions[index].id])] += 1
      return counts
    },
    [answers, questions],
  )

  // ---- server sync -------------------------------------------------------
  // Saves are chained so they reach the server in the order the student made them.
  const persist = useCallback(
    (questionId: string, patch: Partial<Pick<Answer, "selectedOption" | "descriptiveText" | "markedForReview">>) => {
      if (!sessionId) return
      saveQueue.current = saveQueue.current.then(() =>
        fetch(`/api/exams/session/${sessionId}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId, ...patch }) })
          .then((response) => {
            // 409 means the session is no longer accepting answers: ended by an invigilator, submitted or out of time.
            if (response.status === 409) void sessionEndedRef.current()
            else setSaveWarning(!response.ok)
          })
          .catch(() => setSaveWarning(true)),
      )
    },
    [sessionId],
  )

  const updateAnswer = useCallback((questionId: string, patch: Partial<Answer>) => {
    setAnswers((previous) => ({ ...previous, [questionId]: { ...(previous[questionId] ?? blankAnswer(questionId)), ...patch, visited: true } }))
  }, [])

  // Reads a JSON response, and turns an empty or non-JSON body (a server crash) into a readable message.
  async function readJson(response: Response, what: string) {
    const text = await response.text()
    try { return text ? JSON.parse(text) : {} } catch { /* fall through */ }
    throw new Error(`${what} failed (server returned status ${response.status}${text ? "" : " with an empty response"}). Check the terminal running npm run dev for the error; if you just updated the code, run npx prisma migrate deploy and restart`)
  }

  async function loadSession() {
    if (!exam?.id) return
    const startResponse = await fetch(`/api/exams/${exam.id}/start`, { method: "POST" })
    const start = await readJson(startResponse, "Starting the exam")
    if (!startResponse.ok) throw new Error(start.error ?? "Unable to start exam")
    setSessionId(start.sessionId)
    setServerEndsAt(start.serverEndsAt)
    const [questionResponse, answerResponse] = await Promise.all([fetch(`/api/exams/session/${start.sessionId}/questions`), fetch(`/api/exams/session/${start.sessionId}/answers`)])
    const questionData = await readJson(questionResponse, "Loading questions")
    const answerData = await readJson(answerResponse, "Loading saved answers")
    if (!questionResponse.ok) throw new Error(questionData.error ?? "Unable to load questions")
    const sectionOrder = new Map<string, number>()
    for (const question of questionData.questions as Question[]) if (!sectionOrder.has(question.subject.id)) sectionOrder.set(question.subject.id, sectionOrder.size)
    setQuestions([...(questionData.questions as Question[])].sort((a, b) => sectionOrder.get(a.subject.id)! - sectionOrder.get(b.subject.id)!))
    setServerEndsAt(questionData.serverEndsAt)
    if (questionData.candidate) setCandidate(questionData.candidate)
    const restored: Record<string, Answer> = {}
    for (const answer of answerData.answers ?? []) restored[answer.questionId] = { ...blankAnswer(answer.questionId), ...answer }
    setAnswers(restored)
  }

  useEffect(() => {
    if (!started) return
    loadSession().catch((loadError) => setError(loadError.message))
  }, [started, exam?.id])

  // The question on screen counts as visited.
  useEffect(() => {
    const question = questions[currentIndex]
    if (!question || !sessionId || answers[question.id]?.visited) return
    updateAnswer(question.id, {})
    persist(question.id, {})
  }, [currentIndex, questions, sessionId])

  // ---- timer ---------------------------------------------------------------
  useEffect(() => {
    if (!serverEndsAt) return
    const sync = () => setTimeLeft(Math.max(0, Math.floor((new Date(serverEndsAt).getTime() - Date.now()) / 1000)))
    sync()
    const timer = setInterval(sync, 1000)
    return () => clearInterval(timer)
  }, [serverEndsAt])

  // Poll the session every 10s: keeps the clock honest and picks up an invigilator ending the exam even
  // where the realtime socket is unavailable (for example on Vercel).
  useEffect(() => {
    if (!sessionId) return
    const sync = async () => {
      const response = await fetch(`/api/exams/session/${sessionId}/answers`).catch(() => null)
      if (!response?.ok) return
      const data = await response.json()
      setServerEndsAt(data.serverEndsAt)
      if (data.status === "BLOCKED") setBlocked(true)
      else if (data.status !== "IN_PROGRESS") void submitRef.current()
    }
    const interval = setInterval(sync, 10000)
    return () => clearInterval(interval)
  }, [sessionId])

  // ---- submit ----------------------------------------------------------------
  async function submitExam() {
    if (!sessionId || submitting.current) return
    submitting.current = true
    setSubmitError("")
    try {
      const response = await fetch(`/api/exams/session/${sessionId}/submit`, { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? "Unable to submit exam")
      const attempted = Object.values(answers).filter((answer) => answer.selectedOption || answer.descriptiveText).length
      setExamResults({ attempted, skipped: questions.length - attempted, unattempted: questions.length - attempted, totalQuestions: questions.length, answers, score: data.score, status: data.status })
      setFinished(true)
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined)
      onFinishExam()
    } catch (failure) {
      // Never strand the student on a dead screen: show the problem and try again shortly.
      submitting.current = false
      setSubmitError(`${failure instanceof Error ? failure.message : "Unable to submit exam"}. Your answers are saved.${timeLeft === 0 ? " Retrying..." : " Please press Submit again."}`)
      setTimeout(() => setSubmitRetry((count) => count + 1), 5000)
    }
  }

  async function handleSessionEnded() {
    if (!sessionId || submitting.current) return
    const response = await fetch(`/api/exams/session/${sessionId}/answers`).catch(() => null)
    if (!response?.ok) return
    const data = await response.json()
    if (data.status === "BLOCKED") setBlocked(true)
    else if (data.status !== "IN_PROGRESS" || new Date(data.serverEndsAt) <= new Date()) void submitExam()
  }
  submitRef.current = submitExam
  sessionEndedRef.current = handleSessionEnded

  useEffect(() => {
    if (timeLeft !== 0 || !sessionId || !serverEndsAt || submitting.current) return
    void submitExam()
  }, [timeLeft, sessionId, serverEndsAt, submitRetry])

  // ---- lockdown ----------------------------------------------------------------
  const lockdown = useExamLockdown({ sessionId, active: started && Boolean(sessionId) && !finished && !blocked, onAutoSubmitted: () => void submitExam() })

  // ---- actions ------------------------------------------------------------------
  const goTo = (index: number) => setCurrentIndex(Math.min(questions.length - 1, Math.max(0, index)))

  function selectOption(optionId: string) {
    updateAnswer(currentQuestion.id, { selectedOption: optionId })
    persist(currentQuestion.id, { selectedOption: optionId })
  }
  function clearResponse() {
    updateAnswer(currentQuestion.id, { selectedOption: null, descriptiveText: null })
    persist(currentQuestion.id, { selectedOption: null, descriptiveText: null })
  }
  function saveAndNext() {
    if (answers[currentQuestion.id]?.markedForReview) {
      updateAnswer(currentQuestion.id, { markedForReview: false })
      persist(currentQuestion.id, { markedForReview: false })
    }
    goTo(currentIndex + 1)
  }
  function markForReviewAndNext() {
    updateAnswer(currentQuestion.id, { markedForReview: true })
    persist(currentQuestion.id, { markedForReview: true })
    goTo(currentIndex + 1)
  }

  // ---- screens -------------------------------------------------------------------
  if (blocked)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
        <div className="max-w-lg rounded-lg bg-white p-10 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-red-700">Your session has been ended by the invigilator</h1>
          <p className="mt-3 text-gray-600">This exam is no longer accepting answers.</p>
        </div>
      </div>
    )

  if (!started)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow-md">
          <h1 className="text-2xl font-bold">{exam?.title}</h1>
          <p className="mt-2 text-gray-600">The exam runs in fullscreen. Your timer starts when you press the button below.</p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Do not leave fullscreen or switch tabs or windows. Each attempt is recorded as a violation.</li>
            <li>Copy, cut, paste and right-click are disabled.</li>
            <li>After the allowed number of violations the exam is submitted automatically.</li>
            <li>Keep your face visible to the camera and stay alone in the room.</li>
          </ul>
          <button
            onClick={async () => {
              await lockdown.enterFullscreen()
              setStarted(true)
            }}
            className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
          >
            Enter fullscreen and begin exam
          </button>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <p className="text-red-700">{error}</p>
          {onExit && <button onClick={onExit} className="mt-4 rounded bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800">Back to exam list</button>}
        </div>
      </div>
    )

  if (!currentQuestion || !currentSection) return <div className="flex min-h-screen items-center justify-center bg-gray-50">Loading exam...</div>

  const answer = answers[currentQuestion.id]
  const sectionCounts = countStatuses(currentSection.indexes)
  const positionInSection = currentSection.indexes.indexOf(currentIndex) + 1
  const legend: Array<{ status: Status; label: string; count: number }> = [
    { status: "answered", label: "Answered", count: sectionCounts.answered },
    { status: "notAnswered", label: "Not Answered", count: sectionCounts.notAnswered },
    { status: "notVisited", label: "Not Visited", count: sectionCounts.notVisited },
    { status: "marked", label: "Marked for Review", count: sectionCounts.marked },
    { status: "answeredMarked", label: "Answered & Marked for Review (counted in evaluation)", count: sectionCounts.answeredMarked },
  ]

  return (
    <div className="flex h-screen select-none flex-col bg-gray-100">
      {candidate && <ExamWatermark label={`${candidate.fullName} · ${candidate.email} · ${sessionId.slice(-6).toUpperCase()}`} />}
      <ProctorEngine sessionId={sessionId} retryKey={cameraRetry} onCameraStatus={setCameraOk} />

      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">{exam?.title}</h1>
        <div className="flex items-center gap-4 text-sm">
          {lockdown.maxViolations !== null && (
            <span className={`rounded px-2 py-1 font-medium ${lockdown.violations > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
              Violations: {lockdown.violations}/{lockdown.maxViolations}
            </span>
          )}
          <span className="text-gray-600">Candidate: <b>{user?.username}</b></span>
          <span className={`rounded px-3 py-1.5 font-semibold text-white ${timeLeft < 300 ? "bg-red-600" : "bg-blue-700"}`}>Time Left: {formatTime(timeLeft)}</span>
        </div>
      </header>

      {lockdown.warning && (
        <div className="flex items-center justify-between bg-amber-100 px-4 py-2 text-sm text-amber-900">
          <span>
            <b>Warning:</b> {lockdown.warning}
            {lockdown.maxViolations !== null && ` (${lockdown.violations} of ${lockdown.maxViolations} allowed violations used. The exam will be submitted automatically at ${lockdown.maxViolations}.)`}
          </span>
          <button onClick={lockdown.dismissWarning} className="font-medium underline">Dismiss</button>
        </div>
      )}
      {submitError && <div className="bg-red-100 px-4 py-2 text-sm text-red-800">{submitError}</div>}
      {saveWarning && <div className="bg-red-100 px-4 py-2 text-sm text-red-800">Your last change could not be saved. Check your internet connection; it will be retried when you make the next change.</div>}

      {/* Section tabs */}
      <nav className="flex gap-2 border-b bg-white px-4 py-2">
        {sections.map((section) => {
          const counts = countStatuses(section.indexes)
          const active = section.id === currentSection.id
          return (
            <button key={section.id} onClick={() => goTo(section.indexes[0])} className={`rounded px-4 py-1.5 text-sm font-medium ${active ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-blue-100"}`}>
              {section.name} <span className="ml-1 text-xs opacity-80">({counts.answered + counts.answeredMarked}/{section.indexes.length})</span>
            </button>
          )
        })}
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b bg-white px-6 py-2">
            <h2 className="font-semibold text-gray-800">Question {positionInSection}</h2>
            <span className="text-sm text-gray-600">Marks: <b className="text-green-700">+{currentQuestion.marks}</b> <b className="text-red-600">-{currentQuestion.negativeMarks}</b></span>
          </div>
          <div className="flex-1 overflow-y-auto bg-white p-6">
            <p className="mb-6 whitespace-pre-wrap text-lg text-gray-900">{currentQuestion.text}</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const selected = answer?.selectedOption === option.id
                return (
                  <label key={option.id} className={`flex cursor-pointer items-center rounded-md border p-3 ${selected ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-300"}`}>
                    <input type="radio" name={currentQuestion.id} checked={selected} onChange={() => selectOption(option.id)} />
                    <span className="ml-3 mr-2 font-semibold text-gray-500">{optionIndex + 1}.</span>
                    <span>{option.text}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-gray-50 px-6 py-3">
            <div className="flex gap-2">
              <button onClick={markForReviewAndNext} className="rounded border border-purple-600 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50">Mark for Review &amp; Next</button>
              <button onClick={clearResponse} className="rounded border border-gray-400 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Clear Response</button>
            </div>
            <button onClick={saveAndNext} className="rounded bg-blue-700 px-6 py-2 text-sm font-medium text-white hover:bg-blue-800">Save &amp; Next</button>
          </div>
          <div className="flex items-center justify-between border-t bg-white px-6 py-3">
            <div className="flex gap-2">
              <button disabled={currentIndex === 0} onClick={() => goTo(currentIndex - 1)} className="rounded bg-gray-200 px-4 py-2 text-sm disabled:opacity-50">&lt;&lt; Back</button>
              <button disabled={currentIndex === questions.length - 1} onClick={() => goTo(currentIndex + 1)} className="rounded bg-gray-200 px-4 py-2 text-sm disabled:opacity-50">Next &gt;&gt;</button>
            </div>
            <button onClick={() => setConfirmingSubmit(true)} className="rounded bg-green-600 px-8 py-2 text-sm font-semibold text-white hover:bg-green-700">Submit</button>
          </div>
        </main>

        {/* Question palette */}
        <aside className="flex w-80 flex-col overflow-y-auto border-l bg-blue-50 p-4">
          <div className="mb-3 space-y-2 rounded bg-white p-3 text-xs text-gray-700 shadow-sm">
            {legend.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <Swatch status={item.status} />
                <span className="flex-1">{item.label}</span>
                <b>{item.count}</b>
              </div>
            ))}
          </div>
          <h3 className="mb-2 rounded bg-blue-700 px-3 py-1.5 text-sm font-semibold text-white">{currentSection.name}</h3>
          <p className="mb-2 text-xs text-gray-600">Choose a question</p>
          <div className="grid grid-cols-5 gap-2">
            {currentSection.indexes.map((questionIndex, position) => {
              const status = statusOf(answers[questions[questionIndex].id])
              return (
                <button key={questions[questionIndex].id} onClick={() => goTo(questionIndex)} className={`relative flex h-9 items-center justify-center text-sm font-semibold ${paletteStyle[status]} ${questionIndex === currentIndex ? "ring-2 ring-blue-600 ring-offset-1" : ""}`}>
                  {position + 1}
                  {status === "answeredMarked" && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-green-400" />}
                </button>
              )
            })}
          </div>
        </aside>
      </div>

      {/* Submit confirmation */}
      {confirmingSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-xl font-bold">Exam Summary</h2>
            <p className="mb-4 text-sm text-gray-600">Check your attempt before you submit. You cannot return to the exam afterwards.</p>
            <table className="mb-4 w-full text-center text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="p-2 text-left">Section</th><th className="p-2">Questions</th><th className="p-2">Answered</th><th className="p-2">Not Answered</th><th className="p-2">Marked for Review</th><th className="p-2">Not Visited</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => {
                  const counts = countStatuses(section.indexes)
                  return (
                    <tr key={section.id} className="border-b">
                      <td className="p-2 text-left font-medium">{section.name}</td><td className="p-2">{section.indexes.length}</td><td className="p-2">{counts.answered + counts.answeredMarked}</td><td className="p-2">{counts.notAnswered + counts.marked}</td><td className="p-2">{counts.marked + counts.answeredMarked}</td><td className="p-2">{counts.notVisited}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="mb-4 text-sm text-gray-700">Time left: <b>{formatTime(timeLeft)}</b>. Are you sure you want to submit?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmingSubmit(false)} className="rounded border px-5 py-2 text-sm">No, go back</button>
              <button onClick={() => void submitExam()} className="rounded bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">Yes, submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera gate: the exam cannot continue unproctored */}
      {!cameraOk && !finished && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-gray-950/95 p-6">
          <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
            <h2 className="text-xl font-bold text-red-700">Camera required</h2>
            <p className="mt-2 text-gray-700">Your camera or microphone is not available. This was reported to the invigilator. Allow access in your browser, then try again. The timer is still running.</p>
            <button onClick={() => setCameraRetry((count) => count + 1)} className="mt-5 rounded bg-blue-700 px-6 py-2 font-medium text-white hover:bg-blue-800">Try again</button>
          </div>
        </div>
      )}

      {/* Fullscreen gate */}
      {!lockdown.isFullscreen && !finished && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/95 p-6">
          <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
            <h2 className="text-xl font-bold text-red-700">Fullscreen required</h2>
            <p className="mt-2 text-gray-700">You left fullscreen mode. This was recorded as a violation. Return to fullscreen to continue; the timer is still running.</p>
            <button onClick={() => void lockdown.enterFullscreen()} className="mt-5 rounded bg-blue-700 px-6 py-2 font-medium text-white hover:bg-blue-800">Return to fullscreen</button>
          </div>
        </div>
      )}
    </div>
  )
}
