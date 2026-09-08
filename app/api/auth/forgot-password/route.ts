import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/mail"

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "").trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const resetToken = randomUUID()
    await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) } })
    await sendPasswordResetEmail(user.email, user.fullName, resetToken)
  }
  return NextResponse.json({ message: "If the account exists, a password reset email was sent." })
}