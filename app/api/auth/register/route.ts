import { NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "node:crypto"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { Prisma, Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { relaxedSignup } from "@/lib/signup-mode"
import { FirebaseAuthError, firebaseConfigured, firebaseSendEmailVerification, firebaseSignInWithPassword, firebaseSignUp } from "@/lib/firebase"

// Compare secrets without leaking length or content through timing.
function secretsMatch(provided: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(provided), digest(expected))
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/\d/, "Password must contain at least one number"),
  fullName: z.string().trim().min(2),
  role: z.nativeEnum(Role),
  adminCode: z.string().optional(),
  collegeId: z.string().optional(),
  faceEmbedding: z.array(z.number()).length(128).nullable().optional(),
  profilePhotoUrl: z
    .string()
    .regex(/^data:image\/jpeg;base64,/, "Profile photo must be a JPEG image")
    .max(750_000, "Profile photo is too large")
    .nullable()
    .optional(),
})

// Local development: take almost any input (see lib/signup-mode.ts).
const relaxedSchema = z.object({
  email: z.string().trim().email("Enter an email address like name@example.com"),
  password: z.string().min(1, "Enter a password"),
  fullName: z.string().trim().min(1, "Enter a name"),
  role: z.nativeEnum(Role),
  adminCode: z.string().optional(),
  collegeId: z.string().optional(),
  faceEmbedding: z.array(z.number()).nullable().optional(),
  profilePhotoUrl: z.string().max(2_000_000).nullable().optional(),
})

export async function POST(request: Request) {
  const relaxed = relaxedSignup()
  const parsed = (relaxed ? relaxedSchema : schema).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  const data = parsed.data
  const email = data.email.toLowerCase()
  // Only students may self-register. Admin roles need the invite code set in ADMIN_REGISTRATION_CODE.
  if (data.role !== Role.STUDENT && !relaxed) {
    const expectedCode = process.env.ADMIN_REGISTRATION_CODE
    if (!expectedCode) return NextResponse.json({ error: "Admin registration is disabled. Ask the system owner for an admin account." }, { status: 403 })
    if (!data.adminCode || !secretsMatch(data.adminCode, expectedCode)) return NextResponse.json({ error: "Invalid admin registration code" }, { status: 403 })
  }
  if (data.role === Role.STUDENT && !data.collegeId && !relaxed) {
    return NextResponse.json({ error: "College is required for student registration" }, { status: 400 })
  }

  let collegeId: string | undefined
  const collegeCode = data.collegeId?.trim().toUpperCase()
  if (collegeCode) {
    let college = await prisma.college.findUnique({ where: { code: collegeCode } })
    if (!college && relaxed) college = await prisma.college.create({ data: { code: collegeCode, name: data.collegeId!.trim() } })
    if (!college) return NextResponse.json({ error: "Unknown college code. Check with your admin for the correct code." }, { status: 400 })
    collegeId = college.id
  } else if (relaxed) {
    // No college given: use the demo college so the demo exam is visible.
    collegeId = (await prisma.college.findFirst({ orderBy: { code: "asc" } }))?.id
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
  }

  // Local development without Firebase: plain password accounts, email verification skipped.
  if (!firebaseConfigured()) {
    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Sign-up is not configured on this server (FIREBASE_API_KEY is missing)." }, { status: 500 })
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(data.password, 12),
        fullName: data.fullName,
        role: data.role,
        collegeId,
        emailVerified: true,
        faceEmbedding: data.faceEmbedding?.length === 128 ? data.faceEmbedding : Prisma.JsonNull,
        profilePhotoUrl: data.profilePhotoUrl ?? null,
      },
    })
    return NextResponse.json({ message: "Account created and saved. Local development mode: email verification is skipped, so you can sign in now." }, { status: 201 })
  }

  let firebaseUser: { idToken: string; localId: string }
  try {
    firebaseUser = await firebaseSignUp(email, data.password)
  } catch (error) {
    if (!(error instanceof FirebaseAuthError)) throw error
    if (error.code !== "EMAIL_EXISTS") return NextResponse.json({ error: error.message }, { status: 400 })
    // The email exists in Firebase but not in our database: an earlier registration was interrupted
    // after the Firebase account was created. If the password matches, finish it instead of locking the user out.
    try {
      firebaseUser = await firebaseSignInWithPassword(email, data.password)
    } catch {
      return NextResponse.json({ error: "A previous registration with this email was not completed. Enter the same password you used before, or use \"Forgot password\" to reset it, then register again." }, { status: 409 })
    }
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
        profilePhotoUrl: data.profilePhotoUrl ?? null,
      },
    })
  } catch (error: unknown) {
    console.error("Registration database error", error)
    return NextResponse.json({ error: "Your account could not be saved. Please try registering again with the same email and password." }, { status: 503 })
  }

  // The profile now exists, so a failed email is recoverable with "Resend link" on the login screen.
  try {
    await firebaseSendEmailVerification(firebaseUser.idToken)
  } catch (error) {
    console.error("Firebase verification email error", error)
    return NextResponse.json({ message: "Account created, but the verification email could not be sent. Use \"Resend link\" on the login screen to get it again." }, { status: 201 })
  }

  return NextResponse.json(
    { message: data.profilePhotoUrl ? "Registration successful. Your verification photo was saved; check your email to verify your account." : "Registration successful. Check your email to verify your account." },
    { status: 201 },
  )
}
