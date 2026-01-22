'use client';

import React, { useEffect, useState } from 'react';
// Dialog imports removed as we use custom UI
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { GRADE_RANGES, GRADE_COLOR_MAP } from '@/utils/grade-calculation';

interface SalaryRule {
    id: string; // Grade
    grade: string;
    increasePercent: number | string;
    bonusMonths: number | string;
    condition?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export default function SalaryRulesModal({ isOpen, onClose, onSaveSuccess }: Props) {
    const [rules, setRules] = useState<SalaryRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        if (!isOpen) return;

        const fetchRules = async () => {
            setLoading(true);
            try {
                const snap = await getDocs(collection(db, 'salary_rules'));
                if (!snap.empty) {
                    const loadedRules = snap.docs.map(d => d.data() as SalaryRule);
                    setRules(loadedRules);
                } else {
                    // Fallback init if empty (though seeder should handle this)
                    const defaults = GRADE_RANGES.map(g => ({
                        id: g.grade,
                        grade: g.grade,
                        increasePercent: 0,
                        bonusMonths: 0,
                        condition: g.label
                    }));
                    setRules(defaults);
                }
            } catch (err) {
                console.error("Failed to load rules", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRules();
    }, [isOpen]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            rules.forEach(rule => {
                const ref = doc(db, 'salary_rules', rule.id);
                // Convert string inputs back to numbers for storage
                const dataToSave = {
                    ...rule,
                    increasePercent: rule.increasePercent === '' ? 0 : Number(rule.increasePercent),
                    bonusMonths: rule.bonusMonths === '' ? 0 : Number(rule.bonusMonths)
                };
                batch.set(ref, dataToSave);
            });
            await batch.commit();
            onSaveSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to save rules", err);
            alert("บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (id: string, field: keyof SalaryRule, value: string) => {
        setRules(prev => prev.map(r => {
            if (r.id !== id) return r;
            return { ...r, [field]: value };
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        ⚙️ ตั้งค่าเกณฑ์การปรับเงินเดือน
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        ✕
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-yellow-800">
                                    <strong>คำเตือน:</strong> เมื่อกด "บันทึก" ระบบจะคำนวณเงินเดือนใหม่ของพนักงานทุกคนตามเกณฑ์นี้ทันที
                                    (ข้อมูลที่เคยแก้ไข Manual ไว้จะถูกแทนที่ด้วยค่าจากการคำนวณ)
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                                        <tr>
                                            <th className="p-3">เกรด (Grade)</th>
                                            <th className="p-3 text-right">ปรับขึ้น (% Increase)</th>
                                            <th className="p-3 text-right">โบนัส (Months)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {rules.map((rule) => (
                                            <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 font-bold">
                                                    <span
                                                        className="px-3 py-1 rounded-md text-xs shadow-sm"
                                                        style={{
                                                            color: GRADE_COLOR_MAP[rule.grade] || '#333',
                                                            border: `1px solid ${GRADE_COLOR_MAP[rule.grade] || '#ddd'}40`,
                                                            backgroundColor: `${GRADE_COLOR_MAP[rule.grade] || '#fff'}15`
                                                        }}
                                                    >
                                                        {rule.grade}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        className="w-full text-right p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                                                        value={rule.increasePercent}
                                                        onChange={e => handleChange(rule.id, 'increasePercent', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.25"
                                                        className="w-full text-right p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                                                        value={rule.bonusMonths}
                                                        onChange={e => handleChange(rule.id, 'bonusMonths', e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 font-bold shadow-md transition-transform active:scale-95"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        บันทึกการตั้งค่า
                    </button>
                </div>
            </div>
        </div>
    );
}
