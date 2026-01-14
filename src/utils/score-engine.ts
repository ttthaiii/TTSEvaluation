import { create, all } from 'mathjs';
import { EmployeeStats, ScoringRule, Category } from '../types/evaluation';
import { Employee } from '../types/employee';
import { HO_SECTIONS } from '../data/evaluation-criteria';

export const calculateScores = (
    stats: EmployeeStats | null,
    currentScores: Record<string, number>,
    rules: ScoringRule[],
    categories: Category[],
    employee: Employee | null
): { disciplineScore: number | string; totalScore: number } => {
    try {
        const math = create(all);
        const context: any = {};

        // Ensure all stats are numbers
        if (stats) {
            Object.keys(stats).forEach(key => {
                const val = (stats as any)[key];
                context[key] = isNaN(Number(val)) ? val : Number(val);
            });
        }

        Object.entries(currentScores).forEach(([key, value]) => {
            const safeKey = key.replace('-', '_');
            context[safeKey] = value;
            // Add sanitized version for bracketed IDs (e.g. [O]-1 -> O_1)
            const strippedKey = key.replace(/[\[\]]/g, '').replace('-', '_');
            if (strippedKey !== safeKey) {
                context[strippedKey] = value;
            }
        });

        // 🔥 Inject Employee Context
        if (employee) {
            context['Level'] = employee.level;
            context['Section'] = employee.section;
            context['Department'] = employee.department;
            context['isHO'] = HO_SECTIONS.includes(employee.section);
            context['isMonthly'] = employee.level === 'Monthly Staff';
            context['isSupervisor'] = employee.level === 'Supervisor';
        }

        categories.forEach(cat => {
            cat.questions.forEach(q => {
                const safeKey = q.id.replace('-', '_');
                if (!(safeKey in context)) {
                    context[safeKey] = 0;
                }
                // Sanitized fallback
                const strippedKey = q.id.replace(/[\[\]]/g, '').replace('-', '_');
                if (!(strippedKey in context)) {
                    context[strippedKey] = 0;
                }
            });
        });

        const sortedRules = [...rules].sort((a, b) => b.name.length - a.name.length);
        const variables = sortedRules.filter(r => r.type === 'VARIABLE');
        const finalScores = sortedRules.filter(r => r.type === 'SCORE');

        let calculatedDisciplineScore: number | string = "-";
        let foundNamedDisciplineScore = false;

        // 🔥 Multi-pass calculation
        for (let pass = 0; pass < 5; pass++) {
            variables.forEach(v => {
                try {
                    let cleanFormula = v.formula;
                    variables.forEach(subV => {
                        const pattern = `[${subV.name}]`;
                        const val = context[`VAR_${subV.name} `] || context[subV.name] || 0;
                        cleanFormula = cleanFormula.split(pattern).join(`(${val})`);
                    });
                    cleanFormula = cleanFormula.replace(/[\[\]]/g, '');
                    const result = math.evaluate(cleanFormula, context);
                    context[`VAR_${v.name} `] = result;
                    context[v.name] = result;

                    if (v.name === 'DISCIPLINE_SCORE' || v.name === 'Discipline_Score' || v.name === 'รวมคะแนนขาดลามาสาย') {
                        calculatedDisciplineScore = Math.round(result * 100) / 100;
                        foundNamedDisciplineScore = true;
                    }
                } catch (e) {
                    context[`VAR_${v.name} `] = 0;
                    context[v.name] = 0;
                }
            });
        }

        finalScores.forEach(s => {
            try {
                let scoreFormula = s.formula;
                variables.forEach(v => {
                    const pattern = `[${v.name}]`;
                    const val = context[`VAR_${v.name} `] || 0;
                    scoreFormula = scoreFormula.split(pattern).join(`(${val})`);
                });

                finalScores.forEach(otherS => {
                    if (otherS.id !== s.id) {
                        const pattern = `[${otherS.name}]`;
                        const val = context[`VAR_${otherS.name} `] || 0;
                        scoreFormula = scoreFormula.split(pattern).join(`(${val})`);
                    }
                });

                scoreFormula = scoreFormula.replace(/[\[\]]/g, '');
                const result = math.evaluate(scoreFormula, context);
                context[`VAR_${s.name}`] = result;

                if (s.name === 'DISCIPLINE_SCORE' || s.name === 'Discipline_Score') {
                    calculatedDisciplineScore = Math.round(result * 100) / 100;
                    foundNamedDisciplineScore = true;
                }
                else if (s.targetField === 'disciplineScore' && !foundNamedDisciplineScore) {
                    calculatedDisciplineScore = Math.round(result * 100) / 100;
                }
            } catch (e) { }
        });

        const calculatedTotal = context['VAR_TOTAL_SCORE'] || context['VAR_Total_Score'] || 0;
        const finalTotal = typeof calculatedTotal === 'number' ? calculatedTotal : 0;

        return {
            disciplineScore: calculatedDisciplineScore,
            totalScore: Number(finalTotal.toFixed(2))
        };

    } catch (err) {
        console.error("Calculation Error", err);
        return {
            disciplineScore: "Error",
            totalScore: 0
        };
    }
};

// 🔥 Helper to Merge Stats (including [O-1] fix)
export const mergeStatsScores = (
    stats: EmployeeStats,
    currentScores: Record<string, number>,
    categories: Category[]
): Record<string, number> => {
    const merged = { ...currentScores };

    // Safety check if stats is null/undefined
    if (!stats) return merged;

    categories.forEach(cat => {
        cat.questions.forEach(q => {
            if (q.isReadOnly) {
                if (merged[q.id] === undefined) {
                    const cleanKey = q.id.replace(/[ -]/g, '_');
                    const bracketKey = `[${q.id}]`; // 🔥 Support bracketed keys
                    // 🔥 Fuzzy match for 0 (Zero) vs O (Letter O)
                    const bracketKeyZero = bracketKey.replace(/O/g, '0');
                    const bracketKeyOh = bracketKey.replace(/0/g, 'O');

                    // Try exact ID, then cleaned ID, then Bracketed ID (and variants), then 'aiScore'
                    let val = (stats as any)[q.id] ??
                        (stats as any)[cleanKey] ??
                        (stats as any)[bracketKey] ??
                        (stats as any)[bracketKeyZero] ??
                        (stats as any)[bracketKeyOh];

                    // Special Case for AI Score
                    if (val === undefined && (q.title.includes('AI') || q.id.toLowerCase().includes('ai'))) {
                        val = (stats as any)['aiScore'];
                    }

                    if (val !== undefined) {
                        merged[q.id] = Number(val);
                    }
                }
            }
        });
    });
    return merged;
};
