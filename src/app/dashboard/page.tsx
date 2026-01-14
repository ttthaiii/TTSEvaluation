'use client';

import React, { useState, useMemo } from 'react';
import { useEvaluation } from '@/hooks/useEvaluation'; // Using alias if available, else relative
import { FilterBar } from '../../components/dashboard/FilterBar';
import { GradeDonutChart } from '../../components/dashboard/GradeDonutChart';
import { SectionStackChart } from '../../components/dashboard/SectionStackChart';
import { GradeDistributionChart } from '../../components/dashboard/GradeDistributionChart';
import { CompetencyRadarChart } from '../../components/dashboard/CompetencyRadarChart';
import { EmployeeTable } from '../../components/dashboard/EmployeeTable';
import { getGrade, GRADE_RANGES, GradeCriteria } from '@/utils/grade-calculation';
import { Loader2 } from 'lucide-react';
import { EvaluationDrawer } from '../../components/evaluations/EvaluationDrawer'; // 🔥 Import Drawer
import { Employee } from '@/types/employee';
import { EvaluationRecord } from '@/types/evaluation';
import { collection, query, where, getDocs } from 'firebase/firestore'; // 🔥 Import Firestore
import { db } from '@/lib/firebase'; // 🔥 Import DB instance

export default function DashboardPage() {
    const {
        employees,
        existingEvaluations,
        completedEvaluationIds,
        sections,
        loading,
        categories,
        evalYear,
        refreshData, // 🔥 Pull refresh function
        updateLocalEvaluation // 🔥 Pull local update function
    } = useEvaluation();

    const [selectedSection, setSelectedSection] = useState<string>('All');
    const [selectedGrade, setSelectedGrade] = useState<string>('All');
    const [selectedPdNumber, setSelectedPdNumber] = useState<string>('All'); // [T-030]
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [evaluationPanelId, setEvaluationPanelId] = useState<string | null>(null); // 🔥 Drawer State

    // [T-History] Comparison State
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedYears, setSelectedYears] = useState<string[]>(['2024']);
    const [historicalData, setHistoricalData] = useState<Map<string, Map<number, { score: number, grade: string }>>>(new Map());

    // [T-History] Fetch History
    React.useEffect(() => {
        if (!isCompareMode || selectedYears.length === 0) {
            setHistoricalData(new Map());
            return;
        }

        const fetchHistory = async () => {
            try {
                const numericYears = selectedYears.map(y => parseInt(y));
                const q = query(
                    collection(db, 'evaluations'),
                    where('evaluationYear', 'in', numericYears)
                );

                const snapshot = await getDocs(q);
                const historyMap = new Map<string, Map<number, { score: number, grade: string }>>();

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // Supports both 'employeeId' (legacy/string ID) or 'employeeDocId' (auth ID).
                    // Employee List used 'employeeDocId'. Use 'employeeDocId' if available for consistency with generic ID.
                    // But our emp objects here have 'id' (docId) and 'employeeId' (code).
                    // Let's key by 'docId' (item.id in dashboardData).
                    const docId = data.employeeDocId;

                    if (docId) {
                        if (!historyMap.has(docId)) {
                            historyMap.set(docId, new Map());
                        }
                        historyMap.get(docId)?.set(data.evaluationYear, {
                            score: data.totalScore || 0,
                            grade: data.finalGrade || "-"
                        });
                    }
                });

                setHistoricalData(historyMap);

            } catch (error) {
                console.error("Error fetching history:", error);
            }
        };

        fetchHistory();
    }, [isCompareMode, selectedYears]);

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
                grade: 'รอประเมิน',
                range: '-',
                description: 'ยังไม่ได้รับการประเมิน',
                colorClass: 'text-slate-400',
                bgClass: 'bg-slate-100',
                label: 'Waiting',
                min: 0,
                max: 0,
                borderClass: 'border-slate-200',
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

    // [T-030] Extract Unique PdNumbers
    const uniquePdNumbers = useMemo(() => {
        const pds = new Set<string>();
        dashboardData.forEach(e => {
            if (e.pdNumber) pds.add(e.pdNumber);
        });
        return Array.from(pds).sort();
    }, [dashboardData]);

    // [T-030] Autocomplete Options
    const employeeOptions = useMemo(() => {
        return dashboardData.map(e => ({
            id: e.id,
            name: `${e.employeeId} ${e.firstName} ${e.lastName}`
        }));
    }, [dashboardData]);

    // 3. Cascading Filter Logic
    // Helper to filter data based on specific criteria
    const filterSubset = (
        data: typeof dashboardData,
        criteria: { section?: string; grade?: string; pd?: string; search?: string }
    ) => {
        return data.filter(item => {
            const matchSection = !criteria.section || criteria.section === 'All' || item.section === criteria.section;
            const matchGrade = !criteria.grade || criteria.grade === 'All' || item.grade?.grade === criteria.grade;
            const matchPd = !criteria.pd || criteria.pd === 'All' || item.pdNumber === criteria.pd;

            // Search logic (optional inclusion in Cascade)
            // Usually, Search shouldn't limit dropdown options (circular dependency if selecting from dropdown)
            // But if we want Strict filtering, we can include it. 
            // For now, let's keep Dropdowns independent of Search Text, but Search Text dependent on Dropdowns.
            return matchSection && matchGrade && matchPd;
        });
    };

    // Derived Options based on INTERSECTION of other filters
    const availableSections = useMemo(() => {
        // Options for Section should respect Grade & PdNumber
        const subset = filterSubset(dashboardData, { grade: selectedGrade, pd: selectedPdNumber });
        return Array.from(new Set(subset.map(i => i.section))).sort();
    }, [dashboardData, selectedGrade, selectedPdNumber]);

    const availableGrades = useMemo(() => {
        // Options for Grade should respect Section & PdNumber
        const subset = filterSubset(dashboardData, { section: selectedSection, pd: selectedPdNumber });
        const grades = new Set<string>();
        subset.forEach(i => {
            if (i.grade?.grade) grades.add(i.grade.grade);
        });

        // Return full GradeCriteria objects that match the available grades
        return GRADE_RANGES.filter(g => grades.has(g.grade));
    }, [dashboardData, selectedSection, selectedPdNumber]);

    const availablePdNumbers = useMemo(() => {
        // Options for PdNumber should respect Section & Grade
        const subset = filterSubset(dashboardData, { section: selectedSection, grade: selectedGrade });
        return Array.from(new Set(subset.map(i => i.pdNumber).filter((p): p is string => !!p))).sort();
    }, [dashboardData, selectedSection, selectedGrade]);

    // Available Employees (for Autocomplete) - Respects ALL current filters (Section, Grade, Pd)
    const availableEmployeeOptions = useMemo(() => {
        const subset = filterSubset(dashboardData, {
            section: selectedSection,
            grade: selectedGrade,
            pd: selectedPdNumber
        });
        return subset.map(e => ({
            id: e.employeeId, // Use Text ID for value to match existing logic logic (or change keys)
            name: `${e.employeeId} - ${e.firstName} ${e.lastName}`,
            searchTerms: `${e.employeeId} ${e.firstName} ${e.lastName}`
        }));
    }, [dashboardData, selectedSection, selectedGrade, selectedPdNumber]);

    // 4. Final Filtered Data (Display Data)
    const filteredData = useMemo(() => {
        // Base subset from dropdowns
        const subset = filterSubset(dashboardData, {
            section: selectedSection,
            grade: selectedGrade,
            pd: selectedPdNumber
        });

        // Apply Text Search on top
        if (!selectedEmployeeId) return subset;

        const searchLower = selectedEmployeeId.toLowerCase().trim();
        return subset.filter(item => {
            const fullNameString = `${item.employeeId} ${item.firstName} ${item.lastName}`.toLowerCase();
            return item.employeeId.toLowerCase().includes(searchLower) ||
                item.firstName.toLowerCase().includes(searchLower) ||
                item.lastName.toLowerCase().includes(searchLower) ||
                fullNameString.includes(searchLower);
        });
    }, [dashboardData, selectedSection, selectedGrade, selectedPdNumber, selectedEmployeeId]);

    const handleGradeClick = (grade: string) => {
        setSelectedGrade(prev => prev === grade ? 'All' : grade);
    };

    const handleSectionClick = (section: string) => {
        setSelectedSection(prev => prev === section ? 'All' : section);
    };

    const handleRowClick = (empId: string) => {
        // If row clicked, find the employee and set the search filter?
        // Or actually, row click usually opens drawer?
        // Wait, current code sets `selectedEmployeeId` (the filtering mechanism) on row click.
        // This is weird behavior if row click is meant to select.
        // Ah, `handleRowClick` was toggling highlighting.
        // But user wants "Split Screen".
        // The instructions for "Split Screen" (Task Id 1) say: "Clicking ... triggers ... split-screen panel".
        // My code below `handleRowClick` implementation: `setSelectedEmployeeId(...)`.
        // AND `onEvaluate={handleEvaluate}`.
        // Let's verify who calls what. 
        // EmployeeTable usually has `onRowClick` (for highlighting?) and `onEvaluate` (button?).
        // If Row Click should open Drawer, `handleRowClick` should call `setEvaluationPanelId`.
        // I will fix this logic if needed, but for now I'm focused on Filters.
        // I will keep `handleRowClick` as is for now to avoid scope creep, unless it conflicts.
        setSelectedEmployeeId(prev => prev === empId ? '' : empId);
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    const handleResetFilters = () => {
        setSelectedSection('All');
        setSelectedGrade('All');
        setSelectedPdNumber('All');
        setSelectedEmployeeId('');
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        );
    }

    const handleEvaluate = (id: string) => {
        setEvaluationPanelId(id);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Left Side: Dashboard Content */}
            <div className={`flex-1 flex flex-col h-full transition-all duration-300 overflow-hidden`}>
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {/* Header */}
                    <div className="mb-6 rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 p-6 text-white shadow-lg">
                        <h1 className="text-3xl font-bold">ภาพรวมผลการประเมินพนักงาน</h1>
                        <p className="text-orange-100">ประจำปี {evalYear}</p>
                    </div>

                    {/* Filters */}
                    <FilterBar
                        sections={availableSections}
                        grades={availableGrades}
                        selectedSection={selectedSection}
                        onSectionChange={setSelectedSection}
                        selectedGrade={selectedGrade}
                        onGradeChange={setSelectedGrade}
                        searchTerm={selectedEmployeeId}
                        onSearchChange={setSelectedEmployeeId}
                        totalCount={filteredData.length}
                        pdNumbers={availablePdNumbers}
                        selectedPdNumber={selectedPdNumber}
                        onPdNumberChange={setSelectedPdNumber}
                        employeeOptions={availableEmployeeOptions}
                        onReset={handleResetFilters}
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

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                        {/* Row 1: Donut & Stacked Bar */}
                        <div className="rounded-lg bg-white p-4 shadow lg:col-span-1">
                            <h3 className="mb-4 text-lg font-semibold text-slate-700">จำนวนพนักงานแยกตามผลการประเมิน</h3>
                            <GradeDonutChart data={filteredData} onGradeClick={handleGradeClick} />
                        </div>
                        <div className="rounded-lg bg-white p-4 shadow lg:col-span-2">
                            <h3 className="mb-4 text-lg font-semibold text-slate-700">จำนวนพนักงานแยกเกรด ตามส่วนงานต่างๆ</h3>
                            <SectionStackChart
                                data={filteredData}
                                onSectionClick={handleSectionClick}
                                onBack={() => setSelectedSection('All')}
                            />
                        </div>

                        {/* Row 2: Distribution & Radar (Adjusted layout) */}
                        <div className="rounded-lg bg-white p-4 shadow lg:col-span-2">
                            <h3 className="mb-4 text-lg font-semibold text-slate-700">แจกแจงการกระจายตัวผลการประเมิน</h3>
                            <GradeDistributionChart data={filteredData} onGradeClick={handleGradeClick} />
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

            {/* Right Side: Evaluation Drawer (Spacer & Container) */}
            <div
                className={`
                    transition-all duration-300 transform 
                    ${evaluationPanelId ? 'w-[600px] translate-x-0' : 'w-0 translate-x-full'}
                `}
            >
                {evaluationPanelId && (
                    <EvaluationDrawer
                        employeeId={evaluationPanelId}
                        onClose={() => setEvaluationPanelId(null)}
                        onSuccess={(data) => {
                            updateLocalEvaluation(data); // 🔥 Update Only ONE Record
                            setEvaluationPanelId(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
