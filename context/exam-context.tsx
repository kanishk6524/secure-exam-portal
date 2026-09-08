"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Exam {
  id: string
  name: string
  description: string
}

interface ExamResults {
  attempted: number
  skipped: number
  unattempted: number
  totalQuestions: number
  answers: Record<number, any>
}

interface ExamContextType {
  exam: Exam | null
  examResults: ExamResults | null
  setExam: (exam: Exam) => void
  setExamResults: (results: ExamResults) => void
}

const ExamContext = createContext<ExamContextType | undefined>(undefined)

export function ExamProvider({ children }: { children: ReactNode }) {
  const [exam, setExam] = useState<Exam | null>(null)
  const [examResults, setExamResults] = useState<ExamResults | null>(null)

  return <ExamContext.Provider value={{ exam, examResults, setExam, setExamResults }}>{children}</ExamContext.Provider>
}

export function useExam() {
  const context = useContext(ExamContext)
  if (context === undefined) {
    throw new Error("useExam must be used within an ExamProvider")
  }
  return context
}

