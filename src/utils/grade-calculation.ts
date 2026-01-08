export interface GradeCriteria {
    id?: string; // Firestore ID
    grade: string;
    label: string;
    description: string;
    min: number;
    max: number; // Use 100 as implied top
    colorClass: string;
    bgClass: string;
    borderClass: string;
    icon: string;
}

export const GRADE_RANGES: GradeCriteria[] = [
    {
        grade: 'E',
        label: 'ยอดเยี่ยม (Excellent)',
        description: 'ผลงานดีเลิศเกินความคาดหมาย',
        min: 86,
        max: 100,
        colorClass: 'text-purple-600',
        bgClass: 'bg-purple-50',
        borderClass: 'border-purple-200',
        icon: '👑'
    },
    {
        grade: 'OE',
        label: 'ได้มากกว่าความคาดหวัง',
        description: 'ผลงานดีกว่ามาตรฐานที่กำหนด',
        min: 76,
        max: 85.99,
        colorClass: 'text-emerald-600',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        icon: '🌟'
    },
    {
        grade: 'ME',
        label: 'ได้ตามความคาดหวัง (Meet Expectation)',
        description: 'ผลงานเป็นไปตามมาตรฐาน',
        min: 65,
        max: 75.99,
        colorClass: 'text-blue-600',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        icon: '👍'
    },
    {
        grade: 'BE',
        label: 'ได้ตามความคาดหวังบางส่วน (Below Expectation)',
        description: 'ผลงานต่ำกว่ามาตรฐานในบางจุด',
        min: 50,
        max: 64.99,
        colorClass: 'text-orange-500',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
        icon: '⚠️'
    },
    {
        grade: 'NI',
        label: 'ต้องปรับปรุง (Need Improvement)',
        description: 'ผลงานต่ำกว่ามาตรฐานมาก ต้องเร่งปรับปรุง',
        min: 0,
        max: 49.99,
        colorClass: 'text-rose-600',
        bgClass: 'bg-rose-50',
        borderClass: 'border-rose-200',
        icon: '🚨'
    }
];

// Allow passing dynamic rules. If not provided, use default.
export const getGrade = (score: number | string, customRules?: GradeCriteria[]): GradeCriteria | null => {
    const numScore = Number(score);
    if (isNaN(numScore)) return null;

    const rules = customRules && customRules.length > 0 ? customRules : GRADE_RANGES;

    // Sort logic might be needed if customRules are unordered, but let's assume UI/Hook sorts them.
    // Default logic: find first range matching.
    return rules.find(g => numScore >= g.min && numScore <= g.max) || rules[rules.length - 1];
};
