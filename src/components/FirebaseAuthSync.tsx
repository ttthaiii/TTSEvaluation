"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function FirebaseAuthSync() {
    const { data: session, status } = useSession();

    useEffect(() => {
        (async () => {
            if (status === "authenticated" && session) {
                try {
                    const currentUser = auth.currentUser;
                    const sessionUserId = session.user.employeeId || session.user.email;

                    if (currentUser && currentUser.uid === sessionUserId) {
                        return;
                    }

                    console.log("🔄 Syncing Firebase Auth...");

                    // ✅ ไม่ต้องส่ง Authorization header เพราะใช้ session cookie
                    const response = await fetch("/api/auth/firebase-token");

                    if (!response.ok) {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.error || `Failed to fetch token: ${response.status}`);
                    }

                    const { token } = await response.json();
                    await signInWithCustomToken(auth, token);
                    console.log("✅ Firebase Auth Synced!");
                } catch (error: any) {
                    console.error("❌ Firebase Sync Error:", error);
                }
            } else if (status === "unauthenticated" && auth.currentUser) {
                await signOut(auth);
            }
        })();
    }, [session, status]);

    return null;
}