"use client"

import { useState } from "react"
import { AlertTriangle, Eye, Ban, RefreshCw, Clock, Users, Camera } from "lucide-react"

export default function AdminMonitoring() {
  const [activeExams, setActiveExams] = useState([
    {
      id: 1,
      name: "VITEEE",
      startTime: "09:30 AM",
      duration: "2.5 hours",
      activeStudents: 412,
      suspiciousActivities: 3,
      status: "In Progress",
    },
    {
      id: 2,
      name: "JEE Mains (Session 2)",
      startTime: "10:00 AM",
      duration: "3 hours",
      activeStudents: 287,
      suspiciousActivities: 1,
      status: "In Progress",
    },
  ])

  const [suspiciousActivities, setSuspiciousActivities] = useState([
    {
      id: 1,
      studentName: "John Doe",
      studentId: "STU045",
      exam: "VITEEE",
      activity: "Multiple tab switching detected",
      time: "09:45 AM",
      severity: "Medium",
      status: "Pending",
    },
    {
      id: 2,
      studentName: "Sarah Wilson",
      studentId: "STU089",
      exam: "VITEEE",
      activity: "Remote access software detected (AnyDesk)",
      time: "09:52 AM",
      severity: "High",
      status: "Pending",
    },
    {
      id: 3,
      studentName: "Michael Brown",
      studentId: "STU112",
      exam: "VITEEE",
      activity: "Multiple faces detected in camera",
      time: "10:05 AM",
      severity: "High",
      status: "Pending",
    },
    {
      id: 4,
      studentName: "Emily Davis",
      studentId: "STU076",
      exam: "JEE Mains (Session 2)",
      activity: "No face detected for >30 seconds",
      time: "10:15 AM",
      severity: "Medium",
      status: "Pending",
    },
  ])

  const handleBlockStudent = (id: number) => {
    setSuspiciousActivities((prev) =>
      prev.map((activity) => (activity.id === id ? { ...activity, status: "Blocked" } : activity)),
    )
  }

  const handleIgnore = (id: number) => {
    setSuspiciousActivities((prev) =>
      prev.map((activity) => (activity.id === id ? { ...activity, status: "Ignored" } : activity)),
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Exam Monitoring</h1>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <RefreshCw className="inline w-4 h-4 mr-1" />
          Refresh Data
        </button>
      </div>

      {/* Active Exams */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Active Exams</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {activeExams.map((exam) => (
            <div key={exam.id} className="p-6 bg-white rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{exam.name}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {exam.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Start Time</p>
                    <p className="text-sm font-medium">{exam.startTime}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm font-medium">{exam.duration}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Active Students</p>
                    <p className="text-sm font-medium">{exam.activeStudents}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                  <div>
                    <p className="text-xs text-gray-500">Suspicious Activities</p>
                    <p className="text-sm font-medium">{exam.suspiciousActivities}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                <button className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200">
                  <Eye className="inline w-4 h-4 mr-1" />
                  Monitor
                </button>
                <button className="px-3 py-1 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200">
                  <Ban className="inline w-4 h-4 mr-1" />
                  End Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suspicious Activities */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Suspicious Activities</h2>
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Student
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Exam
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Activity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Severity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suspiciousActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8">
                          <img
                            className="w-8 h-8 rounded-full"
                            src={`/placeholder.svg?height=32&width=32&text=${activity.studentName.charAt(0)}`}
                            alt=""
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{activity.studentName}</div>
                          <div className="text-sm text-gray-500">{activity.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{activity.exam}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{activity.activity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{activity.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                          activity.severity === "High"
                            ? "bg-red-100 text-red-800"
                            : activity.severity === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {activity.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                          activity.status === "Pending"
                            ? "bg-blue-100 text-blue-800"
                            : activity.status === "Blocked"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                      {activity.status === "Pending" && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleBlockStudent(activity.id)}
                            className="p-1 text-red-600 rounded hover:bg-red-100"
                            title="Block Student"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-blue-600 rounded hover:bg-blue-100" title="View Camera">
                            <Camera className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleIgnore(activity.id)}
                            className="p-1 text-gray-600 rounded hover:bg-gray-100"
                            title="Ignore"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Proctoring Settings */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Proctoring Settings</h2>
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-4 text-md font-medium text-gray-900">Detection Settings</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="face-detection"
                      name="face-detection"
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="face-detection" className="font-medium text-gray-700">
                      Face Detection
                    </label>
                    <p className="text-gray-500">Detect if student is present in front of camera</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="multiple-faces"
                      name="multiple-faces"
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="multiple-faces" className="font-medium text-gray-700">
                      Multiple Face Detection
                    </label>
                    <p className="text-gray-500">Detect if multiple people are present</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="tab-switching"
                      name="tab-switching"
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="tab-switching" className="font-medium text-gray-700">
                      Tab Switching Detection
                    </label>
                    <p className="text-gray-500">Detect if student switches browser tabs</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="remote-access"
                      name="remote-access"
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="remote-access" className="font-medium text-gray-700">
                      Remote Access Detection
                    </label>
                    <p className="text-gray-500">Detect remote access software (AnyDesk, TeamViewer, etc.)</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="mb-4 text-md font-medium text-gray-900">Automated Actions</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="auto-warning"
                      name="auto-warning"
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="auto-warning" className="font-medium text-gray-700">
                      Automatic Warnings
                    </label>
                    <p className="text-gray-500">Send warnings to students for suspicious activities</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="auto-block"
                      name="auto-block"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="auto-block" className="font-medium text-gray-700">
                      Automatic Blocking
                    </label>
                    <p className="text-gray-500">Automatically block students after multiple violations</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="screenshot"
                      name="screenshot"
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="screenshot" className="font-medium text-gray-700">
                      Periodic Screenshots
                    </label>
                    <p className="text-gray-500">Take periodic screenshots of student's screen</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="record-video"
                      name="record-video"
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="record-video" className="font-medium text-gray-700">
                      Record Video
                    </label>
                    <p className="text-gray-500">Record webcam video during the exam</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

