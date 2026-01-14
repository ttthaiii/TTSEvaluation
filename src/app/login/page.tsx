'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        console.log("🔵 Attempting login...", { username });

        try {
            const result = await signIn('credentials', {
                username,
                password,
                redirect: false,
            });

            console.log("🟡 SignIn Result:", result);

            if (result?.error) {
                console.error("🔴 Login failed with error:", result.error);
                setError('Username หรือ Password ไม่ถูกต้อง');
            } else {
                console.log("🟢 Login success! Redirecting to /dashboard...");
                console.log("🟢 Login success! Redirecting to /dashboard...");
                // FORCE RELOAD: Fixes 'Node cannot be found' and ensures cookies are sent correctly
                window.location.href = '/dashboard';
            }
        } catch (err) {
            console.error("💥 Exception during login:", err);
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4 sm:px-6">
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4 shadow-sm">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
                    <p className="text-slate-500 mt-2 text-sm sm:text-base">ระบบประเมินผลการปฏิบัติงาน</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 sm:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-colors text-base"
                                placeholder="กรอก Username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            รหัสผ่าน
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 sm:py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-colors text-base"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 sm:py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base"
                    >
                        {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>
            </div>
        </div>
    );
}
