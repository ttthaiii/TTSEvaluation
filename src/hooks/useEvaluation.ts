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
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModal } from '../context/ModalContext'; // 🔥 Import useModal

export const useEvaluation = (props?: { defaultEmployeeId?: string }) => {
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetEmpId = props?.defaultEmployeeId || searchParams.get('employeeId');

    // 🔥 Modal Hook
    const { showAlert, showConfirm } = useModal();

    // ... (Year Logic)
    const evalYear = typeof getEvaluationYear === 'function' ? getEvaluationYear() : new Date().getFullYear();
    const currentPeriod = typeof getCurrentPeriod === 'function' ? getCurrentPeriod() : `${evalYear}-Annual`;

    const [sections, setSections] = useState<string[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
    const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [disciplineScore, setDisciplineScore] = useState<number | string>("-");
    const [totalScore, setTotalScore] = useState<number>(0);
    const [existingEvaluations, setExistingEvaluations] = useState<Record<string, EvaluationRecord>>({});
    const [completedEvaluationIds, setCompletedEvaluationIds] = useState<Set<string>>(new Set());
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [popupData, setPopupData] = useState<PopupData | null>(null);
    const [popupScores, setPopupScores] = useState<Record<number, number>>({});
    const [integrityWarnings, setIntegrityWarnings] = useState<string[]>([]);
    const [activePopupId, setActivePopupId] = useState<string | undefined>(undefined);

    // Auth Session
    const { data: session, status } = useSession();

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
                    evaluatorId: d.evaluatorId || "", // Ensure field exists
                } as Employee);
            });

            const qEvals = query(collection(db, 'evaluations'), where('period', '==', currentPeriod));
            const evalSnapshot = await getDocs(qEvals);

            // Fetch Categories
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
                        totalScore: d.totalScore,
                        disciplineScore: d.disciplineScore,
                        updatedAt: d.updatedAt,
                        createdAt: d.createdAt,
                        aiScore: d.aiScore
                    };

                    // Check Completeness
                    const emp = empList.find(e => e.id === d.employeeDocId);
                    if (emp) {
                        let isComplete = true;
                        catsData.forEach(cat => {
                            if (cat.id === 'C' && emp.level === 'Monthly Staff') return;
                            cat.questions.forEach(q => {
                                if (q.isReadOnly) return;
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

            // 🔥 Filter by Authenticated User (Evaluator)
            // If Admin -> Show All
            // If User -> Show Only employees where evaluatorId == session.user.employeeId
            if (session?.user) {
                const currentUser = session.user as any;

                if (currentUser.role === 'Admin') {
                    // ✅ Admin: Show All Sections & Employees
                    setSections(Array.from(sectionSet).sort());
                } else {
                    // ✅ Normal User: Filter Subordinates (Recursive / Chain of Command)
                    const currentEmpId = currentUser.employeeId;

                    // Recursive function to get all down-line subordinates
                    const getAllSubordinates = (managerId: string, allEmps: Employee[]): Employee[] => {
                        const directReports = allEmps.filter(e => e.evaluatorId === managerId);
                        let allSubs = [...directReports];

                        directReports.forEach(report => {
                            // Recursively find subordinates of this report (who is also an evaluator)
                            const indirectReports = getAllSubordinates(report.employeeId, allEmps);
                            allSubs = [...allSubs, ...indirectReports];
                        });

                        return allSubs;
                    };

                    const mySubordinates = getAllSubordinates(currentEmpId, empList);

                    // De-duplicate if recursion causes overlap (though tree structure shouldn't)
                    const uniqueSubordinates = Array.from(new Map(mySubordinates.map(item => [item.id, item])).values());

                    if (uniqueSubordinates.length === 0) {
                        console.warn(`⚠️ User ${currentEmpId} has no subordinates assigned.`);
                    }

                    // Update Sections specifically for subordinates
                    const subSections = new Set<string>();
                    uniqueSubordinates.forEach(e => subSections.add(e.section));
                    setEmployees(uniqueSubordinates);

                    const finalSections = Array.from(subSections).sort();
                    setSections(finalSections);

                    // [T-026] Auto-select default section if user has only one (เลือกโครงการอัตโนมัติถ้ามีแค่ 1 โครงการ)
                    if (finalSections.length === 1) {
                        setSelectedSection(finalSections[0]);
                        setFilteredEmployees(uniqueSubordinates); // 🔥 Fix: แสดงรายชื่อพนักงานทันที
                    }
                }
            } else {
                setEmployees([]);
                setSections([]);
            }

            setExistingEvaluations(evalMap);
            setScoringRules(rules);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            initData();
        } else if (status === 'unauthenticated') {
            setLoading(false);
            // Optional: Redirect if needed, or let the component handle it
            // router.push('/login'); 
        }
    }, [status, session]);

    // 🔥 Auto-select Employee from URL (ทำงานเมื่อมี parameter ?employeeId=...)
    useEffect(() => {
        if (!loading && employees.length > 0 && targetEmpId) {
            const target = employees.find(e => e.employeeId === targetEmpId);
            // ตรวจสอบว่า target อยู่ในรายการที่ User มีสิทธิ์เห็นหรือไม่
            if (target) {
                // If not already selected (ป้องกัน loop หรือ re-fetch ไม่จำเป็น)
                if (selectedEmployeeId !== target.id) {
                    console.log("🔗 Auto-selecting employee from URL:", target.firstName);
                    handleEmployeeChange({ target: { value: target.id } } as any);

                    // Optional: ถ้าต้องการเลือก Section ให้ตรงด้วย (เพื่อความเนียน)
                    if (target.section !== selectedSection && selectedSection !== 'All') {
                        // อาจจะไม่จำเป็นต้องเปลี่ยน Section Dropdown ถ้า UI แสดงผลได้อยู่แล้ว
                        // แต่ถ้า Filter มันบังอยู่ อาจจะต้อง Reset Filter
                        setSelectedSection('All');
                        setFilteredEmployees(employees); // Reset filter to show all so the selected one is visible
                    }
                }
            } else {
                console.warn("⚠️ Employee ID from URL not found in authorized list.");
            }
        }
    }, [loading, employees, targetEmpId]);

    // --- Safety Check Logic ---
    const validateScoringIntegrity = (rules: ScoringRule[], cats: Category[]) => {
        const warnings: string[] = [];
        const systemVars = ['totalLateMinutes', 'totalSickLeaveDays', 'totalAbsentDays', 'warningCount', 'Level', 'Section', 'Department', 'isHO', 'isMonthly', 'isSupervisor'];
        const math = create(all);

        const validIds = new Set<string>();
        systemVars.forEach(v => validIds.add(v));
        cats.forEach(c => c.questions.forEach(q => {
            validIds.add(q.id);
            validIds.add(q.id.replace('-', '_'));
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

            setDisciplineScore(calculatedDisciplineScore);

            const calculatedTotal = context['VAR_TOTAL_SCORE'] || context['VAR_Total_Score'] || 0;
            const finalTotal = typeof calculatedTotal === 'number' ? calculatedTotal : 0;
            setTotalScore(Number(finalTotal.toFixed(2)));

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
            currentLoadedScores = prevEval.scores;
            setScores(prevEval.scores);
            if (emp && completedEvaluationIds.has(emp.id)) {
                const confirmReEval = await showConfirm('ยืนยันการประเมินซ้ำ', `⚠️ พนักงานคนนี้ (${emp.firstName}) ถูกประเมินไปแล้ว\nคุณต้องการกลับไปแก้ไขการประเมินหรือไม่?`);
                if (!confirmReEval) {
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

    const handleSubmit = async (onSuccess?: (savedData: EvaluationRecord) => void) => {
        if (!selectedEmployee) return;

        const isConfirmed = await showConfirm('ยืนยันการบันทึก', `คุณต้องการบันทึกผลการประเมินของ\n${selectedEmployee.firstName} ${selectedEmployee.lastName} ใช่หรือไม่?`);
        if (!isConfirmed) return;

        try {
            const dataToSave = {
                employeeId: selectedEmployee.employeeId,
                employeeDocId: selectedEmployee.id,
                employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName} `,
                department: selectedEmployee.department,
                section: selectedEmployee.section,
                level: selectedEmployee.level,
                evaluator: session?.user?.name || "Admin",
                scores: scores,
                aiScore: 0,
                disciplineScore: disciplineScore,
                totalScore: Number(totalScore.toFixed(2)),
                updatedAt: Timestamp.now(),
                period: currentPeriod,
                evaluationYear: evalYear
            };

            let savedDocId = "";
            const prevEval = existingEvaluations[selectedEmployee.id];

            if (prevEval) {
                savedDocId = prevEval.docId;
                const docRef = doc(db, 'evaluations', savedDocId);
                await setDoc(docRef, dataToSave, { merge: true });
            } else {
                const docRef = await addDoc(collection(db, 'evaluations'), {
                    ...dataToSave,
                    createdAt: Timestamp.now()
                });
                savedDocId = docRef.id;
            }

            // Construct full record for local update
            const fullRecord: EvaluationRecord = {
                docId: savedDocId,
                ...dataToSave,
                createdAt: prevEval ? prevEval.createdAt : Timestamp.now()
            };

            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(fullRecord);
            }

            const returnTo = searchParams.get('returnTo');
            if (returnTo) {
                router.push(returnTo);
                return;
            }

            if (!onSuccess) {
                // Default behavior: refresh and clear selection (only if not handled by custom success flow)
                await initData();
                setScores({});
                setSelectedEmployeeId('');
                setSelectedEmployee(null);
                setEmployeeStats(null);
                setDisciplineScore("-");
                await showAlert("สำเร็จ", "✅ บันทึกการประเมินเรียบร้อย!");
            }
        } catch (error) {
            console.error("Error saving evaluation:", error);
            await showAlert("ข้อผิดพลาด", "❌ เกิดข้อผิดพลาดในการบันทึก: " + error);
        }
    };

    const updateLocalEvaluation = (newEval: EvaluationRecord) => {
        setExistingEvaluations(prev => ({
            ...prev,
            [newEval.employeeDocId]: newEval
        }));
        setCompletedEvaluationIds(prev => {
            const newSet = new Set(prev);
            newSet.add(newEval.employeeDocId);
            return newSet;
        });
    };

    const getDisplayCategories = () => {
        if (!selectedEmployee) return [];
        return categories.map(cat => {
            const validQuestions = cat.questions.filter(q => {
                if (q.id === 'B-4' && HO_SECTIONS.includes(selectedEmployee.section)) return false;
                if (q.isReadOnly) return false;
                return true;
            });
            if (cat.id === 'C' && selectedEmployee.level === 'Monthly Staff') return null;
            if (validQuestions.length === 0) return null;
            return { ...cat, questions: validQuestions };
        }).filter(c => c !== null) as Category[];
    };

    // ... (rest of helper functions same as before) 

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
        closePopup(); // 🔥 Auto-close after applying
    };

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
        completedEvaluationIds,
        selectedEmployee,
        employeeStats,
        disciplineScore,
        totalScore,
        displayCategories: getDisplayCategories(),
        readOnlyItems: getReadOnlyItems(),
        scores,
        handleScoreChange,
        handleSubmit,
        integrityWarnings,
        activePopupId,
        openPopup,
        closePopup,
        handlePopupScore,
        applyPopupScore,
        popupData,
        popupScores,
        categories,
        employees,
        refreshData: initData, // 🔥 Exposed for manual refresh
        updateLocalEvaluation, // 🔥 Exposed for local update
    };
};
