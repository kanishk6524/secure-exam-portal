import { NextResponse } from "next/server"
import { autoSubmitExpiredSessions } from "@/lib/exam-engine"

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  // Without a secret the endpoint would be open to anyone, so refuse to run.
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 })
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const count = await autoSubmitExpiredSessions()
  return NextResponse.json({ submitted: count })
}
