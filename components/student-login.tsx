"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/context/auth-context"

interface StudentLoginProps {
  onLoginSuccess: () => void
}

export default function StudentLogin({ onLoginSuccess }: StudentLoginProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [forgotPassword, setForgotPassword] = useState(false)
  const [collegeId, setCollegeId] = useState("")
  const { login } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // In a real app, you would validate credentials against a backend
    if (username === "student" && password === "student123") {
      login({ username, role: "student" })
      onLoginSuccess()
    } else {
      setError("Invalid username or password")
    }
  }

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would verify the college ID and send a password reset link
    if (collegeId) {
      setError("")
      alert("Password reset link has been sent to your registered email.")
      setForgotPassword(false)
    } else {
      setError("Please enter your college ID")
    }
  }

  if (forgotPassword) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">Reset Password</h2>
          </div>
          {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
          <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="collegeId" className="block text-sm font-medium text-gray-700">
                College ID
              </label>
              <input
                id="collegeId"
                name="collegeId"
                type="text"
                required
                className="relative block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your college ID"
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Password
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setForgotPassword(false)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900">Student Login</h2>
        </div>
        {error && <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => setForgotPassword(true)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md group hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

