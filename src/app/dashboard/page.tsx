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
import { Employee } from '@/types/employee';
import { EvaluationRecord } from '@/types/evaluation';

export default function DashboardPage() {
    const {
        employees,
        existingEvaluations,
        completedEvaluationIds,
        sections,
        loading,
        categories,
        evalYear
    } = useEvaluation();

    const [selectedSection, setSelectedSection] = useState<string>('All');
    const [selectedGrade, setSelectedGrade] = useState<string>('All');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    // 1. Filter ONLY Completed Employees
    const completedEmployees = useMemo(() => {
        return employees.filter(emp => completedEvaluationIds.has(emp.id));
    }, [employees, completedEvaluationIds]);

    // 2. Prepare Data for Dashboard
    const dashboardData = useMemo(() => {
        return completedEmployees.map(emp => {
            const evaluation = existingEvaluations[emp.id];
            const totalScore = Number(evaluation?.totalScore || 0);
            const grade = getGrade(totalScore);

            return {
                ...emp,
                evaluation,
                grade,
                totalScore
            };
        });
    }, [completedEmployees, existingEvaluations]);

    // 3. Apply Filters
    const filteredData = useMemo(() => {
        return dashboardData.filter(item => {
            const matchSection = selectedSection === 'All' || item.section === selectedSection;
            const matchGrade = selectedGrade === 'All' || item.grade?.grade === selectedGrade;
            const matchId = !selectedEmployeeId || item.employeeId.includes(selectedEmployeeId) ||
                item.firstName.includes(selectedEmployeeId) ||
                item.lastName.includes(selectedEmployeeId);

            return matchSection && matchGrade && matchId;
        });
    }, [dashboardData, selectedSection, selectedGrade, selectedEmployeeId]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            {/* Header */}
            <div className="mb-6 rounded-lg bg-gradient-to-r from-orange-400 to-orange-600 p-6 text-white shadow-lg">
                <h1 className="text-3xl font-bold">ภาพรวมผลการประเมินพนักงาน</h1>
                <p className="text-orange-100">ประจำปี {evalYear}</p>
            </div>

            {/* Filters */}
            <FilterBar
                sections={sections}
                grades={GRADE_RANGES}
                selectedSection={selectedSection}
                onSectionChange={setSelectedSection}
                selectedGrade={selectedGrade}
                onGradeChange={setSelectedGrade}
                searchTerm={selectedEmployeeId}
                onSearchChange={setSelectedEmployeeId}
                totalCount={filteredData.length}
            />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {/* Row 1: Donut & Stacked Bar */}
                <div className="rounded-lg bg-white p-4 shadow lg:col-span-1">
                    <h3 className="mb-4 text-lg font-semibold text-slate-700">จำนวนพนักงานแยกตามผลการประเมิน</h3>
                    <GradeDonutChart data={filteredData} />
                </div>
                <div className="rounded-lg bg-white p-4 shadow lg:col-span-2">
                    <h3 className="mb-4 text-lg font-semibold text-slate-700">จำนวนพนักงานแยกเกรด ตามส่วนงานต่างๆ</h3>
                    <SectionStackChart data={filteredData} />
                </div>

                {/* Row 2: Distribution & Radar (Adjusted layout) */}
                <div className="rounded-lg bg-white p-4 shadow lg:col-span-2">
                    <h3 className="mb-4 text-lg font-semibold text-slate-700">แจกแจงการกระจายตัวผลการประเมิน</h3>
                    <GradeDistributionChart data={filteredData} />
                </div>
                <div className="rounded-lg bg-white p-4 shadow lg:col-span-1">
                    <h3 className="mb-4 text-lg font-semibold text-slate-700">ผลการประเมินแยกตามหัวข้อ</h3>
                    <CompetencyRadarChart data={filteredData} />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg bg-white shadow">
                <div className="border-b px-6 py-4">
                    <h3 className="text-lg font-semibold text-slate-700">ตารางแสดงรายละเอียดข้อมูล</h3>
                </div>
                <EmployeeTable data={filteredData} categories={categories} />
            </div>
        </div>
    );
}
