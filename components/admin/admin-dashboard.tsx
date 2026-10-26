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
import AdminAiFlags from "./admin-ai-flags"
import AdminSettings from "./admin-settings"
import AdminHome from "./admin-home"
import AdminAudit from "./admin-audit"
import AdminAppeals from "./admin-appeals"

interface AdminDashboardProps {
  onLogout: () => void
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const { data: session } = useSession()

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminHome onNavigate={setActiveTab} adminName={session?.user?.name ?? undefined} />
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
      case "aiflags":
        return <AdminAiFlags />
      case "collusion":
        return <AdminCollusion />
      case "reports":
        return <AdminReports />
      case "appeals":
        return <AdminAppeals />
      case "audit":
        return <AdminAudit />
      case "settings":
        return <AdminSettings />
      default:
        return <AdminHome onNavigate={setActiveTab} adminName={session?.user?.name ?? undefined} />
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
              onClick={() => setActiveTab("aiflags")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "aiflags" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <ClipboardCheck className="w-5 h-5 mr-3" />
              AI Flag Dashboard
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
              onClick={() => setActiveTab("appeals")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "appeals" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <ClipboardCheck className="w-5 h-5 mr-3" />
              Appeals
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === "audit" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Shield className="w-5 h-5 mr-3" />
              Audit Log
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
