import React from 'react';
import { Employee } from '../../types/employee';

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
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="block text-slate-700 font-semibold text-base">เลือกส่วนงาน (Section)</label>
                    <div className="relative">
                        <select
                            className="w-full pl-4 pr-10 py-3.5 text-base border-gray-200 rounded-xl text-slate-700 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50/50 outline-none transition-all appearance-none cursor-pointer"
                            value={selectedSection}
                            onChange={onSectionChange}
                        >
                            <option value="">-- กรุณาเลือกส่วนงาน --</option>
                            {sections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </div>
                    </div>
                </div>

                {selectedSection && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                        <label className="block text-slate-700 font-semibold text-base">เลือกพนักงานที่ต้องการประเมิน</label>
                        <div className="relative">
                            <select
                                className="w-full pl-4 pr-10 py-3.5 text-base border-gray-200 rounded-xl text-slate-700 bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-50/50 outline-none transition-all appearance-none cursor-pointer"
                                value={selectedEmployeeId}
                                onChange={onEmployeeChange}
                            >
                                <option value="">-- เลือกรายชื่อ --</option>
                                {filteredEmployees.map(emp => {
                                    const isComplete = completedEvaluationIds.has(emp.id);
                                    return (
                                        <option key={emp.id} value={emp.id} className={isComplete ? 'text-green-600 font-medium' : ''}>
                                            {isComplete ? "✅ " : ""}{emp.employeeId} - {emp.firstName} {emp.lastName}
                                        </option>
                                    );
                                })}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
