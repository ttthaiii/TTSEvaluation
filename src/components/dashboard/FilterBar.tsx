import React, { useMemo } from 'react';
import { GradeCriteria } from '@/utils/grade-calculation';
import { SearchableSelect, SearchableSelectOption } from '../ui/SearchableSelect';
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
    employeeOptions: SearchableSelectOption[];
    onReset?: () => void;
    // [T-History] Comparison Props
    isCompareMode?: boolean;
    onCompareModeChange?: (val: boolean) => void;
    selectedYears?: string[];
    onYearChange?: (year: string) => void;
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
    onReset,
    isCompareMode = false,
    onCompareModeChange,
    selectedYears = [],
    onYearChange
}) => {
    // [T-History] Local state for dropdown visibility
    const [isYearDropdownOpen, setIsYearDropdownOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsYearDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        ...employeeOptions // Pass through directly as they are already SearchableSelectOption
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
                <div className="flex-shrink-0 flex flex-row flex-wrap items-center justify-end gap-3 w-full xl:w-auto xl:mb-1">

                    {/* [T-History] Comparison UI */}
                    {onCompareModeChange && (
                        <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 h-[40px]">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isCompareMode}
                                    onChange={e => onCompareModeChange(e.target.checked)}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                />
                                <span className="text-xs sm:text-sm font-bold text-orange-700 whitespace-nowrap">เทียบปี</span>
                            </label>

                            {isCompareMode && onYearChange && (
                                <div className="relative ml-1 sm:ml-2" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                                        className="flex items-center gap-1 sm:gap-2 cursor-pointer bg-white border border-gray-200 rounded-md px-2 py-1 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition shadow-sm outline-none active:scale-95 duration-100"
                                    >
                                        <span>ปี ({selectedYears.length})</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isYearDropdownOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="text-xs font-semibold text-gray-400 mb-2 px-2">เลือกปีที่ต้องการเทียบ</div>
                                            {['2024'].map(year => (
                                                <label key={year} className="flex items-center gap-3 p-2 hover:bg-orange-50 rounded cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedYears.includes(year)}
                                                        onChange={() => onYearChange(year)}
                                                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                                    />
                                                    <span className="text-sm text-gray-700 font-medium">{year}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {onReset && (
                        <button
                            onClick={onReset}
                            className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-orange-600 transition-colors h-[40px]"
                        >
                            <RotateCcw className="w-3 h-3 sm:w-4 sm:w-4" />
                            <span className="hidden sm:inline">รีเซ็ต</span>
                        </button>
                    )}
                    <div className="bg-orange-50 text-orange-700 px-3 py-2 rounded-lg border border-orange-100 font-medium whitespace-nowrap text-xs sm:text-sm h-[40px] flex items-center">
                        {totalCount} รายการ
                    </div>
                </div>
            </div>
        </div>
    );
};
