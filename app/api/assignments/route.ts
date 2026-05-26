import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { weekId, shiftTypeId, employeeId, notes } = body

  if (!weekId || !shiftTypeId || !employeeId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const assignment = await prisma.shiftAssignment.upsert({
    where: {
      weekId_shiftTypeId: {
        weekId,
        shiftTypeId,
      },
    },
    update: {
      employeeId,
      notes: notes || null,
    },
    create: {
      weekId,
      shiftTypeId,
      employeeId,
      notes: notes || null,
    },
    include: {
      employee: { select: { id: true, name: true, initials: true } },
      shiftType: { select: { id: true, name: true, code: true } },
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "ASSIGN_SHIFT",
      details: JSON.stringify({
        weekId,
        shiftTypeId,
        employeeId,
        assignmentId: assignment.id,
      }),
    },
  })

  return NextResponse.json(assignment)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  await prisma.shiftAssignment.delete({
    where: { id },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "REMOVE_SHIFT",
      details: JSON.stringify({ assignmentId: id }),
    },
  })

  return NextResponse.json({ success: true })
}
