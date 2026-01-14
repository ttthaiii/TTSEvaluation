import React, { useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DashboardItem } from '@/types/dashboard';
import { HO_SECTIONS } from '../../data/evaluation-criteria';

interface CompetencyRadarChartProps {
    data: DashboardItem[];
}

export const CompetencyRadarChart: React.FC<CompetencyRadarChartProps> = ({ data }) => {

    const chartData = useMemo(() => {
        if (data.length === 0) return [];

        let totalA = 0, countA = 0;
        let totalB = 0, countB = 0;
        let totalC = 0, countC = 0;

        data.forEach(item => {
            const scores = item.evaluation?.scores || {};
            const sectionName = item.section?.trim() || '';
            const isHO = HO_SECTIONS.includes(sectionName);

            // Sum Raw Scores for A, B, C
            let sumA = 0;
            let sumB = 0;
            let sumC = 0;

            Object.keys(scores).forEach(key => {
                const val = scores[key];
                if (key.startsWith('A-')) { sumA += val; }
                if (key.startsWith('B-')) {
                    // Defensive: Ignore B-4 for HO
                    if (key.endsWith('B-4') && isHO) return;
                    sumB += val;
                }
                if (key.startsWith('C-')) { sumC += val; }
            });

            // Calculate % for this person
            let pctA = 0;
            let pctB = 0;
            let pctC = 0;

            // A (4 items) -> Max Raw 20 + Discipline Score (Max 20 total)
            const discipline = Number(item.evaluation?.disciplineScore || 0);
            const totalRawA = Math.min(20, sumA + discipline);
            pctA = (totalRawA / 20) * 100;

            // B (Logic from user)
            if (isHO) {
                // 3 items (B1-B3) -> Max 15
                pctB = (sumB / 15) * 100;
            } else {
                // 4 items (B1-B4) -> Max 20
                pctB = (sumB / 20) * 100;
            }

            // C (5 items) -> Max 25
            pctC = (sumC / 25) * 100;

            // Cap at 100
            if (pctA > 100) pctA = 100;
            if (pctB > 100) pctB = 100;
            if (pctC > 100) pctC = 100;

            // Add to accumulators
            totalA += pctA; countA++;
            totalB += pctB; countB++;
            if (item.level !== 'Monthly Staff') { // C only for Supervisors
                totalC += pctC; countC++;
            }
        });

        if (countA === 0) return [];

        const avgA = Math.round(totalA / countA);
        const avgB = Math.round(totalB / countB);
        const avgC = countC > 0 ? Math.round(totalC / countC) : 0;

        return [
            { subject: 'พฤติกรรม', A: avgA, fullMark: 100 },
            { subject: 'ผลงาน', A: avgB, fullMark: 100 },
            { subject: 'ทักษะการบริหาร', A: avgC, fullMark: 100 },
        ];
    }, [data]);

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="คะแนนเฉลี่ย (%)"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                    />
                    <Tooltip />
                    <Legend />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
