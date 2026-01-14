import React, { useMemo } from 'react';
import { GradeCriteria } from '@/utils/grade-calculation';
import { SearchableSelect } from '../ui/SearchableSelect';
import { RotateCcw } from 'lucide-react';

interface FilterBarProps {
    sections: string[];
    grades: GradeCriteria[];
    selectedSection: string;
    onSectionChange: (val: string) => void;
    selectedGrade: string;
    onGradeChange: (val: string) => void;
    searchTerm: string; // Used as selectedEmployeeId here
    onSearchChange: (val: string) => void;
    totalCount: number;
    pdNumbers: string[];
    selectedPdNumber: string;
    onPdNumberChange: (val: string) => void;
    employeeOptions: { id: string; name: string; searchTerms?: string }[];
    onReset?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    sections,
    grades,
    selectedSection,
    onSectionChange,
    selectedGrade,
    onGradeChange,
    searchTerm,
    onSearchChange,
    totalCount,
    pdNumbers,
    selectedPdNumber,
    onPdNumberChange,
    employeeOptions,
    onReset
}) => {

    // Transform options for SearchableSelect
    const sectionOptions = useMemo(() => [
        { value: 'All', label: 'ทั้งหมด (All)' },
        ...sections.map(s => ({ value: s, label: s }))
    ], [sections]);

    const gradeOptions = useMemo(() => [
        { value: 'All', label: 'ทั้งหมด (All)' },
        ...grades.map(g => ({ value: g.grade, label: `${g.grade} (${g.label})` }))
    ], [grades]);

    const pdOptions = useMemo(() => [
        { value: 'All', label: 'ทั้งหมด (All)' },
        ...pdNumbers.map(p => ({ value: p, label: p }))
    ], [pdNumbers]);

    const empOptions = useMemo(() => [
        { value: '', label: 'ทั้งหมด (All)' }, // Empty string usually clears the filter in parent logic if we map '' to 'All'-like behavior or !val check
        ...employeeOptions.map(e => ({
            value: e.id, // This is the employeeId (text)
            label: e.name,
            searchTerms: e.searchTerms
        }))
    ], [employeeOptions]);

    return (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">

                {/* Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-auto flex-1">

                    {/* PD Number Filter */}
                    <SearchableSelect
                        label="PD Number"
                        placeholder="เลือก PD..."
                        options={pdOptions}
                        value={selectedPdNumber}
                        onChange={onPdNumberChange}
                        className="w-full"
                    />

                    {/* Section Filter */}
                    <SearchableSelect
                        label="ส่วนงาน (Section)"
                        placeholder="เลือกส่วนงาน..."
                        options={sectionOptions}
                        value={selectedSection}
                        onChange={onSectionChange}
                        className="w-full"
                    />

                    {/* Grade Filter */}
                    <SearchableSelect
                        label="เกรด (Grade)"
                        placeholder="เลือกเกรด..."
                        options={gradeOptions}
                        value={selectedGrade}
                        onChange={onGradeChange}
                        className="w-full"
                    />

                    {/* Employee Search */}
                    <SearchableSelect
                        label="ค้นหาพนักงาน"
                        placeholder="ค้นหา (รหัส/ชื่อ)"
                        options={empOptions}
                        value={searchTerm}
                        onChange={onSearchChange}
                        className="w-full"
                    />
                </div>

                {/* Counter Badge & Reset Button */}
                <div className="flex-shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-3 xl:mb-1">
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-orange-600 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            รีเซ็ต
                        </button>
                    )}
                    <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg border border-orange-100 font-medium whitespace-nowrap">
                        พบข้อมูล {totalCount} รายการ
                    </div>
                </div>
            </div>
        </div>
    );
};
