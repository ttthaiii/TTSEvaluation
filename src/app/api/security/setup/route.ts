import { NextResponse } from 'next/server';
// import { db } from '@/lib/firebase'; // Client SDK removed to prevent permission errors
// Note: In Next.js API routes, we might need Firebase Admin SDK for privileged operations if we restrict 'system_keys' collection.
// However, for this demo, we'll assume the same 'db' (Client SDK) has access if rules allow, 
// OR simpler: we use crypto-js here on server side.

import CryptoJS from 'crypto-js';
import { getServerSecret } from '@/lib/server-secret';
// import { doc, setDoc } from 'firebase/firestore'; // Client SDK functions removed

// Helper to generate random MK
const generateMasterKey = () => {
    return CryptoJS.lib.WordArray.random(32).toString();
};

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password too short' }, { status: 400 });
        }

        // 1. Generate Master Key (MK)
        const masterKey = generateMasterKey();

        // 2. Encrypt MK with User Password (KEK-User)
        const keyUserWrapped = CryptoJS.AES.encrypt(masterKey, password).toString();

        // 3. Encrypt MK with Server Secret (KEK-Server)
        const serverSecret = getServerSecret();
        const keyRecoveryWrapped = CryptoJS.AES.encrypt(masterKey, serverSecret).toString();

        // 4. Save to Firestore (Assuming public/writable 'system_keys/salary_security' for now, or secured via rules)
        // In prod, use Admin SDK to bypass rules if rules are strict.
        // 4. Save to Firestore
        // 🔥 Use Admin SDK to bypass security rules (PERMISSION_DENIED fix)
        // Dynamic import to be safe (though API routes are Node, this pattern is consistent)
        // Note: Admin SDK syntax is different: db.collection().doc().set()
        const { getAdminDb } = await import('@/lib/firebase-admin');
        const db = getAdminDb();

        await db.collection('system_keys').doc('salary_security').set({
            keyUserWrapped,
            keyRecoveryWrapped,
            setupAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Setup failed:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
