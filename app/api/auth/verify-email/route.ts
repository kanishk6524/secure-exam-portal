import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Legacy path: only reachable for pre-Firebase accounts that still carry a
// verificationToken. Firebase-registered accounts are verified via Firebase's
// own hosted action page, not this route.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  const redirect = (status: string) => NextResponse.redirect(new URL(`/verify-email?status=${status}`, request.url))
  if (!token) return redirect("invalid")
  const user = await prisma.user.findFirst({ where: { verificationToken: token } })
  if (!user) return redirect("invalid")
  if (!user.verificationExpiry || user.verificationExpiry < new Date()) return redirect("expired")
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verificationToken: null, verificationExpiry: null } })
  return redirect("success")
}