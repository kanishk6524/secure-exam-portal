"use client"

import { createContext, useContext, type ReactNode } from "react"
import { signOut, useSession } from "next-auth/react"

interface User {
  username: string
  role: "admin" | "student" | "college_admin"
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const user = session?.user
    ? { username: session.user.email ?? session.user.name ?? "", role: session.user.role.toLowerCase() as User["role"] }
    : null
  const login = (_userData: User) => undefined
  const logout = () => signOut({ callbackUrl: "/" })

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

