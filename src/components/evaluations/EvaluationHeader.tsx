import React from 'react';

interface EvaluationHeaderProps {
    evalYear: number;
    currentPeriod: string;
}

export const EvaluationHeader: React.FC<EvaluationHeaderProps> = ({ evalYear, currentPeriod }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">แบบประเมินผลการปฏิบัติงาน</h1>
                <p className="text-slate-500 mt-1">ประจำปีงบประมาณ {evalYear}</p>
            </div>
            <div className="bg-orange-50 text-orange-700 font-semibold px-4 py-2 rounded-full border border-orange-100 flex items-center gap-2">
                <span>📅</span>
                <span>Period: <span className="font-bold">{currentPeriod}</span></span>
            </div>
        </div>
    );
};
