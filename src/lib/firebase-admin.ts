import "server-only";
import admin from "firebase-admin";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// Prevent multiple initializations in development
if (!admin.apps.length) {
    const serviceAccountPath = join(process.cwd(), "service-account.json");

    // 1. Prioritize Service Account (Local Development)
    if (existsSync(serviceAccountPath)) {
        try {
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("🔥 Firebase Admin initialized with Service Account (Local)");
            console.log("📂 Loading Credential from:", serviceAccountPath);
        } catch (error) {
            console.error("❌ Failed to load Service Account:", error);
        }
    } else {
        // 2. Fallback: Default Credentials (Production / Vercel / Cloud Functions)
        try {
            admin.initializeApp();
            console.log("🔥 Firebase Admin initialized with Default Credentials (Cloud)");
        } catch (error) {
            console.warn("⚠️ Firebase Admin Init Failed (Cloud Mode). Check credentials.");
        }
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
