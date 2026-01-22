'use client';

import React, { useState } from 'react';
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSecurity } from '@/context/SecurityContext';

export default function SetupSecurityModal({ onSetupComplete }: { onSetupComplete: () => void }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'ideal' | 'form'>('ideal');

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        if (password !== confirmPassword) {
            setError('รหัสผ่านยืนยันไม่ตรงกัน');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/security/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Setup failed');

            onSetupComplete();

        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการตั้งค่า');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'ideal') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">ตั้งค่าความปลอดภัยระบบเงินเดือน</h2>
                        <p className="text-slate-500 mt-2">
                            ระบบจะทำการสร้างกุญแจเข้ารหัส (Master Key) และล็อกไว้ด้วยรหัสผ่านของคุณ
                        </p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800">
                                <strong>ปลอดภัยสูงสุด:</strong> Developer หรือผู้ดูแลระบบ ไม่สามารถเข้าถึงข้อมูลเงินเดือนได้
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <strong>กู้คืนได้:</strong> หากลืมรหัสผ่าน สามารถใช้ระบบกู้คืนผ่าน Server Secret ได้ (ปลอดภัยและสะดวก)
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setStep('form')}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
                    >
                        เริ่มตั้งค่ารหัสผ่าน
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">กำหนดรหัสผ่านเข้าถึงข้อมูล</h2>

                <form onSubmit={handleSetup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน (ใช้สำหรับปลดล็อก)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่าน</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                            placeholder="กรอกอีกครั้ง"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm justify-center bg-red-50 p-2 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200 disabled:bg-slate-300 flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'บันทึกและเริ่มใช้งาน'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
