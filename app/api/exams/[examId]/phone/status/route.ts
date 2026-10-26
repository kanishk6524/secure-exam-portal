import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { sideCameraStatus } from "@/lib/side-camera"

export async function GET(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { examId } = await params
  return NextResponse.json(sideCameraStatus(session.user.id, examId))
}
