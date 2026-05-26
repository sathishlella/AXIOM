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
  const { name, code, startTime, endTime, location, category, requiresBuddy, sortOrder } = body

  const shiftType = await prisma.shiftType.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(code && { code }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(location !== undefined && { location: location || null }),
      ...(category && { category }),
      ...(requiresBuddy !== undefined && { requiresBuddy }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  })

  return NextResponse.json(shiftType)
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
    where: { shiftTypeId: params.id },
  })

  if (assignmentCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete shift type with roster history" },
      { status: 409 }
    )
  }

  await prisma.shiftType.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
