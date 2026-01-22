import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import CryptoJS from 'crypto-js';
import { getServerSecret } from '@/lib/server-secret';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        // Recovery logic:
        // We do NOT need old password. We rely on the fact that this API is called securely.
        // In a real app, this should be protected by Auth (Admin only).

        const { newPassword } = await request.json();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'Password too short' }, { status: 400 });
        }

        // 1. Fetch encrypted keys
        const keyDocRef = doc(db, 'system_keys', 'salary_security');
        const keySnap = await getDoc(keyDocRef);

        if (!keySnap.exists()) {
            return NextResponse.json({ error: 'System not setup yet' }, { status: 404 });
        }

        const data = keySnap.data();
        const { keyRecoveryWrapped } = data;

        if (!keyRecoveryWrapped) {
            return NextResponse.json({ error: 'Recovery key not found' }, { status: 500 });
        }

        // 2. Decrypt MK using Server Secret
        const serverSecret = getServerSecret();
        const masterKeyBytes = CryptoJS.AES.decrypt(keyRecoveryWrapped, serverSecret);
        const masterKey = masterKeyBytes.toString(CryptoJS.enc.Utf8);

        if (!masterKey) {
            return NextResponse.json({ error: 'Recovery failed: Invalid Server Secret or Corrupted Key' }, { status: 500 });
        }

        // 3. Re-encrypt MK with NEW Password
        const newKeyUserWrapped = CryptoJS.AES.encrypt(masterKey, newPassword).toString();

        // 4. Update Firestore
        await updateDoc(keyDocRef, {
            keyUserWrapped: newKeyUserWrapped,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Recovery failed:', error);
        return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
    }
}
