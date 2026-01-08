import { auth } from "./auth"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')

    if (isOnDashboard && !isLoggedIn) {
        return Response.redirect(new URL('/login', req.nextUrl))
    }

    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/employees');
    if (isAdminRoute) {
        if (!isLoggedIn) {
            return Response.redirect(new URL('/login', req.nextUrl))
        }
        const userRole = (req.auth?.user as any)?.role;
        if (userRole !== 'Admin') {
            // Redirect non-admins to dashboard
            return Response.redirect(new URL('/dashboard', req.nextUrl))
        }
    }
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
