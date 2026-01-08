export interface QuestionItem {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    maxScore: number;
    isReadOnly?: boolean; // If true, displays as raw score (no update buttons)
}

export interface Category {
    id: string;
    title: string;
    order: number;
    questions: QuestionItem[];
}

export interface ScoringRule {
    id: string;
    name: string;
    type: 'VARIABLE' | 'SCORE';
    formula: string;
    targetField?: string;
}

export interface EvaluationRecord {
    docId: string;
    scores: Record<string, number>;
    employeeDocId: string;
    totalScore?: number | string;
    disciplineScore?: number | string;
    updatedAt?: any; // Firestore Timestamp
    createdAt?: any; // Firestore Timestamp
    aiScore?: number; // AI Score
}
