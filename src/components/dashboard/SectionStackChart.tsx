import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardItem } from '@/types/dashboard';

interface SectionStackChartProps {
    data: DashboardItem[];
    onSectionClick?: (section: string) => void;
}

export const SectionStackChart: React.FC<SectionStackChartProps> = ({ data, onSectionClick }) => {
    const chartData = useMemo(() => {
        // Group by Section
        const secMap: Record<string, Record<string, number>> = {};
        const allGrades = new Set<string>();

        data.forEach(item => {
            const section = item.section || 'Unknown';
            const grade = item.grade?.grade || 'N/A';
            allGrades.add(grade);

            if (!secMap[section]) secMap[section] = { name: section } as any; // 'name' for Recharts
            secMap[section][grade] = (secMap[section][grade] || 0) + 1;
        });

        return Object.values(secMap);
    }, [data]);

    const COLORS: Record<string, string> = {
        'E': '#f97316',
        'OE': '#fbbf24',
        'ME': '#fcd34d',
        'BE': '#d1d5db',
        'NI': '#e5e7eb',
        'N/A': '#9ca3af'
    };

    const gradeKeys = ['NI', 'BE', 'ME', 'OE', 'E']; // Order matters for stacking

    return (
        <div className="h-[250px] w-full">
            <style>{`
                .recharts-wrapper *:focus { outline: none !important; }
                .recharts-bar-rectangle:focus, .recharts-bar:focus { outline: none !important; }
            `}</style>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    className="cursor-pointer outline-none"
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {gradeKeys.map(key => (
                        <Bar
                            key={key}
                            dataKey={key}
                            stackId="a"
                            fill={COLORS[key]}
                            onClick={(data) => onSectionClick && onSectionClick(data.name as string)}
                            isAnimationActive={false}
                            className="outline-none focus:outline-none"
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
