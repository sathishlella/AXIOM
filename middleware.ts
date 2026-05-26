import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Protect admin/manager routes
    if (path.startsWith("/employees") || path.startsWith("/settings")) {
      if (token?.role !== "ADMIN" && token?.role !== "MANAGER") {
        return NextResponse.redirect(new URL("/rosters", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        if (token) return true
        return false
      },
    },
  }
)

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
}
