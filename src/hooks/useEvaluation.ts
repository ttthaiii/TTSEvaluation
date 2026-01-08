import { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import { collection, getDocs, addDoc, query, where, Timestamp, doc, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HO_SECTIONS } from '../data/evaluation-criteria';
import { Employee } from '../types/employee';
import { calculateServiceTenure, getEvaluationYear, getCurrentPeriod } from '../utils/dateUtils';
import { Category, EvaluationRecord, QuestionItem, ScoringRule } from '../types/evaluation';
import { EmployeeStats } from '../components/evaluations/EmployeeStatsCard';
import { PopupData } from '../components/evaluations/ScoreHelperPopup';

export const useEvaluation = () => {
    const [loading, setLoading] = useState(true);

    // Year Logic
    const evalYear = typeof getEvaluationYear === 'function' ? getEvaluationYear() : new Date().getFullYear();
    const currentPeriod = typeof getCurrentPeriod === 'function' ? getCurrentPeriod() : `${evalYear}-Annual`;

    const [sections, setSections] = useState<string[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
    const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [disciplineScore, setDisciplineScore] = useState<number | string>("-");
    const [totalScore, setTotalScore] = useState<number>(0); // 🔥 New State
    const [existingEvaluations, setExistingEvaluations] = useState<Record<string, EvaluationRecord>>({});
    const [completedEvaluationIds, setCompletedEvaluationIds] = useState<Set<string>>(new Set()); // 🔥 New State for completion status
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [popupData, setPopupData] = useState<PopupData | null>(null);
    const [popupScores, setPopupScores] = useState<Record<number, number>>({});
    const [integrityWarnings, setIntegrityWarnings] = useState<string[]>([]);
    const [activePopupId, setActivePopupId] = useState<string | undefined>(undefined);

    // --- 1. Init Data & Fetch Rules ---
    const initData = async () => {
        try {
            setLoading(true);

            const qUsers = query(collection(db, 'users'), where('isActive', '==', true));
            const userSnapshot = await getDocs(qUsers);

            const empList: Employee[] = [];
            const sectionSet = new Set<string>();

            userSnapshot.forEach((doc) => {
                const d = doc.data();
                if (d.section) sectionSet.add(d.section);

                empList.push({
                    id: doc.id,
                    employeeId: d.employeeId || "",
                    firstName: d.firstName || "",
                    lastName: d.lastName || "",
                    position: d.position || "",
                    department: d.department || "",
                    section: d.section || "",
                    level: d.level || "Monthly Staff",
                    startDate: d.startDate,
                    isActive: d.isActive ?? true,
                } as Employee);
            });

            const qEvals = query(collection(db, 'evaluations'), where('period', '==', currentPeriod));
            const evalSnapshot = await getDocs(qEvals);



            // ... (keep rules loading)

            const qCats = query(collection(db, 'evaluation_categories'), orderBy('order'));
            const catSnap = await getDocs(qCats);
            const catsData = catSnap.docs.map(d => d.data() as Category);
            setCategories(catsData);

            // 🔥 Calculate Completion Loop
            const completedIds = new Set<string>();
            const evalMap: Record<string, EvaluationRecord> = {};

            evalSnapshot.forEach((doc) => {
                const d = doc.data();
                if (d.employeeDocId) {
                    evalMap[d.employeeDocId] = {
                        docId: doc.id,
                        scores: d.scores || {},
                        employeeDocId: d.employeeDocId,
                        totalScore: d.totalScore, // 🔥 Store totalScore
                        disciplineScore: d.disciplineScore // 🔥 Store disciplineScore
                    };

                    // Check Completeness
                    const emp = empList.find(e => e.id === d.employeeDocId);
                    if (emp) {
                        let isComplete = true;
                        catsData.forEach(cat => {
                            // Skip C for Monthly Staff
                            if (cat.id === 'C' && emp.level === 'Monthly Staff') return;

                            cat.questions.forEach(q => {
                                // Skip ReadOnly
                                if (q.isReadOnly) return;

                                // Skip B-4 if HO
                                if (q.id === 'B-4' && HO_SECTIONS.includes(emp.section)) return;

                                if (d.scores?.[q.id] === undefined) {
                                    isComplete = false;
                                }
                            });
                        });
                        if (isComplete) completedIds.add(d.employeeDocId);
                    }
                }
            });
            setCompletedEvaluationIds(completedIds);

            const rulesSnapshot = await getDocs(collection(db, 'scoring_formulas'));
            const rules: ScoringRule[] = [];
            rulesSnapshot.forEach(doc => {
                const d = doc.data();
                rules.push({
                    id: doc.id,
                    name: d.name,
                    type: d.type,
                    formula: d.formula,
                    targetField: d.targetField
                });
            });

            setEmployees(empList);
            setSections(Array.from(sectionSet).sort());
            setExistingEvaluations(evalMap);
            setScoringRules(rules);

            // Moved category loading UP to be available for completion check
            // setCategories(catsData); // Already set above

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initData();
    }, []);

    // --- Safety Check Logic ---
    const validateScoringIntegrity = (rules: ScoringRule[], cats: Category[]) => {
        const warnings: string[] = [];
        const systemVars = ['totalLateMinutes', 'totalSickLeaveDays', 'totalAbsentDays', 'warningCount', 'Level', 'Section', 'Department', 'isHO', 'isMonthly', 'isSupervisor'];
        const math = create(all);

        const validIds = new Set<string>();
        systemVars.forEach(v => validIds.add(v));
        cats.forEach(c => c.questions.forEach(q => {
            validIds.add(q.id);
            validIds.add(q.id);
            validIds.add(q.id.replace('-', '_'));
            // Also add sanitized version (remove brackets, replace dash)
            validIds.add(q.id.replace(/[\[\]]/g, '').replace('-', '_'));
        }));
        rules.forEach(r => validIds.add(r.name));

        rules.forEach(r => {
            try {
                const matches = r.formula.match(/\[([a-zA-Z0-9_\-]+)\]/g);
                if (matches) {
                    matches.forEach(m => {
                        const varName = m.replace(/[\[\]]/g, '');
                        if (!validIds.has(varName) && !systemVars.includes(varName)) {
                            warnings.push(`⚠️ สูตร "${r.name}": อ้างอิง [${varName}] ซึ่งไม่พบในระบบ`);
                        }
                    });
                }

                const node = math.parse(r.formula);
                node.traverse((n: any) => {
                    if (n.isSymbolNode) {
                        const varName = n.name;
                        const isValid = validIds.has(varName) || systemVars.includes(varName);
                        // Check known function in mathjs context
                        const isMathFunc = typeof (math as any)[varName] === 'function';

                        if (!isValid && !isMathFunc) {
                            if (varName === 'pi' || varName === 'e') return;

                            const isBracketedCoverage = r.formula.includes(`[${varName}]`);
                            if (!isBracketedCoverage) {
                                if (varName.length > 1) {
                                    warnings.push(`⚠️ สูตร "${r.name}": พบตัวแปร "${varName}" (ไม่มีวงเล็บ) ที่ไม่มีอยู่ในระบบ`);
                                }
                            }
                        }
                    }
                });

            } catch (e) {
                // Ignore parse errors here
            }
        });
        setIntegrityWarnings(warnings.filter((item, index) => warnings.indexOf(item) === index));
    };

    useEffect(() => {
        if (scoringRules.length > 0 && categories.length > 0) {
            validateScoringIntegrity(scoringRules, categories);
        }
    }, [scoringRules, categories]);


    // --- 2. Calculate Score (Multi-pass System) ---
    const runDisciplineCalculation = (stats: EmployeeStats, currentScores: Record<string, number>, emp?: Employee | null) => {
        if (scoringRules.length === 0) return;

        // Use passed emp or fallback to selectedEmployee
        const targetEmp = emp || selectedEmployee;

        console.log("🧮 Starting Calculation", { stats, currentScores, empName: targetEmp?.firstName });

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
            if (targetEmp) {
                context['Level'] = targetEmp.level;
                context['Section'] = targetEmp.section;
                context['Department'] = targetEmp.department;
                context['isHO'] = HO_SECTIONS.includes(targetEmp.section);
                context['isMonthly'] = targetEmp.level === 'Monthly Staff';
                context['isSupervisor'] = targetEmp.level === 'Supervisor';
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

            const sortedRules = [...scoringRules].sort((a, b) => b.name.length - a.name.length);
            const variables = sortedRules.filter(r => r.type === 'VARIABLE');
            const finalScores = sortedRules.filter(r => r.type === 'SCORE');

            let calculatedDisciplineScore: number | string = "-";
            let foundNamedDisciplineScore = false;

            console.log("🧮 Stats Data:", JSON.stringify(stats));
            console.log("🧮 Context Keys:", Object.keys(context));

            // 🔥 Multi-pass calculation to resolve dependencies (e.g. Summation variables depending on component variables)
            // Pass 1: Calculate foundational values
            // 🔥 Fix: 2-Pass Calculation -> 5-Pass Calculation
            // Pass 1-4: Propagate dependency chains (Discipline -> Behavior -> Score)
            // Pass 5: Finalize
            for (let pass = 0; pass < 5; pass++) {
                variables.forEach(v => {
                    try {
                        // 🔥 Sanitize formula: remove brackets to prevent Matrix type interpretation
                        let cleanFormula = v.formula;

                        // 🔥 Substitute [Variable] with (Value) to support Thai variable names in math.js
                        variables.forEach(subV => {
                            const pattern = `[${subV.name}]`;
                            // Look up value in context (it might be 0 if not calculated yet, or pre-filled from context init)
                            const val = context[`VAR_${subV.name} `] || context[subV.name] || 0;
                            cleanFormula = cleanFormula.split(pattern).join(`(${val})`);
                        });

                        cleanFormula = cleanFormula.replace(/[\[\]]/g, '');
                        const result = math.evaluate(cleanFormula, context);

                        // Only log on the final pass to reduce noise, unless it's an error
                        if (pass === 1) {
                            console.log(`🔹 Var[${v.name}] = ${result} (Formula: ${cleanFormula})`);
                        }

                        context[`VAR_${v.name} `] = result;
                        context[v.name] = result;

                        // 🔥 Support DISCIPLINE_SCORE as a Variable
                        if (v.name === 'DISCIPLINE_SCORE' || v.name === 'Discipline_Score' || v.name === 'รวมคะแนนขาดลามาสาย') {
                            calculatedDisciplineScore = Math.round(result * 100) / 100;
                            foundNamedDisciplineScore = true;
                        }

                    } catch (e) {
                        // Only log errors on the final pass, as pass 1 might legitimately fail due to missing dependencies
                        if (pass === 1) {
                            console.error(`❌ Error Var[${v.name}]: `, e);
                        }
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

                    // 🔥 Sanitize formula: remove remaining brackets (e.g. from [A_1] -> A_1)
                    scoreFormula = scoreFormula.replace(/[\[\]]/g, '');

                    const result = math.evaluate(scoreFormula, context);
                    context[`VAR_${s.name} `] = result;
                } catch (e) { }
            });

            // Variable declarations moved up


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
                            // Also sanitize other scores if they are matrices? No, context values are numbers.
                            scoreFormula = scoreFormula.split(pattern).join(`(${val})`);
                        }
                    });

                    // 🔥 FIX: Sanitize brackets in Loop 2 as well!
                    scoreFormula = scoreFormula.replace(/[\[\]]/g, '');

                    const result = math.evaluate(scoreFormula, context);
                    console.log(`🔸 Final Score[${s.name}] = ${result} (Formula: ${scoreFormula})`);
                    context[`VAR_${s.name}`] = result;

                    // 1. Check Named Match (Priority)
                    if (s.name === 'DISCIPLINE_SCORE' || s.name === 'Discipline_Score') {
                        calculatedDisciplineScore = Math.round(result * 100) / 100;
                        foundNamedDisciplineScore = true;
                    }
                    // 2. Check TargetField (Fallback) - Only if not already found by name
                    else if (s.targetField === 'disciplineScore' && !foundNamedDisciplineScore) {
                        calculatedDisciplineScore = Math.round(result * 100) / 100;
                    }

                } catch (e) {
                    // console.error(`Error final calc ${ s.name }: `, e);
                }
            });

            setDisciplineScore(calculatedDisciplineScore);

            // 🔥 Capture TOTAL_SCORE
            const calculatedTotal = context['VAR_TOTAL_SCORE'] || context['VAR_Total_Score'] || 0;
            setTotalScore(typeof calculatedTotal === 'number' ? calculatedTotal : 0);

        } catch (err) {
            setDisciplineScore("Error");
        }
    };


    const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sec = e.target.value;
        setSelectedSection(sec);
        setSelectedEmployeeId('');
        setSelectedEmployee(null);
        setScores({});
        setEmployeeStats(null);
        setDisciplineScore("-");
        setFilteredEmployees(sec ? employees.filter(emp => emp.section === sec) : []);
    };

    const handleEmployeeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const empId = e.target.value;
        setScores({});
        setEmployeeStats(null);
        setDisciplineScore("-");

        if (!empId) {
            setSelectedEmployeeId('');
            setSelectedEmployee(null);
            return;
        }

        const emp = employees.find(e => e.id === empId) || null;
        setSelectedEmployee(emp);
        setSelectedEmployeeId(empId);

        let currentLoadedScores = {};
        const prevEval = existingEvaluations[empId];

        if (prevEval) {
            // Default: Load existing scores (for partial data like AI Score)
            currentLoadedScores = prevEval.scores;
            setScores(prevEval.scores);

            // Alert ONLY if fully complete
            if (emp && completedEvaluationIds.has(emp.id)) {
                const confirmReEval = confirm(`⚠️ พนักงานคนนี้(${emp.firstName}) ถูกประเมินไปแล้ว คุณต้องการประเมินซ้ำหรือไม่ ? `);
                if (!confirmReEval) {
                    // User Cancelled -> Reset selection
                    setSelectedEmployeeId('');
                    setSelectedEmployee(null);
                    setScores({});
                    return;
                }
            }
        }

        if (emp) {
            try {
                const statsRef = doc(db, 'users', emp.id, 'yearlyStats', String(evalYear));
                const statsSnap = await getDoc(statsRef);

                let statsData: EmployeeStats;
                if (statsSnap.exists()) {
                    statsData = statsSnap.data() as EmployeeStats;
                } else {
                    statsData = {
                        totalLateMinutes: 0, totalSickLeaveDays: 0,
                        totalAbsentDays: 0, warningCount: 0,
                        year: evalYear
                    } as any;
                }

                setEmployeeStats(statsData);
                runDisciplineCalculation(statsData, currentLoadedScores, emp);

            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        }
        setPopupData(null);
    };

    const handleScoreChange = (criteriaId: string, score: number) => {
        const newScores = { ...scores, [criteriaId]: score };
        setScores(newScores);

        if (employeeStats) {
            runDisciplineCalculation(employeeStats, newScores, selectedEmployee);
        }

    };

    const handleSubmit = async () => {
        if (!selectedEmployee) return;
        if (!confirm(`ยืนยันการบันทึกการประเมินของ ${selectedEmployee.firstName}?`)) return;

        try {
            const dataToSave = {
                employeeId: selectedEmployee.employeeId,
                employeeDocId: selectedEmployee.id,
                employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName} `,
                department: selectedEmployee.department,
                section: selectedEmployee.section,
                level: selectedEmployee.level,
                evaluator: "Admin",
                scores: scores,
                aiScore: 0, // Legacy field kept for compatibility, score now in 'scores' map
                disciplineScore: disciplineScore,
                totalScore: totalScore, // 🔥 Save Total Score
                updatedAt: Timestamp.now(),
                period: currentPeriod,
                evaluationYear: evalYear
            };

            const prevEval = existingEvaluations[selectedEmployee.id];

            if (prevEval) {
                const docRef = doc(db, 'evaluations', prevEval.docId);
                await setDoc(docRef, dataToSave, { merge: true });
            } else {
                await addDoc(collection(db, 'evaluations'), {
                    ...dataToSave,
                    createdAt: Timestamp.now()
                });
            }

            alert("✅ บันทึกการประเมินเรียบร้อย!");
            await initData();

            setScores({});
            setSelectedEmployeeId('');
            setSelectedEmployee(null);
            setEmployeeStats(null);
            setDisciplineScore("-");

        } catch (error) {
            console.error("Error saving evaluation:", error);
            alert("❌ เกิดข้อผิดพลาดในการบันทึก: " + error);
        }
    };

    const getDisplayCategories = () => {
        if (!selectedEmployee) return [];

        return categories.map(cat => {
            const validQuestions = cat.questions.filter(q => {
                if (q.id === 'B-4' && HO_SECTIONS.includes(selectedEmployee.section)) return false;
                if (q.isReadOnly) return false; // 🔥 Exclude ReadOnly items from main list (แยกรายการ ReadOnly ออกจากรายการปกติ)
                return true;
            });

            if (cat.id === 'C' && selectedEmployee.level === 'Monthly Staff') return null;

            if (validQuestions.length === 0) return null;

            return { ...cat, questions: validQuestions };
        }).filter(c => c !== null) as Category[];
    };

    // Popup Logic
    const openPopup = (item: QuestionItem) => {
        if (popupData?.criteriaId === item.id) return;
        setPopupData({
            title: item.title,
            subItems: (item.description || '').split('\n').map(line => {
                const parts = line.split(';');
                return {
                    title: parts[0]?.trim() || '',
                    description: parts[1]?.trim() || ''
                };
            }).filter(item => item.title),
            criteriaId: item.id
        });
        setPopupScores({});
        setActivePopupId(item.id);
    };

    const closePopup = () => {
        setPopupData(null);
        setActivePopupId(undefined);
    };

    const handlePopupScore = (index: number, score: number) => {
        setPopupScores(prev => ({ ...prev, [index]: score }));
    };

    const applyPopupScore = () => {
        if (!popupData) return;
        const values = Object.values(popupScores);
        if (values.length < popupData.subItems.length) return;
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = (sum / values.length).toFixed(2);

        handleScoreChange(popupData.criteriaId, Math.round(parseFloat(avg)));
    };

    // Get ReadOnly Items for Stats Card (ดึงรายการคะแนนดิบไปแสดงในการ์ดสถิติ)
    const getReadOnlyItems = () => {
        if (!selectedEmployee) return [];
        const items: { id: string; title: string; score: number | string; description?: string }[] = [];

        categories.forEach(cat => {
            cat.questions.forEach(q => {
                if (q.isReadOnly) {
                    items.push({
                        id: q.id,
                        title: q.title,
                        score: scores[q.id] !== undefined ? scores[q.id] : "-",
                        description: q.description
                    });
                }
            });
        });
        return items;
    };

    return {
        loading,
        evalYear,
        currentPeriod,
        sections,
        selectedSection,
        handleSectionChange,
        filteredEmployees,
        selectedEmployeeId,
        handleEmployeeChange,
        existingEvaluations,
        completedEvaluationIds, // 🔥 Return this
        selectedEmployee,
        employeeStats,
        disciplineScore,
        totalScore, // 🔥 Return totalScore
        displayCategories: getDisplayCategories(),
        readOnlyItems: getReadOnlyItems(), // 🔥 Return ReadOnly Items
        scores,
        handleScoreChange,
        handleSubmit,
        integrityWarnings,
        // Popup
        activePopupId,
        openPopup,
        closePopup,
        handlePopupScore,
        applyPopupScore,
        categories, // 🔥 Expose raw categories for Dashboard
        employees
    };
};
