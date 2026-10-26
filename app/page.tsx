"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import AdminLogin from "@/components/admin-login"
import StudentLogin from "@/components/student-login"
import ExamSelection from "@/components/exam-selection"
import ExamInstructions from "@/components/exam-instructions"
import ExamInterface from "@/components/exam-interface"
import CameraCheck from "@/components/proctor/camera-check"
import GazeCalibration from "@/components/proctor/gaze-calibration"
import FinalSubmission from "@/components/final-submission"
import AdminDashboard from "@/components/admin/admin-dashboard"
import { AuthProvider } from "@/context/auth-context"
import { ExamProvider } from "@/context/exam-context"

const PAGE_KEY = "exam-portal:page"
const EXAM_KEY = "exam-portal:exam"
const SIGNED_IN_PAGES = new Set(["examSelection", "examInstructions", "cameraCheck", "gazeCalibration", "examInterface", "finalSubmission", "adminDashboard"])
const NEEDS_EXAM = new Set(["examInstructions", "cameraCheck", "gazeCalibration", "examInterface", "finalSubmission"])

export default function Home() {
  const { status } = useSession()
  const [currentPage, setCurrentPage] = useState("home")
  const [restored, setRestored] = useState(false)
  const [userType, setUserType] = useState("")
  const [startInRegister, setStartInRegister] = useState(false)

  // Refreshing the browser mid-exam used to dump the student on the home screen. Restore the last screen instead.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(PAGE_KEY)
      if (saved && SIGNED_IN_PAGES.has(saved)) {
        const hasExam = Boolean(window.sessionStorage.getItem(EXAM_KEY))
        setCurrentPage(NEEDS_EXAM.has(saved) && !hasExam ? "examSelection" : saved)
      }
    } catch {
      /* sessionStorage unavailable: start from home */
    }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (!restored) return
    try {
      window.sessionStorage.setItem(PAGE_KEY, currentPage)
    } catch {
      /* ignore */
    }
  }, [currentPage, restored])

  // A restored screen that needs a login must not be shown after the session has ended.
  useEffect(() => {
    if (status === "unauthenticated" && SIGNED_IN_PAGES.has(currentPage)) setCurrentPage("home")
  }, [status, currentPage])

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
              <div className="space-y-1 text-center">
                <h1 className="text-3xl font-bold text-gray-800">Online Exam Portal</h1>
                <p className="text-sm text-gray-500">New here? Register first, then sign in.</p>
              </div>

              <div className="space-y-3 rounded-md border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700">Student</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setUserType("student")
                      setStartInRegister(true)
                      setCurrentPage("studentLogin")
                    }}
                    className="flex-1 px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Register
                  </button>
                  <button
                    onClick={() => {
                      setUserType("student")
                      setStartInRegister(false)
                      setCurrentPage("studentLogin")
                    }}
                    className="flex-1 px-4 py-2 text-green-700 bg-white border border-green-600 rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Login
                  </button>
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700">Admin</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setUserType("admin")
                      setStartInRegister(true)
                      setCurrentPage("adminLogin")
                    }}
                    className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Register
                  </button>
                  <button
                    onClick={() => {
                      setUserType("admin")
                      setStartInRegister(false)
                      setCurrentPage("adminLogin")
                    }}
                    className="flex-1 px-4 py-2 text-blue-700 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      case "adminLogin":
        return <AdminLogin onHome={() => setCurrentPage("home")} startInRegister={startInRegister} onLoginSuccess={() => setCurrentPage("adminDashboard")} />
      case "studentLogin":
        return <StudentLogin onHome={() => setCurrentPage("home")} startInRegister={startInRegister} onLoginSuccess={() => setCurrentPage("examSelection")} />
      case "examSelection":
        return <ExamSelection onSelectExam={() => setCurrentPage("examInstructions")} onSignOut={() => setCurrentPage("home")} />
      case "examInstructions":
        return <ExamInstructions onStartExam={() => setCurrentPage("cameraCheck")} />
      case "cameraCheck":
        return <CameraCheck onReady={() => setCurrentPage("gazeCalibration")} />
      case "gazeCalibration":
        return <GazeCalibration onDone={() => setCurrentPage("examInterface")} />
      case "examInterface":
        return <ExamInterface onFinishExam={() => setCurrentPage("finalSubmission")} onExit={() => setCurrentPage("examSelection")} />
      case "finalSubmission":
        return <FinalSubmission onGoHome={() => setCurrentPage("home")} />
      case "adminDashboard":
        return <AdminDashboard onLogout={() => setCurrentPage("home")} />
      default:
        return <div>Page not found</div>
    }
  }

  if (!restored) return <div className="min-h-screen bg-gray-50" />

  return (
    <AuthProvider>
      <ExamProvider>{renderPage()}</ExamProvider>
    </AuthProvider>
  )
}

