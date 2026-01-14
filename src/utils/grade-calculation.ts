import { GRADE_COLORS } from '@/constants/colors';
import { UI_TEXT } from '@/constants/text';

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
    'E': GRADE_COLORS.E.hex,
    'OE': GRADE_COLORS.OE.hex,
    'ME': GRADE_COLORS.ME.hex,
    'BE': GRADE_COLORS.BE.hex,
    'NI': GRADE_COLORS.NI.hex,
    'N/A': GRADE_COLORS.NA.hex,
    [UI_TEXT.WAITING]: GRADE_COLORS.WAITING.hex
};

export const GRADE_RANGES: GradeCriteria[] = [
    {
        grade: 'E',
        label: 'ยอดเยี่ยม (Excellent)',
        description: 'ผลงานดีเลิศเกินความคาดหมาย',
        min: 86,
        max: 100,
        colorClass: GRADE_COLORS.E.text,
        bgClass: GRADE_COLORS.E.bg,
        borderClass: GRADE_COLORS.E.border,
        icon: '👑'
    },
    {
        grade: 'OE',
        label: 'ได้มากกว่าความคาดหวัง',
        description: 'ผลงานดีกว่ามาตรฐานที่กำหนด',
        min: 76,
        max: 85.99,
        colorClass: GRADE_COLORS.OE.text,
        bgClass: GRADE_COLORS.OE.bg,
        borderClass: GRADE_COLORS.OE.border,
        icon: '🌟'
    },
    {
        grade: 'ME',
        label: 'ได้ตามความคาดหวัง (Meet Expectation)',
        description: 'ผลงานเป็นไปตามมาตรฐาน',
        min: 65,
        max: 75.99,
        colorClass: GRADE_COLORS.ME.text,
        bgClass: GRADE_COLORS.ME.bg,
        borderClass: GRADE_COLORS.ME.border,
        icon: '👍'
    },
    {
        grade: 'BE',
        label: 'ได้ตามความคาดหวังบางส่วน (Below Expectation)',
        description: 'ผลงานต่ำกว่ามาตรฐานในบางจุด',
        min: 50,
        max: 64.99,
        colorClass: GRADE_COLORS.BE.text,
        bgClass: GRADE_COLORS.BE.bg,
        borderClass: GRADE_COLORS.BE.border,
        icon: '⚠️'
    },
    {
        grade: 'NI',
        label: 'ต้องปรับปรุง (Need Improvement)',
        description: 'ผลงานต่ำกว่ามาตรฐานมาก ต้องเร่งปรับปรุง',
        min: 0,
        max: 49.99,
        colorClass: GRADE_COLORS.NI.text,
        bgClass: GRADE_COLORS.NI.bg,
        borderClass: GRADE_COLORS.NI.border,
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
