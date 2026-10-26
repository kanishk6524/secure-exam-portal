import { NextResponse } from "next/server"
import { getAdminScope } from "@/lib/admin-auth"

// Read-only view of the deployment's effective configuration (values come from environment variables).
export async function GET() {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  return NextResponse.json({
    maxViolations: Number(process.env.MAX_LOCKDOWN_VIOLATIONS ?? 5),
    adminRegistrationEnabled: Boolean(process.env.ADMIN_REGISTRATION_CODE),
    cronConfigured: Boolean(process.env.CRON_SECRET),
    realtimeAvailable: Boolean(globalThis.realtimeIO),
    role: scope.session.user.role,
  })
}
