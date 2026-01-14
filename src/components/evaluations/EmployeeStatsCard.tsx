import React from 'react';
import { InfoTooltip } from '../ui/InfoTooltip';
import { getGrade, GradeCriteria } from '../../utils/grade-calculation';

export interface EmployeeStats {
    totalLateMinutes: number;
    totalSickLeaveDays: number;
    totalAbsentDays: number;
    warningCount: number;
    year: number;
    // aiScore removed but kept flexibile for backward compatibility if needed
    [key: string]: any;
}

export interface EmployeeStatsCardProps {
    stats: EmployeeStats;
    disciplineScore: number | string;
    totalScore?: number;
    readOnlyItems?: { id: string; title: string; score: number | string; description?: string }[];
    showTotalScore?: boolean;
    gradingRules?: GradeCriteria[];
    isCompact?: boolean; // 🔥 New Prop
}

export const EmployeeStatsCard: React.FC<EmployeeStatsCardProps> = ({ stats, disciplineScore, totalScore, readOnlyItems = [], showTotalScore = true, gradingRules, isCompact = false }) => {

    // 🔥 Calculate Grade (Dynamic Rules)
    const gradeData = showTotalScore && totalScore ? getGrade(totalScore, gradingRules) : null;

    return (
        <div>
            {/* Stats Grid: Use Compact Mode? */}
            <div className={`grid gap-4 mb-8 ${isCompact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                <div className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${isCompact ? 'text-left pl-5' : 'text-center'}`}>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">รวมมาสาย</p>
                    <p className={`text-2xl font-bold ${stats.totalLateMinutes > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {stats.totalLateMinutes} <span className="text-sm font-medium text-slate-300">นาที</span>
                    </p>
                </div>
                <div className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${isCompact ? 'text-left pl-5' : 'text-center'}`}>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">รวมลาป่วย</p>
                    <p className={`text-2xl font-bold ${stats.totalSickLeaveDays > 30 ? 'text-orange-500' : 'text-slate-700'}`}>
                        {stats.totalSickLeaveDays} <span className="text-sm font-medium text-slate-300">วัน</span>
                    </p>
                </div>
                <div className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${isCompact ? 'text-left pl-5' : 'text-center'}`}>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">รวมขาดงาน</p>
                    <p className={`text-2xl font-bold ${stats.totalAbsentDays > 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                        {isNaN(Number(stats.totalAbsentDays)) ? 0 : stats.totalAbsentDays} <span className="text-sm font-medium text-slate-300">วัน</span>
                    </p>
                </div>
                <div className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm ${isCompact ? 'text-left pl-5' : 'text-center'}`}>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">ใบเตือน</p>
                    <p className={`text-2xl font-bold ${stats.warningCount > 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                        {stats.warningCount || 0} <span className="text-sm font-medium text-slate-300">ใบ</span>
                    </p>
                </div>
            </div>

            {/* Scores Section */}
            <div className={`grid gap-6 ${isCompact ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>

                {/* 🔥 Render ReadOnly Items (Imported Scores) */}
                {readOnlyItems.map((item) => (
                    <div key={item.id} className={`bg-white p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow flex ${isCompact ? 'flex-col items-start gap-4' : 'items-center justify-between'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xl">
                                📊
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-blue-900 text-lg">{item.title}</h4>
                                    {item.description && <InfoTooltip text={item.description} />}
                                    <InfoTooltip text="ผลคะแนนจากการร่วมกิจกรรม AI for Everyone ภายใน 31 ธันวาคม 2025" />
                                </div>
                            </div>
                        </div>
                        <div className="text-4xl font-black text-blue-500 tracking-tight">
                            {item.score}
                        </div>
                    </div>
                ))}

                <div className={`bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow flex ${isCompact ? 'flex-col items-start gap-4' : 'items-center justify-between'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-2xl">
                            ⚖️
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-emerald-900 text-lg">คะแนนด้านระเบียบ</h4>
                                <InfoTooltip text="คำนวณจากการ ขาด, ลา, มาสาย, ใบเตือน" />
                            </div>
                        </div>
                    </div>
                    <div className="text-4xl font-black text-emerald-500 tracking-tight">
                        {disciplineScore}
                    </div>
                </div>

                {showTotalScore && (
                    <div className={`bg-white p-6 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow flex ${isCompact ? 'flex-col items-start gap-4 col-span-2' : 'items-center justify-between'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-2xl">
                                🏆
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-orange-900 text-lg">คะแนนรวมสุทธิ</h4>
                                    <InfoTooltip text="คะแนนรวมสุดท้าย (Total Score) ที่คำนวณจากทุกส่วน" />
                                </div>
                                <p className="text-sm text-orange-600/70 py-0.5">Total Score</p>
                            </div>
                        </div>
                        <div className={`flex flex-col ${isCompact ? 'items-start w-full' : 'items-end'}`}>
                            <div className={`text-4xl font-black ${gradeData?.colorClass || 'text-gray-300'} tracking-tight`}>
                                {totalScore ?? '-'}
                            </div>
                            {gradeData && (
                                <div className="relative group">
                                    <div className={`text-xs font-bold px-2 py-1 rounded-full mt-1 cursor-help ${gradeData.bgClass} ${gradeData.colorClass} border ${gradeData.borderClass}`}>
                                        {gradeData.icon} {gradeData.grade}
                                    </div>
                                    {/* Tooltip */}
                                    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute bottom-full right-0 mb-2 w-48 p-3 bg-gray-800 text-white rounded-lg shadow-xl pointer-events-none z-20">
                                        <div className="font-bold text-sm mb-1">{gradeData.icon} {gradeData.label}</div>
                                        <div className="text-xs text-gray-300">{gradeData.description}</div>
                                        {/* Arrow */}
                                        <div className="absolute top-full right-4 border-8 border-transparent border-t-gray-800"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
