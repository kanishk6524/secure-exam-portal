"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function RegisterForm({ role, onBack }: { role: "STUDENT" | "ADMIN"; onBack: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", collegeId: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, role }) })
    const data = await response.json()
    setLoading(false)
    if (!response.ok) setError(data.error ?? "Registration failed")
    else setMessage(data.message)
  }

  return <Card className="w-full max-w-md"><CardHeader><CardTitle>{role === "STUDENT" ? "Create student account" : "Create admin account"}</CardTitle><CardDescription>Verify your email before signing in.</CardDescription></CardHeader><CardContent>{error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}{message && <p className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-700">{message}</p>}<form className="space-y-4" onSubmit={handleSubmit}><Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /><Input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />{role === "STUDENT" && <Input required placeholder="College ID" value={form.collegeId} onChange={(event) => setForm({ ...form, collegeId: event.target.value })} />}<Input required type="password" minLength={8} placeholder="Password (8+ characters, including a number)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><Button className="w-full" disabled={loading}>{loading ? "Creating account..." : "Create account"}</Button><Button type="button" variant="link" className="w-full" onClick={onBack}>Back to login</Button></form></CardContent></Card>
}