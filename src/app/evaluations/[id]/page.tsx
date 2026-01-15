'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEvaluation } from '@/hooks/useEvaluation';
import { useGradingRules } from '@/hooks/useGradingRules';
import { EmployeeInfoCard } from '@/components/evaluations/EmployeeInfoCard';
import { EmployeeStatsCard } from '@/components/evaluations/EmployeeStatsCard';
import { EvaluationSection } from '@/components/evaluations/EvaluationSection';
import { ScoreHelperPopup } from '@/components/evaluations/ScoreHelperPopup';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ArrowLeft } from 'lucide-react';
export default function EvaluationPage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params?.id as string;
    const searchParams = useSearchParams();
    const returnTo = searchParams?.get('returnTo') || '/dashboard';

    // Check for desktop screen size
    const isDesktop = useMediaQuery('(min-width: 1024px)');

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

    // 🔥 Body Scroll Lock: เฉพาะ Mobile + มี Popup เปิดอยู่
    useEffect(() => {
        if (!isDesktop && popupData) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [isDesktop, popupData]);

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
        // Refresh data context if needed (global) or just rely on new fetch on dashboard
        router.push(returnTo);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            {/* Main Layout Container - Hybrid Approach */}
            {/* Desktop: Flex Row with Gap (Split Screen) */}
            {/* Mobile: Flex Column (Standard Flow) */}
            <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row gap-6 items-start relative px-0 lg:px-6">

                {/* LEFT SIDE: Main Evaluation Form */}
                <div className="flex-1 w-full min-w-0">

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

                {/* RIGHT SIDE: Desktop Inline Sidebar (Side-by-Side) */}
                {isDesktop && popupData && (
                    <div className="shrink-0 pt-20 pr-4">
                        <ScoreHelperPopup
                            data={popupData}
                            popupScores={popupScores}
                            onClose={closePopup}
                            onPopupScoreChange={handlePopupScore}
                            onApplyScore={applyPopupScore}
                            mode="inline"
                        />
                    </div>
                )}

                {/* Mobile Only: Full Screen Modal (Overlay) */}
                {!isDesktop && popupData && (
                    <ScoreHelperPopup
                        data={popupData}
                        popupScores={popupScores}
                        onClose={closePopup}
                        onPopupScoreChange={handlePopupScore}
                        onApplyScore={applyPopupScore}
                        mode="global"
                    />
                )}
            </div>
        </div>
    );
}