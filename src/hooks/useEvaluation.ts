import { useState, useEffect } from 'react';
import { create, all } from 'mathjs';
import { calculateScores, mergeStatsScores } from '../utils/score-engine';
import { collection, getDocs, addDoc, query, where, Timestamp, doc, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HO_SECTIONS } from '../data/evaluation-criteria';
import { Employee } from '../types/employee';
import { calculateServiceTenure, getEvaluationYear, getCurrentPeriod, getRawTenure } from '../utils/dateUtils';
import { Category, EvaluationRecord, QuestionItem, ScoringRule, EmployeeStats } from '../types/evaluation';
import { PopupData } from '../components/evaluations/ScoreHelperPopup';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useModal } from '../context/ModalContext'; // 🔥 Import useModal
import { useEvaluationContext } from '../context/EvaluationContext';

export const useEvaluation = (props?: { defaultEmployeeId?: string; onSelectionCancelled?: () => void }) => {

    const router = useRouter();
    const searchParams = useSearchParams();
    const targetEmpId = props?.defaultEmployeeId || searchParams.get('employeeId');

    // 🔥 Modal Hook
    const { showAlert, showConfirm, setNavigationGuard } = useModal();

    // 🔥 Context Data (Global Cache)
    const {
        employees,
        sections: contextSections,
        existingEvaluations,
        scoringRules,
        categories,
        loading: contextLoading,
        updateLocalEvaluation,
        refreshData
    } = useEvaluationContext();

    // Local State associated with UI Interaction
    const [loading, setLoading] = useState(true); // Local loading for switching
    const [sections, setSections] = useState<string[]>([]);
    const [disciplineScore, setDisciplineScore] = useState<number | string>("-");
    const [totalScore, setTotalScore] = useState<number>(0);
    const [completedEvaluationIds, setCompletedEvaluationIds] = useState<Set<string>>(new Set());

    const [selectedSection, setSelectedSection] = useState<string>('');
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);

    // UI Helpers
    const [popupData, setPopupData] = useState<PopupData | null>(null);
    const [popupScores, setPopupScores] = useState<Record<number, number>>({});
    const [integrityWarnings, setIntegrityWarnings] = useState<string[]>([]);
    const [activePopupId, setActivePopupId] = useState<string | undefined>(undefined);

    // Auth Session
    const { data: session, status } = useSession();

    // Year Logic
    const evalYear = typeof getEvaluationYear === 'function' ? getEvaluationYear() : new Date().getFullYear();
    const currentPeriod = typeof getCurrentPeriod === 'function' ? getCurrentPeriod() : `${evalYear}-Annual`;

    // --- Sync Context to Local State ---
    useEffect(() => {
        if (!contextLoading && employees.length > 0) {
            setLoading(false);

            // Sync Sections
            setSections(contextSections);

            // Sync Completed IDs
            const completed = new Set<string>();
            Object.values(existingEvaluations).forEach(ev => {
                if (ev.status === 'Completed') { // Simple check, or reuse complex logic if moved to context
                    completed.add(ev.employeeDocId);
                }
                // Compatibility: If status undefined, check scores (Old logic)
                if (!ev.status) {
                    // Logic was complex in old initData. 
                    // ideally Context should provide 'isComplete' flag or we re-calc here cheaply.
                    // For now, let's assume if it exists in evaluations map, it's "Evaluated" 
                    // BUT Phase 2 "Draft" feature means we must check status.
                    // If no status, assume Completed (Legacy).
                    completed.add(ev.employeeDocId);
                }
            });
            setCompletedEvaluationIds(completed);

            // Auto-Select Section if Single
            if (contextSections.length === 1 && !selectedSection) {
                setSelectedSection(contextSections[0]);
                setFilteredEmployees(employees.filter(e => e.section === contextSections[0]));
            } else if (!selectedSection) {
                // Initial load: show nothing or all?
                // Existing logic: "setFilteredEmployees(uniqueSubordinates)" if user.
                // Let's default to Empty or All based on design.
                // Context.employees is already filtered by Auth.
                // So we can show all context.employees.
                setFilteredEmployees(employees);
            }
        } else if (!contextLoading && employees.length === 0) {
            setLoading(false);
        }
    }, [contextLoading, employees, contextSections, existingEvaluations]);

    // Handle Section Change locally
    useEffect(() => {
        if (selectedSection) {
            if (selectedSection === 'All') {
                setFilteredEmployees(employees);
            } else {
                setFilteredEmployees(employees.filter(e => e.section === selectedSection));
            }
        } else if (employees.length > 0) {
            // Default if no section selected
            setFilteredEmployees(employees);
        }
    }, [selectedSection, employees]);

    // 🔥 Auto-select Employee from URL (ทำงานเมื่อมี parameter ?employeeId=...)
    useEffect(() => {
        if (!loading && employees.length > 0 && targetEmpId) {
            const target = employees.find(e => e.employeeId === targetEmpId);
            // ตรวจสอบว่า target อยู่ในรายการที่ User มีสิทธิ์เห็นหรือไม่
            if (target) {
                // If not already selected (ป้องกัน loop หรือ re-fetch ไม่จำเป็น)
                if (selectedEmployeeId !== target.id) {
                    // Case 1: Initial Load (No employee selected yet) -> Bypass Exit Confirmation
                    if (!selectedEmployeeId) {
                        console.log("🔗 Initial Auto-select:", target.firstName);
                        switchEmployee(target.id);
                    }
                    // Case 2: Switching from one employee to another via Prop/URL -> Require Confirmation
                    else {
                        if (selectedEmployeeId === target.id) {
                            console.log("🔗 Auto-select: Already selected, skipping.", { selectedEmployeeId });
                            return;
                        }
                        console.log("🔗 Auto-select: Switching", { from: selectedEmployeeId, to: target.id });
                        handleEmployeeChange({ target: { value: target.id } } as any);
                    }

                    // Optional: ถ้าต้องการเลือก Section ให้ตรงด้วย (เพื่อความเนียน)
                    if (target.section !== selectedSection && selectedSection !== 'All') {
                        setSelectedSection('All');
                        setFilteredEmployees(employees);
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

        console.log("🧮 Starting Calculation (Engine)", { stats, currentScores, empName: targetEmp?.firstName });

        const result = calculateScores(
            stats,
            currentScores,
            scoringRules,
            categories,
            targetEmp
        );

        setDisciplineScore(result.disciplineScore);
        setTotalScore(result.totalScore);
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

    const switchEmployee = async (empId: string) => {
        console.log("🔄 switchEmployee Called", { empId });

        if (!empId) {
            setScores({});
            setEmployeeStats(null);
            setDisciplineScore("-");
            setSelectedEmployeeId('');
            setSelectedEmployee(null);
            return;
        }

        const emp = employees.find(e => e.id === empId) || null;
        if (!emp) return;

        // [T-033] Fix: Check for Re-evaluation BEFORE setting state
        // This prevents the "Exit Guard" from activating before the user confirms they want to enter re-evaluation.
        // แก้ไขปัญหาระบบถาม "ยืนยันการออก" ซ้อนกับ "ยืนยันการประเมินซ้ำ"
        const prevEval = existingEvaluations[empId];

        if (prevEval && emp && completedEvaluationIds.has(emp.id)) {
            console.log("⚠️ Asking Re-Eval Confirm");
            const confirmReEval = await showConfirm(
                'ยืนยันการประเมินซ้ำ',
                `⚠️ พนักงานคนนี้ (${emp.firstName}) ถูกประเมินไปแล้ว\nคุณต้องการกลับไปแก้ไขการประเมินหรือไม่?`
            );

            if (!confirmReEval) {
                // User Cancelled: Do not switch, do not update state
                // [T-UX] Trigger cancellation callback (e.g., to close drawer)
                if (props?.onSelectionCancelled) {
                    props.onSelectionCancelled();
                }
                return;
            }
        }

        // --- Confirmed or No Confirmation Needed ---

        // Now safe to update state (activates Navigation Guard)
        setScores({});
        setEmployeeStats(null);
        setDisciplineScore("-");

        setSelectedEmployee(emp);
        setSelectedEmployeeId(empId);

        let currentLoadedScores: Record<string, number> = {};

        if (prevEval) {
            currentLoadedScores = prevEval.scores;
            setScores(prevEval.scores);
        }

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

            // 🔥 Merge scores from yearlyStats (Handles 0 vs O match automatically)
            const mergedScores = mergeStatsScores(statsData, currentLoadedScores, categories);

            setEmployeeStats(statsData);
            setScores(mergedScores); // Update state

            // Calculate using shared engine
            const result = calculateScores(statsData, mergedScores, scoringRules, categories, emp);
            setDisciplineScore(result.disciplineScore);
            setTotalScore(result.totalScore);
        } catch (err) {
            console.error("Error fetching stats:", err);
        }

        setPopupData(null);
    };

    const handleEmployeeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const empId = e.target.value;
        const previousId = selectedEmployeeId;

        // If trying to select the same employee, do nothing
        if (empId === previousId) return;

        // Use handleExitEvaluation to confirm exit from current employee -> then switch
        await handleExitEvaluation(() => switchEmployee(empId));

        // Note: If user cancels in handleExitEvaluation, the callback isn't called.
        // The UI (Select) might need to be forced back to 'previousId' if it's uncontrolled,
        // but since it's controlled by selectedEmployeeId, React re-render should fix it 
        // if we didn't update state.
    };

    const handleScoreChange = (criteriaId: string, score: number) => {
        const newScores = { ...scores, [criteriaId]: score };
        setScores(newScores);
        if (employeeStats) {
            runDisciplineCalculation(employeeStats, newScores, selectedEmployee);
        }
    };

    const checkCompleteness = () => {
        if (!selectedEmployee) return [];
        const missing: string[] = [];

        categories.forEach(cat => {
            // Skip Category C for Monthly Staff
            if (cat.id === 'C' && selectedEmployee.level === 'Monthly Staff') return;

            cat.questions.forEach(q => {
                // Skip Read Only items
                if (q.isReadOnly) return;
                // Skip B-4 for HO Sections
                if (q.id === 'B-4' && HO_SECTIONS.includes(selectedEmployee.section)) return;

                if (scores[q.id] === undefined) {
                    missing.push(q.id); // [T-027] เก็บแค่ ID ตาม Requirement
                }
            });
        });
        return missing;
    };

    const handleSubmit = async (
        onSuccess?: (savedData: EvaluationRecord) => void,
        overrideStatus?: 'Draft' | 'Completed',
        skipConfirm: boolean = false
    ) => {
        if (!selectedEmployee) return;

        const missingItems = checkCompleteness();
        let status: 'Draft' | 'Completed' = overrideStatus || 'Completed';
        let isConfirmed = skipConfirm;

        if (!skipConfirm) {
            if (missingItems.length > 0) {
                // Case: Incomplete -> Ask to save as Draft
                const msg = `⚠️ ยังประเมินไม่ครบ ${missingItems.length} หัวข้อ:\n${missingItems.join(', ')}\n\nคุณต้องการบันทึกเป็น "แบบร่าง (Draft)" หรือไม่?`;
                isConfirmed = await showConfirm('ยืนยันการบันทึกแบบร่าง', msg);
                status = 'Draft';
            } else {
                // Case: Complete -> Standard Confirm
                isConfirmed = await showConfirm('ยืนยันการบันทึก', `คุณต้องการบันทึกผลการประเมินของ\n${selectedEmployee.firstName} ${selectedEmployee.lastName} ใช่หรือไม่?`);
                status = 'Completed';
            }
        } else if (!overrideStatus) {
            status = missingItems.length > 0 ? 'Draft' : 'Completed';
        }

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
                // 🔥 Self-Healing: If aiScore is 0, try to find it in the scores map (Legacy Keys: [0]-1, [O]-1, etc.)
                aiScore: (() => {
                    const currentAi = existingEvaluations[selectedEmployee.id]?.aiScore || employeeStats?.aiScore || 0;
                    if (currentAi > 0) return currentAi;

                    // Fallback: Check hidden keys in scores
                    const hiddenScore = scores['[0]-1'] || scores['[O]-1'] || scores['O-1'] || scores['0-1'] || 0;
                    return hiddenScore > 0 ? hiddenScore : 0;
                })(),
                disciplineScore: disciplineScore,
                totalScore: Number(totalScore.toFixed(2)),
                updatedAt: Timestamp.now(),
                period: currentPeriod,
                evaluationYear: evalYear,
                status: status // [T-027] Save Status
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

            // 🔥 Update Local Context immediately
            updateLocalEvaluation(selectedEmployee.id, fullRecord);

            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(fullRecord);
            }

            const returnTo = searchParams.get('returnTo');
            if (returnTo) {
                router.push(returnTo);
                return;
            }

            if (!onSuccess) {
                // Default behavior
                await refreshData();
                setScores({});
                setSelectedEmployeeId('');
                setSelectedEmployee(null);
                setEmployeeStats(null);
                setDisciplineScore("-");
                // [T-FIX-002] Removed success alert
            }
        } catch (error) {
            console.error("Error saving evaluation:", error);
            await showAlert("ข้อผิดพลาด", "❌ เกิดข้อผิดพลาดในการบันทึก: " + error);
        }
    };

    // [T-029] Two-Step Exit Confirmation
    const handleExitEvaluation = async (onConfirmedExit?: () => void): Promise<boolean> => {
        console.log("🚨 handleExitEvaluation Called", { selectedEmployee: selectedEmployee?.id });
        if (!selectedEmployee) {
            if (onConfirmedExit) onConfirmedExit();
            return true;
        }

        // Step 1: Confirm Exit
        const confirmExit = await showConfirm(
            'ยืนยันการออก',
            'คุณกำลังทำการประเมินอยู่ ต้องการออกจากหน้านี้ใช่หรือไม่?'
        );

        if (!confirmExit) return false; // User Cancelled Exit

        // Step 2: Check Incompleteness -> Ask Draft
        const missingItems = checkCompleteness();
        if (missingItems.length > 0) {
            const saveDraft = await showConfirm(
                'บันทึกแบบร่าง',
                `มี ${missingItems.length} หัวข้อที่ยังไม่ได้ประเมิน (${missingItems.join(', ')}) ต้องการบันทึกเป็น Draft หรือไม่?`
            );

            if (saveDraft) {
                // Yes: Save as Draft then Exit
                // We await handleSubmit, and if it succeeds, we proceed.
                // We need to ensure handleSubmit doesn't throw or we handle it.
                // Assuming handleSubmit handles errors internally.
                await handleSubmit(() => {
                    if (onConfirmedExit) onConfirmedExit();
                }, 'Draft', true);
                return true;
            } else {
                // No: Discard and Exit
                if (onConfirmedExit) onConfirmedExit();
                return true;
            }
        } else {
            // Already complete -> Just Exit
            if (onConfirmedExit) onConfirmedExit();
            return true;
        }
    };

    // 🔥 Register Navigation Guard
    useEffect(() => {
        if (selectedEmployee) {
            setNavigationGuard(() => () => handleExitEvaluation());

            // Register Browser Native BeforeUnload
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = ''; // Trigger browser confirmation
            };
            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                setNavigationGuard(null);
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        } else {
            setNavigationGuard(null);
        }
    }, [selectedEmployee, selectedEmployeeId, scores, disciplineScore]); // Helper dependencies to ensure scope is fresh if needed, though mostly selectedEmployee is key.





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
        handleExitEvaluation, // [T-029] Two-Step Confirmation
        refreshData, // 🔥 Exposed for manual refresh
        updateLocalEvaluation, // 🔥 Exposed for local update
    };
};
