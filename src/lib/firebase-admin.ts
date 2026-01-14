import "server-only";
import admin from "firebase-admin";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

let initError: string | null = null;
let isInitialized = false;

function initializeFirebase() {
    if (isInitialized) return;

    if (admin.apps.length > 0) {
        isInitialized = true;
        return;
    }

    try {
        const serviceAccountPath = join(process.cwd(), "service-account.json");

        // 1. Prioritize Service Account (Local Development)
        if (existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("🔥 Firebase Admin initialized with Service Account (Local)");
            isInitialized = true;
            return;
        }

        // 2. Environment Variable (Production / Vercel / CI)
        const envKey = process.env.APP_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (envKey) {
            try {
                let jsonStr = envKey;
                // Basic cleanup if user included single quotes wrapping the JSON
                if (jsonStr.startsWith("'") && jsonStr.endsWith("'")) {
                    jsonStr = jsonStr.slice(1, -1);
                }

                const serviceAccount = JSON.parse(jsonStr);

                // Critical Fix: Replace \\n with \n
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log("🔥 Firebase Admin initialized with APP_SERVICE_ACCOUNT_KEY");
                isInitialized = true;
                return;
            } catch (err: any) {
                console.error("❌ Failed to parse Service Account Env Var:", err);
                initError = `Invalid JSON in APP_SERVICE_ACCOUNT_KEY: ${err.message}`;
                // Do not return here, try fallback
            }
        }

        // 3. Fallback: Default Credentials
        admin.initializeApp();
        console.log("🔥 Firebase Admin initialized with Default Credentials (Cloud)");
        isInitialized = true;

    } catch (error: any) {
        console.error("⚠️ Firebase Admin Init Failed:", error);
        initError = `Firebase Init Failed: ${error.message}`;
    }
}

export const getAdminAuth = () => {
    initializeFirebase();
    if (initError) {
        throw new Error(initError);
    }
    if (!admin.apps.length) {
        throw new Error("Firebase Admin not initialized (No Apps found)");
    }
    return admin.auth();
};

export const getAdminDb = () => {
    initializeFirebase();
    if (initError) {
        throw new Error(initError);
    }
    return admin.firestore();
};
