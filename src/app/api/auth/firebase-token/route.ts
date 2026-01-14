import { auth } from "@/auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // 1. Verify NextAuth Session
        const session = await auth();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).employeeId || session.user.email;
        if (!userId) {
            return NextResponse.json({ error: "No User ID found" }, { status: 400 });
        }

        // 2. Create Custom Token via Admin SDK (Lazy Init)
        const adminAuth = getAdminAuth();

        // We use the employeeId as the Firebase UID to keep things consistent
        const firebaseToken = await adminAuth.createCustomToken(userId, {
            role: (session.user as any).role || 'User',
            name: session.user.name
        });

        return NextResponse.json({ token: firebaseToken });

    } catch (error) {
        console.error("Error minting token:", error);
        return NextResponse.json({ error: "Internal Server Error: " + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}
