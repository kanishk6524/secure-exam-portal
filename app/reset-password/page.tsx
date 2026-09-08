"use client"

import { Suspense, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function ResetPasswordContent() {
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) })
    const data = await response.json()
    if (!response.ok) setError(data.error)
    else setMessage(data.message)
  }

  return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><Card className="w-full max-w-md"><CardHeader><CardTitle>Reset password</CardTitle></CardHeader><CardContent>{error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}{message ? <p className="space-y-4 text-sm text-green-700">{message}. <a href="/">Return to login.</a></p> : <form className="space-y-4" onSubmit={submit}><Input required minLength={8} type="password" placeholder="New password (8+ characters, including a number)" value={password} onChange={(event) => setPassword(event.target.value)} /><Button className="w-full" disabled={!token}>Save new password</Button></form>}</CardContent></Card></main>
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">Loading...</main>}><ResetPasswordContent /></Suspense>
}