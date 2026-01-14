import React from 'react';
import { Employee } from '../../types/employee';
import { calculateServiceTenure, formatDateToThai, calculateAge } from '../../utils/dateUtils';

interface EmployeeInfoCardProps {
    employee: Employee;
    evalYear: number;
    isCompact?: boolean;
}

export const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({ employee, evalYear, isCompact = false }) => {

    // 🔥 Define text sizes based on compact mode
    const titleSize = isCompact ? 'text-lg' : 'text-xl';
    const contentSize = isCompact ? 'text-base' : 'text-lg';

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isCompact ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-6 mb-8 pb-8 border-b border-gray-100`}>
            {/* Row 1 */}
            <div>
                <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">รหัสพนักงาน</p>
                <p className={`${titleSize} font-bold text-slate-800`}>{employee.employeeId}</p>
            </div>
            <div className={isCompact ? "" : "sm:col-span-2 lg:col-span-1"}>
                <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">ชื่อ-นามสกุล</p>
                <p className={`${titleSize} font-bold text-slate-800`}>{employee.firstName} {employee.lastName}</p>
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
    );
};
