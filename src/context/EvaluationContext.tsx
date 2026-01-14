'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { collection, getDocs, query, where, getDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Employee } from '@/types/employee';
import { EvaluationRecord, Category, ScoringRule } from '@/types/evaluation';
import { getEvaluationYear, getRawTenure, getCurrentPeriod } from '@/utils/dateUtils';

interface EvaluationContextProps {
    employees: Employee[];
    sections: string[];
    existingEvaluations: Record<string, EvaluationRecord>;
    scoringRules: ScoringRule[];
    categories: Category[];
    loading: boolean;
    refreshData: () => Promise<void>;
    updateLocalEvaluation: (empId: string, data: EvaluationRecord) => void;
    fetchHistory: (years: number[]) => Promise<void>;
    historyCache: Record<number, EvaluationRecord[]>;
}

const EvaluationContext = createContext<EvaluationContextProps | undefined>(undefined);

export const EvaluationProvider = ({ children }: { children: ReactNode }) => {
    const { data: session, status } = useSession();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [sections, setSections] = useState<string[]>([]);
    const [existingEvaluations, setExistingEvaluations] = useState<Record<string, EvaluationRecord>>({});
    const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const evalYear = typeof getEvaluationYear === 'function' ? getEvaluationYear() : new Date().getFullYear();
    const currentPeriod = typeof getCurrentPeriod === 'function' ? getCurrentPeriod() : `${evalYear}-Annual`;

    const fetchData = useCallback(async () => {
        if (status !== 'authenticated') {
            setLoading(false);
            return;
        }

        setLoading(true);
        console.log("🔄 [EvaluationContext] Fetching Data...");

        try {
            // 1. Fetch Users
            const qUsers = query(collection(db, 'users'), where('isActive', '==', true));
            const userSnapshot = await getDocs(qUsers);
            const empList: Employee[] = [];
            const sectionSet = new Set<string>();

            userSnapshot.forEach((doc) => {
                const d = doc.data();
                // [T-Exclude Executives]
                if (!d.evaluatorId) return; // Skip if no evaluator (Executives)

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
                    evaluatorId: d.evaluatorId || "",
                    pdNumber: d.pdNumber || "",
                    birthDate: d.birthDate || null,
                    age: d.age || 0,
                } as Employee);
            });

            // 2. Fetch Evaluations
            const qEvals = query(collection(db, 'evaluations'), where('period', '==', currentPeriod));
            const evalSnapshot = await getDocs(qEvals);
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
                        aiScore: d.aiScore,
                        status: d.status
                    } as EvaluationRecord;
                }
            });

            // 3. Fetch Categories
            const qCats = query(collection(db, 'evaluation_categories'), orderBy('order'));
            const catSnap = await getDocs(qCats);
            const catsData = catSnap.docs.map(d => d.data() as Category);

            // 4. Fetch Rules
            const rulesSnapshot = await getDocs(collection(db, 'scoring_formulas'));
            const rules: ScoringRule[] = rulesSnapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as ScoringRule));

            // 5. Apply Eligibility & Filtering (Combined Logic taken from useEvaluation)
            // [T-032] Config
            let eligibilityRule: { minTenure: number, tenureUnit: string, cutoffDate: string } | null = null;
            try {
                const ruleSnap = await getDoc(doc(db, 'config_general', 'eligibility'));
                if (ruleSnap.exists()) eligibilityRule = ruleSnap.data() as any;
            } catch (e) { console.warn("No eligibility rule found"); }

            let finalEmpList = empList;
            if (eligibilityRule && eligibilityRule.minTenure > 0) {
                const { minTenure, tenureUnit, cutoffDate } = eligibilityRule;
                const targetDate = cutoffDate ? new Date(cutoffDate) : new Date(evalYear, 11, 31);

                finalEmpList = empList.filter(emp => {
                    const raw = getRawTenure(emp.startDate, targetDate);
                    if (tenureUnit === 'years') return raw.years >= minTenure;
                    if (tenureUnit === 'months') return ((raw.years * 12) + raw.months) >= minTenure;
                    return raw.totalDays >= minTenure;
                });
            }

            // Filter by User Role (Evaluator)
            if (session?.user) {
                const currentUser = session.user as any;
                if (currentUser.role !== 'Admin') {
                    const currentEmpId = currentUser.employeeId;
                    const getAllSubordinates = (managerId: string, allEmps: Employee[]): Employee[] => {
                        const directReports = allEmps.filter(e => e.evaluatorId === managerId);
                        let allSubs = [...directReports];
                        directReports.forEach(report => {
                            allSubs = [...allSubs, ...getAllSubordinates(report.employeeId, allEmps)];
                        });
                        return allSubs;
                    };

                    const mySubordinates = getAllSubordinates(currentEmpId, finalEmpList);
                    const uniqueSubordinates = Array.from(new Map(mySubordinates.map(item => [item.id, item])).values());

                    finalEmpList = uniqueSubordinates;

                    // Update sections based on filtered list
                    const subSections = new Set<string>();
                    finalEmpList.forEach(e => subSections.add(e.section));
                    setSections(Array.from(subSections).sort());
                } else {
                    setSections(Array.from(sectionSet).sort());
                }
            }

            setEmployees(finalEmpList);
            setExistingEvaluations(evalMap);
            setScoringRules(rules);
            setCategories(catsData);

        } catch (error) {
            console.error("❌ Error fetching global evaluation data:", error);
        } finally {
            setLoading(false);
        }
    }, [status, session, evalYear, currentPeriod]);

    // 🔥 History Cache System
    const [historyCache, setHistoryCache] = useState<Record<number, EvaluationRecord[]>>({});

    const fetchHistory = useCallback(async (years: number[]) => {
        const missingYears = years.filter(y => !historyCache[y]);
        if (missingYears.length === 0) return;

        console.log("🔄 Fetching History for years:", missingYears);
        try {
            // Fetch only missing years
            const q = query(
                collection(db, 'evaluations'),
                where('evaluationYear', 'in', missingYears)
            );
            const snapshot = await getDocs(q);

            const newCache: Record<number, EvaluationRecord[]> = {};
            missingYears.forEach(y => newCache[y] = []); // Init arrays

            snapshot.forEach(doc => {
                const d = doc.data();
                const y = d.evaluationYear;
                if (newCache[y]) {
                    newCache[y].push({
                        docId: doc.id,
                        scores: d.scores || {},
                        employeeDocId: d.employeeDocId,
                        totalScore: d.totalScore,
                        disciplineScore: d.disciplineScore,
                        updatedAt: d.updatedAt,
                        createdAt: d.createdAt,
                        aiScore: d.aiScore,
                        status: d.status,
                        // Add other fields if needed for history
                        finalGrade: d.finalGrade // Important for charts
                    } as any);
                }
            });

            setHistoryCache(prev => ({
                ...prev,
                ...newCache
            }));

        } catch (err) {
            console.error("Error fetching history:", err);
        }
    }, [historyCache]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refreshData = async () => {
        await fetchData();
        setHistoryCache({}); // Clear history cache on full refresh? Or keep it? Let's clear to be safe.
    };

    const updateLocalEvaluation = (empId: string, data: EvaluationRecord) => {
        setExistingEvaluations(prev => ({
            ...prev,
            [empId]: data
        }));
    };

    return (
        <EvaluationContext.Provider value={{
            employees,
            sections,
            existingEvaluations,
            scoringRules,
            categories,
            loading,
            refreshData,
            updateLocalEvaluation,
            fetchHistory, // 🔥 Exposed
            historyCache  // 🔥 Exposed
        }}>
            {children}
        </EvaluationContext.Provider>
    );
};

export const useEvaluationContext = () => {
    const context = useContext(EvaluationContext);
    if (!context) {
        throw new Error('useEvaluationContext must be used within an EvaluationProvider');
    }
    return context;
};
