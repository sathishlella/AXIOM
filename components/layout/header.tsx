"use client"

import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function Header() {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <div>
        <h2 className="text-sm font-medium text-slate-400">
          Taylor&apos;s University - ICT Service Desk
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="bg-slate-800 text-slate-300">
          {user?.role}
        </Badge>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.name || user?.email}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <Avatar className="h-8 w-8 border border-slate-700">
            <AvatarFallback className="bg-slate-800 text-white text-xs">
              {user?.initials || user?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
