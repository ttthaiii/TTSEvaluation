import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardItem } from '@/types/dashboard';
import { ArrowLeft } from 'lucide-react';
import { GRADE_COLOR_MAP } from '@/utils/grade-calculation';

interface SectionStackChartProps {
    data: DashboardItem[];
    onSectionClick?: (section: string) => void;
    onBack?: () => void;
}

export const SectionStackChart: React.FC<SectionStackChartProps> = ({ data, onSectionClick, onBack }) => {
    // State for Drill-Down
    const [drillDownPd, setDrillDownPd] = useState<string | null>(null);

    const chartData = useMemo(() => {
        // Prepare Data based on View Mode
        const map: Record<string, Record<string, number>> = {};

        data.forEach(item => {
            let groupKey = 'Unknown';
            const grade = (item.grade?.grade || 'N/A').trim();

            const pdNum = (item.pdNumber || 'No PD').trim();
            const sectionName = (item.section || 'Unknown').trim();

            if (drillDownPd) {
                // Level 2: Section View (Filtered by PD)
                // Filter first (Ensure consistent comparison)
                if (pdNum !== drillDownPd) return;
                groupKey = sectionName;
            } else {
                // Level 1: PdNumber View
                groupKey = pdNum;
            }

            if (!map[groupKey]) map[groupKey] = { name: groupKey } as any;
            map[groupKey][grade] = (map[groupKey][grade] || 0) + 1;
        });

        return Object.values(map);
    }, [data, drillDownPd]);

    // ... COLORS constants ...
    // Use centralized colors
    const COLORS = GRADE_COLOR_MAP;

    const gradeKeys = ['NI', 'BE', 'ME', 'OE', 'E'];

    const handleBarClick = (data: any) => {
        if (!drillDownPd) {
            // Level 1 -> Level 2
            setDrillDownPd(data.name);
        } else {
            // Level 2 Click -> Trigger external action (Filter Section)
            if (onSectionClick) {
                onSectionClick(data.name);
            }
        }
    };

    return (
        <div className="h-[280px] w-full flex flex-col">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {drillDownPd && (
                        <button
                            onClick={() => {
                                setDrillDownPd(null);
                                if (onBack) onBack();
                            }}
                            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Back to Overview"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <span className="text-sm font-semibold text-slate-600">
                        {drillDownPd ? `Sections in ${drillDownPd}` : 'Overview by PD Number'}
                    </span>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <style>{`
                    .recharts-wrapper *:focus { outline: none !important; }
                    .recharts-bar-rectangle:focus, .recharts-bar:focus { outline: none !important; }
                `}</style>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                        className="cursor-pointer outline-none"
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Tooltip />
                        <Legend content={(props) => {
                            return (
                                <ul className="flex flex-wrap justify-center gap-4 mt-2 text-xs">
                                    {gradeKeys.map((key) => (
                                        <li key={key} className="flex items-center gap-1.5">
                                            <span
                                                className="block w-2.5 h-2.5"
                                                style={{ backgroundColor: COLORS[key] }}
                                            />
                                            <span className="text-slate-600">{key}</span>
                                        </li>
                                    ))}
                                </ul>
                            );
                        }} />
                        {gradeKeys.map(key => (
                            <Bar
                                key={key}
                                dataKey={key}
                                stackId="a"
                                fill={COLORS[key]}
                                onClick={(data) => handleBarClick(data)}
                                className="outline-none focus:outline-none hover:opacity-80 transition-opacity"
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
