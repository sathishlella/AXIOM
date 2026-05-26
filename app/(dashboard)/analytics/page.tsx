"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

interface Roster {
  id: string
  name: string
  month: number
  year: number
}

interface AnalyticsData {
  coverage: Array<{ weekLabel: string; assigned: number; total: number; percentage: number }>
  workload: Array<{ id: string; name: string; initials: string; shifts: number; hours: number }>
  weekendEquity: Array<{ name: string; count: number }>
  shiftDistribution: Array<{ name: string; count: number }>
  categoryBreakdown: Record<string, number>
  totalAssignments: number
}

async function fetchRosters(): Promise<Roster[]> {
  const res = await fetch("/api/rosters")
  if (!res.ok) throw new Error("Failed to fetch rosters")
  return res.json()
}

async function fetchAnalytics(rosterId: string): Promise<AnalyticsData> {
  const res = await fetch(`/api/analytics?rosterId=${rosterId}`)
  if (!res.ok) throw new Error("Failed to fetch analytics")
  return res.json()
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"]

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function AnalyticsPage() {
  const [selectedRoster, setSelectedRoster] = useState("")

  const { data: rosters, isLoading: rostersLoading } = useQuery({
    queryKey: ["rosters"],
    queryFn: fetchRosters,
  })

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics", selectedRoster],
    queryFn: () => fetchAnalytics(selectedRoster),
    enabled: !!selectedRoster,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-slate-400">Workload insights and coverage reports.</p>
        </div>
        <Select value={selectedRoster} onValueChange={setSelectedRoster}>
          <SelectTrigger className="w-64 bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Select a roster" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {rosters?.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-white">
                {r.name} ({months[r.month - 1]} {r.year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedRoster ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-white">Select a roster to view analytics</p>
            <p className="text-sm text-slate-400 mt-2">Choose from the dropdown above</p>
          </CardContent>
        </Card>
      ) : analyticsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 bg-slate-800" />
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Total Assignments</CardDescription>
                <CardTitle className="text-3xl text-white">{analytics.totalAssignments}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Avg Coverage</CardDescription>
                <CardTitle className="text-3xl text-white">
                  {Math.round(
                    analytics.coverage.reduce((s, c) => s + c.percentage, 0) /
                      analytics.coverage.length
                  )}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Active Employees</CardDescription>
                <CardTitle className="text-3xl text-white">{analytics.workload.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Weekend Shifts</CardDescription>
                <CardTitle className="text-3xl text-white">
                  {analytics.categoryBreakdown.WEEKEND || 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Coverage Chart */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Weekly Coverage</CardTitle>
              <CardDescription className="text-slate-400">
                Assigned shifts vs total available slots per week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.coverage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="weekLabel" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="assigned" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" fill="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Employee Workload */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Employee Workload</CardTitle>
              <CardDescription className="text-slate-400">
                Total shifts assigned per employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.workload} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="initials" type="category" stroke="#94a3b8" width={50} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="shifts" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Weekend Equity */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Weekend Equity</CardTitle>
                <CardDescription className="text-slate-400">
                  Saturday & Sunday shift distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analytics.weekendEquity}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, value }: any) => `${name}: ${value}`}
                    >
                      {analytics.weekendEquity.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Shift Category Breakdown</CardTitle>
                <CardDescription className="text-slate-400">
                  Early, Standard, and Weekend shifts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analytics.categoryBreakdown).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          category === "EARLY"
                            ? "bg-amber-500/10 text-amber-400"
                            : category === "WEEKEND"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-blue-500/10 text-blue-400"
                        }
                      >
                        {category}
                      </Badge>
                      <span className="text-slate-300">{count} shifts</span>
                    </div>
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={
                          category === "EARLY"
                            ? "bg-amber-500"
                            : category === "WEEKEND"
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        }
                        style={{
                          width: `${(count / analytics.totalAssignments) * 100}%`,
                          height: "100%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
