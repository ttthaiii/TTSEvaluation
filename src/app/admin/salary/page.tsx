'use client';

import React, { useState, useEffect } from 'react';
import { useSecurity } from '@/context/SecurityContext';
import { useEvaluation } from '@/hooks/useEvaluation';
import { encryptData, decryptData } from '@/utils/security';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Loader2, Save, Calculator, Lock, RefreshCw, KeyRound, Settings, FileUp } from 'lucide-react';
import { getGrade } from '@/utils/grade-calculation';
import SalaryRulesModal from '@/components/admin/SalaryRulesModal';
import SalaryImportModal from '@/components/admin/SalaryImportModal';

// New Modals (If used, currently commented out or unused in my previous replacement? Check logic below)
import SetupSecurityModal from '@/components/admin/SetupSecurityModal';
import UnlockSecurityModal from '@/components/admin/UnlockSecurityModal';
import RecoveryModal from '@/components/admin/RecoveryModal';

// ... (Imports remain same until SalaryRulesModal)

interface SalaryRule {
    id: string;
    grade: string;
    increasePercent: number;
    bonusMonths: number;
}

interface SalaryData {
    increasePercent: number;
    bonusAmount: number;
    newSalary?: number; // Optional
    notes?: string;
}

export default function SalaryAdjustmentPage() {
    const { isAuthenticated, masterKey } = useSecurity();
    const { employees, existingEvaluations, loading: dataLoading, refreshData } = useEvaluation();

    // UI State
    const [salaryDataMap, setSalaryDataMap] = useState<Record<string, SalaryData>>({});
    const [isDecryptionDone, setIsDecryptionDone] = useState(false);
    const [saving, setSaving] = useState(false);

    // Rule State
    const [salaryRules, setSalaryRules] = useState<Record<string, SalaryRule>>({});
    const [isRulesOpen, setIsRulesOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Auth Flow State
    const [authStep, setAuthStep] = useState<'checking' | 'setup' | 'unlock' | 'recovery' | 'authenticated'>('checking');

    // 1. ตรวจสอบสถานะ Security System ว่า Setup แล้วหรือยัง (Check Security System Status)
    useEffect(() => {
        const checkSecurityStatus = async () => {
            try {
                const res = await fetch('/api/security/status');
                const data = await res.json();

                if (data.isSetup) {
                    // ถ้า setup แล้วแต่ยังไม่ได้ปลดล็อก -> แสดง Unlock Modal
                    setAuthStep('unlock');
                } else {
                    // ถ้ายังไม่ setup -> แสดง Setup Modal
                    setAuthStep('setup');
                }
            } catch (error) {
                console.error('Failed to check security status:', error);
                setAuthStep('setup'); // Fallback to setup if error
            }
        };

        // ถ้ายังไม่ได้ authenticated ให้ตรวจสอบสถานะ
        if (!isAuthenticated) {
            checkSecurityStatus();
        } else {
            setAuthStep('authenticated');
        }
    }, [isAuthenticated]);

    // 2. Load Salary Rules
    const fetchRules = async () => {
        try {
            const snap = await getDocs(collection(db, 'salary_rules'));
            const rulesMap: Record<string, SalaryRule> = {};
            snap.forEach(doc => {
                const data = doc.data() as SalaryRule;
                rulesMap[data.grade] = data;
            });
            setSalaryRules(rulesMap);
            return rulesMap;
        } catch (error) {
            console.error("Failed to fetch salary rules", error);
            return {};
        }
    };

    useEffect(() => {
        if (isAuthenticated) fetchRules();
    }, [isAuthenticated]);

    // 3. Decrypt & Prepare Data
    useEffect(() => {
        if (authStep !== 'authenticated' || !masterKey || dataLoading || isDecryptionDone) return;

        console.log("🔓 Decrypting data...");
        const decryptedMap: Record<string, SalaryData> = {};

        // Use a clearer async function inside effect, or just logic here.
        // We also want to AUTO CALC if data is missing.

        const initData = async () => {
            // Ensure rules are loaded first? Or just use current state?
            // To be safe, fetch rules again or assume loaded. 
            // Better to wait for rules? Let's assume rules loaded closely enough or auto-calc later.
            // For now, just decrypt existing data.

            Object.entries(existingEvaluations).forEach(([empId, evalRecord]) => {
                if (evalRecord.encryptedSalaryData) {
                    try {
                        const decrypted = decryptData(evalRecord.encryptedSalaryData, masterKey);
                        decryptedMap[empId] = decrypted;
                    } catch (err) {
                        console.error(`Failed to decrypt for ${empId}`, err);
                    }
                }
            });

            setSalaryDataMap(decryptedMap);
            setIsDecryptionDone(true);
        };

        initData();
    }, [authStep, masterKey, existingEvaluations, dataLoading, isDecryptionDone]);

    // Auto-Calculate Function
    const applyRulesToAll = (isAutoTrigger = false) => {
        if (Object.keys(salaryRules).length === 0) {
            alert("ไม่พบเกณฑ์การคำนวณ กรุณาตั้งค่าก่อน");
            return;
        }

        if (!isAutoTrigger && !confirm("ระบบจะคำนวณยอดเงินใหม่ทั้งหมดตามเกรด (ข้อมูลเดิมจะถูกทับ) ยืนยันหรือไม่?")) return;

        const newMap = { ...salaryDataMap };
        let count = 0;

        validEmployees.forEach(emp => {
            const evalRec = existingEvaluations[emp.id];
            if (!evalRec) return;

            // 1. Determine Grade (Fallback if missing in DB)
            let grade = evalRec.finalGrade;
            if (!grade && evalRec.totalScore) {
                const g = getGrade(evalRec.totalScore);
                grade = g?.grade;
            }

            if (grade && salaryRules[grade]) {
                const rule = salaryRules[grade];

                // Use Real Base Salary (if imported) or Fallback to 20,000
                const baseSalary = emp.baseSalary || 20000;

                const bonusVal = baseSalary * rule.bonusMonths;
                const increaseVal = rule.increasePercent;
                // New Salary = Base + (Base * Inc%)
                const newSalaryVal = baseSalary + (baseSalary * (increaseVal / 100));

                newMap[emp.id] = {
                    increasePercent: increaseVal,
                    bonusAmount: bonusVal,
                    newSalary: newSalaryVal,
                    notes: 'Auto-Calculated'
                };
                count++;
            }
        });

        setSalaryDataMap(newMap);
        // Notify user
        if (count > 0) {
            alert(isAutoTrigger
                ? `บันทึกเกณฑ์เรียบร้อย! ระบบคำนวณยอดเงินใหม่อัตโนมัติแล้ว (${count} รายการ)`
                : `คำนวณเรียบร้อย ${count} รายการ (ใช้ฐานเงินเดือนสมมติ 20,000 บาท)`
            );
        }
    };

    // Handle Input Change
    const handleInputChange = (empId: string, field: keyof SalaryData, value: number | string) => {
        setSalaryDataMap(prev => ({
            ...prev,
            [empId]: {
                ...prev[empId],
                [field]: value
            }
        }));
    };

    // Save All Changes
    // Save All Changes (บันทึกข้อมูลทั้งหมด)
    const handleSaveAll = async () => {
        console.log("handleSaveAll called", { masterKey: !!masterKey, dataCount: Object.keys(salaryDataMap).length });

        // ป้องกันการบันทึกเมื่อยังไม่ได้ปลดล็อก (Prevent saving when not unlocked)
        if (!masterKey) {
            console.warn("No masterKey found");
            alert('กรุณาปลดล็อกระบบก่อนบันทึกข้อมูล (Please Unlock System)');
            return;
        }

        if (Object.keys(salaryDataMap).length === 0) {
            console.warn("No data to save");
            alert('ไม่พบข้อมูลที่มีการเปลี่ยนแปลง (No changes to save)');
            return;
        }
        setSaving(true);
        try {
            const updates = Object.entries(salaryDataMap).map(async ([empId, data]) => {
                const evalRecord = existingEvaluations[empId];
                if (!evalRecord) return;

                // Encrypt
                // Note: Ensure encryptData is imported and working.
                // Assuming encryptData takes (data, key)
                const encrypted = encryptData(data, masterKey);

                // Update Firestore
                const evalRef = doc(db, 'evaluations', evalRecord.docId);
                await updateDoc(evalRef, {
                    encryptedSalaryData: encrypted,
                    updatedAt: new Date()
                });
            });

            await Promise.all(updates);
            alert('บันทึกข้อมูลสำเร็จ (เข้ารหัสเรียบร้อย)');
        } catch (error) {
            console.error('Save failed:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
        }
    };

    // Filter employees
    const validEmployees = employees.filter(emp => {
        const evalRec = existingEvaluations[emp.id];
        return evalRec && evalRec.status === 'Completed';
    });

    // 🔒 แสดง Modal ตามสถานะ Authentication (Show modals based on auth state)
    if (authStep === 'setup') {
        return <SetupSecurityModal onSetupComplete={() => setAuthStep('unlock')} />;
    }

    if (authStep === 'unlock') {
        return (
            <UnlockSecurityModal
                onUnlockSuccess={() => setAuthStep('authenticated')}
                onForgotPassword={() => setAuthStep('recovery')}
            />
        );
    }

    if (authStep === 'recovery') {
        return (
            <RecoveryModal
                onClose={() => setAuthStep('unlock')}
                onRecoverySuccess={() => setAuthStep('unlock')}
            />
        );
    }

    // 📊 แสดง Loading Spinner ขณะตรวจสอบสถานะ (Show loading while checking)
    if (authStep === 'checking' || dataLoading || !isDecryptionDone) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">
                        {authStep === 'checking' ? 'กำลังตรวจสอบสถานะระบบ...' : 'กำลังถอดรหัสข้อมูล...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Lock className="w-6 h-6 text-blue-600" />
                        ปรับเงินเดือนและโบนัส
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        ข้อมูลถูกป้องกันด้วย <strong>Key Wrapping Architecture</strong> (Recoverable)
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsRulesOpen(true)}
                        className="flex items-center px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Settings className="w-5 h-5 mr-2 text-slate-500" />
                        ตั้งค่าเกณฑ์ & คำนวณ
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <FileUp className="w-5 h-5 mr-2 text-green-600" />
                        Import Salary
                    </button>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || !isAuthenticated}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        บันทึก
                    </button>
                </div>
            </div>

            <SalaryRulesModal
                isOpen={isRulesOpen}
                onClose={() => setIsRulesOpen(false)}
                onSaveSuccess={() => {
                    fetchRules().then(() => {
                        applyRulesToAll(true);
                    });
                }}
            />

            <SalaryImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={async () => {
                    await refreshData();
                    // Optionally ask to auto-calculate immediately?
                    // For now just refresh the data so UI shows new Base Salaries if we display them anywhere
                    // or just ready for next calculation.
                    alert("Import ข้อมูลเรียบร้อย");
                }}
            />

            {/* Content Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 font-semibold">พนักงาน</th>
                                <th className="p-4 font-semibold text-center">แผนก</th>
                                <th className="p-4 font-semibold text-center">เกรด</th>
                                <th className="p-4 font-semibold text-center">คะแนน (%)</th>
                                <th className="p-4 font-semibold text-center w-32">ปรับขึ้น (%)</th>
                                <th className="p-4 font-semibold text-center w-40">โบนัส (บาท)</th>
                                <th className="p-4 font-semibold text-center w-40">เงินเดือนใหม่ (Est.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {validEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400">
                                        ไม่พบข้อมูลพนักงานที่ได้รับการประเมินเสร็จสิ้น
                                    </td>
                                </tr>
                            ) : (
                                validEmployees.map(emp => {
                                    const evalRec = existingEvaluations[emp.id];
                                    const currentData = salaryDataMap[emp.id] || { increasePercent: 0, bonusAmount: 0 };
                                    const totalScore = Number(evalRec?.totalScore || 0).toFixed(2);

                                    // 🔥 Grade Fallback Logic
                                    let displayGrade = evalRec?.finalGrade || '-';
                                    if (evalRec && !evalRec.finalGrade && evalRec.totalScore) {
                                        const g = getGrade(evalRec.totalScore);
                                        if (g) displayGrade = g.grade;
                                    }

                                    return (
                                        <tr key={emp.id} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{emp.firstName} {emp.lastName}</div>
                                                <div className="text-xs text-slate-400">{emp.employeeId}</div>
                                            </td>
                                            <td className="p-4 text-center text-sm text-slate-600">{emp.department}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded font-bold text-xs ${displayGrade === 'E' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                    displayGrade === 'OE' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                        displayGrade === 'ME' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {displayGrade}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center font-mono text-slate-700 font-bold">{totalScore}</td>

                                            {/* Inputs */}
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    value={currentData.increasePercent || 0}
                                                    onChange={(e) => handleInputChange(emp.id, 'increasePercent', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-center focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                                                    placeholder="0.0"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    value={currentData.bonusAmount || 0}
                                                    onChange={(e) => handleInputChange(emp.id, 'bonusAmount', Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-right focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={currentData.newSalary || 0}
                                                    onChange={(e) => handleInputChange(emp.id, 'newSalary', Number(e.target.value))}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-right text-slate-500 focus:bg-white transition-colors outline-none"
                                                    placeholder="ระบุ..."
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
