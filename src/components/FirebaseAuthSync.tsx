'use client';

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { signInWithCustomToken, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Client SDK

export default function FirebaseAuthSync() {
    const { data: session, status } = useSession();

    useEffect(() => {
        const syncAuth = async () => {
            if (status === 'authenticated' && session) {
                try {
                    // 1. Check if already signed in to Firebase with correct user
                    const currentUser = auth.currentUser;
                    const sessionUid = (session.user as any).employeeId || session.user.email;

                    if (currentUser && currentUser.uid === sessionUid) {
                        return; // Already synced
                    }

                    console.log("🔄 Syncing Firebase Auth...");

                    // 2. Request Custom Token from our API
                    const response = await fetch('/api/auth/firebase-token');
                    if (!response.ok) throw new Error('Failed to fetch token');

                    const { token } = await response.json();

                    // 3. Sign in to Firebase Client SDK
                    await signInWithCustomToken(auth, token);
                    console.log("✅ Firebase Auth Synced!");

                } catch (error) {
                    console.error("❌ Firebase Sync Error:", error);
                }
            } else if (status === 'unauthenticated') {
                // Logout from Firebase if NextAuth is logged out
                if (auth.currentUser) {
                    await firebaseSignOut(auth);
                }
            }
        };

        syncAuth();
    }, [session, status]);

    return null; // This component renders nothing
}
