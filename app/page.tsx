"use client"

import { useState } from "react"
import AdminLogin from "@/components/admin-login"
import StudentLogin from "@/components/student-login"
import ExamSelection from "@/components/exam-selection"
import ExamInstructions from "@/components/exam-instructions"
import ExamInterface from "@/components/exam-interface"
import CameraCheck from "@/components/proctor/camera-check"
import FinalSubmission from "@/components/final-submission"
import AdminDashboard from "@/components/admin/admin-dashboard"
import { AuthProvider } from "@/context/auth-context"
import { ExamProvider } from "@/context/exam-context"

export default function Home() {
  const [currentPage, setCurrentPage] = useState("home")
  const [userType, setUserType] = useState("")
  const [startInRegister, setStartInRegister] = useState(false)

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
        return <AdminLogin startInRegister={startInRegister} onLoginSuccess={() => setCurrentPage("adminDashboard")} />
      case "studentLogin":
        return <StudentLogin startInRegister={startInRegister} onLoginSuccess={() => setCurrentPage("examSelection")} />
      case "examSelection":
        return <ExamSelection onSelectExam={() => setCurrentPage("examInstructions")} />
      case "examInstructions":
        return <ExamInstructions onStartExam={() => setCurrentPage("cameraCheck")} />
      case "cameraCheck":
        return <CameraCheck onReady={() => setCurrentPage("examInterface")} />
      case "examInterface":
        return <ExamInterface onFinishExam={() => setCurrentPage("finalSubmission")} />
      case "finalSubmission":
        return <FinalSubmission onGoHome={() => setCurrentPage("home")} />
      case "adminDashboard":
        return <AdminDashboard onLogout={() => setCurrentPage("home")} />
      default:
        return <div>Page not found</div>
    }
  }

  return (
    <AuthProvider>
      <ExamProvider>{renderPage()}</ExamProvider>
    </AuthProvider>
  )
}

