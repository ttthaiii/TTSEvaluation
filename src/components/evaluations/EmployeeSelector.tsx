import React, { useMemo } from 'react';
import { Employee } from '../../types/employee';
import { SearchableSelect } from '../ui/SearchableSelect';

interface EmployeeSelectorProps {
    sections: string[];
    selectedSection: string;
    onSectionChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    filteredEmployees: Employee[];
    selectedEmployeeId: string;
    onEmployeeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    existingEvaluations: Record<string, any>;
    completedEvaluationIds: Set<string>;
}

export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
    sections,
    selectedSection,
    onSectionChange,
    filteredEmployees,
    selectedEmployeeId,
    onEmployeeChange,
    existingEvaluations,
    completedEvaluationIds
}) => {
    // Transform Sections to Options
    const sectionOptions = useMemo(() =>
        sections.map(s => ({ value: s, label: s })),
        [sections]
    );

    // Transform Employees to Options
    const employeeOptions = useMemo(() =>
        filteredEmployees.map(emp => {
            const isComplete = completedEvaluationIds.has(emp.id);
            return {
                value: emp.id,
                label: `${isComplete ? "✅ " : ""}${emp.employeeId} - ${emp.firstName} ${emp.lastName}`,
                searchTerms: `${emp.employeeId} ${emp.firstName} ${emp.lastName}`, // Allows searching by ID, First, or Last name
                statusColor: isComplete ? 'text-green-600 font-medium' : undefined
            };
        }),
        [filteredEmployees, completedEvaluationIds]
    );

    // Initial check for section validity
    // If selectedSection is not in options, we might want to warn or just let it be.

    const handleSectionChange = (newValue: string) => {
        // Create synthetic event to match existing interface
        const event = {
            target: { value: newValue }
        } as React.ChangeEvent<HTMLSelectElement>;
        onSectionChange(event);
    };

    const handleEmployeeChange = (newValue: string) => {
        const event = {
            target: { value: newValue }
        } as React.ChangeEvent<HTMLSelectElement>;
        onEmployeeChange(event);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SearchableSelect
                    label="เลือกส่วนงาน (Section)"
                    placeholder="ค้นหาหรือเลือกส่วนงาน..."
                    options={sectionOptions}
                    value={selectedSection}
                    onChange={handleSectionChange}
                />

                {selectedSection && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                        <SearchableSelect
                            label="เลือกพนักงานที่ต้องการประเมิน"
                            placeholder="พิมพ์รหัส, ชื่อ หรือนามสกุล..."
                            options={employeeOptions}
                            value={selectedEmployeeId}
                            onChange={handleEmployeeChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
