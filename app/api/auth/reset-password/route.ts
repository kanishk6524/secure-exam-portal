import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).regex(/\d/, "Password must contain at least one number"),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  const user = await prisma.user.findFirst({ where: { resetToken: parsed.data.token } })
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return NextResponse.json({ error: "This reset link is invalid or expired" }, { status: 400 })
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), resetToken: null, resetTokenExpiry: null } })
  return NextResponse.json({ message: "Password reset successfully" })
}