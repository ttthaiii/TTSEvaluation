import React from 'react';
import { useRouter } from 'next/navigation'; // 🔥 Import useRouter
import { DashboardItem } from '@/types/dashboard';
import { Category } from '@/types/evaluation';
import { HO_SECTIONS } from '../../data/evaluation-criteria';
import { GRADE_RANGES } from '@/utils/grade-calculation'; // 🔥 Import Grade Ranges

interface EmployeeTableProps {
    data: DashboardItem[];
    categories?: Category[];
    onRowClick?: (employeeId: string) => void;
    onEvaluate?: (employeeId: string) => void;
    // [T-History] Comparison
    compareYears?: string[];
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ data, categories = [], onRowClick, onEvaluate, compareYears = [] }) => {
    const router = useRouter(); // 🔥 Initialize Router

    // 🔥 Safety Helper to find AI Score
    const getAiScore = (item: DashboardItem) => {
        // 1. Check direct AI Score on Item (from Users collection - Import Fix)
        if (item.aiScore) return item.aiScore;

        const evalData = item.evaluation;
        // 2. Check Evaluation Object
        if (evalData) {
            // 2a. Direct Property
            if (evalData.aiScore && evalData.aiScore !== 0) return evalData.aiScore;

            // 2b. Check inside Scores object for legacy keys like [O]-1 or [0]-1
            const scores = evalData.scores || {};
            // Try various permutations found in DB
            const val = scores['[O]-1'] || scores['[0]-1'] || scores['O-1'] || scores['0-1'];
            if (val) return val;
        }

        return 0;
    };

    const getCategoryPercentage = (item: DashboardItem, catId: string) => {
        const scores = item.evaluation?.scores || {};
        let rawSum = 0;
        const sectionName = item.section?.trim() || '';
        const isHO = HO_SECTIONS.includes(sectionName);

        // Sum raw scores for the Category
        Object.keys(scores).forEach(key => {
            if (key.startsWith(`${catId}-`)) {
                // Defensive: For HO, Ignore B-4 if it exists in DB
                if (catId === 'B' && key.endsWith('B-4') && isHO) return;
                rawSum += scores[key];
            }
        });

        // logic per Category
        if (catId === 'A') {
            // A: Behavior (4 items) + Discipline Score -> Max 20
            const discipline = Number(item.evaluation?.disciplineScore || 0);
            const totalRawA = Math.min(20, rawSum + discipline);
            return Math.min(100, Math.round((totalRawA / 20) * 100));
        }

        if (catId === 'B') {
            // B: Performance (User Formula)
            if (isHO) {
                // HO: Divide by 15
                return Math.min(100, Math.round((rawSum / 15) * 100));
            } else {
                // Non-HO: Divide by 20
                return Math.min(100, Math.round((rawSum / 20) * 100));
            }
        }

        if (catId === 'C') {
            // C: Management (5 items) -> Max Raw 25
            if (item.level === 'Monthly Staff') return 0;
            return Math.min(100, Math.round((rawSum / 25) * 100));
        }

        return 0;
    };

    const handleNameClick = (e: React.MouseEvent, employeeId: string) => {
        e.stopPropagation(); // 🛑 Stop row click (filter)
        if (onEvaluate) {
            onEvaluate(employeeId);
        }
    };

    return (
        <div className="w-full">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4">
                {data.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                        ไม่พบข้อมูล
                    </div>
                ) : (
                    data.map((item, index) => {
                        const isWaiting = !item.evaluation;
                        const isDraft = item.evaluation?.status === 'Draft';

                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-xl border transition-all active:scale-[0.98] ${isWaiting ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}
                                onClick={() => onRowClick && onRowClick(item.employeeId)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400">{item.employeeId}</span>
                                            {isDraft && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">DRAFT</span>}
                                        </div>
                                        <h4 className="font-bold text-slate-800">{item.firstName} {item.lastName}</h4>
                                        <p className="text-xs text-slate-500">{item.section} / {item.department}</p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold border ${item.grade?.bgClass} ${item.grade?.colorClass} ${item.grade?.borderClass}`}>
                                        {item.grade?.grade || '-'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                                    <div className="bg-slate-50 p-2 rounded-lg">
                                        <p className="text-slate-400 uppercase font-bold">Total Score</p>
                                        <p className="text-sm font-black text-slate-700">{isWaiting ? '-' : `${Number(item.totalScore).toFixed(2)}%`}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg">
                                        <p className="text-slate-400 uppercase font-bold">AI Score</p>
                                        <p className="text-sm font-black text-indigo-600">{isWaiting ? '-' : getAiScore(item) || 0}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => handleNameClick(e, item.employeeId)}
                                    className="w-full py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    {isWaiting ? 'เริ่มประเมิน' : 'แก้ไขการประเมิน'}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-3">ลำดับ</th>
                            <th className="px-6 py-3">รหัส</th>
                            <th className="px-6 py-3">ชื่อ-นามสกุล</th>
                            <th className="px-6 py-3">ชื่อส่วน</th>
                            <th className="px-6 py-3">ชื่อแผนก</th>
                            <th className="px-6 py-3">Level</th>
                            {/* [T-History] Dynamic History Headers */}
                            {compareYears.map(year => (
                                <th key={year} className="px-6 py-3 text-center bg-orange-50/50 text-orange-800 border-x border-orange-100 min-w-[80px]">
                                    เกรด {year}
                                </th>
                            ))}
                            <th className="px-6 py-3">เกรด</th>
                            <th className="px-6 py-3">วันที่ประเมิน</th>
                            <th className="px-6 py-3 text-center">คะแนนสุทธิ (%)</th>
                            <th className="px-6 py-3 text-center">พฤติกรรม (%)</th>
                            <th className="px-6 py-3 text-center">ผลงาน (%)</th>
                            <th className="px-6 py-3 text-center">ทักษะการบริหาร (%)</th>
                            <th className="px-6 py-3 text-center">คะแนน AI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={13} className="px-6 py-4 text-center text-slate-400">
                                    ไม่พบข้อมูล
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => {
                                // Use updatedAt as requested, fallback to createdAt
                                const timestamp = item.evaluation?.updatedAt || item.evaluation?.createdAt;

                                let dateStr = '-';
                                if (timestamp) {
                                    let dateObj: Date | null = null;
                                    if (typeof (timestamp as any).toDate === 'function') dateObj = (timestamp as any).toDate();
                                    else if ((timestamp as any).seconds) dateObj = new Date((timestamp as any).seconds * 1000);
                                    else if (timestamp instanceof Date) dateObj = timestamp;
                                    else if (typeof timestamp === 'string') dateObj = new Date(timestamp);

                                    if (dateObj) {
                                        dateStr = dateObj.toLocaleDateString('th-TH', {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        });
                                    }
                                }

                                const isDraft = item.evaluation?.status === 'Draft';
                                const isWaiting = !item.evaluation; // [T-028] Waiting State

                                return (
                                    <tr
                                        key={item.id}
                                        className={`
                                            border-b cursor-pointer transition-colors group
                                            ${isWaiting ? 'bg-slate-50 text-slate-400' :
                                                isDraft ? 'bg-slate-50 opacity-60' :
                                                    'bg-white hover:bg-orange-50'}
                                        `}
                                        onClick={() => onRowClick && onRowClick(item.employeeId)}
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {index + 1}.
                                            {/* [T-027] Show Draft status (แสดงสถานะ Draft) */}
                                            {isDraft && (
                                                <span className="ml-2 text-xs font-normal text-slate-400 uppercase tracking-wider">(Draft)</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{item.employeeId}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => handleNameClick(e, item.employeeId)}
                                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                title="คลิกเพื่อแก้ไขการประเมิน"
                                            >
                                                {item.firstName} {item.lastName}
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">↗</span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">{item.section}</td>
                                        <td className="px-6 py-4">{item.department}</td>
                                        <td className="px-6 py-4">{item.level}</td>

                                        {/* [T-History] Dynamic History Cells */}
                                        {compareYears.map(year => {
                                            const hData = item.history?.[year];
                                            const gradeStr = hData?.grade;
                                            // Find color class
                                            const gradeCriteria = GRADE_RANGES.find(g => g.grade === gradeStr);
                                            const bgClass = gradeCriteria?.bgClass || 'bg-gray-100';
                                            const textClass = gradeCriteria?.colorClass || 'text-gray-500';

                                            return (
                                                <td key={year} className="px-6 py-4 text-center border-x border-dashed border-gray-100">
                                                    {gradeStr ? (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${bgClass} ${textClass}`}>
                                                            {gradeStr}
                                                        </span>
                                                    ) : <span className="text-gray-300">-</span>}
                                                </td>
                                            );
                                        })}

                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${item.grade?.bgClass} ${item.grade?.colorClass}`}>
                                                {item.grade?.grade || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{dateStr}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-800">
                                            {isWaiting ? '-' : `${Number(item.totalScore).toFixed(2)}%`}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isWaiting ? '-' : `${getCategoryPercentage(item, 'A')}%`}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isWaiting ? '-' : `${getCategoryPercentage(item, 'B')}%`}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isWaiting ? '-' : (item.level === 'Monthly Staff' ? '0%' : `${getCategoryPercentage(item, 'C')}%`)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-indigo-600 font-semibold">
                                            {isWaiting ? '-' : getAiScore(item) || 0}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    );
};
