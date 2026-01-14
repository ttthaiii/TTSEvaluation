import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { X, TrendingUp, History, Loader2 } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { getGrade, GRADE_COLOR_MAP } from '@/utils/grade-calculation';

interface EvaluationHistoryModalProps {
    employeeId: string;
    employeeName: string;
    onClose: () => void;
}

interface HistoryRecord {
    year: number;
    score: number;
    grade: string;
    evaluator: string;
}

export const EvaluationHistoryModal: React.FC<EvaluationHistoryModalProps> = ({ employeeId, employeeName, onClose }) => {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const q = query(
                    collection(db, 'evaluations'),
                    where('employeeDocId', '==', employeeId)
                );

                const snapshot = await getDocs(q);
                const data: HistoryRecord[] = [];

                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.totalScore || d.finalGrade) {
                        const score = Number(d.totalScore || 0);
                        let grade = d.finalGrade;

                        // 🔥 Calculate Grade if missing
                        if (!grade || grade === '-') {
                            const calculated = getGrade(score);
                            grade = calculated ? calculated.grade : '-';
                        }

                        data.push({
                            year: d.evaluationYear || 0,
                            score: score,
                            grade: grade,
                            evaluator: d.evaluatorName || "-"
                        });
                    }
                });

                // Sort by Year
                data.sort((a, b) => a.year - b.year);
                setHistory(data);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        if (employeeId) {
            fetchHistory();
        }
    }, [employeeId]);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-hidden">
            {/* Backdrop Click to Close */}
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 relative z-10 m-auto">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <History className="w-5 h-5 text-orange-600" />
                            ประวัติการประเมิน
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">พนักงาน: <span className="font-semibold text-gray-700">{employeeName}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-orange-500" />
                            <p>กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>ยังไม่มีประวัติการประเมินย้อนหลัง</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* 1. Trend Chart */}
                            <div className="h-64 w-full">
                                <h3 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    แนวโน้มผลคะแนน (Trend)
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="year"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#f97316"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#fff', stroke: '#f97316', strokeWidth: 2 }}
                                            activeDot={{ r: 6, fill: '#f97316' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* 2. Detailed Table */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-600 mb-3">รายละเอียดรายปี</h3>
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3">ปีการประเมิน</th>
                                                <th className="px-4 py-3 text-center">เกรด</th>
                                                <th className="px-4 py-3 text-right">คะแนนรวม</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {history.map((rec) => (
                                                <tr key={rec.year} className="hover:bg-orange-50/30 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-gray-700">{rec.year}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span
                                                            className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm"
                                                            style={{ backgroundColor: GRADE_COLOR_MAP[rec.grade] || '#9ca3af' }}
                                                        >
                                                            {rec.grade || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                        {rec.score > 0 ? rec.score.toFixed(2) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
