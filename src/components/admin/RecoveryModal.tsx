'use client';

import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function RecoveryModal({ onClose, onRecoverySuccess }: { onClose: () => void, onRecoverySuccess: () => void }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'confirm' | 'form'>('confirm');

    const handleRecover = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('รหัสผ่านยืนยันไม่ตรงกัน');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/security/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Recovery failed');

            onRecoverySuccess();

        } catch (err: any) {
            setError(err.message || 'การกู้คืนล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'confirm') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-orange-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการกู้คืนรหัสผ่าน?</h2>
                    <p className="text-slate-500 mb-6 text-sm">
                        ระบบจะใช้ <strong>Server Secret</strong> เพื่อดึง Master Key ออกมา <br />และทำการตั้งค่ารหัสผ่านใหม่ให้คุณ
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={() => setStep('form')}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            ดำเนินการต่อ
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <h2 className="text-xl font-bold text-slate-900 text-center mb-6">ตั้งรหัสผ่านใหม่</h2>

                <form onSubmit={handleRecover} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่านใหม่</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
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
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'รีเซ็ตรหัสผ่าน'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 mt-2 text-slate-400 font-medium hover:text-slate-600 transition-colors"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
