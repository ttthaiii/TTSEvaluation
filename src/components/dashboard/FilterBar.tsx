import React from 'react';
import { GradeCriteria } from '@/utils/grade-calculation';
import { Search } from 'lucide-react';

interface FilterBarProps {
    sections: string[];
    grades: GradeCriteria[];
    selectedSection: string;
    onSectionChange: (val: string) => void;
    selectedGrade: string;
    onGradeChange: (val: string) => void;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    totalCount: number;
    // [T-030] New Props
    pdNumbers: string[];
    selectedPdNumber: string;
    onPdNumberChange: (val: string) => void;
    // For Autocomplete
    employeeOptions: { id: string; name: string }[];
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
    employeeOptions
}) => {
    return (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm flex flex-col xl:flex-row items-end xl:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-wrap">
                {/* Section Filter */}
                <div className="flex flex-col">
                    <label className="text-sm text-slate-500 mb-1">ชื่อส่วน</label>
                    <select
                        value={selectedSection}
                        onChange={(e) => onSectionChange(e.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none min-w-[200px]"
                    >
                        <option value="All">ทั้งหมด</option>
                        {sections.map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                        ))}
                    </select>
                </div>

                {/* Grade Filter */}
                <div className="flex flex-col">
                    <label className="text-sm text-slate-500 mb-1">เกรด</label>
                    <select
                        value={selectedGrade}
                        onChange={(e) => onGradeChange(e.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none min-w-[150px]"
                    >
                        <option value="All">ทั้งหมด</option>
                        {grades.map(g => (
                            <option key={g.grade} value={g.grade}>{g.grade} ({g.label})</option>
                        ))}
                    </select>
                </div>

                {/* [T-030] PdNumber Filter */}
                <div className="flex flex-col">
                    <label className="text-sm text-slate-500 mb-1">PD Number</label>
                    <select
                        value={selectedPdNumber}
                        onChange={(e) => onPdNumberChange(e.target.value)}
                        className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none min-w-[150px]"
                    >
                        <option value="All">ทั้งหมด</option>
                        {pdNumbers.map(pd => (
                            <option key={pd} value={pd}>{pd}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Search & Count */}
            <div className="flex flex-col md:flex-row items-end gap-4 w-full xl:w-auto">

                <div className="flex flex-col w-full md:w-auto">
                    <label className="text-sm text-slate-500 mb-1">ค้นหาพนักงาน</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            list="employee-suggestions" // [T-030] Link to Datalist
                            type="text"
                            placeholder="พิมพ์รหัส หรือ ชื่อ..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="rounded border border-slate-300 pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none w-full md:min-w-[250px]"
                        />
                        {/* [T-030] Autocomplete Datalist */}
                        <datalist id="employee-suggestions">
                            {employeeOptions.map(opt => (
                                <option key={opt.id} value={opt.name} />
                            ))}
                        </datalist>
                    </div>
                </div>
            </div>
        </div>
    );
};
