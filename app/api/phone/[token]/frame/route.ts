import { NextResponse } from "next/server"
import { putFrame, readPhoneToken } from "@/lib/side-camera"

// Called by the paired phone every couple of seconds with a small JPEG.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const pairing = readPhoneToken(token)
  if (!pairing) return NextResponse.json({ error: "This pairing link is invalid or has expired" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const image = typeof body.image === "string" ? body.image : ""
  if (image.length > 120_000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) return NextResponse.json({ error: "Invalid picture" }, { status: 400 })
  putFrame(pairing.userId, pairing.examId, image)
  return NextResponse.json({ ok: true })
}
