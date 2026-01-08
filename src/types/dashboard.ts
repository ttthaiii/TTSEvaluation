
import { Employee } from '@/types/employee';
import { EvaluationRecord } from '@/types/evaluation';
import { GradeCriteria } from '@/utils/grade-calculation';

export interface DashboardItem extends Employee {
    evaluation?: EvaluationRecord;
    grade: GradeCriteria | null;
    totalScore: number;
}
