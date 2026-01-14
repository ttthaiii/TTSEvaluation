'use client';

import React, { useState, useMemo } from 'react';
import { useEvaluation } from '@/hooks/useEvaluation'; // Using alias if available, else relative
import { FilterBar } from '../../components/dashboard/FilterBar';
import { GradeDonutChart } from '../../components/dashboard/GradeDonutChart';
import { SectionStackChart } from '../../components/dashboard/SectionStackChart';
import { GradeDistributionChart } from '../../components/dashboard/GradeDistributionChart';
import { CompetencyRadarChart } from '../../components/dashboard/CompetencyRadarChart';
import { EmployeeTable } from '../../components/dashboard/EmployeeTable';
import { EvaluationDrawer } from '../../components/evaluations/EvaluationDrawer'; // 🔥 Import Drawer
import { getGrade, GRADE_RANGES, GradeCriteria } from '@/utils/grade-calculation';
import { Loader2 } from 'lucide-react';
import { Employee } from '@/types/employee';
import { EvaluationRecord } from '@/types/evaluation';
import { collection, query, where, getDocs } from 'firebase/firestore'; // 🔥 Import Firestore
import { db } from '@/lib/firebase'; // 🔥 Import DB instance
import { UI_TEXT } from '@/constants/text';
import { useEmployeeFilter } from '@/hooks/useEmployeeFilter'; // [Refactor]
import { useHistoricalData } from '@/hooks/useHistoricalData'; // [Refactor]
import { GRADE_COLORS } from '@/constants/colors';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const {
        employees,
        existingEvaluations,
        completedEvaluationIds,
        sections,
        loading,
        categories,
        evalYear,
        refreshData,
        updateLocalEvaluation
    } = useEvaluation();

    const router = useRouter();

    // [T-History] Comparison State
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedYears, setSelectedYears] = useState<string[]>(['2024']);

    // [Speckit T-Split] Selected Employee for Split View
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    // 🔥 Use Historical Data Hook
    const { historicalData } = useHistoricalData(isCompareMode, selectedYears);

    // 2. Prepare Data for Dashboard (Map ALL employees)
    const dashboardData = useMemo(() => {
        return employees.map(emp => {
            const rawEval = existingEvaluations[emp.id];

            // [T-028] Filter out "ghost" evaluations (legacy 0-score records with no status)
            // Considered valid ONLY if: Has Status (Draft/Completed) OR Has Score > 0
            const isValidEval = rawEval && (
                rawEval.status ||
                (rawEval.totalScore && Number(rawEval.totalScore) > 0)
            );

            const evaluation = isValidEval ? rawEval : undefined;

            let totalScore = 0;
            let grade = {
                grade: UI_TEXT.WAITING,
                range: '-',
                description: UI_TEXT.WAITING_DESC,
                colorClass: GRADE_COLORS.NA.text,
                bgClass: GRADE_COLORS.NA.bg,
                label: 'Waiting',
                min: 0,
                max: 0,
                borderClass: GRADE_COLORS.NA.border,
                icon: '⏳'
            } as any;

            if (evaluation) {
                totalScore = Number(evaluation.totalScore || 0);
                grade = getGrade(totalScore);
            }

            return {
                ...emp,
                evaluation,
                grade,
                totalScore,
                history: historicalData.get(emp.id) ? Object.fromEntries(historicalData.get(emp.id)!) : undefined // [T-History] Inject History
            };
        });
    }, [employees, existingEvaluations, historicalData]);

    // [T-030] Extract Unique PdNumbers (Still useful?)
    // Actually hook calculates availablePdNumbers, but maybe we want ALL possible ones here?
    // Let's let the hook handle it. But wait, 'uniquePdNumbers' was used for... nothing? 
    // It was used in previous code but logic removed? Ah, no, it was used to pass to FilterBar?
    // FilterBar now takes availablePdNumbers from hook.

    // [T-030] Autocomplete Options (Legacy logic? Hook provides availableEmployeeOptions)

    // 🔥 Initialize Filter Hook (Generic Type Hack for Dashboard Data)
    const {
        filters,
        setFilter,
        resetFilters,
        filteredEmployees: filteredEmployeesRaw, // Alias and Raw
        availableSections,
        availableGrades,
        availablePdNumbers,
        employeeOptionsResolved: availableEmployeeOptions
    } = useEmployeeFilter(dashboardData as unknown as Employee[]);

    // Cast back to Dashboard Item Type
    const filteredData = filteredEmployeesRaw as unknown as typeof dashboardData;

    // Helper Wrappers for UI Handlers
    const handleGradeClick = (grade: string) => {
        setFilter('grade', filters.grade === grade ? 'All' : grade);
    };

    const handleSectionClick = (section: string) => {
        setFilter('section', filters.section === section ? 'All' : section);
    };

    const handleRowClick = (empId: string) => {
        // Here selectedEmployeeId is used for "Selection" (Highlight), NOT filtering.
        // Wait, line 238 in original: values 'selectedEmployeeId' was used for filter text AND selection highlight?
        // Line 220 `searchLower = selectedEmployeeId`.
        // Line 239 `setSelectedEmployeeId(prev => ...`.
        // So clicking a row filtered the list to ONLY that employee? That seems odd UX.
        // Usually Row Click -> Draw/Details.
        // Let's look at logic: `handleEvaluate` opens drawer. `handleRowClick` was doing selection/filter.
        // If I Click a row, it sets selectedEmployeeId -> filteredData becomes 1 item.
        // If that's the desired legacy behavior, we map it to `filters.info`.

        // But `filters.info` is "Search Text". 
        // If I click row, and set filter.info = empId, it works.
        // But if I click again to deselect?
        const currentSearch = filters.info;
        setFilter('info', currentSearch === empId ? '' : empId);
    };

    // Removed Handlers (Defined above with hook)

    // [T-History] Compute Comparison Distribution (Top-Level Hook)
    const comparisonDistribution = useMemo(() => {
        if (!isCompareMode || !historicalData) return undefined;

        // Aggregate counts per Year per Grade
        const distribution: Record<string, Record<string, number>> = {};

        selectedYears.forEach(year => {
            distribution[year] = { 'NI': 0, 'BE': 0, 'ME': 0, 'OE': 0, 'E': 0 };
        });

        filteredData.forEach(item => {
            const empHistory = historicalData.get(item.id);
            if (empHistory) {
                selectedYears.forEach(yearStr => {
                    const yearNum = parseInt(yearStr);
                    const record = empHistory.get(yearNum);
                    if (record && record.grade) {
                        const g = record.grade;
                        if (distribution[yearStr][g] !== undefined) {
                            distribution[yearStr][g]++;
                        }
                    }
                });
            }
        });

        return distribution;
    }, [filteredData, historicalData, isCompareMode, selectedYears]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    // handleResetFilters moved to hook alias 'resetFilters'



    // Import EvaluationDrawer dynamically to avoid SSR issues if usually not needed, or standard import if fine.
    // Standard import is fine. Need to add import at top separately.
    // Ensure import { EvaluationDrawer } from '../../components/evaluations/EvaluationDrawer'; is present.


    const handleEvaluate = (id: string) => {
        // [Speckit T-Split] Check screen size
        // If Mobile/Tablet (< 1024px), use legacy Redirect
        if (window.innerWidth < 1024) {
            router.push(`/evaluations/${id}?returnTo=/dashboard`);
        } else {
            // Desktop: Open Split View
            setSelectedEmployeeId(id);
        }
    };

    const handleCloseEvaluation = () => {
        setSelectedEmployeeId(null);
    };

    const handleEvaluationSuccess = () => {
        refreshData();
        setSelectedEmployeeId(null);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
            {/* Left Side: Dashboard Content */}
            {/* If Drawer Open: 60%, Else: 100% */}
            <div className={`flex flex-col h-full transition-all duration-300 overflow-hidden ${selectedEmployeeId ? 'w-full lg:w-[60%] xl:w-[65%]' : 'w-full'}`}>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth pb-20 md:pb-6"> {/* Padding for mobile nav */}
                    {/* Header */}
                    <div className="mb-6 rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 p-6 text-white shadow-lg">
                        <h1 className="text-2xl md:text-3xl font-bold">{UI_TEXT.DASHBOARD_TITLE}</h1>
                        <p className="text-orange-100">{UI_TEXT.EVAL_YEAR_LABEL} {evalYear}</p>
                    </div>

                    {/* Filters */}
                    <FilterBar
                        sections={availableSections}
                        grades={availableGrades}
                        selectedSection={filters.section}
                        onSectionChange={(val) => setFilter('section', val)}
                        selectedGrade={filters.grade}
                        onGradeChange={(val) => setFilter('grade', val)}
                        searchTerm={filters.info}
                        onSearchChange={(val) => setFilter('info', val)}
                        totalCount={filteredData.length}
                        pdNumbers={availablePdNumbers}
                        selectedPdNumber={filters.pdNumber}
                        onPdNumberChange={(val) => setFilter('pdNumber', val)}
                        employeeOptions={availableEmployeeOptions} // Type safe now
                        onReset={resetFilters}
                        // [T-History] Props
                        isCompareMode={isCompareMode}
                        onCompareModeChange={setIsCompareMode}
                        selectedYears={selectedYears}
                        onYearChange={(year) => {
                            if (selectedYears.includes(year)) {
                                setSelectedYears(prev => prev.filter(y => y !== year).sort());
                            } else {
                                setSelectedYears(prev => [...prev, year].sort());
                            }
                        }}
                    />

                    {/* Charts Grid - Adjust Layout when Split */}
                    <div className={`grid grid-cols-1 gap-6 mb-6 ${selectedEmployeeId ? 'lg:grid-cols-1 xl:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                        {/* Row 1: Donut & Stacked Bar */}
                        <div className="rounded-lg bg-white p-4 shadow lg:col-span-1">
                            <h3 className="mb-4 text-lg font-semibold text-slate-700">จำนวนพนักงานแยกตามผลการประเมิน</h3>
                            <GradeDonutChart data={filteredData} onGradeClick={handleGradeClick} />
                        </div>
                        <div className={`rounded-lg bg-white p-4 shadow ${selectedEmployeeId ? 'lg:col-span-1 xl:col-span-1' : 'lg:col-span-2'}`}>
                            <h3 className="mb-4 text-lg font-semibold text-slate-700">จำนวนพนักงานแยกเกรด ตามส่วนงานต่างๆ</h3>
                            <SectionStackChart
                                data={filteredData}
                                onSectionClick={handleSectionClick}
                                onBack={() => setFilter('section', 'All')}
                            />
                        </div>

                        {/* Row 2: Distribution & Radar (Adjusted layout) */}
                        <div className={`rounded-lg bg-white p-4 shadow ${selectedEmployeeId ? 'lg:col-span-1 xl:col-span-2' : 'lg:col-span-2'}`}>
                            <h3 className="mb-4 text-lg font-semibold text-slate-700">
                                {isCompareMode ? 'เปรียบเทียบการกระจายตัวผลการประเมิน' : 'แจกแจงการกระจายตัวผลการประเมิน'}
                            </h3>
                            <GradeDistributionChart
                                data={filteredData}
                                onGradeClick={handleGradeClick}
                                // [T-History]
                                isCompareMode={isCompareMode}
                                comparisonData={comparisonDistribution}
                            />
                        </div>
                        <div className="rounded-lg bg-white p-4 shadow lg:col-span-1">
                            <h3 className="mb-4 text-lg font-semibold text-slate-700">ผลการประเมินแยกตามหัวข้อ</h3>
                            <CompetencyRadarChart data={filteredData} />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-lg bg-white shadow mb-10">
                        <div className="border-b px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-700">ตารางแสดงรายละเอียดข้อมูล</h3>
                        </div>
                        <EmployeeTable
                            data={filteredData}
                            categories={categories}
                            onRowClick={handleRowClick}
                            onEvaluate={handleEvaluate} // 🔥 Capture Click
                            compareYears={isCompareMode ? selectedYears : []} // [T-History] Pass Years
                        />
                    </div>
                </div>
            </div>

            {/* Right Side: Evaluation Drawer (Split View) */}
            {selectedEmployeeId && (
                <div className="hidden lg:flex flex-col w-[40%] xl:w-[35%] h-full border-l border-slate-200 bg-white shadow-xl z-20 transition-all duration-300">
                    {/* Import EvaluationDrawer dynamically inside if needed, or top level */}
                    <EvaluationDrawer
                        employeeId={selectedEmployeeId}
                        onClose={handleCloseEvaluation}
                        onSuccess={handleEvaluationSuccess}
                        isEmbedded={true}
                    />
                </div>
            )}
        </div>
    );
}
