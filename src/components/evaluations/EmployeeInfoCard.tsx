import React, { useState } from 'react';
import { Employee } from '../../types/employee';
import { calculateServiceTenure, formatDateToThai, calculateAge } from '../../utils/dateUtils';
import { History } from 'lucide-react';
import { EvaluationHistoryModal } from './EvaluationHistoryModal';

interface EmployeeInfoCardProps {
    employee: Employee;
    evalYear: number;
    isCompact?: boolean;
}

export const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({ employee, evalYear, isCompact = false }) => {
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // 🔥 Define text sizes based on compact mode
    const titleSize = isCompact ? 'text-lg' : 'text-xl';
    const contentSize = isCompact ? 'text-base' : 'text-lg';

    return (
        <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isCompact ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} print:grid-cols-3 gap-6 print:gap-4 mb-8 print:mb-4 pb-8 print:pb-4 border-b border-gray-100 employee-info-grid`}>
                {/* Row 1 */}
                <div>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">รหัสพนักงาน</p>
                    <p className={`${titleSize} font-bold text-slate-800`}>{employee.employeeId}</p>
                </div>
                <div className={isCompact ? "" : "sm:col-span-2 lg:col-span-1"}>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">ชื่อ-นามสกุล</p>
                    <div className="flex items-center gap-3">
                        <p className={`${titleSize} font-bold text-slate-800`}>{employee.firstName} {employee.lastName}</p>
                        <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 text-orange-600 rounded-md text-xs font-bold hover:bg-orange-100 transition-colors border border-orange-100 shadow-sm"
                            title="ดูประวัติการประเมินย้อนหลัง"
                        >
                            <History className="w-3.5 h-3.5" />
                            <span>ประวัติ</span>
                        </button>
                    </div>
                </div>
                <div>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">ตำแหน่ง</p>
                    <p className={`${contentSize} font-semibold text-slate-700`}>{employee.position || '-'}</p>
                </div>
                {!isCompact && (
                    <div>
                        <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">แผนก</p>
                        <p className={`${contentSize} font-semibold text-slate-700`}>{employee.department || '-'}</p>
                    </div>
                )}

                {/* Row 2 */}
                {isCompact && (
                    <div>
                        <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">แผนก</p>
                        <p className={`${contentSize} font-semibold text-slate-700`}>{employee.department || '-'}</p>
                    </div>
                )}
                <div>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">ส่วนงาน</p>
                    <p className={`${contentSize} font-semibold text-slate-700`}>{employee.section || '-'}</p>
                </div>
                <div>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">วันที่เริ่มงาน</p>
                    <p className={`${contentSize} font-semibold text-slate-700`}>{formatDateToThai(employee.startDate)}</p>
                </div>
                <div>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">ระดับ</p>
                    <div className={`inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg ${isCompact ? 'text-sm' : 'text-base'} font-medium`}>
                        {employee.level}
                    </div>
                </div>
                <div>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">อายุ (ปี)</p>
                    <p className={`${contentSize} font-medium text-slate-700`}>
                        {employee.birthDate ? `${calculateAge(employee.birthDate)} ปี` : '-'}
                    </p>
                </div>
                <div>
                    <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">อายุงาน</p>
                    <p className={`${contentSize} font-medium text-slate-700`}>
                        {calculateServiceTenure(employee.startDate, evalYear)}
                    </p>
                </div>
            </div>

            {/* History Modal */}
            {isHistoryModalOpen && (
                <EvaluationHistoryModal
                    employeeId={employee.id}
                    employeeName={`${employee.firstName} ${employee.lastName}`}
                    onClose={() => setIsHistoryModalOpen(false)}
                />
            )}
        </>
    );
};
