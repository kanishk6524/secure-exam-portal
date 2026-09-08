import { auth } from "@/auth"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "COLLEGE_ADMIN")) return null
  return session
}