"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import RegisterForm from "@/components/auth/register-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { KeyRound } from "lucide-react"

export default function AdminLogin({ onLoginSuccess, startInRegister = false }: { onLoginSuccess: () => void; startInRegister?: boolean }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [registering, setRegistering] = useState(startInRegister)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const result = await signIn("credentials", { email, password, redirect: false })
    if (result?.error) {
      setError(result.code === "EMAIL_NOT_VERIFIED" ? "Please verify your email before signing in. Check your inbox for the verification link." : "Invalid email or password")
      return
    }
    onLoginSuccess()
  }

  if (registering) return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><RegisterForm role="ADMIN" onBack={() => setRegistering(false)} /></div>
  return <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><Card className="w-full max-w-md"><CardHeader className="text-center"><KeyRound className="mx-auto h-10 w-10 text-blue-600" /><CardTitle>Admin Login</CardTitle></CardHeader><CardContent>{error && <p className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</p>}<form className="space-y-4" onSubmit={handleSubmit}><Input required type="email" placeholder="Admin email" value={email} onChange={(event) => setEmail(event.target.value)} /><Input required type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} /><Button className="w-full">Sign in</Button><Button type="button" variant="link" className="w-full" onClick={() => setRegistering(true)}>Create admin account</Button></form></CardContent></Card></div>
}