"use client"

import { useEffect, useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { ClipboardCheck, Users, BookOpen, FileText, BarChart3, Settings, LogOut, Home, AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react"
import AdminStudents from "./admin-students"
import AdminExams from "./admin-exams"
import AdminQuestions from "./admin-questions"
import AdminReports from "./admin-reports"
import AdminMonitoring from "./admin-monitoring"
import AdminReview from "./admin-review"
import AdminCollusion from "./admin-collusion"
import AdminSettings from "./admin-settings"

interface AdminDashboardProps {
  onLogout: () => void
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const { data: session } = useSession()

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent />
      case "students":
        return <AdminStudents />
      case "exams":
        return <AdminExams />
      case "questions":
        return <AdminQuestions />
      case "monitoring":
        return <AdminMonitoring />
      case "review":
        return <AdminReview />
      case "collusion":
        return <AdminCollusion />
      case "reports":
        return <AdminReports />
      case "settings":
        return <AdminSettings />
      default:
        return <DashboardContent />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="flex items-center justify-center h-16 border-b">
          <h1 className="text-xl font-bold text-blue-600">Admin Portal</h1>
        </div>
        <div className="p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "dashboard" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "students" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Students
            </button>
            <button
              onClick={() => setActiveTab("exams")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "exams" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <BookOpen className="w-5 h-5 mr-3" />
              Exams
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "questions" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <FileText className="w-5 h-5 mr-3" />
              Questions
            </button>
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "monitoring" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Shield className="w-5 h-5 mr-3" />
              Monitoring
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "review" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <ClipboardCheck className="w-5 h-5 mr-3" />
              Incident Review
            </button>
            <button
              onClick={() => setActiveTab("collusion")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "collusion" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <ClipboardCheck className="w-5 h-5 mr-3" />
              Collusion Analysis
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "reports" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Reports
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "settings" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </button>
            <button
              onClick={() => void signOut({ redirect: false }).then(onLogout)}
              className="flex items-center w-full px-4 py-2 mt-6 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="flex h-16 items-center justify-end border-b bg-white px-6">
          <span className="text-sm font-medium text-gray-700">{session?.user?.name ?? session?.user?.email ?? "Admin"}</span>
        </header>

        {/* Page content */}
        <main className="p-6">{renderContent()}</main>
      </div>
    </div>
  )
}

type DashboardData = {
  stats: { students: number; exams: number; upcomingExams: number; activeSessions: number; completedSessions: number; incidents24h: number }
  recentSessions: Array<{ id: string; student: string; email: string; exam: string; status: string; score: number | null; startedAt: string; incidents: number }>
  recentExams: Array<{ id: string; title: string; status: string; startTime: string; endTime: string; attempts: number }>
}

const statusStyle: Record<string, string> = {
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-green-100 text-green-800",
  AUTO_SUBMITTED: "bg-yellow-100 text-yellow-800",
  BLOCKED: "bg-red-100 text-red-800",
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (response) => ({ ok: response.ok, body: await response.json() }))
      .then(({ ok, body }) => (ok ? setData(body) : setError(body.error ?? "Unable to load dashboard")))
      .catch(() => setError("Unable to load dashboard"))
  }, [])

  if (error) return <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p>
  if (!data) return <p className="text-sm text-gray-500">Loading dashboard...</p>

  const cards = [
    { name: "Students", value: data.stats.students, icon: Users, color: "bg-blue-500" },
    { name: "Exams", value: data.stats.exams, icon: BookOpen, color: "bg-green-500" },
    { name: "Upcoming / open exams", value: data.stats.upcomingExams, icon: Clock, color: "bg-yellow-500" },
    { name: "Attempts in progress", value: data.stats.activeSessions, icon: Shield, color: "bg-indigo-500" },
    { name: "Attempts finished", value: data.stats.completedSessions, icon: CheckCircle, color: "bg-purple-500" },
    { name: "Incidents (24h)", value: data.stats.incidents24h, icon: AlertTriangle, color: "bg-red-500" },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Dashboard</h1>
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className={`rounded-full p-3 ${card.color}`}><card.icon className="h-6 w-6 text-white" /></div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{card.name}</h3>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Recent exams</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500"><th className="py-2 font-medium">Exam</th><th className="py-2 font-medium">Opens</th><th className="py-2 font-medium">Attempts</th><th className="py-2 font-medium">Status</th></tr></thead>
            <tbody className="divide-y">
              {data.recentExams.map((exam) => (
                <tr key={exam.id}><td className="py-2">{exam.title}</td><td className="py-2">{new Date(exam.startTime).toLocaleDateString()}</td><td className="py-2">{exam.attempts}</td><td className="py-2">{exam.status}</td></tr>
              ))}
            </tbody>
          </table>
          {data.recentExams.length === 0 && <p className="py-4 text-sm text-gray-500">No exams yet.</p>}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Recent attempts</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500"><th className="py-2 font-medium">Student</th><th className="py-2 font-medium">Exam</th><th className="py-2 font-medium">Score</th><th className="py-2 font-medium">Incidents</th><th className="py-2 font-medium">Status</th></tr></thead>
            <tbody className="divide-y">
              {data.recentSessions.map((attempt) => (
                <tr key={attempt.id}>
                  <td className="py-2">{attempt.student}</td><td className="py-2">{attempt.exam}</td><td className="py-2">{attempt.score ?? "-"}</td><td className="py-2">{attempt.incidents}</td>
                  <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[attempt.status] ?? "bg-gray-100 text-gray-800"}`}>{attempt.status.replace("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recentSessions.length === 0 && <p className="py-4 text-sm text-gray-500">No attempts yet.</p>}
        </div>
      </div>
    </div>
  )
}
