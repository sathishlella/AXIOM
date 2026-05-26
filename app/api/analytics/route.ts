import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rosterId = searchParams.get("rosterId")

  if (!rosterId) {
    return NextResponse.json({ error: "Missing rosterId" }, { status: 400 })
  }

  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    include: {
      weeks: {
        orderBy: { startDate: "asc" },
        include: {
          assignments: {
            include: {
              employee: { select: { id: true, name: true, initials: true } },
              shiftType: { select: { id: true, name: true, startTime: true, endTime: true, category: true } },
            },
          },
        },
      },
    },
  })

  if (!roster) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 })
  }

  const shiftTypes = await prisma.shiftType.findMany({ orderBy: { sortOrder: "asc" } })

  // Coverage per week
  const coverage = roster.weeks.map((week) => {
    const assigned = week.assignments.length
    const total = shiftTypes.length
    return {
      weekLabel: week.weekLabel,
      assigned,
      total,
      percentage: Math.round((assigned / total) * 100),
    }
  })

  // Employee workload
  const employeeCounts: Record<string, { id: string; name: string; initials: string; shifts: number; hours: number }> = {}
  for (const week of roster.weeks) {
    for (const a of week.assignments) {
      const emp = a.employee
      if (!emp) continue
      if (!employeeCounts[emp.id]) {
        employeeCounts[emp.id] = { id: emp.id, name: emp.name || "", initials: emp.initials || "", shifts: 0, hours: 0 }
      }
      employeeCounts[emp.id].shifts++
      // Calculate hours from startTime and endTime
      const start = parseTime(a.shiftType.startTime)
      const end = parseTime(a.shiftType.endTime)
      const hours = end - start
      employeeCounts[emp.id].hours += hours > 0 ? hours : 0
    }
  }

  const workload = Object.values(employeeCounts).sort((a, b) => b.shifts - a.shifts)

  // Weekend equity
  const weekendCounts: Record<string, number> = {}
  for (const week of roster.weeks) {
    for (const a of week.assignments) {
      if (a.shiftType.category === "WEEKEND") {
        const name = a.employee?.initials || "Unknown"
        weekendCounts[name] = (weekendCounts[name] || 0) + 1
      }
    }
  }
  const weekendEquity = Object.entries(weekendCounts).map(([name, count]) => ({ name, count }))

  // Shift type distribution
  const shiftTypeCounts: Record<string, number> = {}
  for (const st of shiftTypes) {
    shiftTypeCounts[st.name] = 0
  }
  for (const week of roster.weeks) {
    for (const a of week.assignments) {
      shiftTypeCounts[a.shiftType.name] = (shiftTypeCounts[a.shiftType.name] || 0) + 1
    }
  }
  const shiftDistribution = Object.entries(shiftTypeCounts).map(([name, count]) => ({ name, count }))

  // Category breakdown
  const categoryCounts: Record<string, number> = { EARLY: 0, STANDARD: 0, WEEKEND: 0 }
  for (const week of roster.weeks) {
    for (const a of week.assignments) {
      categoryCounts[a.shiftType.category] = (categoryCounts[a.shiftType.category] || 0) + 1
    }
  }

  return NextResponse.json({
    coverage,
    workload,
    weekendEquity,
    shiftDistribution,
    categoryBreakdown: categoryCounts,
    totalAssignments: roster.weeks.reduce((sum, w) => sum + w.assignments.length, 0),
  })
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number)
  return h + (m || 0) / 60
}
