import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** For load balancers and uptime checks: is the app up, can it reach the database, and is the live socket server running? */
export async function GET() {
  const started = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true, database: "up", dbMs: Date.now() - started, realtime: Boolean(globalThis.realtimeIO), uptimeSeconds: Math.round(process.uptime()) })
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 })
  }
}
