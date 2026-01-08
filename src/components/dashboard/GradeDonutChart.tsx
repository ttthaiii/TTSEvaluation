import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DashboardItem } from '@/types/dashboard';

interface GradeDonutChartProps {
    data: DashboardItem[];
}

export const GradeDonutChart: React.FC<GradeDonutChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts: Record<string, number> = {};
        data.forEach(item => {
            const grade = item.grade?.grade || 'N/A';
            counts[grade] = (counts[grade] || 0) + 1;
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);

    // Colors match the UI in the prompt roughly (Orange/Dark theme logic, but adaptive)
    // Or match grade colors? The prompt image shows specific colors for sections of donut.
    // NI=Gray/White, E=Orange, ME=Light Orange
    const COLORS: Record<string, string> = {
        'E': '#f97316', // Orange-500
        'OE': '#fbbf24', // Amber-400
        'ME': '#fcd34d', // Amber-300
        'BE': '#d1d5db', // Gray-300
        'NI': '#9ca3af', // Gray-400
        'N/A': '#e5e7eb'
    };

    const total = data.length;

    return (
        <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={0}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip itemStyle={{ color: '#000' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center">
                <div className="text-xs text-slate-500">จำนวนพนักงาน</div>
                <div className="text-3xl font-bold text-slate-800">{total}</div>
                <div className="text-xs text-slate-500">คน</div>
            </div>
        </div>
    );
};
