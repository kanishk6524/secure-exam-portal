import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFrame } from "@/lib/side-camera"

/** The candidate's own preview of what the side camera sees. */
export async function GET(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { examId } = await params
  const frame = getFrame(session.user.id, examId)
  return NextResponse.json({ image: frame?.image ?? null })
}
