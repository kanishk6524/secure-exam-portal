import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { faceEmbedding: true } })
  return NextResponse.json({ faceEmbedding: Array.isArray(user?.faceEmbedding) ? user.faceEmbedding : null })
}