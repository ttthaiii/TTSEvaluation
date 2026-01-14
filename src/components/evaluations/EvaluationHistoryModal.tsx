import React, { useEffect, useState } from 'react';
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
    BarChart,
    Bar,
    Cell
} from 'recharts';

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

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // Fetch evaluations for this employee
                // Note: We use 'employeeDocId' as the key based on previous context, 
                // or 'employeeId' if that's how it's stored. The current system seems to use 'employeeDocId' for the link.
                // Let's assume passed 'employeeId' is the Doc ID or the String ID? 
                // In EmployeeInfoCard, employee.employeeId is the "CODE" (e.g. EMP-001) and employee.id is Key.
                // The evaluations are stored with 'employeeDocId' matching user.id

                // Let's rely on the passed employeeId being the Doc ID (because EmployeeInfoCard has employee.id).

                const q = query(
                    collection(db, 'evaluations'),
                    where('employeeDocId', '==', employeeId)
                );

                const snapshot = await getDocs(q);
                const data: HistoryRecord[] = [];

                snapshot.forEach(doc => {
                    const d = doc.data();
                    // Determine Score: totalScore > disciplineScore ? logic?
                    // Usually totalScore holds the final.
                    if (d.totalScore || d.finalGrade) {
                        data.push({
                            year: d.evaluationYear || 0,
                            score: Number(d.totalScore || 0),
                            grade: d.finalGrade || "-",
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

        fetchHistory();
    }, [employeeId]);

    // Determine Chart Color based on Grade (Mock logic or reusable)
    const getGradeColor = (grade: string) => {
        if (grade === 'A') return '#22c55e'; // Green
        if (grade === 'B') return '#3b82f6'; // Blue
        if (grade === 'C') return '#eab308'; // Yellow
        if (grade === 'D') return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
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
                                                            style={{ backgroundColor: getGradeColor(rec.grade) }}
                                                        >
                                                            {rec.grade}
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
        </div>
    );
};
