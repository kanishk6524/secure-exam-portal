import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { firebaseConfigured, firebaseSendPasswordResetEmail } from "@/lib/firebase"

export async function POST(request: Request) {
  if (!firebaseConfigured()) return NextResponse.json({ message: "Password reset emails are not available in local development mode." })
  const body = await request.json()
  const email = String(body.email ?? "").trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })
  if (user?.firebaseUid) {
    try {
      await firebaseSendPasswordResetEmail(email)
    } catch (error) {
      console.error("Firebase password reset error", error)
    }
  }
  return NextResponse.json({ message: "If the account exists, a password reset email was sent. Follow the link in that email to set a new password." })
}
