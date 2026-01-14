import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
import { DashboardItem } from '@/types/dashboard';

interface GradeDistributionChartProps {
    data: DashboardItem[];
    onGradeClick?: (grade: string) => void;
    // [T-History]
    isCompareMode?: boolean;
    comparisonData?: Record<string, Record<string, number>>; // { "2024": { A: 10, B: 5 }, "2023": ... }
}

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({
    data,
    onGradeClick,
    isCompareMode,
    comparisonData
}) => {
    const chartData = useMemo(() => {
        // 1. Current Year Counts
        const currentCounts: Record<string, number> = { 'NI': 0, 'BE': 0, 'ME': 0, 'OE': 0, 'E': 0 };
        data.forEach(item => {
            const grade = item.grade?.grade;
            if (grade && currentCounts[grade] !== undefined) {
                currentCounts[grade]++;
            }
        });

        // 2. Prepare Base Data Structure
        // [ { name: 'E', current: 10, '2024': 5, '2023': 8 }, ... ]
        const grades = ['E', 'OE', 'ME', 'BE', 'NI'];

        return grades.map(grade => {
            const item: any = { name: grade, current: currentCounts[grade] };

            // Add historical data if in compare mode
            if (isCompareMode && comparisonData) {
                Object.keys(comparisonData).forEach(year => {
                    item[year] = comparisonData[year][grade] || 0;
                });
            }
            return item;
        });
    }, [data, isCompareMode, comparisonData]);

    const COLORS: Record<string, string> = {
        'E': '#f97316',
        'OE': '#fbbf24',
        'ME': '#fcd34d',
        'BE': '#d1d5db',
        'NI': '#9ca3af'
    };

    // Helper for Legend/Tooltip Colors
    const YEAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899']; // Blue, Violet, Pink for history

    return (
        <div className="h-[300px] w-full">
            <style>{`
                .recharts-wrapper *:focus { outline: none !important; }
                .recharts-bar-rectangle:focus, .recharts-bar:focus { outline: none !important; }
            `}</style>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    className="cursor-pointer outline-none"
                    // Grouped Bar Gap
                    barGap={2}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    {isCompareMode && <Legend />}

                    {/* 1. Current Year Bar (Always Show) */}
                    <Bar
                        dataKey="current"
                        name="ปีปัจจุบัน"
                        barSize={isCompareMode ? 30 : 60} // Shrink if comparing
                        // [Refinement] If compare mode, use solid color for Current Year (Black/Dark Gray) to contrast with History
                        // User suggested: "If compare mode, current year bar must be same color".
                        // Let's use a standard Dark Gray or Black for "Current" to stand out against colorful history?
                        // Or just Orange? User said "Current Year is Orange" in previous context maybe?
                        // Let's use #1f2937 (Gray-800) or #f97316 (Orange-500) as the "Base".
                        // Let's try #1f2937 (Dark Gray) for "Current" when comparing, looks professional.
                        fill={isCompareMode ? '#1f2937' : undefined}
                        onClick={(data) => onGradeClick && onGradeClick(data.name as string)}
                        isAnimationActive={false}
                    >
                        {
                            // Only use individual grade colors if NOT comparing
                            !isCompareMode && chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#ccc'} />
                            ))
                        }
                        {!isCompareMode && <LabelList dataKey="current" position="top" />}
                    </Bar>

                    {/* 2. Historical Bars (Dynamic) */}
                    {isCompareMode && comparisonData && Object.keys(comparisonData).sort().map((year, idx) => (
                        <Bar
                            key={year}
                            dataKey={year}
                            name={`ปี ${year}`}
                            barSize={30}
                            fill={YEAR_COLORS[idx % YEAR_COLORS.length]} // Cyclic colors
                            isAnimationActive={false}
                        />
                    ))}

                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
