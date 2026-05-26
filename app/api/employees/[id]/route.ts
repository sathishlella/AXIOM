import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, initials, isBuddy, isActive } = body

  // Only check for duplicates if email or initials are being updated
  if (email || initials) {
    const existing = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: params.id } },
          {
            OR: [
              ...(email ? [{ email }] : []),
              ...(initials ? [{ initials: initials.toUpperCase() }] : []),
            ],
          },
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Another employee with this email or initials already exists" },
        { status: 409 }
      )
    }
  }

  const employee = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(initials && { initials: initials.toUpperCase() }),
      ...(isBuddy !== undefined && { isBuddy }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE_EMPLOYEE",
      details: JSON.stringify({ employeeId: params.id, name }),
    },
  })

  return NextResponse.json(employee)
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const assignmentCount = await prisma.shiftAssignment.count({
    where: { employeeId: params.id },
  })

  if (assignmentCount > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete employee with roster history. Deactivate them instead.",
        hasAssignments: true,
      },
      { status: 409 }
    )
  }

  await prisma.user.delete({
    where: { id: params.id },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE_EMPLOYEE",
      details: JSON.stringify({ employeeId: params.id }),
    },
  })

  return NextResponse.json({ success: true })
}
