import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/mail"

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
  if (data.role === Role.STUDENT && !data.collegeId) {
    return NextResponse.json({ error: "College is required for student registration" }, { status: 400 })
  }

  const verificationToken = randomUUID()
  let user
  try {
    user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(data.password, 12),
        fullName: data.fullName,
        role: data.role,
        collegeId: data.collegeId,
        emailVerified: false,
        verificationToken,
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        faceEmbedding: data.faceEmbedding,
      },
    })
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }
    console.error("Registration database error", error)
    return NextResponse.json({ error: "Database unavailable. Check the MongoDB Atlas connection and Network Access settings." }, { status: 503 })
  }

  try {
    await sendVerificationEmail(user)
  } catch (error) {
    console.error("Verification email error", error)
    return NextResponse.json({ error: "Account created, but the verification email could not be sent. Configure SMTP or try resending later." }, { status: 503 })
  }

  return NextResponse.json({ message: "Registration successful. Check your email to verify your account." }, { status: 201 })
}