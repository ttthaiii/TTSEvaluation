'use client';

import React from 'react';
import { useEvaluation } from '../../hooks/useEvaluation';
import { useGradingRules } from '../../hooks/useGradingRules';
import { EvaluationHeader } from '../../components/evaluations/EvaluationHeader';
import { EmployeeSelector } from '../../components/evaluations/EmployeeSelector';
import { EmployeeInfoCard } from '../../components/evaluations/EmployeeInfoCard';
import { EmployeeStatsCard } from '../../components/evaluations/EmployeeStatsCard';
import { EvaluationSection } from '../../components/evaluations/EvaluationSection';
import { ScoreHelperPopup } from '../../components/evaluations/ScoreHelperPopup';

export default function EvaluationPage() {
  const {
    loading,
    evalYear,
    currentPeriod,
    sections,
    selectedSection,
    handleSectionChange,
    filteredEmployees,
    selectedEmployeeId,
    handleEmployeeChange,
    existingEvaluations,
    completedEvaluationIds,
    selectedEmployee,
    employeeStats,
    disciplineScore,
    totalScore,
    displayCategories,
    readOnlyItems,
    scores,
    handleScoreChange,
    handleSubmit,
    integrityWarnings,
    popupData,
    popupScores,
    activePopupId,
    openPopup,
    closePopup,
    handlePopupScore,
    applyPopupScore
  } = useEvaluation();
  const { rules: gradeRules } = useGradingRules();

  if (loading) return <div className="p-10 text-center text-xl">⏳ กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 md:p-8 font-sans">
      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-8 items-start">

        {/* 🔥 Safety Warning Banner */}
        {integrityWarnings.length > 0 && (
          <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white p-4 shadow-xl animate-bounce-in">
            <div className="max-w-4xl mx-auto flex items-start gap-4">
              <span className="text-3xl">🚫</span>
              <div>
                <h3 className="font-bold text-lg underline">พบปัญหาความปลอดภัยของสูตรคำนวณ (Scoring Integrity Error)</h3>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {integrityWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
                <p className="mt-2 text-sm bg-red-800 inline-block px-2 py-1 rounded">กรุณาแจ้ง Admin ให้แก้ไขสูตรที่ หน้า "ตั้งค่าสูตรคำนวณ"</p>
              </div>
            </div>
          </div>
        )}

        {/* ================= LEFT COLUMN ================= */}
        <div className="flex-1 w-full min-w-0 space-y-8">

          <div className="print:hidden space-y-8">
            <EvaluationHeader
              evalYear={evalYear}
              currentPeriod={currentPeriod}
              showPrintButton={!!selectedEmployee}
            />

            <EmployeeSelector
              sections={sections}
              selectedSection={selectedSection}
              onSectionChange={handleSectionChange}

              filteredEmployees={filteredEmployees}
              selectedEmployeeId={selectedEmployeeId}
              onEmployeeChange={handleEmployeeChange}
              existingEvaluations={existingEvaluations}
              completedEvaluationIds={completedEvaluationIds}
            />
          </div>

          {/* Employee Info Box & Criteria */}
          {selectedEmployee && (
            <div className="bg-[#efebe9] p-8 print:p-4 rounded-xl shadow-md border-2 border-[#d7ccc8] print:break-inside-avoid shadow-none print:border-none">
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
            </div>
          )}

          {/* Evaluation Criteria Loop (Dynamic) */}
          {selectedEmployee && displayCategories.map((cat) => (
            <EvaluationSection
              key={cat.id}
              category={cat}
              scores={scores}
              onScoreChange={handleScoreChange}
              onOpenPopup={openPopup}
              activePopupId={activePopupId}
            />
          ))}

          {selectedEmployee && (
            <button className="w-full bg-[#4caf50] hover:bg-[#43a047] text-white font-bold py-5 rounded-xl shadow-lg transition-transform active:scale-[0.99] text-2xl mt-8" onClick={() => handleSubmit()}>
              บันทึกการประเมิน
            </button>
          )}
        </div>

        {/* ================= RIGHT COLUMN (Desktop Sidebar) ================= */}
        {popupData && (
          <div className="hidden lg:block w-[450px] shrink-0 sticky top-6 h-[calc(100vh-3rem)] overflow-hidden pt-16">
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

        {/* ================= MODAL LAYER (Mobile Only) ================= */}
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