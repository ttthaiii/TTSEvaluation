export const GRADE_COLORS = {
    E: {
        text: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        hex: '#f97316', // Orange-500
    },
    OE: {
        text: 'text-yellow-500',
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        hex: '#facc15', // Yellow-400
    },
    ME: {
        text: 'text-orange-400',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        hex: '#fb923c', // Orange-400
    },
    BE: {
        text: 'text-gray-500',
        bg: 'bg-gray-100',
        border: 'border-gray-300',
        hex: '#6b7280', // Gray-500
    },
    NI: {
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        hex: '#ef4444', // Red-500
    },
    NA: {
        text: 'text-gray-400',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        hex: '#e5e7eb', // Gray-200
    },
    WAITING: {
        hex: '#e5e7eb', // Gray-200
    }
} as const;

export const CHART_COLORS = {
    // Standard Palette for Charts
    primary: '#3b82f6', // blue-500
    secondary: '#10b981', // emerald-500
    tertiary: '#f59e0b', // amber-500
    quaternary: '#ef4444', // red-500
    quinary: '#8b5cf6', // violet-500
} as const;
