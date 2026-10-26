"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

interface Exam {
  id: string
  title: string
  description?: string | null
  durationMins?: number
  subjects?: Array<{ name: string; questions: number }>
  totalQuestions?: number
  marking?: Array<{ marks: number; negative: number; count: number }>
}

interface ExamResults {
  sessionId?: string
  attempted: number
  skipped: number
  unattempted: number
  totalQuestions: number
  answers: Record<number, any>
  score?: number | null
  status?: string
  reason?: "MANUAL" | "TIME_UP" | "VIOLATION_LIMIT" | "INVIGILATOR"
  secondsUsed?: number
  breakdown?: Record<string, number>
  lockdownCount?: number
  maxViolations?: number
}

interface ExamContextType {
  exam: Exam | null
  examResults: ExamResults | null
  setExam: (exam: Exam) => void
  setExamResults: (results: ExamResults) => void
  /** Forget the selected exam and results (used when signing out). */
  clearExam: () => void
}

const EXAM_KEY = "exam-portal:exam"
const RESULTS_KEY = "exam-portal:results"

// The selection and results live in sessionStorage so a page refresh does not lose them.
function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeStored(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage can be unavailable (private mode); the app still works without it */
  }
}

const ExamContext = createContext<ExamContextType | undefined>(undefined)

export function ExamProvider({ children }: { children: ReactNode }) {
  const [exam, setExamState] = useState<Exam | null>(() => readStored<Exam>(EXAM_KEY))
  const [examResults, setResultsState] = useState<ExamResults | null>(() => readStored<ExamResults>(RESULTS_KEY))

  const setExam = useCallback((value: Exam) => {
    setExamState(value)
    writeStored(EXAM_KEY, value)
  }, [])
  const setExamResults = useCallback((value: ExamResults) => {
    setResultsState(value)
    writeStored(RESULTS_KEY, value)
  }, [])
  const clearExam = useCallback(() => {
    setExamState(null)
    setResultsState(null)
    writeStored(EXAM_KEY, null)
    writeStored(RESULTS_KEY, null)
  }, [])

  return <ExamContext.Provider value={{ exam, examResults, setExam, setExamResults, clearExam }}>{children}</ExamContext.Provider>
}

export function useExam() {
  const context = useContext(ExamContext)
  if (context === undefined) {
    throw new Error("useExam must be used within an ExamProvider")
  }
  return context
}
