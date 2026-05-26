"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2, Plus, UserPlus, AlertTriangle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface Employee {
  id: string
  name: string | null
  email: string
  initials: string | null
  isBuddy: boolean
  isActive: boolean
  createdAt: string
}

async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch("/api/employees")
  if (!res.ok) throw new Error("Failed to fetch employees")
  return res.json()
}

export default function EmployeesPage() {
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  })

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (data: {
      name: string
      email: string
      initials: string
      isBuddy: boolean
    }) => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to add employee")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      setIsAddOpen(false)
      toast.success("Employee added successfully")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string
      name: string
      email: string
      initials: string
      isBuddy: boolean
      isActive: boolean
    }) => {
      const res = await fetch(`/api/employees/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update employee")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      setEditingEmployee(null)
      toast.success("Employee updated successfully")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete employee")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      setDeletingEmployee(null)
      toast.success("Employee deleted successfully")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Toggle active inline
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
    onError: () => toast.error("Failed to update status"),
  })

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    addMutation.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      initials: formData.get("initials") as string,
      isBuddy: formData.get("isBuddy") === "on",
    })
  }

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingEmployee) return
    const form = e.currentTarget
    const formData = new FormData(form)
    updateMutation.mutate({
      id: editingEmployee.id,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      initials: formData.get("initials") as string,
      isBuddy: formData.get("isBuddy") === "on",
      isActive: formData.get("isActive") === "on",
    })
  }

  const activeCount = employees?.filter((e) => e.isActive).length || 0
  const totalCount = employees?.length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Employees</h1>
          <p className="text-slate-400">Manage your ICT team members and their roles.</p>
        </div>
        <Button
          className="bg-white text-slate-900 hover:bg-slate-200"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Team Directory</CardTitle>
          <CardDescription className="text-slate-400">
            {activeCount} active / {totalCount} total members in the ICT Service Desk
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-slate-800" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Employee</TableHead>
                  <TableHead className="text-slate-400">Initials</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Buddy</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((emp) => (
                  <TableRow key={emp.id} className="border-slate-800">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-slate-700">
                          <AvatarFallback className="bg-slate-800 text-white text-xs">
                            {emp.initials || emp.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-white">{emp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 font-mono text-sm">
                      {emp.initials}
                    </TableCell>
                    <TableCell className="text-slate-400">{emp.email}</TableCell>
                    <TableCell>
                      {emp.isBuddy ? (
                        <Badge className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                          Buddy
                        </Badge>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={emp.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: emp.id, isActive: checked })
                          }
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <span
                          className={
                            emp.isActive ? "text-emerald-400 text-sm" : "text-slate-500 text-sm"
                          }
                        >
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                          onClick={() => setEditingEmployee(emp)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                          onClick={() => setDeletingEmployee(emp)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Employee
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new team member for the ICT Service Desk.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Full Name</Label>
              <Input name="name" placeholder="e.g., A. Sathish" required className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input name="email" type="email" placeholder="name@taylors.edu.my" required className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Initials</Label>
              <Input name="initials" placeholder="e.g., AS" maxLength={3} required className="bg-slate-800 border-slate-700 text-white uppercase" />
            </div>
            <div className="flex items-center gap-3 py-2">
              <Switch id="add-buddy" name="isBuddy" className="data-[state=checked]:bg-blue-500" />
              <Label htmlFor="add-buddy" className="text-slate-300 cursor-pointer">
                Buddy Trainer (can shadow new hires)
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" className="bg-white text-slate-900 hover:bg-slate-200" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Employee
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Update {editingEmployee?.name}&apos;s profile and settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Full Name</Label>
              <Input name="name" defaultValue={editingEmployee?.name || ""} required className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input name="email" type="email" defaultValue={editingEmployee?.email || ""} required className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Initials</Label>
              <Input name="initials" defaultValue={editingEmployee?.initials || ""} maxLength={3} required className="bg-slate-800 border-slate-700 text-white uppercase" />
            </div>
            <div className="flex items-center gap-3 py-2">
              <Switch id="edit-buddy" name="isBuddy" defaultChecked={editingEmployee?.isBuddy} className="data-[state=checked]:bg-blue-500" />
              <Label htmlFor="edit-buddy" className="text-slate-300 cursor-pointer">
                Buddy Trainer
              </Label>
            </div>
            <div className="flex items-center gap-3 py-2">
              <Switch id="edit-active" name="isActive" defaultChecked={editingEmployee?.isActive} className="data-[state=checked]:bg-emerald-500" />
              <Label htmlFor="edit-active" className="text-slate-300 cursor-pointer">
                Active Employee
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingEmployee(null)} className="border-slate-700 text-white hover:bg-slate-800">
                Cancel
              </Button>
              <Button type="submit" className="bg-white text-slate-900 hover:bg-slate-200" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Delete Employee
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete <strong className="text-white">{deletingEmployee?.name}</strong>? This action cannot be undone.
              <br /><br />
              <span className="text-amber-400 text-sm">
                Note: Employees with roster history cannot be deleted. They will be deactivated instead.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEmployee && deleteMutation.mutate(deletingEmployee.id)}
              className="bg-red-600 text-white hover:bg-red-500"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
