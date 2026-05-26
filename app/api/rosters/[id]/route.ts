import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const roster = await prisma.roster.findUnique({
    where: { id: params.id },
    include: {
      weeks: {
        orderBy: { startDate: "asc" },
        include: {
          assignments: {
            include: {
              employee: {
                select: { id: true, name: true, initials: true },
              },
              shiftType: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      },
      createdBy: {
        select: { name: true, initials: true },
      },
    },
  })

  if (!roster) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { sortOrder: "asc" },
  })

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, initials: true, isBuddy: true },
  })

  return NextResponse.json({ roster, shiftTypes, employees })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { status } = body

  const updateData: any = { status }
  if (status === "PUBLISHED") {
    updateData.publishedAt = new Date()
  }

  const roster = await prisma.roster.update({
    where: { id: params.id },
    data: updateData,
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      rosterId: params.id,
      action: status === "PUBLISHED" ? "PUBLISH_ROSTER" : "UPDATE_ROSTER_STATUS",
      details: JSON.stringify({ status }),
    },
  })

  return NextResponse.json(roster)
}
