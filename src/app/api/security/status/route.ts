import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// API สำหรับตรวจสอบสถานะว่าระบบ Security ถูก Setup แล้วหรือยัง (Check if Security System is setup)
// ใช้ Admin SDK เพื่อ bypass Firestore Rules (Use Admin SDK to bypass Firestore Rules)
export async function GET() {
    try {
        // ดึง Firestore Admin instance (Get Firestore Admin instance)
        const adminDb = getAdminDb();

        // ตรวจสอบว่ามี Document system_keys/salary_security หรือไม่ (Check if system_keys document exists)
        const docRef = adminDb.collection('system_keys').doc('salary_security');
        const snap = await docRef.get();

        if (!snap.exists) {
            // ยังไม่ได้ Setup (Not setup yet)
            console.log('🔍 System not setup yet');
            return NextResponse.json({ isSetup: false });
        }

        const data = snap.data();
        // ตรวจสอบว่ามี keyUserWrapped (User Wrapped Key) หรือไม่ (Check if user wrapped key exists)
        const isSetup = !!(data?.keyUserWrapped);

        console.log('✅ Security status:', { isSetup });
        return NextResponse.json({ isSetup });
    } catch (error: any) {
        // แสดง error แบบละเอียดเพื่อ debug (Show detailed error for debugging)
        console.error('❌ Status check failed:', error);
        console.error('Error details:', error.message || error);
        return NextResponse.json(
            {
                error: 'Failed to check status',
                details: error.message || String(error),
                isSetup: false
            },
            { status: 500 }
        );
    }
}
