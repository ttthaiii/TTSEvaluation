import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardItem } from '@/types/dashboard';

interface DepartmentStackChartProps {
    data: DashboardItem[];
}

export const DepartmentStackChart: React.FC<DepartmentStackChartProps> = ({ data }) => {
    const chartData = useMemo(() => {
        // Group by department
        const deptMap: Record<string, Record<string, number>> = {};
        const allGrades = new Set<string>();

        data.forEach(item => {
            const dept = item.department || 'Unknown';
            const grade = item.grade?.grade || 'N/A';
            allGrades.add(grade);

            if (!deptMap[dept]) deptMap[dept] = { name: dept } as any; // 'name' for Recharts
            deptMap[dept][grade] = (deptMap[dept][grade] || 0) + 1;
        });

        return Object.values(deptMap);
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
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {gradeKeys.map(key => (
                        <Bar key={key} dataKey={key} stackId="a" fill={COLORS[key]} barSize={40} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
