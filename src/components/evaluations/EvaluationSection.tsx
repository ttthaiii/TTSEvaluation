import React from 'react';
import { Category, QuestionItem } from '../../types/evaluation';
import { CATEGORY_DETAILS } from '../../data/evaluation-criteria';

interface EvaluationSectionProps {
    category: Category;
    scores: Record<string, number>;
    onScoreChange: (criteriaId: string, score: number) => void;
    onOpenPopup: (item: QuestionItem) => void;
    activePopupId?: string;
}

export const EvaluationSection: React.FC<EvaluationSectionProps> = ({
    category,
    scores,
    onScoreChange,
    onOpenPopup,
    activePopupId
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                        {category.id}
                    </span>
                    <h2 className="font-bold text-xl text-slate-800">{category.title}</h2>
                </div>

                <p className="text-slate-500 mt-2 font-light text-sm pl-11">
                    {CATEGORY_DETAILS[`[${category.id}] ${category.title}`] || "ส่วนการประเมินผลการปฏิบัติงาน"}
                </p>
            </div>

            <div className="p-8 divide-y divide-gray-100">
                {category.questions.map((item) => {
                    const isActive = activePopupId === item.id;
                    const currentScore = scores[item.id];
                    const hasScore = currentScore !== undefined;

                    return (
                        <div key={item.id} className={`py-8 first:pt-4 last:pb-2 transition-all duration-300 ${isActive ? 'bg-orange-50/30 -mx-8 px-8' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                                <div className="flex gap-4">
                                    <span className="text-sm font-semibold text-slate-400 mt-1">[{item.id}]</span>
                                    <div>
                                        <h4 className={`text-lg font-bold text-slate-800`}>{item.title}</h4>
                                        <p className="text-slate-500 text-base leading-relaxed mt-1">{item.subtitle}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onOpenPopup(item)}
                                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 h-fit
                                        ${isActive
                                            ? 'bg-orange-500 border-orange-600 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 shadow-sm'
                                        }`}
                                >
                                    <span>{isActive ? '☇' : '🧮'}</span> {isActive ? 'คำนวณอยู่' : 'ตัวช่วย'}
                                </button>
                            </div>

                            <div className="flex flex-col items-center mt-6">
                                {/* 🔥 CHECK: Only Render 1-5 buttons if NOT Read Only */}
                                {!item.isReadOnly ? (
                                    <div className="flex flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 w-full">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                onClick={() => onScoreChange(item.id, score)}
                                                className={`
                                                    w-10 h-10 sm:w-12 sm:h-12 rounded-full font-bold text-base sm:text-lg transition-all duration-200 flex items-center justify-center
                                                    ${currentScore === score
                                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-110 ring-4 ring-orange-100'
                                                        : 'bg-white border-2 border-slate-100 text-slate-400 hover:border-orange-400 hover:text-orange-500'
                                                    }
                                                `}
                                            >
                                                {score}
                                            </button>
                                        ))}
                                        <div className="text-[10px] sm:text-xs font-medium text-slate-400 min-w-[70px] text-center">
                                            {hasScore ? <span className="text-green-600 animate-in fade-in">บันทึกแล้ว ✓</span> : <span>ยังไม่ระบุ</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full flex items-center justify-start gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl">
                                                📊
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-bold uppercase">Imported Score</p>
                                                <p className="text-sm text-gray-600">คะแนนจากระบบ</p>
                                            </div>
                                        </div>

                                        <div className="h-10 w-[1px] bg-gray-300"></div>

                                        <div className="text-4xl font-black text-blue-600">
                                            {currentScore !== undefined ? currentScore : <span className="text-gray-300 text-2xl">-</span>}
                                        </div>

                                        {currentScore === undefined && (
                                            <span className="text-red-500 text-sm font-medium animate-pulse ml-2">⚠️ ยังไม่มีคะแนน (นำเข้าไฟล์ก่อน)</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
