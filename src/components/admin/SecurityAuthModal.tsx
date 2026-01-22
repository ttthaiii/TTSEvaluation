'use client';

import React, { useState } from 'react';
import { useSecurity } from '@/context/SecurityContext'; // Adjust path as needed
import { Lock, AlertCircle } from 'lucide-react';
import { validateKey } from '@/utils/security';

export default function SecurityAuthModal() {
    const { isAuthenticated, setMasterKey } = useSecurity();
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');

    if (isAuthenticated) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateKey(inputKey)) {
            setError('รหัสผ่านสั้นเกินไป (ต้องมีอย่างน้อย 4 ตัวอักษร)');
            return;
        }
        setMasterKey(inputKey);
        setError('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 transform transition-all scale-100">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">ระบบปรับเงินเดือน/โบนัส</h2>
                    <p className="text-slate-500 text-center mt-2">
                        กรุณากรอก <strong>Master Key</strong> เพื่อเข้าถึงข้อมูล<br />
                        <span className="text-xs text-red-500 mt-1 block">
                            (หากระบุผิด จะไม่สามารถอ่านข้อมูลเก่าได้)
                        </span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center tracking-widest"
                            placeholder="กรอกรหัสผ่าน..."
                            autoFocus
                        />
                        {error && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm justify-center">
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
                    >
                        ปลดล็อกระบบ
                    </button>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 text-center">
                            ระบบนี้ใช้การเข้ารหัสแบบ Client-Side Encryption <br />
                            Developer ไม่สามารถเข้าถึงข้อมูลของคุณได้
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
