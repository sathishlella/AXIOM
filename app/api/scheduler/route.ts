import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Shuffle array in place (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { rosterId } = body

  if (!rosterId) {
    return NextResponse.json({ error: "Missing rosterId" }, { status: 400 })
  }

  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    include: {
      weeks: { orderBy: { startDate: "asc" } },
    },
  })

  if (!roster) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 })
  }

  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { sortOrder: "asc" },
  })

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    select: { id: true, name: true, initials: true, isBuddy: true },
  })

  if (employees.length === 0) {
    return NextResponse.json({ error: "No active employees" }, { status: 400 })
  }

  // Clear existing assignments for this roster
  await prisma.shiftAssignment.deleteMany({
    where: {
      week: {
        rosterId,
      },
    },
  })

  const assignments: any[] = []
  const conflicts: string[] = []

  // Track total shift counts globally for fairness across the whole roster period
  const globalShiftCounts: Record<string, number> = {}
  employees.forEach((e) => (globalShiftCounts[e.id] = 0))

  for (const week of roster.weeks) {
    // Track how many shifts each employee has THIS WEEK
    const weekShiftCounts: Record<string, number> = {}
    employees.forEach((e) => (weekShiftCounts[e.id] = 0))

    // Sort shift types: non-weekend first, then weekend last (so overflow goes to weekends preferentially)
    const sortedShifts = [...shiftTypes].sort((a, b) => {
      if (a.category === "WEEKEND" && b.category !== "WEEKEND") return 1
      if (a.category !== "WEEKEND" && b.category === "WEEKEND") return -1
      return a.sortOrder - b.sortOrder
    })

    for (const shift of sortedShifts) {
      // Find eligible employees: those with < 2 shifts this week
      // Prioritize by: (1) lowest global shift count, (2) lowest week shift count
      const eligible = employees
        .filter((e) => weekShiftCounts[e.id] < 2)
        .sort((a, b) => {
          const globalDiff = globalShiftCounts[a.id] - globalShiftCounts[b.id]
          if (globalDiff !== 0) return globalDiff
          return weekShiftCounts[a.id] - weekShiftCounts[b.id]
        })

      if (eligible.length === 0) {
        conflicts.push(`Week ${week.weekLabel}: No eligible employee for ${shift.name}`)
        continue
      }

      // Pick from top 3 eligible employees randomly for variety
      const pool = eligible.slice(0, Math.min(3, eligible.length))
      const chosen = pool[Math.floor(Math.random() * pool.length)]

      weekShiftCounts[chosen.id]++
      globalShiftCounts[chosen.id]++

      assignments.push({
        weekId: week.id,
        shiftTypeId: shift.id,
        employeeId: chosen.id,
        notes: shift.location ? shift.location : null,
      })
    }
  }

  // Bulk create assignments
  if (assignments.length > 0) {
    await prisma.shiftAssignment.createMany({ data: assignments })
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      rosterId,
      action: "AUTO_SCHEDULE",
      details: JSON.stringify({
        assignmentsCreated: assignments.length,
        totalShifts: shiftTypes.length * roster.weeks.length,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      }),
    },
  })

  return NextResponse.json({
    success: true,
    assignmentsCreated: assignments.length,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  })
}
