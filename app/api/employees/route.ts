import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const employees = await prisma.user.findMany({
    where: {
      role: "EMPLOYEE",
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      initials: true,
      isBuddy: true,
      isActive: true,
      createdAt: true,
    },
  })

  return NextResponse.json(employees)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, initials, isBuddy } = body

  if (!name || !email || !initials) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { initials }],
    },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Employee with this email or initials already exists" },
      { status: 409 }
    )
  }

  const password = await bcrypt.hash("employee123", 10)

  const employee = await prisma.user.create({
    data: {
      name,
      email,
      initials: initials.toUpperCase(),
      role: "EMPLOYEE",
      isBuddy: isBuddy || false,
      isActive: true,
      password,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_EMPLOYEE",
      details: JSON.stringify({ employeeId: employee.id, name }),
    },
  })

  return NextResponse.json(employee)
}
