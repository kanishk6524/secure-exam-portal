"use client"

import { useState } from "react"
import { Save, Lock, Bell, User, FileText } from "lucide-react"

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general")

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralSettings />
      case "security":
        return <SecuritySettings />
      case "notifications":
        return <NotificationSettings />
      case "exam":
        return <ExamSettings />
      default:
        return <GeneralSettings />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Tabs */}
        <div className="w-full md:w-64 mb-6 md:mb-0">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">Settings</h2>
            </div>
            <nav className="p-2">
              <button
                onClick={() => setActiveTab("general")}
                className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "general" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="w-5 h-5 mr-3" />
                General
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "security" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Lock className="w-5 h-5 mr-3" />
                Security
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "notifications" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Bell className="w-5 h-5 mr-3" />
                Notifications
              </button>
              <button
                onClick={() => setActiveTab("exam")}
                className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === "exam" ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <FileText className="w-5 h-5 mr-3" />
                Exam Settings
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 md:ml-6">
          <div className="bg-white rounded-lg shadow">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">General Settings</h2>

      <form>
        <div className="space-y-6">
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Admin Profile</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  defaultValue="Admin User"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  defaultValue="admin@example.com"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  defaultValue="+1 (555) 123-4567"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <input
                  type="text"
                  name="role"
                  id="role"
                  defaultValue="Administrator"
                  disabled
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">System Settings</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="UTC-8">Pacific Time (UTC-8)</option>
                  <option value="UTC-5">Eastern Time (UTC-5)</option>
                  <option value="UTC+0">Greenwich Mean Time (UTC+0)</option>
                  <option value="UTC+1">Central European Time (UTC+1)</option>
                  <option value="UTC+5:30">Indian Standard Time (UTC+5:30)</option>
                </select>
              </div>
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>

      <form>
        <div className="space-y-6">
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  name="current-password"
                  id="current-password"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  name="new-password"
                  id="new-password"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirm-password"
                  id="confirm-password"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Two-Factor Authentication</h3>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="2fa"
                  name="2fa"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="2fa" className="font-medium text-gray-700">
                  Enable Two-Factor Authentication
                </label>
                <p className="text-gray-500">Require a verification code when logging in</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Session Management</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Current Session</p>
                  <p className="text-xs text-gray-500">Started: Today at 10:24 AM</p>
                  <p className="text-xs text-gray-500">IP Address: 192.168.1.1</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Out All Other Sessions
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Notification Settings</h2>

      <form>
        <div className="space-y-6">
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="email-exam-start"
                    name="email-exam-start"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-exam-start" className="font-medium text-gray-700">
                    Exam Start Notifications
                  </label>
                  <p className="text-gray-500">Receive an email when an exam starts</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="email-exam-end"
                    name="email-exam-end"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-exam-end" className="font-medium text-gray-700">
                    Exam End Notifications
                  </label>
                  <p className="text-gray-500">Receive an email when an exam ends</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="email-suspicious"
                    name="email-suspicious"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-suspicious" className="font-medium text-gray-700">
                    Suspicious Activity Alerts
                  </label>
                  <p className="text-gray-500">Receive an email when suspicious activity is detected</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="email-reports"
                    name="email-reports"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-reports" className="font-medium text-gray-700">
                    Report Generation Notifications
                  </label>
                  <p className="text-gray-500">Receive an email when a report is generated</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">System Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="system-student-reg"
                    name="system-student-reg"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="system-student-reg" className="font-medium text-gray-700">
                    Student Registration Notifications
                  </label>
                  <p className="text-gray-500">Receive a notification when a new student registers</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="system-login"
                    name="system-login"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="system-login" className="font-medium text-gray-700">
                    Login Attempt Notifications
                  </label>
                  <p className="text-gray-500">Receive a notification for failed login attempts</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="system-updates"
                    name="system-updates"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="system-updates" className="font-medium text-gray-700">
                    System Update Notifications
                  </label>
                  <p className="text-gray-500">Receive a notification when system updates are available</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

function ExamSettings() {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Exam Settings</h2>

      <form>
        <div className="space-y-6">
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Default Exam Configuration</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="default-duration" className="block text-sm font-medium text-gray-700">
                  Default Exam Duration
                </label>
                <select
                  id="default-duration"
                  name="default-duration"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="1">1 hour</option>
                  <option value="1.5">1.5 hours</option>
                  <option value="2">2 hours</option>
                  <option value="2.5">2.5 hours</option>
                  <option value="3" selected>
                    3 hours
                  </option>
                  <option value="3.5">3.5 hours</option>
                  <option value="4">4 hours</option>
                </select>
              </div>
              <div>
                <label htmlFor="default-questions" className="block text-sm font-medium text-gray-700">
                  Default Questions Per Subject
                </label>
                <input
                  type="number"
                  name="default-questions"
                  id="default-questions"
                  defaultValue="25"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="marking-scheme" className="block text-sm font-medium text-gray-700">
                  Default Marking Scheme
                </label>
                <select
                  id="marking-scheme"
                  name="marking-scheme"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="4-1">+4 for correct, -1 for incorrect</option>
                  <option value="3-1">+3 for correct, -1 for incorrect</option>
                  <option value="2-0">+2 for correct, 0 for incorrect</option>
                  <option value="1-0">+1 for correct, 0 for incorrect</option>
                </select>
              </div>
              <div>
                <label htmlFor="passing-percentage" className="block text-sm font-medium text-gray-700">
                  Default Passing Percentage
                </label>
                <input
                  type="number"
                  name="passing-percentage"
                  id="passing-percentage"
                  defaultValue="40"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Exam Security</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="browser-lock"
                    name="browser-lock"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="browser-lock" className="font-medium text-gray-700">
                    Enable Browser Lockdown
                  </label>
                  <p className="text-gray-500">Prevent students from opening other tabs or applications</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="remote-proctoring"
                    name="remote-proctoring"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="remote-proctoring" className="font-medium text-gray-700">
                    Enable Remote Proctoring
                  </label>
                  <p className="text-gray-500">Monitor students via webcam during exams</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="ip-restriction"
                    name="ip-restriction"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="ip-restriction" className="font-medium text-gray-700">
                    Enable IP Restrictions
                  </label>
                  <p className="text-gray-500">Restrict exam access to specific IP ranges</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="randomize-questions"
                    name="randomize-questions"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="randomize-questions" className="font-medium text-gray-700">
                    Randomize Questions
                  </label>
                  <p className="text-gray-500">Randomize the order of questions for each student</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-700 mb-4">Result Settings</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="auto-results"
                    name="auto-results"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="auto-results" className="font-medium text-gray-700">
                    Automatic Result Generation
                  </label>
                  <p className="text-gray-500">Generate results automatically when exams are completed</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="email-results"
                    name="email-results"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-results" className="font-medium text-gray-700">
                    Email Results to Students
                  </label>
                  <p className="text-gray-500">Send exam results to students via email</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="show-answers"
                    name="show-answers"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="show-answers" className="font-medium text-gray-700">
                    Show Correct Answers
                  </label>
                  <p className="text-gray-500">Show correct answers to students after exam completion</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

