import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { DashboardItem } from '@/types/dashboard';

interface GradeDistributionChartProps {
    data: DashboardItem[];
}

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        const counts: Record<string, number> = { 'NI': 0, 'BE': 0, 'ME': 0, 'OE': 0, 'E': 0 };
        data.forEach(item => {
            const grade = item.grade?.grade || 'N/A';
            if (counts[grade] !== undefined) {
                counts[grade]++;
            }
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [data]);

    const COLORS: Record<string, string> = {
        'E': '#f97316',
        'OE': '#fbbf24',
        'ME': '#fcd34d',
        'BE': '#d1d5db',
        'NI': '#9ca3af'
    };

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" barSize={60}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#ccc'} />
                        ))}
                        <LabelList dataKey="value" position="top" />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
