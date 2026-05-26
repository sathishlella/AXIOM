import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json(shiftTypes)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, code, startTime, endTime, location, category, requiresBuddy, sortOrder } = body

  if (!name || !code || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const existing = await prisma.shiftType.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ error: "Shift type code already exists" }, { status: 409 })
  }

  const shiftType = await prisma.shiftType.create({
    data: {
      name,
      code,
      startTime,
      endTime,
      location: location || null,
      category: category || "STANDARD",
      requiresBuddy: requiresBuddy || false,
      sortOrder: sortOrder || 0,
    },
  })

  return NextResponse.json(shiftType)
}
