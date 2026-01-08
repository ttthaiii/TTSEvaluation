import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        user: {
            employeeId?: string
            role?: string
            id?: string
        } & DefaultSession["user"]
    }

    interface User {
        employeeId?: string
        role?: string
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        employeeId?: string
        role?: string
        id?: string
    }
}
