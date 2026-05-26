"use client"

import { useSession } from "next-auth/react"
import { Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SidebarNavContent } from "./sidebar"

export function Header() {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-slate-950 border-r border-slate-800 p-0">
            <SidebarNavContent />
          </SheetContent>
        </Sheet>

        <h2 className="text-sm font-medium text-slate-400 truncate">
          Taylor&apos;s University - ICT Service Desk
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <Badge variant="secondary" className="bg-slate-800 text-slate-300 hidden sm:inline-flex">
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
