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

export const GRADE_COLOR_MAP: Record<string, string> = {
    'E': '#f97316',   // Orange-500
    'OE': '#facc15',  // Yellow-400
    'ME': '#fbbf24',  // Amber-400 (Peach-ish) -> OR '#fdba74' (Orange-300) -> Let's use Orange-400 #fb923c
    'BE': '#6b7280',  // Gray-500 (Dark Grey)
    'NI': '#ef4444',  // Red-500
    'N/A': '#e5e7eb',  // Gray-200 (Light Grey)
    'รอประเมิน': '#e5e7eb' // Fix for hardcoded Thai string in dashboard
};

// Tweaking to match user specific request precisely
// E: Orange
// OE: Yellow
// ME: Peach/Light Orange
// BE: Gray
// N/A: Light Gray

export const GRADE_RANGES: GradeCriteria[] = [
    {
        grade: 'E',
        label: 'ยอดเยี่ยม (Excellent)',
        description: 'ผลงานดีเลิศเกินความคาดหมาย',
        min: 86,
        max: 100,
        colorClass: 'text-orange-600',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
        icon: '👑'
    },
    {
        grade: 'OE',
        label: 'ได้มากกว่าความคาดหวัง',
        description: 'ผลงานดีกว่ามาตรฐานที่กำหนด',
        min: 76,
        max: 85.99,
        colorClass: 'text-yellow-500',
        bgClass: 'bg-yellow-50',
        borderClass: 'border-yellow-200',
        icon: '🌟'
    },
    {
        grade: 'ME',
        label: 'ได้ตามความคาดหวัง (Meet Expectation)',
        description: 'ผลงานเป็นไปตามมาตรฐาน',
        min: 65,
        max: 75.99,
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
        icon: '👍'
    },
    {
        grade: 'BE',
        label: 'ได้ตามความคาดหวังบางส่วน (Below Expectation)',
        description: 'ผลงานต่ำกว่ามาตรฐานในบางจุด',
        min: 50,
        max: 64.99,
        colorClass: 'text-gray-500',
        bgClass: 'bg-gray-100', // Darker bg for visibility
        borderClass: 'border-gray-300',
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
