"use client"

import { useState } from "react"
import {
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Home,
  PlusCircle,
  Download,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
} from "lucide-react"
import AdminStudents from "./admin-students"
import AdminExams from "./admin-exams"
import AdminQuestions from "./admin-questions"
import AdminReports from "./admin-reports"
import AdminMonitoring from "./admin-monitoring"
import AdminSettings from "./admin-settings"

interface AdminDashboardProps {
  onLogout: () => void
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard")

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
              onClick={onLogout}
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
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
          <div className="flex items-center">
            <div className="relative">
              <Search className="absolute top-0 left-0 w-5 h-5 ml-3 text-gray-400 pointer-events-none transform translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-1 text-gray-400 rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span className="sr-only">View notifications</span>
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center">
              <img className="w-8 h-8 rounded-full" src="/placeholder.svg?height=32&width=32" alt="Admin" />
              <span className="ml-2 text-sm font-medium text-gray-700">Admin User</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{renderContent()}</main>
      </div>
    </div>
  )
}

function DashboardContent() {
  // Sample data for the dashboard
  const stats = [
    { name: "Total Students", value: "2,543", icon: Users, color: "bg-blue-500" },
    { name: "Active Exams", value: "12", icon: BookOpen, color: "bg-green-500" },
    { name: "Completed Exams", value: "87", icon: CheckCircle, color: "bg-purple-500" },
    { name: "Upcoming Exams", value: "5", icon: Clock, color: "bg-yellow-500" },
  ]

  const recentExams = [
    { id: 1, name: "JEE Mains", date: "2023-05-15", students: 543, status: "Completed" },
    { id: 2, name: "VITEEE", date: "2023-05-20", students: 412, status: "Active" },
    { id: 3, name: "BITSAT", date: "2023-05-25", students: 328, status: "Upcoming" },
    { id: 4, name: "MIT Entrance", date: "2023-05-10", students: 256, status: "Completed" },
    { id: 5, name: "NEET", date: "2023-06-01", students: 621, status: "Upcoming" },
  ]

  const alerts = [
    { id: 1, message: "Suspicious activity detected in JEE Mains exam", type: "warning" },
    { id: 2, message: "Server load high during peak hours", type: "warning" },
    { id: 3, message: "New student registrations require approval", type: "info" },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <PlusCircle className="inline w-4 h-4 mr-1" />
            New Exam
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Download className="inline w-4 h-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center">
              <div className={`p-3 ${stat.color} rounded-full`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{stat.name}</h3>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Exams */}
        <div className="lg:col-span-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Exams</h2>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                View all
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="px-4 py-2 font-medium">Exam Name</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Students</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentExams.map((exam) => (
                    <tr key={exam.id}>
                      <td className="px-4 py-3">{exam.name}</td>
                      <td className="px-4 py-3">{exam.date}</td>
                      <td className="px-4 py-3">{exam.students}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            exam.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : exam.status === "Active"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {exam.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button className="p-1 text-gray-500 rounded hover:bg-gray-100">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-500 rounded hover:bg-gray-100">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div>
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Alerts</h2>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                View all
              </a>
            </div>
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-md ${alert.type === "warning" ? "bg-yellow-50" : "bg-blue-50"}`}
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {alert.type === "warning" ? (
                        <AlertTriangle className={`w-5 h-5 text-yellow-400`} />
                      ) : (
                        <Bell className={`w-5 h-5 text-blue-400`} />
                      )}
                    </div>
                    <div className="ml-3">
                      <p
                        className={`text-sm font-medium ${
                          alert.type === "warning" ? "text-yellow-800" : "text-blue-800"
                        }`}
                      >
                        {alert.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 mt-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Quick Actions</h2>
            <div className="space-y-2">
              <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-left text-gray-700 rounded-md hover:bg-gray-100">
                <PlusCircle className="w-5 h-5 mr-3 text-blue-500" />
                Create New Exam
              </button>
              <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-left text-gray-700 rounded-md hover:bg-gray-100">
                <Users className="w-5 h-5 mr-3 text-green-500" />
                Add New Students
              </button>
              <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-left text-gray-700 rounded-md hover:bg-gray-100">
                <FileText className="w-5 h-5 mr-3 text-purple-500" />
                Upload Question Bank
              </button>
              <button className="flex items-center w-full px-4 py-2 text-sm font-medium text-left text-gray-700 rounded-md hover:bg-gray-100">
                <BarChart3 className="w-5 h-5 mr-3 text-yellow-500" />
                Generate Reports
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

