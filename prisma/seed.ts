import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10)
  await prisma.user.upsert({
    where: { email: "admin@taylors.edu.my" },
    update: {},
    create: {
      email: "admin@taylors.edu.my",
      name: "System Administrator",
      initials: "SA",
      role: "ADMIN",
      password: adminPassword,
      isActive: true,
    },
  })

  // Create manager user
  const managerPassword = await bcrypt.hash("manager123", 10)
  await prisma.user.upsert({
    where: { email: "manager@taylors.edu.my" },
    update: {},
    create: {
      email: "manager@taylors.edu.my",
      name: "ICT Manager",
      initials: "IM",
      role: "MANAGER",
      password: managerPassword,
      isActive: true,
    },
  })

  // Seed employees from the Excel roster initials
  const employeeInitials = [
    { initials: "AS", name: "A. Sathish", email: "as@taylors.edu.my" },
    { initials: "KM", name: "K. Megan", email: "km@taylors.edu.my" },
    { initials: "NN", name: "N. Nathan", email: "nn@taylors.edu.my" },
    { initials: "KA", name: "K. Ahmad", email: "ka@taylors.edu.my" },
    { initials: "SL", name: "S. Lee", email: "sl@taylors.edu.my" },
    { initials: "CS", name: "C. Sarah", email: "cs@taylors.edu.my" },
    { initials: "NS", name: "N. Syafiq", email: "ns@taylors.edu.my" },
    { initials: "AL", name: "A. Lim", email: "al@taylors.edu.my" },
    { initials: "DY", name: "D. Yeo", email: "dy@taylors.edu.my" },
    { initials: "TM", name: "T. Muthu", email: "tm@taylors.edu.my" },
    { initials: "AA", name: "A. Ali", email: "aa@taylors.edu.my" },
    { initials: "MK", name: "M. Kumar", email: "mk@taylors.edu.my" },
    { initials: "NF", name: "N. Farah", email: "nf@taylors.edu.my" },
  ]

  for (const emp of employeeInitials) {
    const password = await bcrypt.hash("employee123", 10)
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        name: emp.name,
        initials: emp.initials,
        role: "EMPLOYEE",
        password: password,
        isActive: true,
      },
    })
  }

  console.log("Seeded users")

  // Seed shift types based on Excel columns
  const shiftTypes = [
    { name: "Service Desk 1", code: "SD1", startTime: "07:30", endTime: "16:30", category: "EARLY", sortOrder: 1 },
    { name: "Service Desk 2", code: "SD2", startTime: "07:30", endTime: "16:30", category: "EARLY", sortOrder: 2 },
    { name: "Support 1", code: "S1", startTime: "08:00", endTime: "17:00", category: "STANDARD", sortOrder: 3 },
    { name: "Support 2", code: "S2", startTime: "08:00", endTime: "17:00", category: "STANDARD", sortOrder: 4 },
    { name: "Support 3", code: "S3", startTime: "08:00", endTime: "17:00", category: "STANDARD", sortOrder: 5 },
    { name: "Support 4", code: "S4", startTime: "08:00", endTime: "17:00", category: "STANDARD", sortOrder: 6 },
    { name: "Support 5 (A2 Desk)", code: "S5", startTime: "09:00", endTime: "18:00", location: "A2 Desk @4.15pm", category: "STANDARD", sortOrder: 7 },
    { name: "Support 6 (A2 Desk)", code: "S6", startTime: "09:00", endTime: "18:00", location: "A2 Desk @4.15pm", category: "STANDARD", sortOrder: 8 },
    { name: "Support 7", code: "S7", startTime: "09:00", endTime: "18:00", category: "STANDARD", sortOrder: 9 },
    { name: "Support 8", code: "S8", startTime: "09:00", endTime: "18:00", category: "STANDARD", sortOrder: 10 },
    { name: "Support 9", code: "S9", startTime: "09:00", endTime: "18:00", category: "STANDARD", sortOrder: 11 },
    { name: "Support 10", code: "S10", startTime: "09:00", endTime: "18:00", category: "STANDARD", sortOrder: 12 },
    { name: "Support 11", code: "S11", startTime: "09:00", endTime: "18:00", category: "STANDARD", sortOrder: 13 },
    { name: "Saturday", code: "SAT", startTime: "09:00", endTime: "15:00", category: "WEEKEND", sortOrder: 14 },
    { name: "Sunday", code: "SUN", startTime: "09:00", endTime: "15:00", category: "WEEKEND", sortOrder: 15 },
  ]

  for (const shift of shiftTypes) {
    await prisma.shiftType.upsert({
      where: { code: shift.code },
      update: {},
      create: shift,
    })
  }

  console.log("Seeded shift types")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
