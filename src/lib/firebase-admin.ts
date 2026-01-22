import "server-only";
import admin from "firebase-admin";

// ฟังก์ชันหลักสำหรับดึง Instance ของ Firebase Admin
function getFirebaseAdmin() {
    // ✅ แก้ไข: ตรวจสอบว่ามี App ถูกสร้างไว้แล้วหรือไม่
    if (admin.apps.length > 0) {
        // 👇 เพิ่ม Log เพื่อตรวจสอบชื่อ App ที่แท้จริง (Debug)
        console.log("🔥 Found existing apps:", admin.apps.length);
        console.log("🔥 App Name [0]:", admin.apps[0]?.name);

        // ✅ แก้ไข: ให้คืนค่า App ตัวแรกที่เจอเสมอ (ปลอดภัยกว่าการเรียก admin.app() ที่หาแต่ชื่อ [DEFAULT])
        return admin.apps[0]!;
    }

    try {
        console.log("🔥 Initializing Firebase Admin...");
        console.log("📍 Environment:", process.env.NODE_ENV);

        // Production: Default Credentials (สำหรับ Cloud Run / App Engine)
        if (process.env.NODE_ENV === 'production') {
            console.log("✅ Using Default Credentials (Cloud Run)");
            return admin.initializeApp({
                projectId: 'tts2004evaluation'
            });
        }

        // Emulator Mode
        if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
            console.log("🛠️ Using Firebase Emulator (Admin SDK)");
            process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
            process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

            return admin.initializeApp({
                projectId: 'tts2004evaluation'
            });
        }

        // Development: Service Account (สำหรับ Localhost - Non Emulator)
        const { readFileSync, existsSync } = require("fs");
        const { join } = require("path");

        const serviceAccountPath = join(process.cwd(), "service-account.json");

        if (!existsSync(serviceAccountPath)) {
            // Fallback if no service account but not explicitly in emulator mode
            console.warn("⚠️ service-account.json not found. If using emulator, ensure NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true");
        }

        if (existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            console.log("✅ Using Service Account (Local)");
            return admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }

        // Final fallback (might work if logged in via gcloud CLI)
        return admin.initializeApp({
            projectId: 'tts2004evaluation'
        });

    } catch (error: any) {
        console.error("❌ Firebase Admin Init Failed:", error.message);
        throw error;
    }
}

export const getAdminAuth = () => {
    return getFirebaseAdmin().auth();
};

export const getAdminDb = () => {
    return getFirebaseAdmin().firestore();
};