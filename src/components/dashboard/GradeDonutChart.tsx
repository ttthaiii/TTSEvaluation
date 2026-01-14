import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DashboardItem } from '@/types/dashboard';
import { GRADE_COLOR_MAP } from '@/utils/grade-calculation';

interface GradeDonutChartProps {
    data: DashboardItem[];
    onGradeClick?: (grade: string) => void;
}

export const GradeDonutChart: React.FC<GradeDonutChartProps> = ({ data, onGradeClick }) => {
    const chartData = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach(item => {
            const grade = item.grade?.grade || 'N/A';
            counts[grade] = (counts[grade] || 0) + 1;
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);

    // Use centralized colors
    const COLORS = GRADE_COLOR_MAP;

    const total = data.length;

    return (
        <div className="h-[300px] w-full relative">
            <style>{`
                .recharts-sector:focus, .recharts-pie:focus, path:focus { outline: none !important; }
            `}</style>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="55%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={0}
                        dataKey="value"
                        onClick={(data) => onGradeClick && onGradeClick(data.name)}
                        className="cursor-pointer outline-none focus:outline-none"
                        isAnimationActive={false}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} stroke="none" className="hover:opacity-80 transition-opacity" cursor="pointer" />
                        ))}
                    </Pie>
                    <Tooltip itemStyle={{ color: '#000' }} />
                    <Legend wrapperStyle={{ paddingTop: '40px' }} verticalAlign="bottom" />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute top-[48%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-xs text-slate-500">จำนวนพนักงาน</div>
                <div className="text-3xl font-bold text-slate-800">{total}</div>
                <div className="text-xs text-slate-500">คน</div>
            </div>
        </div>
    );
};
