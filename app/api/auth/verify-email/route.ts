import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/mail"

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

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "").trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) return NextResponse.json({ message: "If the account exists, a verification email was sent." })
  const verificationToken = randomUUID()
  const updated = await prisma.user.update({ where: { id: user.id }, data: { verificationToken, verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) } })
  await sendVerificationEmail(updated)
  return NextResponse.json({ message: "Verification email sent." })
}