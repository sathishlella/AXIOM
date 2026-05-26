import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rosterId = params.id

  const roster = await prisma.roster.findUnique({
    where: { id: rosterId },
    include: { weeks: { orderBy: { startDate: "asc" } } },
  })

  if (!roster) {
    return NextResponse.json({ error: "Roster not found" }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return NextResponse.json({ error: "Invalid file type. Please upload .xlsx or .xls" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const workbook = XLSX.read(bytes, { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, initials: true },
  })
  const employeeMap = new Map(employees.map((e) => [e.initials?.toUpperCase(), e.id]))

  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { sortOrder: "asc" },
  })

  // Find header row by looking for "Week"
  let headerRowIndex = -1
  let subHeaderRowIndex = -1
  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
    const row = jsonData[i]
    if (row && row.some((cell: any) => String(cell).toLowerCase().includes("week"))) {
      headerRowIndex = i
      subHeaderRowIndex = i + 1
      break
    }
  }

  if (headerRowIndex === -1) {
    return NextResponse.json({ error: "Could not find header row in Excel" }, { status: 400 })
  }

  const headerRow = jsonData[headerRowIndex] as string[]
  const subHeaderRow = jsonData[subHeaderRowIndex] as string[]

  // Build a clean shift type matcher
  const matchShiftType = (timeHeader: string, nameHeader: string) => {
    const time = timeHeader.trim().toLowerCase()
    const name = nameHeader.trim().toLowerCase()

    // Use time header for weekend columns (when name is "9am-3pm")
    const effective = name === "9am-3pm" ? time : name

    // Exact code/name matching in priority order (longer names first)
    const patterns = [
      { pattern: "service desk 1", code: "SD1" },
      { pattern: "service desk 2", code: "SD2" },
      { pattern: "support 10", code: "S10" },
      { pattern: "support 11", code: "S11" },
      { pattern: "support 1", code: "S1" },
      { pattern: "support 2", code: "S2" },
      { pattern: "support 3", code: "S3" },
      { pattern: "support 4", code: "S4" },
      { pattern: "support 5", code: "S5" },
      { pattern: "support 6", code: "S6" },
      { pattern: "support 7", code: "S7" },
      { pattern: "support 8", code: "S8" },
      { pattern: "support 9", code: "S9" },
      { pattern: "saturday", code: "SAT" },
      { pattern: "sunday", code: "SUN" },
    ]

    for (const { pattern, code } of patterns) {
      if (effective.includes(pattern)) {
        const matched = shiftTypes.find((st) => st.code === code)
        if (matched) return matched
      }
    }

    // Fallback: fuzzy name matching
    return shiftTypes.find((st) => {
      const dbName = st.name.toLowerCase().replace(/\s+/g, " ")
      const search = effective.replace(/\s+/g, " ")
      return dbName === search || dbName.includes(search) || search.includes(dbName)
    })
  }

  const columnMap: { colIndex: number; shiftTypeId: string; shiftName: string }[] = []

  for (let col = 2; col < headerRow.length; col++) {
    const timeHeader = String(headerRow[col] || "")
    const nameHeader = String(subHeaderRow[col] || "")
    if (!timeHeader && !nameHeader) continue

    const matched = matchShiftType(timeHeader, nameHeader)
    if (matched) {
      columnMap.push({ colIndex: col, shiftTypeId: matched.id, shiftName: matched.name })
    }
  }

  if (columnMap.length === 0) {
    return NextResponse.json({ error: "No matching shift columns found" }, { status: 400 })
  }

  // Clear existing assignments for this roster
  await prisma.shiftAssignment.deleteMany({
    where: { week: { rosterId } },
  })

  const warnings: string[] = []
  let importedCount = 0

  const weekMap = new Map(roster.weeks.map((w) => [w.weekLabel, w.id]))

  for (let rowIdx = subHeaderRowIndex + 1; rowIdx < jsonData.length; rowIdx++) {
    const row = jsonData[rowIdx]
    if (!row || row.length < 2) continue

    const weekLabel = String(row[1] || "").trim()
    if (!weekLabel) continue

    const weekId = weekMap.get(weekLabel)
    if (!weekId) {
      warnings.push(`Row ${rowIdx + 1}: Week "${weekLabel}" not found in roster`)
      continue
    }

    for (const { colIndex, shiftTypeId } of columnMap) {
      const initials = String(row[colIndex] || "").trim().toUpperCase()
      if (!initials) continue

      const employeeId = employeeMap.get(initials)
      if (!employeeId) {
        warnings.push(`Row ${rowIdx + 1}: Unknown initials "${initials}"`)
        continue
      }

      await prisma.shiftAssignment.upsert({
        where: { weekId_shiftTypeId: { weekId, shiftTypeId } },
        update: { employeeId },
        create: { weekId, shiftTypeId, employeeId },
      })

      importedCount++
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      rosterId,
      action: "IMPORT_EXCEL",
      details: JSON.stringify({
        fileName: file.name,
        imported: importedCount,
        warnings: warnings.length,
      }),
    },
  })

  return NextResponse.json({
    success: true,
    imported: importedCount,
    warnings: warnings.length > 0 ? warnings : undefined,
  })
}
