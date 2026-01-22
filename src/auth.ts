import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "./auth.config"

// 🔥 Client SDK is removed
// 🔥 Admin SDK will be imported dynamically to support Edge Runtime in Middleware

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
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
                    console.log("🔐 Authorize called for:", credentials.username);

                    // 🔥 Admin Login Bypass (Hardcoded)
                    if (credentials.username === 'admin' && credentials.password === 'admin') {
                        console.log("✅ Admin Bypass Success");
                        return {
                            id: 'admin-user',
                            name: 'Administrator',
                            email: 'admin@company.com',
                            employeeId: 'admin',
                            role: 'Admin',
                            image: ''
                        }
                    }

                    // 1. Query User using ADMIN SDK (Bypasses Rules)
                    // 🚀 DYNAMIC IMPORT: Fix "Node.js API not supported in Edge Runtime"
                    // Middleware imports this file but runs on Edge. Admin SDK is Node-only.
                    const { getAdminDb } = await import("./lib/firebase-admin");
                    const db = getAdminDb();
                    const usersRef = db.collection("users");

                    let querySnapshot;

                    // A. Try Employee ID
                    console.log("🔍 Searching ID:", credentials.username);
                    querySnapshot = await usersRef.where("employeeId", "==", credentials.username).get();
                    console.log("   > Found via ID:", !querySnapshot.empty);

                    if (querySnapshot.empty) {
                        // B. Try Username
                        console.log("🔍 Searching Username:", credentials.username);
                        querySnapshot = await usersRef.where("username", "==", credentials.username).get();
                        console.log("   > Found via Username:", !querySnapshot.empty);
                    }

                    if (querySnapshot.empty) {
                        // C. Try Email
                        console.log("🔍 Searching Email:", credentials.username);
                        querySnapshot = await usersRef.where("email", "==", credentials.username).get();
                        console.log("   > Found via Email:", !querySnapshot.empty);
                    }

                    if (querySnapshot.empty) {
                        console.log("❌ User not found in DB");
                        return null
                    }

                    const userDoc = querySnapshot.docs[0];
                    const userData = userDoc.data();
                    console.log("👤 User Found:", userData.firstName, userData.email, "Role:", userData.role);

                    // 🔥 SPECIAL RULE
                    if (userData.employeeId === '100348') {
                        userData.role = 'Admin';
                    }

                    // 2. Validate Password
                    let isValid = false;
                    console.log("🔑 Checking Password...");

                    if (userData.password && userData.password.length > 0) {
                        isValid = credentials.password === userData.password;
                    } else {
                        isValid = credentials.password === userData.employeeId;
                    }

                    if (!isValid) {
                        console.log("❌ Invalid password mismatch");
                        return null
                    }

                    // 3. User Found
                    console.log("✅ Login Successful for:", userData.email);

                    return {
                        id: userDoc.id,
                        name: `${userData.firstName} ${userData.lastName}`,
                        email: userData.email || `${userData.employeeId}@company.com`,
                        image: userData.image || "",
                        employeeId: userData.employeeId,
                        role: userData.role || "User",
                    }
                } catch (error) {
                    console.error("🔥 Auth Crash/Error:", error)
                    return null
                }
            },
        }),
    ],
})
