"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Building2, Mail, Clock, Bell, Save, Loader2, TestTube } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface ShiftType {
  id: string
  name: string
  code: string
  startTime: string
  endTime: string
  location: string | null
  category: string
  requiresBuddy: boolean
  sortOrder: number
}

async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch("/api/settings")
  if (!res.ok) throw new Error("Failed to fetch settings")
  return res.json()
}

async function fetchShiftTypes(): Promise<ShiftType[]> {
  const res = await fetch("/api/shift-types")
  if (!res.ok) throw new Error("Failed to fetch shift types")
  return res.json()
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({})

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  })

  useEffect(() => {
    if (settings) setSettingsForm(settings)
  }, [settings])

  const { data: shiftTypes, isLoading: shiftTypesLoading } = useQuery({
    queryKey: ["shift-types"],
    queryFn: fetchShiftTypes,
  })

  const updateSettings = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.success("Settings saved")
    },
    onError: () => toast.error("Failed to save settings"),
  })

  const testEmail = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      })
      if (!res.ok) throw new Error("Test failed")
      return res.json()
    },
    onSuccess: () => toast.success("Test email sent"),
    onError: () => toast.error("Test email failed"),
  })

  const handleSave = () => {
    updateSettings.mutate(settingsForm)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-slate-400">Organization preferences and system configuration.</p>
      </div>

      {settingsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 bg-slate-800" />
          ))}
        </div>
      ) : (
        <>
          {/* Organization */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription className="text-slate-400">
                Display name and branding used in emails and exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Organization Name</Label>
                  <Input
                    value={settingsForm.org_name || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, org_name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Department</Label>
                  <Input
                    value={settingsForm.org_department || ""}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, org_department: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Configuration */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription className="text-slate-400">
                Resend API key and sender address for shift notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Resend API Key</Label>
                  <Input
                    type="password"
                    value={settingsForm.resend_api_key || ""}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, resend_api_key: e.target.value })
                    }
                    placeholder="re_xxxxxxxx"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">From Address</Label>
                  <Input
                    value={settingsForm.email_from || ""}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, email_from: e.target.value })
                    }
                    placeholder="roster@taylors.edu.my"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="border-slate-700 text-white hover:bg-slate-800"
                  onClick={() => testEmail.mutate()}
                  disabled={testEmail.isPending}
                >
                  {testEmail.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="mr-2 h-4 w-4" />
                  )}
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-slate-400">
                Control automatic email behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-white font-medium">Email on Publish</p>
                  <p className="text-sm text-slate-400">
                    Automatically send shift emails when a roster is published
                  </p>
                </div>
                <Switch
                  checked={settingsForm.notify_on_publish === "true"}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, notify_on_publish: String(checked) })
                  }
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shift Types */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Shift Types
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage the shift lanes available in roster builder
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shiftTypesLoading ? (
                <Skeleton className="h-40 bg-slate-800" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Code</TableHead>
                      <TableHead className="text-slate-400">Time</TableHead>
                      <TableHead className="text-slate-400">Location</TableHead>
                      <TableHead className="text-slate-400">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftTypes?.map((st) => (
                      <TableRow key={st.id} className="border-slate-800">
                        <TableCell className="text-white">{st.name}</TableCell>
                        <TableCell className="text-slate-300 font-mono text-sm">{st.code}</TableCell>
                        <TableCell className="text-slate-400">
                          {st.startTime} - {st.endTime}
                        </TableCell>
                        <TableCell className="text-slate-400">{st.location || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              st.category === "EARLY"
                                ? "bg-amber-500/10 text-amber-400"
                                : st.category === "WEEKEND"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-blue-500/10 text-blue-400"
                            }
                          >
                            {st.category}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              className="bg-white text-slate-900 hover:bg-slate-200"
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save All Settings
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
