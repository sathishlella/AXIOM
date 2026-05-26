"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Plus, Calendar, Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface Roster {
  id: string
  name: string
  month: number
  year: number
  status: string
  createdAt: string
  createdBy: { name: string | null; initials: string | null }
  _count: { weeks: number }
}

async function fetchRosters(): Promise<Roster[]> {
  const res = await fetch("/api/rosters")
  if (!res.ok) throw new Error("Failed to fetch rosters")
  return res.json()
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function RostersPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))

  const { data: rosters, isLoading } = useQuery({
    queryKey: ["rosters"],
    queryFn: fetchRosters,
  })

  const createRoster = useMutation({
    mutationFn: async (data: { name: string; month: number; year: number }) => {
      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create roster")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rosters"] })
      setOpen(false)
      setName("")
      toast.success("Roster created successfully")
    },
    onError: () => {
      toast.error("Failed to create roster")
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createRoster.mutate({
      name,
      month: parseInt(month),
      year: parseInt(year),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Rosters</h1>
          <p className="text-slate-400">Manage duty rosters and shift assignments.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-slate-900 hover:bg-slate-200 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Roster
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Roster</DialogTitle>
              <DialogDescription className="text-slate-400">
                Set up a new monthly duty roster for your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Roster Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q2 June Duty Roster"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {months.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)} className="text-white">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Year</Label>
                  <Input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    type="number"
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  className="bg-white text-slate-900 hover:bg-slate-200"
                  disabled={createRoster.isPending}
                >
                  {createRoster.isPending ? "Creating..." : "Create Roster"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rosters?.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-lg font-medium text-white">No rosters yet</p>
            <p className="text-sm text-slate-400">Create your first duty roster to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rosters?.map((roster) => (
            <Link key={roster.id} href={`/rosters/${roster.id}`}>
              <Card className="border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={
                        roster.status === "PUBLISHED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : roster.status === "DRAFT"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-slate-800 text-slate-400"
                      }
                    >
                      {roster.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-white mt-2">{roster.name}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {months[roster.month - 1]} {roster.year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {roster._count.weeks} weeks
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {roster.createdBy.initials || roster.createdBy.name}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
