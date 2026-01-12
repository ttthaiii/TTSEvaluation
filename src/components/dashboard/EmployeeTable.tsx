import React from 'react';
import { useRouter } from 'next/navigation'; // 🔥 Import useRouter
import { DashboardItem } from '@/types/dashboard';
import { Category } from '@/types/evaluation';
import { HO_SECTIONS } from '../../data/evaluation-criteria';

interface EmployeeTableProps {
    data: DashboardItem[];
    categories?: Category[];
    onRowClick?: (employeeId: string) => void;
    onEvaluate?: (employeeId: string) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ data, categories = [], onRowClick, onEvaluate }) => {
    const router = useRouter(); // 🔥 Initialize Router

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
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                    <tr>
                        <th className="px-6 py-3">ลำดับ</th>
                        <th className="px-6 py-3">รหัส</th>
                        <th className="px-6 py-3">ชื่อ-นามสกุล</th>
                        <th className="px-6 py-3">ชื่อส่วน</th>
                        <th className="px-6 py-3">ชื่อแผนก</th>
                        <th className="px-6 py-3">Level</th>
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

                            return (
                                <tr
                                    key={item.id}
                                    className="bg-white border-b hover:bg-orange-50 cursor-pointer transition-colors group"
                                    onClick={() => onRowClick && onRowClick(item.employeeId)}
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900">{index + 1}.</td>
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
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.grade?.bgClass} ${item.grade?.colorClass}`}>
                                            {item.grade?.grade || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{dateStr}</td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                                        {Number(item.totalScore).toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getCategoryPercentage(item, 'A')}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {getCategoryPercentage(item, 'B')}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.level === 'Monthly Staff' ? '0%' : `${getCategoryPercentage(item, 'C')}%`}
                                    </td>
                                    <td className="px-6 py-4 text-center text-indigo-600 font-semibold">
                                        {item.evaluation?.aiScore || 0}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};
