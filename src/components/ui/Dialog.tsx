import React from 'react';

// Types for Dialog Mode
export type DialogMode = 'alert' | 'confirm';

interface DialogProps {
    isOpen: boolean;
    mode: DialogMode;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, mode, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100">
                {/* Header */}
                <div className={`px-6 py-4 border-b ${mode === 'confirm' ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                    <h3 className={`text-lg font-bold ${mode === 'confirm' ? 'text-orange-600' : 'text-slate-800'}`}>
                        {title}
                    </h3>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                    <p className="text-slate-600 text-base leading-relaxed whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {/* Footer / Buttons */}
                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                    {mode === 'confirm' && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                        >
                            ยกเลิก
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 ${mode === 'confirm'
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                            }`}
                    >
                        {mode === 'confirm' ? 'ยืนยัน' : 'ตกลง'}
                    </button>
                </div>
            </div>
        </div>
    );
};
