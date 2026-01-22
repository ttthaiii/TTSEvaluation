'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Loader2, Database, UserPlus, FileJson, CheckCircle, AlertTriangle } from 'lucide-react';

// Only allow in Emulator Mode
const IS_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

export default function SeederPage() {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        if (!IS_EMULATOR) {
            setLogs(prev => [...prev, "❌ Warning: This page should only be used in Emulator Mode!"]);
        } else {
            setLogs(prev => [...prev, "✅ Connected to Emulator Mode. Ready to seed."]);
        }
    }, []);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const seedData = async () => {
        if (!IS_EMULATOR) return alert("Not in Emulator Mode!");
        setLoading(true);
        addLog("🚀 Starting Seeder API...");

        try {
            const res = await fetch('/api/emulator/seed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Unknown error');
            }

            if (data.logs && Array.isArray(data.logs)) {
                data.logs.forEach((l: string) => addLog(l));
            }

            addLog("✅ Seeding Completed Successfully!");

        } catch (error: any) {
            addLog(`❌ Error seeding: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Consolidated Auto-Seed or Manual Trigger
    const seedUsers = seedData;
    const seedRules = () => addLog("ℹ️ Rules are now seeded together with Users in the API.");

    if (!IS_EMULATOR) {
        return (
            <div className="flex h-screen items-center justify-center bg-red-50 p-4">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-200 max-w-md">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-red-700 mb-2">Production Mode Detected</h1>
                    <p className="text-slate-600">
                        This seeding tool is disabled in production to prevent data loss.
                        <br />
                        Please start the app with <code>NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true</code>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-indigo-100 rounded-xl">
                            <Database className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Emulator Data Seeder</h1>
                            <p className="text-slate-500">Generate test data for the safe sandbox environment</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={seedUsers}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                            <UserPlus className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                            <div className="text-left">
                                <div className="font-bold text-slate-700 group-hover:text-blue-700">Seed Users</div>
                                <div className="text-sm text-slate-400">Admin, Manager, Employee</div>
                            </div>
                        </button>

                        <button
                            onClick={seedRules}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-green-500 hover:bg-green-50 transition-all group"
                        >
                            <FileJson className="w-8 h-8 text-slate-400 group-hover:text-green-600" />
                            <div className="text-left">
                                <div className="font-bold text-slate-700 group-hover:text-green-700">Seed Rules</div>
                                <div className="text-sm text-slate-400">Formulas & Criteria</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Logs Console */}
                <div className="bg-slate-900 rounded-xl p-6 shadow-lg h-96 overflow-y-auto font-mono text-sm">
                    <div className="flex items-center justify-between mb-2 text-slate-400 border-b border-slate-700 pb-2">
                        <span>Console Output</span>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
                    </div>
                    <div className="space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className="text-green-400">{log}</div>
                        ))}
                        {logs.length === 0 && <div className="text-slate-600 italic">Ready...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
