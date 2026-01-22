'use client';

import React, { useState } from 'react';
import { useSecurity } from '@/context/SecurityContext';
import { Lock, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CryptoJS from 'crypto-js';

export default function UnlockSecurityModal({ onUnlockSuccess, onForgotPassword }: { onUnlockSuccess: () => void, onForgotPassword: () => void }) {
    const { isAuthenticated, setMasterKey } = useSecurity();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) return null;

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Fetch User Wrapped Key
            const docRef = doc(db, 'system_keys', 'salary_security');
            const snap = await getDoc(docRef);

            if (!snap.exists()) {
                throw new Error('System Keys not found. Please setup first.');
            }

            const { keyUserWrapped } = snap.data();
            if (!keyUserWrapped) {
                throw new Error('User Key not found.');
            }

            // 2. Decrypt MK with Password
            const mkBytes = CryptoJS.AES.decrypt(keyUserWrapped, password);
            const mkString = mkBytes.toString(CryptoJS.enc.Utf8);

            if (!mkString) {
                throw new Error('รหัสผ่านไม่ถูกต้อง');
            }

            // 3. Success -> Store MK in Context
            setMasterKey(mkString);
            onUnlockSuccess();

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Unlock failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all scale-100">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">ปลดล็อกข้อมูลเงินเดือน</h2>
                    <p className="text-slate-500 text-center mt-2">
                        กรุณากรอกรหัสผ่านเพื่อถอดรหัส Master Key
                    </p>
                </div>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center tracking-widest"
                            placeholder="รหัสผ่าน..."
                            autoFocus
                        />
                        {error && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm justify-center bg-red-50 p-2 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200 disabled:bg-slate-300 flex justify-center items-center"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'ปลดล็อก'}
                    </button>

                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-sm text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                        >
                            <KeyRound className="w-3 h-3" />
                            ฉันลืมรหัสผ่าน (กู้คืนด้วย Server Secret)
                        </button>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 text-center">
                            Key Wrapping Architecture <br />
                            Master Key ถูกล็อก 2 ชั้นเพื่อความปลอดภัยและกู้คืนได้ (Managed by Server)
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
