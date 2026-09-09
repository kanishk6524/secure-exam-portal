import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma, Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { FirebaseAuthError, firebaseSendEmailVerification, firebaseSignUp } from "@/lib/firebase"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/\d/, "Password must contain at least one number"),
  fullName: z.string().trim().min(2),
  role: z.nativeEnum(Role),
  collegeId: z.string().optional(),
  faceEmbedding: z.array(z.number()).length(128).nullable().optional(),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  const data = parsed.data
  const email = data.email.toLowerCase()
  if (data.role === Role.STUDENT && !data.collegeId) {
    return NextResponse.json({ error: "College is required for student registration" }, { status: 400 })
  }

  let collegeId: string | undefined
  if (data.collegeId) {
    const college = await prisma.college.findUnique({ where: { code: data.collegeId.trim().toUpperCase() } })
    if (!college) return NextResponse.json({ error: "Unknown college code. Check with your admin for the correct code." }, { status: 400 })
    collegeId = college.id
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
  }

  let firebaseUser
  try {
    firebaseUser = await firebaseSignUp(email, data.password)
  } catch (error) {
    if (error instanceof FirebaseAuthError) return NextResponse.json({ error: error.message }, { status: 400 })
    throw error
  }

  try {
    await firebaseSendEmailVerification(firebaseUser.idToken)
  } catch (error) {
    console.error("Firebase verification email error", error)
    return NextResponse.json({ error: "Account created, but the verification email could not be sent. Try resending later." }, { status: 503 })
  }

  try {
    await prisma.user.create({
      data: {
        email,
        firebaseUid: firebaseUser.localId,
        fullName: data.fullName,
        role: data.role,
        collegeId,
        emailVerified: false,
        faceEmbedding: data.faceEmbedding ?? Prisma.JsonNull,
      },
    })
  } catch (error: unknown) {
    console.error("Registration database error", error)
    return NextResponse.json({ error: "Account created with Firebase, but saving your profile failed. Contact an admin." }, { status: 503 })
  }

  return NextResponse.json({ message: "Registration successful. Check your email to verify your account." }, { status: 201 })
}
