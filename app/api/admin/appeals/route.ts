import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminScope } from "@/lib/admin-auth"

export async function GET() {
  const scope = await getAdminScope()
  if (!scope) return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  const appeals = await prisma.appeal.findMany({
    where: scope.collegeId ? { session: { exam: { collegeId: scope.collegeId } } } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { session: { select: { id: true, verdict: true, riskScore: true, status: true, exam: { select: { title: true } }, user: { select: { fullName: true, email: true } }, _count: { select: { incidents: true } } } } },
  })
  return NextResponse.json({ appeals })
}
