"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Send,
  ChevronLeft,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Employee {
  id: string
  name: string | null
  initials: string | null
}

interface ShiftType {
  id: string
  name: string
  code: string
  startTime: string
  category: string
}

interface Assignment {
  id: string
  employeeId: string
  shiftTypeId: string
  weekId: string
  notes: string | null
  employee: Employee
  shiftType: { id: string; name: string; code: string }
}

interface Week {
  id: string
  weekLabel: string
  startDate: string
  endDate: string
  assignments: Assignment[]
}

interface RosterData {
  roster: {
    id: string
    name: string
    month: number
    year: number
    status: string
    createdBy: { name: string | null; initials: string | null }
    weeks: Week[]
  }
  shiftTypes: ShiftType[]
  employees: Employee[]
}

async function fetchRoster(id: string): Promise<RosterData> {
  const res = await fetch(`/api/rosters/${id}`)
  if (!res.ok) throw new Error("Failed to fetch roster")
  return res.json()
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function RosterDetailPage() {
  const params = useParams()
  const rosterId = params.id as string
  const queryClient = useQueryClient()
  const [conflicts, setConflicts] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ["roster", rosterId],
    queryFn: () => fetchRoster(rosterId),
  })

  const assignMutation = useMutation({
    mutationFn: async (payload: {
      weekId: string
      shiftTypeId: string
      employeeId: string
    }) => {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to assign")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster", rosterId] })
    },
    onError: () => {
      toast.error("Failed to update assignment")
    },
  })

  const autoScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId }),
      })
      if (!res.ok) throw new Error("Failed to auto-schedule")
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["roster", rosterId] })
      if (data.conflicts?.length) {
        setConflicts(data.conflicts)
        toast.warning(`Auto-scheduled with ${data.conflicts.length} conflicts`)
      } else {
        setConflicts([])
        toast.success("Auto-schedule completed successfully")
      }
    },
    onError: () => {
      toast.error("Auto-schedule failed")
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/rosters/${rosterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      })
      if (!res.ok) throw new Error("Failed to publish")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster", rosterId] })
      toast.success("Roster published successfully")
    },
    onError: () => {
      toast.error("Failed to publish roster")
    },
  })

  const sendEmailsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rosterId }),
      })
      if (!res.ok) throw new Error("Failed to send emails")
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Sent ${data.sent} emails (${data.failed} failed)`)
    },
    onError: () => {
      toast.error("Failed to send emails")
    },
  })

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/rosters/${rosterId}/import`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Import failed")
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["roster", rosterId] })
      if (data.warnings?.length) {
        toast.warning(`Imported ${data.imported} shifts with ${data.warnings.length} warnings`)
      } else {
        toast.success(`Imported ${data.imported} shifts successfully`)
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleDownload = async (format: string) => {
    const res = await fetch(`/api/rosters/${rosterId}/export?format=${format}`)
    if (!res.ok) {
      toast.error("Download failed")
      return
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv"
    a.download = `${data?.roster.name.replace(/\s+/g, "_")}_${data?.roster.year}_${data?.roster.month}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    toast.success(`Downloaded ${ext.toUpperCase()} file`)
  }

  const handleAssign = (weekId: string, shiftTypeId: string, employeeId: string) => {
    assignMutation.mutate({ weekId, shiftTypeId, employeeId })
  }

  const getAssignment = (weekId: string, shiftTypeId: string) => {
    const week = data?.roster.weeks.find((w) => w.id === weekId)
    return week?.assignments.find((a) => a.shiftTypeId === shiftTypeId)
  }

  // Detect conflicts manually
  const detectConflicts = () => {
    const newConflicts: string[] = []
    if (!data) return newConflicts

    for (const week of data.roster.weeks) {
      const counts: Record<string, number> = {}
      for (const a of week.assignments) {
        counts[a.employeeId] = (counts[a.employeeId] || 0) + 1
        if (counts[a.employeeId] > 2) {
          newConflicts.push(
            `Week ${week.weekLabel}: ${a.employee.name} is assigned to 3+ shifts`
          )
        }
      }
    }
    return newConflicts
  }

  const allConflicts = [...conflicts, ...detectConflicts()]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-white">Roster not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/rosters"
            className="flex items-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Rosters
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {data.roster.name}
            </h1>
            <Badge
              variant="secondary"
              className={
                data.roster.status === "PUBLISHED"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : data.roster.status === "DRAFT"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-slate-800 text-slate-400"
              }
            >
              {data.roster.status}
            </Badge>
          </div>
          <p className="text-slate-400">
            {months[data.roster.month - 1]} {data.roster.year} · Created by{" "}
            {data.roster.createdBy.name || data.roster.createdBy.initials}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            id="excel-import"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importMutation.mutate(file)
              e.target.value = ""
            }}
          />
          <Button
            variant="outline"
            className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => document.getElementById("excel-import")?.click()}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import Excel
          </Button>
          <Button
            variant="outline"
            className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
            onClick={() => autoScheduleMutation.mutate()}
            disabled={autoScheduleMutation.isPending}
          >
            {autoScheduleMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Auto-Schedule
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
              <DropdownMenuItem
                onClick={() => handleDownload("csv")}
                className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700"
              >
                <FileCode className="mr-2 h-4 w-4 text-emerald-400" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("xlsx")}
                className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-400" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload("pdf")}
                className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700"
              >
                <FileText className="mr-2 h-4 w-4 text-red-400" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {data.roster.status !== "PUBLISHED" && (
            <Button
              className="bg-white text-slate-900 hover:bg-slate-200"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          )}
          {data.roster.status === "PUBLISHED" && (
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={() => sendEmailsMutation.mutate()}
              disabled={sendEmailsMutation.isPending}
            >
              {sendEmailsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Emails
            </Button>
          )}
        </div>
      </div>

      {/* Conflicts */}
      {allConflicts.length > 0 && (
        <Card className="border-red-900/50 bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {allConflicts.length} Conflict{allConflicts.length > 1 ? "s" : ""} Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {allConflicts.map((c, i) => (
                <li key={i} className="text-sm text-red-300">
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Roster Grid */}
      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-4 text-slate-400 font-medium whitespace-nowrap">
                    Week
                  </th>
                  {data.shiftTypes.map((st) => (
                    <th
                      key={st.id}
                      className="text-left p-4 text-slate-400 font-medium min-w-[140px]"
                    >
                      <div className="flex flex-col">
                        <span>{st.name}</span>
                        <span className="text-xs text-slate-600">{st.startTime}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.roster.weeks.map((week) => (
                  <tr key={week.id} className="border-b border-slate-800/50">
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{week.weekLabel}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(week.startDate).toLocaleDateString()} -{" "}
                          {new Date(week.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    {data.shiftTypes.map((st) => {
                      const assignment = getAssignment(week.id, st.id)
                      return (
                        <td key={st.id} className="p-2">
                          <Select
                            value={assignment?.employeeId || ""}
                            onValueChange={(value) =>
                              handleAssign(week.id, st.id, value)
                            }
                          >
                            <SelectTrigger
                              className={`bg-slate-800 border-slate-700 text-white h-10 ${
                                assignment
                                  ? "border-l-4 border-l-emerald-500"
                                  : ""
                              }`}
                            >
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {data.employees.map((emp) => (
                                <SelectItem
                                  key={emp.id}
                                  value={emp.id}
                                  className="text-white"
                                >
                                  <span className="font-mono text-xs text-slate-400 mr-2">
                                    {emp.initials}
                                  </span>
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-800 border-l-4 border-l-emerald-500 rounded" />
          <span>Assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded" />
          <span>Unassigned</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>Select an employee from the dropdown to assign</span>
        </div>
      </div>
    </div>
  )
}
