import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { FirebaseAuthError, firebaseSendEmailVerification, firebaseSignInWithPassword } from "@/lib/firebase"

const GENERIC_MESSAGE = "If the account exists and the password is correct, a verification email was sent."

export async function POST(request: Request) {
  const body = await request.json()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerified || !user.firebaseUid) return NextResponse.json({ message: GENERIC_MESSAGE })

  try {
    const { idToken } = await firebaseSignInWithPassword(email, password)
    await firebaseSendEmailVerification(idToken)
  } catch (error) {
    if (error instanceof FirebaseAuthError) return NextResponse.json({ message: GENERIC_MESSAGE })
    throw error
  }

  return NextResponse.json({ message: "Verification email sent." })
}
