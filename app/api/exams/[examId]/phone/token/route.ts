import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { makePhoneToken, phoneBaseUrl } from "@/lib/side-camera"

/** Creates the link (shown as a QR code) that pairs the candidate's phone as a side camera. */
export async function POST(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { examId } = await params
  const base = phoneBaseUrl(request)
  const url = `${base}/phone/${makePhoneToken(session.user.id, examId)}`
  const secureEnough = base.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)/.test(base)
  return NextResponse.json({ url, required: process.env.REQUIRE_PHONE_CAMERA === "1", secureEnough })
}
