"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function VerifyEmailContent() {
  const status = useSearchParams().get("status")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const needsResend = status === "expired" || status === "invalid"

  async function resend() {
    const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
    const data = await response.json()
    setMessage(data.message ?? data.error)
  }

  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><Card className="w-full max-w-md"><CardHeader><CardTitle>{status === "success" ? "Email verified" : needsResend ? "Verification link unavailable" : "Check your email"}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-gray-600">{status === "success" ? "Your account is verified. You can return to the login screen." : needsResend ? "This verification link is invalid or expired. Request a new one below." : "Use the verification link sent to your email address."}</p>{needsResend && <><Input type="email" placeholder="Your account email" value={email} onChange={(event) => setEmail(event.target.value)} /><Button className="w-full" onClick={resend}>Resend verification email</Button></>}{message && <p className="text-sm text-blue-700">{message}</p>}<a className="block text-center text-sm text-blue-600 hover:underline" href="/">Return to login</a></CardContent></Card></main>
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">Loading...</main>}><VerifyEmailContent /></Suspense>
}