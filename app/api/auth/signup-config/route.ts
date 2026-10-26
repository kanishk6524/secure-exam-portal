import { NextResponse } from "next/server"
import { relaxedSignup } from "@/lib/signup-mode"

/** Lets the registration form know whether it is running in the relaxed local-development mode. */
export async function GET() {
  return NextResponse.json({ relaxed: relaxedSignup() })
}
