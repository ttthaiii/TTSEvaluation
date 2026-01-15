import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PopupData {
    title: string;
    subItems: { title: string; description: string }[];
    criteriaId: string;
}

interface ScoreHelperPopupProps {
    data: PopupData;
    popupScores: Record<number, number>;
    onClose: () => void;
    onPopupScoreChange: (index: number, score: number) => void;
    onApplyScore: () => void;
    mode?: 'global' | 'contained' | 'inline'; // 'global' = Portal (Mobile), 'contained' = Absolute (Desktop Split), 'inline' = Sticky (Page Side-by-Side)
    className?: string;
}

export const ScoreHelperPopup: React.FC<ScoreHelperPopupProps> = ({
    data,
    popupScores,
    onClose,
    onPopupScoreChange,
    onApplyScore,
    mode = 'global', // Default to global (Portal)
    className = ''
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const handleScrollLock = () => {
            // Only lock if mode is global AND screen is mobile (< 1024px)
            if (mode === 'global' && window.matchMedia('(max-width: 1023px)').matches) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        };

        handleScrollLock(); // Initial check

        // Listen for resize to toggle lock/unlock
        window.addEventListener('resize', handleScrollLock);

        return () => {
            setMounted(false);
            window.removeEventListener('resize', handleScrollLock);
            if (mode === 'global') {
                document.body.style.overflow = '';
            }
        };
    }, [mode]);

    const calculateAverage = () => {
        const values = Object.values(popupScores);
        if (values.length < data.subItems.length) return null;
        const sum = values.reduce((a, b) => a + b, 0);
        return (sum / values.length).toFixed(2);
    };

    const avg = calculateAverage();

    // ─────────────────────────────────────────────────────────────
    // Shared Content Component
    // ─────────────────────────────────────────────────────────────
    const PopupContent = () => (
        <div className={`
            bg-white overflow-hidden shadow-2xl border border-slate-200 flex flex-col
            ${mode === 'global'
                ? 'w-full max-w-lg rounded-2xl animate-in zoom-in-95 duration-200 relative z-10 max-h-[90vh] m-auto pointer-events-auto'
                : mode === 'contained'
                    ? 'absolute inset-4 rounded-2xl shadow-slate-200 border-slate-100 animate-in zoom-in-95 duration-200 z-50'
                    : 'rounded-2xl shadow-slate-200 border-slate-100 max-h-[85vh] lg:max-h-[calc(100vh-6rem)] animate-in slide-in-from-right-10 fade-in duration-300' // Inline
            }
        `}>
            {/* Header */}
            <div className="p-5 bg-white border-b border-gray-100 flex justify-between items-start shrink-0 z-10">
                <div>
                    <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Score Calculator</span>
                    <h3 className="font-bold text-xl text-slate-800 leading-snug mt-1">{data.title}</h3>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors shrink-0"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className={`p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/50 ${mode === 'global' ? 'overscroll-contain' : ''}`}>
                {data.subItems.map((sub, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                        <p className="font-bold text-base mb-1 text-slate-800 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">{idx + 1}</span>
                            {sub.title}
                        </p>
                        <p className="text-sm text-slate-500 mb-4 pl-7 leading-relaxed">{sub.description}</p>

                        <div className="flex gap-2 justify-center pl-7">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => onPopupScoreChange(idx, s)}
                                    className={`
                                        w-10 h-10 text-base font-bold rounded-lg transition-all duration-200 border
                                        ${popupScores[idx] === s
                                            ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200 scale-105'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-500'
                                        }
                                    `}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-5 bg-white border-t border-gray-100 shrink-0 z-10">
                <div className="flex justify-between items-end mb-4 px-2">
                    <span className="text-slate-500 font-medium text-sm mb-1">คะแนนเฉลี่ยที่ได้</span>
                    <span className={`text-4xl font-extrabold tracking-tight ${avg ? 'text-orange-600' : 'text-slate-200'}`}>
                        {avg || '0.00'}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        onApplyScore();
                        onClose();
                    }}
                    disabled={!avg}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <span>ใช้คะแนนนี้</span>
                    <span className="text-lg">↵</span>
                </button>
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────
    // Render: Contained Mode (Desktop / Split Screen)
    // ─────────────────────────────────────────────────────────────
    if (mode === 'contained') {
        return (
            <div className={`absolute inset-0 z-[100] bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 animate-in fade-in duration-200 overscroll-contain ${className}`}>
                {/* Click backdrop to close */}
                <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
                <PopupContent />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Render: Inline Mode (Desktop Page Side-by-Side)
    // ─────────────────────────────────────────────────────────────
    if (mode === 'inline') {
        return (
            <div className={`w-full lg:w-[480px] shrink-0 lg:sticky lg:top-[5.5rem] z-40 ${className}`}>
                <PopupContent />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Render: Global Mode (Mobile / Overlay)
    // ─────────────────────────────────────────────────────────────
    if (!mounted) return null;

    return createPortal(
        <div className={`fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-hidden overscroll-none touch-none ${className}`}>
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
            <PopupContent />
        </div>,
        document.body
    );
};
