import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rosters = await prisma.roster.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { name: true, initials: true },
      },
      _count: {
        select: { weeks: true },
      },
    },
  })

  return NextResponse.json(rosters)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, month, year } = body

  if (!name || !month || !year) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const roster = await prisma.roster.create({
    data: {
      name,
      month,
      year,
      createdById: session.user.id,
    },
  })

  // Auto-generate 4 weeks for the month
  const weeks = []
  const startOfMonth = new Date(year, month - 1, 1)
  let current = new Date(startOfMonth)

  while (current.getMonth() === month - 1) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)
    weekEnd.setDate(weekEnd.getDate() + 6)

    if (weekEnd.getMonth() !== month - 1) {
      weekEnd.setDate(1)
      weekEnd.setMonth(month)
      weekEnd.setDate(0)
    }

    const label = `${String(weekStart.getDate()).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`

    weeks.push({
      rosterId: roster.id,
      weekLabel: label,
      startDate: weekStart,
      endDate: weekEnd,
    })

    current.setDate(current.getDate() + 7)
  }

  await prisma.week.createMany({ data: weeks })

  return NextResponse.json(roster)
}
