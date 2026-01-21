import React from 'react';
import { WarningRecord } from '@/types/employee';
import { X, TriangleAlert } from 'lucide-react';

interface WarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    warnings: WarningRecord[];
}

export const WarningModal: React.FC<WarningModalProps> = ({
    isOpen,
    onClose,
    employeeName,
    warnings
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            {/* Modal Panel */}
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b bg-red-50 border-red-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                        <TriangleAlert className="w-6 h-6" />
                        ประวัติการทำผิด / ใบเตือน (Warning History)
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-red-400 hover:text-red-600 outline-none p-1 rounded-full hover:bg-red-100 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content (Scrollable) */}
                <div className="p-6 overflow-y-auto">
                    <div className="mb-4">
                        <p className="text-sm text-slate-500">
                            พนักงาน: <span className="font-bold text-slate-900 text-lg ml-2">{employeeName}</span>
                        </p>
                    </div>

                    {warnings.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            ไม่พบประวัติการทำผิด
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">
                                            วันที่
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[200px]">
                                            ข้อบังคับ
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            รายละเอียด
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200 text-sm">
                                    {warnings.map((record, index) => (
                                        <tr key={index} className="hover:bg-red-50/50 transition-colors group">
                                            <td className="px-4 py-3 align-top whitespace-nowrap font-medium text-slate-900 group-hover:text-red-700">
                                                {record.date}
                                            </td>
                                            <td className="px-4 py-3 align-top text-slate-700 leading-relaxed">
                                                {record.rule}
                                            </td>
                                            <td className="px-4 py-3 align-top text-slate-600 leading-relaxed">
                                                {record.details}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 shadow-sm"
                        onClick={onClose}
                    >
                        ปิด (Close)
                    </button>
                </div>
            </div>
        </div>
    );
};
