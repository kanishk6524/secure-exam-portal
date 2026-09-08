import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })
  if (pathname.startsWith("/admin/")) {
    if (!token) return NextResponse.redirect(new URL("/admin-login", request.url))
    if (token.role !== "ADMIN" && token.role !== "COLLEGE_ADMIN") return NextResponse.redirect(new URL("/admin-login", request.url))
  }
  if (pathname.startsWith("/exam/") && !token) return NextResponse.redirect(new URL("/", request.url))
  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*", "/exam/:path*"] }