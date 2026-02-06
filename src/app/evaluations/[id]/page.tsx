'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEvaluation } from '@/hooks/useEvaluation';
import { useGradingRules } from '@/hooks/useGradingRules';
import { EmployeeInfoCard } from '@/components/evaluations/EmployeeInfoCard';
import { EmployeeStatsCard } from '@/components/evaluations/EmployeeStatsCard';
import { EvaluationSection } from '@/components/evaluations/EvaluationSection';
import { ScoreHelperPopup } from '@/components/evaluations/ScoreHelperPopup';
import { ArrowLeft, Printer } from 'lucide-react';

export default function EvaluationPage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params?.id as string;
    const searchParams = useSearchParams();
    const returnTo = searchParams?.get('returnTo') || '/dashboard';

    const {
        loading,
        evalYear,
        selectedEmployee,
        employeeStats,
        disciplineScore,
        totalScore,
        displayCategories,
        readOnlyItems,
        scores,
        handleScoreChange,
        handleSubmit,
        handleExitEvaluation,
        popupData,
        popupScores,
        activePopupId,
        openPopup,
        closePopup,
        handlePopupScore,
        applyPopupScore,
        completedEvaluationIds,
        refreshData
    } = useEvaluation({ defaultEmployeeId: employeeId });

    const { rules: gradeRules } = useGradingRules();

    // Debug Log
    useEffect(() => {
        console.log("📄 Page [ID]: popupData changed:", popupData);
        if (popupData) {
            console.log("👀 FORCE PROBE: Inline Renderer Triggered in Page State");
        }
    }, [popupData]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <span className="text-slate-400 animate-pulse">กำลังโหลดข้อมูล...</span>
            </div>
        );
    }

    if (!selectedEmployee) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-slate-50 text-center">
                <span className="text-red-400 mb-2">⚠️ ไม่พบข้อมูลพนักงาน</span>
                <button onClick={() => router.push(returnTo)} className="text-sm text-slate-500 underline">ย้อนกลับ</button>
            </div>
        );
    }

    const handleBack = () => {
        handleExitEvaluation(() => router.push(returnTo));
    };

    const handleSuccess = () => {
        router.push(returnTo);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* Main Layout Container - Grid Architecture */}
            {/* Switched to CSS Grid for guaranteed side-by-side layout stability */}
            <div className={`
                max-w-[1920px] mx-auto 
                grid gap-6 items-start relative px-0 lg:px-6
                items-stretch
                transition-all duration-300 ease-in-out
                ${popupData
                    ? 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_450px]'
                    : 'grid-cols-1'
                }
            `}>

                {/* LEFT SIDE: Main Evaluation Form */}
                <div className="w-full min-w-0">

                    {/* Header - Sticky within the left column flow on Desktop */}
                    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm transition-all">
                        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBack}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className="text-lg font-bold text-slate-800 leading-none">แบบประเมิน</h1>
                                    <p className="text-xs text-slate-500 mt-1">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                                </div>
                            </div>

                            {/* Print Button (ปุ่มพิมพ์แบบประเมิน) */}
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center gap-2 print:hidden font-medium"
                                title="สั่งพิมพ์ (Print)"
                            >
                                <Printer size={18} />
                                <span>Print</span>
                            </button>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                        {/* Info & Stats */}
                        <EmployeeInfoCard employee={selectedEmployee} evalYear={evalYear} />

                        {employeeStats && (
                            <EmployeeStatsCard
                                stats={employeeStats}
                                disciplineScore={disciplineScore}
                                totalScore={totalScore}
                                readOnlyItems={readOnlyItems}
                                showTotalScore={completedEvaluationIds.has(selectedEmployee.id)}
                                gradingRules={gradeRules}
                                employeeName={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                            />
                        )}

                        {/* Evaluation Sections */}
                        {displayCategories.map((cat) => (
                            <EvaluationSection
                                key={cat.id}
                                category={cat}
                                scores={scores}
                                onScoreChange={handleScoreChange}
                                onOpenPopup={openPopup}
                                activePopupId={activePopupId}
                            />
                        ))}

                        {/* Submit Button */}
                        <button
                            className="w-full bg-[#4caf50] hover:bg-[#43a047] text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.99] text-xl flex items-center justify-center gap-2"
                            onClick={() => handleSubmit(handleSuccess)}
                        >
                            <span>บันทึกการประเมิน</span>
                        </button>
                    </div>
                </div>

                {/* 🔥 RIGHT SIDE: Desktop Inline Sidebar (Side-by-Side) */}
                {/* CSS Grid Cell - Only rendered when popupData exists */}
                {popupData && (
                    <div className="block sticky top-6 h-[calc(100vh-3rem)] overflow-hidden pt-16 border-2 border-red-500">
                        {/* PROBE: Force Inline Render */}
                        <ScoreHelperPopup
                            data={popupData}
                            popupScores={popupScores}
                            onClose={closePopup}
                            onPopupScoreChange={handlePopupScore}
                            onApplyScore={applyPopupScore}
                            mode="inline"
                            className="h-full shadow-xl border-l border-slate-100"
                        />
                    </div>
                )}

                {/* 🔥 Mobile Only: Full Screen Modal (Overlay) */}
                {/* CSS hidden on desktop */}
                {popupData && (
                    <div className="lg:hidden">
                        <ScoreHelperPopup
                            data={popupData}
                            popupScores={popupScores}
                            onClose={closePopup}
                            onPopupScoreChange={handlePopupScore}
                            onApplyScore={applyPopupScore}
                            mode="global"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}