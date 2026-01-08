import React from 'react';
import { Employee } from '../../types/employee';
import { calculateServiceTenure } from '../../utils/dateUtils';

interface EmployeeInfoCardProps {
    employee: Employee;
    evalYear: number;
}

export const EmployeeInfoCard: React.FC<EmployeeInfoCardProps> = ({ employee, evalYear }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-100">
            <div>
                <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">รหัสพนักงาน</p>
                <p className="text-2xl font-bold text-slate-800">{employee.employeeId}</p>
            </div>
            <div>
                <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">ชื่อ-นามสกุล</p>
                <p className="text-2xl font-bold text-slate-800">{employee.firstName} {employee.lastName}</p>
            </div>
            <div>
                <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">ระดับ</p>
                <div className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-lg font-medium">
                    {employee.level}
                </div>
            </div>
            <div>
                <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase mb-1">อายุงาน</p>
                <p className="text-lg font-medium text-slate-700">
                    {calculateServiceTenure(employee.startDate, evalYear)}
                </p>
            </div>
        </div>
    );
};
