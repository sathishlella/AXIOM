import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import WeeklyShiftEmail from "@/components/emails/weekly-shift-email"

const resend = process.env.RESEND_API_KEY?.startsWith("re_")
  ? new Resend(process.env.RESEND_API_KEY)
  : null

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
      weeks: {
        include: {
          assignments: {
            include: {
              employee: { select: { id: true, name: true, email: true } },
              shiftType: { select: { name: true, startTime: true, location: true } },
            },
          },
        },
      },
    },
  })

  if (!roster) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 })
  }

  // Group shifts by employee
  const employeeShifts = new Map<
    string,
    {
      name: string
      email: string
      shifts: Array<{
        weekLabel: string
        shiftName: string
        startTime: string
        location: string | null
        notes: string | null
      }>
    }
  >()

  for (const week of roster.weeks) {
    for (const assignment of week.assignments) {
      const emp = assignment.employee
      if (!emp) continue

      if (!employeeShifts.has(emp.id)) {
        employeeShifts.set(emp.id, {
          name: emp.name || "",
          email: emp.email,
          shifts: [],
        })
      }

      employeeShifts.get(emp.id)!.shifts.push({
        weekLabel: week.weekLabel,
        shiftName: assignment.shiftType.name,
        startTime: assignment.shiftType.startTime,
        location: assignment.shiftType.location,
        notes: assignment.notes,
      })
    }
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const results = []

  for (const entry of Array.from(employeeShifts)) {
    const data = entry[1]
    const html = await render(
      WeeklyShiftEmail({
        employeeName: data.name,
        month: months[roster.month - 1],
        year: roster.year,
        shifts: data.shifts,
      })
    )

    let status: string
    let resendId: string | null = null
    let error: string | null = null

    if (resend) {
      try {
        const { data: sendData, error: sendError } = await resend.emails.send({
          from: "AXIOM <roster@taylors.edu.my>",
          to: data.email,
          subject: `Your Shift Schedule — ${months[roster.month - 1]} ${roster.year}`,
          html,
        })

        if (sendError) {
          status = "FAILED"
          error = sendError.message
        } else {
          status = "SENT"
          resendId = sendData?.id || null
        }
      } catch (e: any) {
        status = "FAILED"
        error = e.message
      }
    } else {
      // Demo mode: simulate success
      status = "SENT"
      resendId = "demo-" + Math.random().toString(36).substring(7)
    }

    await prisma.emailLog.create({
      data: {
        rosterId,
        recipientEmail: data.email,
        recipientName: data.name,
        subject: `Your Shift Schedule — ${months[roster.month - 1]} ${roster.year}`,
        status,
        resendId,
        error,
        sentAt: status === "SENT" ? new Date() : null,
      },
    })

    results.push({ email: data.email, status })
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      rosterId,
      action: "SEND_EMAILS",
      details: JSON.stringify({ count: results.length }),
    },
  })

  return NextResponse.json({
    success: true,
    sent: results.filter((r) => r.status === "SENT").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    results,
  })
}
