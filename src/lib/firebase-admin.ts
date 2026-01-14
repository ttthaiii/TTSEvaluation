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

        // Development: Service Account (สำหรับ Localhost)
        const { readFileSync, existsSync } = require("fs");
        const { join } = require("path");

        const serviceAccountPath = join(process.cwd(), "service-account.json");

        if (!existsSync(serviceAccountPath)) {
            throw new Error("❌ service-account.json not found");
        }

        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

        // แก้ไข \n ใน private key กรณีเก็บใน env variable หรือ json string
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        console.log("✅ Using Service Account (Local)");
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
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