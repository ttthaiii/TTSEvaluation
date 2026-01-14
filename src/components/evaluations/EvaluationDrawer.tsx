import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom'; // [T-029] Import Portal
import { useEvaluation } from '../../hooks/useEvaluation';
import { useGradingRules } from '../../hooks/useGradingRules'; // Ensure this hook is available or duplicated logic
import { EmployeeInfoCard } from '../../components/evaluations/EmployeeInfoCard';
import { EmployeeStatsCard } from '../../components/evaluations/EmployeeStatsCard';
import { EvaluationSection } from '../../components/evaluations/EvaluationSection';
import { ScoreHelperPopup } from '../../components/evaluations/ScoreHelperPopup';
import { X } from 'lucide-react';

import { EvaluationRecord } from '../../types/evaluation';

interface EvaluationDrawerProps {
    employeeId: string;
    onClose: () => void;
    onSuccess?: (data: EvaluationRecord) => void;
    isEmbedded?: boolean; // 🔥 New Prop for Split Screen
}

export const EvaluationDrawer: React.FC<EvaluationDrawerProps> = ({ employeeId, onClose, onSuccess, isEmbedded = false }) => {
    // 🔥 Initialize hook with the specific employee ID
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
        handleExitEvaluation, // [T-029] Import Safe Exit
        popupData,
        popupScores,
        activePopupId,
        openPopup,
        closePopup,
        handlePopupScore,
        applyPopupScore,
        completedEvaluationIds
    } = useEvaluation({ defaultEmployeeId: employeeId });

    // 🔥 Grading Rules
    // Assuming useGradingRules doesn't depend on much state
    const { rules: gradeRules } = useGradingRules();

    // [T-029] Handle Client-side mounting for Portal
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const handleSafeClose = () => {
        handleExitEvaluation(onClose);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full bg-white border-l border-gray-200">
                <span className="text-slate-400 animate-pulse">กำลังโหลดข้อมูล...</span>
            </div>
        );
    }

    if (!selectedEmployee) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-white border-l border-gray-200 p-8 text-center">
                <span className="text-red-400 mb-2">⚠️ ไม่พบข้อมูลพนักงาน</span>
                <button onClick={onClose} className="text-sm text-slate-500 underline">ปิดหน้าต่าง</button>
            </div>
        );
    }

    // 🔥 Embedded Mode (Split Screen)
    if (isEmbedded) {
        return (
            <div className="w-full h-full flex flex-col bg-[#f8fafc] border-l border-slate-200 relative animate-in fade-in duration-300">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div className="overflow-hidden">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                            📝 แบบประเมิน (Evaluation)
                        </h2>
                        <p className="text-xs text-slate-500 truncate">
                            {selectedEmployee.firstName} {selectedEmployee.lastName}
                        </p>
                    </div>
                    <button
                        onClick={handleSafeClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Info & Stats */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <EmployeeInfoCard employee={selectedEmployee} evalYear={evalYear} isCompact={true} />
                        {employeeStats && (
                            <div className="mt-6 pt-6 border-t border-slate-50">
                                <EmployeeStatsCard
                                    stats={employeeStats}
                                    disciplineScore={disciplineScore}
                                    totalScore={totalScore}
                                    readOnlyItems={readOnlyItems}
                                    showTotalScore={completedEvaluationIds.has(selectedEmployee.id)}
                                    gradingRules={gradeRules}
                                    isCompact={true}
                                />
                            </div>
                        )}
                    </div>

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
                        onClick={() => handleSubmit(onSuccess)}
                    >
                        <span>บันทึกการประเมิน</span>
                    </button>

                    <div className="h-10"></div>
                </div>

                {/* Helper Popup */}
                {popupData && (
                    <ScoreHelperPopup
                        data={popupData}
                        popupScores={popupScores}
                        onClose={closePopup}
                        onPopupScoreChange={handlePopupScore}
                        onApplyScore={applyPopupScore}
                    />
                )}
            </div>
        );
    }

    // Standard Portal Drawer Mode (Mobile / Overlay)
    return (
        <>
            {mounted && createPortal(
                <>
                    {/* [T-034] Backdrop */}
                    <div
                        onClick={handleSafeClose}
                        title="คลิกเพื่อปิดหน้าต่าง (มีระบบยืนยัน)"
                        aria-hidden="true"
                        className="fixed inset-0 bg-black/20 z-[40] cursor-pointer animate-in fade-in duration-300"
                    />

                    {/* [T-034] Drawer Content */}
                    <div
                        className="fixed top-0 right-0 bottom-0 w-[600px] max-w-full bg-[#f8fafc] border-l border-slate-200 shadow-2xl overflow-hidden z-[50] flex flex-col animate-in slide-in-from-right duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    📝 แบบประเมิน (Evaluation)
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                                </p>
                            </div>
                            <button
                                onClick={handleSafeClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Info & Stats */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                <EmployeeInfoCard employee={selectedEmployee} evalYear={evalYear} isCompact={true} />

                                {employeeStats && (
                                    <div className="mt-6 pt-6 border-t border-slate-50">
                                        <EmployeeStatsCard
                                            stats={employeeStats}
                                            disciplineScore={disciplineScore}
                                            totalScore={totalScore}
                                            readOnlyItems={readOnlyItems}
                                            showTotalScore={completedEvaluationIds.has(selectedEmployee.id)}
                                            gradingRules={gradeRules}
                                            isCompact={true}
                                        />
                                    </div>
                                )}
                            </div>

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
                                onClick={() => handleSubmit(onSuccess)}
                            >
                                <span>บันทึกการประเมิน</span>
                            </button>

                            <div className="h-10"></div> {/* Spacer */}
                        </div>

                        {/* Helper Popup (Self-Portaled) */}
                        {popupData && (
                            <ScoreHelperPopup
                                data={popupData}
                                popupScores={popupScores}
                                onClose={closePopup}
                                onPopupScoreChange={handlePopupScore}
                                onApplyScore={applyPopupScore}
                            />
                        )}
                    </div>
                </>,
                document.body
            )}
        </>
    );
};
