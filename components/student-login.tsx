"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import RegisterForm from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function StudentLogin({ onLoginSuccess, startInRegister = false }: { onLoginSuccess: () => void; startInRegister?: boolean }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [registering, setRegistering] = useState(startInRegister)
  const [forgotPassword, setForgotPassword] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const result = await signIn("credentials", { email, password, redirect: false })
    if (result?.error) {
      setError(result.code === "EMAIL_NOT_VERIFIED" ? "Please verify your email before signing in. Resend the verification link below." : "Invalid email or password")
      return
    }
    onLoginSuccess()
  }

  async function requestReset(event: FormEvent) {
    event.preventDefault()
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
    const data = await response.json()
    setMessage(data.message)
  }

  async function resendVerification() {
    const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
    const data = await response.json()
    setMessage(data.message ?? data.error)
  }

  if (registering) return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><RegisterForm role="STUDENT" onBack={() => setRegistering(false)} /></div>
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><Card className="w-full max-w-md"><CardHeader><CardTitle>Student Login</CardTitle></CardHeader><CardContent>{error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error} {error.includes("verify") && <button type="button" className="font-medium underline" onClick={resendVerification}>Resend link</button>}</p>}{message && <p className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-700">{message}</p>}{forgotPassword ? <form className="space-y-4" onSubmit={requestReset}><Input required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} /><Button className="w-full">Send reset link</Button><Button type="button" variant="link" className="w-full" onClick={() => setForgotPassword(false)}>Back to login</Button></form> : <form className="space-y-4" onSubmit={handleSubmit}><Input required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} /><Input required type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} /><Button className="w-full bg-green-600 hover:bg-green-700">Sign in</Button><div className="flex justify-between"><Button type="button" variant="link" onClick={() => setForgotPassword(true)}>Forgot password?</Button><Button type="button" variant="link" onClick={() => setRegistering(true)}>Create account</Button></div></form>}</CardContent></Card></div>
}