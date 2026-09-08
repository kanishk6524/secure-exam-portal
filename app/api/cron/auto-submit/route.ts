import { NextResponse } from "next/server"
import { autoSubmitExpiredSessions } from "@/lib/exam-engine"

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authorization !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const count = await autoSubmitExpiredSessions()
  return NextResponse.json({ submitted: count })
}