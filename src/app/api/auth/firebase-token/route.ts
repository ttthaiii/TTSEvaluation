import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
    try {
        console.log("🔐 Starting token creation...");

        const session = await auth();

        if (!session || !session.user) {
            console.log("❌ No session found");
            return NextResponse.json(
                { error: "Unauthorized: No session" },
                { status: 401 }
            );
        }

        // ✅ เพิ่ม validation และ type guard
        const userId = session.user.employeeId || session.user.email;

        if (!userId) {
            console.log("❌ No user ID found");
            return NextResponse.json(
                { error: "Unauthorized: No user identifier" },
                { status: 401 }
            );
        }

        console.log("📝 Creating token for user:", userId);

        const adminAuth = getAdminAuth();
        console.log("✅ Firebase Admin Auth instance ready");

        // ✅ ตอนนี้ TypeScript รู้แล้วว่า userId เป็น string แน่นอน
        const customToken = await adminAuth.createCustomToken(userId);
        console.log("✅ Custom token created");

        return NextResponse.json({
            token: customToken,
            uid: userId,
        });
    } catch (error: any) {
        console.error("❌ Error in firebase-token route:");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Stack:", error.stack);

        return NextResponse.json(
            {
                error: "Internal Server Error",
                message: error.message,
                code: error.code,
            },
            { status: 500 }
        );
    }
}