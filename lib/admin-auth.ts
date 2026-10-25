import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "COLLEGE_ADMIN")) return null
  return session
}

/**
 * Admin plus the data they may see. ADMIN sees everything (collegeId null); a COLLEGE_ADMIN is
 * limited to their own college. Returns null when the caller is not an admin or a college admin
 * without a college.
 */
export async function getAdminScope() {
  const session = await requireAdmin()
  if (!session) return null
  if (session.user.role === "ADMIN") return { session, collegeId: null as string | null }
  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { collegeId: true } })
  if (!admin?.collegeId) return null
  return { session, collegeId: admin.collegeId as string | null }
}
