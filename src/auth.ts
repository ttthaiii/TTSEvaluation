import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { db } from "./lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                username: { label: "Employee ID", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.username || !credentials?.password) {
                    return null
                }

                try {
                    // 🔥 Admin Login Bypass (Hardcoded)
                    if (credentials.username === 'admin' && credentials.password === 'admin') {
                        return {
                            id: 'admin-user',
                            name: 'Administrator',
                            email: 'admin@company.com',
                            employeeId: 'admin',
                            role: 'Admin',
                            image: ''
                        }
                    }

                    // 1. Query User (Check Employee ID OR Username)
                    const usersRef = collection(db, "users")

                    // A. Try Employee ID first
                    let q = query(usersRef, where("employeeId", "==", credentials.username))
                    let querySnapshot = await getDocs(q)

                    if (querySnapshot.empty) {
                        // B. Try Custom Username if ID not found
                        q = query(usersRef, where("username", "==", credentials.username))
                        querySnapshot = await getDocs(q)
                    }

                    if (querySnapshot.empty) {
                        console.log("❌ User not found")
                        return null
                    }

                    const userDoc = querySnapshot.docs[0]
                    const userData = userDoc.data()

                    // 2. Validate Password
                    // Priority: 1. Custom Password (in DB)  2. Default (Employee ID)
                    let isValid = false;
                    if (userData.password && userData.password.length > 0) {
                        isValid = credentials.password === userData.password;
                    } else {
                        isValid = credentials.password === userData.employeeId;
                    }

                    if (!isValid) {
                        console.log("❌ Invalid password")
                        return null
                    }

                    // 3. Check for Validator Rights (Must be Admin OR Have Subordinates)
                    let isEvaluator = false;
                    if (userData.role === 'Admin') {
                        isEvaluator = true;
                    } else {
                        // Check if this user is an evaluator for anyone
                        const subQuery = query(usersRef, where("evaluatorId", "==", userData.employeeId));
                        const subSnapshot = await getDocs(subQuery);
                        if (!subSnapshot.empty) {
                            isEvaluator = true;
                        }
                    }

                    if (!isEvaluator) {
                        console.log("❌ User has no evaluation rights")
                        return null
                    }

                    // 4. Return User Object
                    return {
                        id: userDoc.id,
                        name: `${userData.firstName} ${userData.lastName}`,
                        email: userData.email || `${userData.employeeId}@company.com`,
                        image: userData.image || "",
                        employeeId: userData.employeeId,
                        role: userData.role || "User",
                    }
                } catch (error) {
                    console.error("Auth Error:", error)
                    return null
                }
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    // 🔥 Fixed: Fallback secret for dev environment
    secret: process.env.AUTH_SECRET || "development-secret-key-1234",
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.employeeId = (user as any).employeeId
                token.role = (user as any).role
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).employeeId = token.employeeId;
                (session.user as any).role = token.role;
            }
            return session
        }
    }
})
