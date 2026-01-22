import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

// 🔥 Create a lightweight auth helper for Edge Middleware
// This avoids importing 'auth.ts' which contains Node.js-only code (Admin SDK)
const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    // DEBUG: Temporarily disable redirect to check if session exists on client
    // console.log("Middleware Auth State:", isLoggedIn)

    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/employees');

    if (isOnDashboard) {
        if (!isLoggedIn) {
            return Response.redirect(new URL('/login', req.nextUrl))
        }
    }

    if (isAdminRoute) {
        if (!isLoggedIn) {
            return Response.redirect(new URL('/login', req.nextUrl))
        }
        const userRole = (req.auth?.user as any)?.role;
        if (userRole !== 'Admin') {
            return Response.redirect(new URL('/dashboard', req.nextUrl))
        }
    }
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
