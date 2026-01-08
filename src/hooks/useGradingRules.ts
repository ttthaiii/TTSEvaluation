import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GradeCriteria } from '../utils/grade-calculation';

export const useGradingRules = () => {
    const [rules, setRules] = useState<GradeCriteria[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'config_grading_rules'), orderBy('min', 'desc')); // High scores first (E -> NI)
            const snapshot = await getDocs(q);
            const data: GradeCriteria[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GradeCriteria));

            // If empty (first run), should we return defaults? 
            // For now, let UI decide or assume empty. 
            // Better yet, if empty, we could offer to seed defaults.
            setRules(data);
        } catch (error) {
            console.error("Error fetching grading rules:", error);
        } finally {
            setLoading(false);
        }
    };

    const addRule = async (rule: Omit<GradeCriteria, 'id'>) => {
        await addDoc(collection(db, 'config_grading_rules'), {
            ...rule,
            updatedAt: serverTimestamp()
        });
        await fetchRules();
    };

    const updateRule = async (id: string, rule: Partial<GradeCriteria>) => {
        const docRef = doc(db, 'config_grading_rules', id);
        await updateDoc(docRef, { ...rule, updatedAt: serverTimestamp() });
        await fetchRules();
    };

    const deleteRule = async (id: string) => {
        await deleteDoc(doc(db, 'config_grading_rules', id));
        await fetchRules();
    };

    // Seed default rules if needed
    const seedDefaults = async (defaults: GradeCriteria[]) => {
        for (const rule of defaults) {
            // Check if similar exists? Or just add.
            // Simplified: just add.
            // remove id from object before saving
            const { icon, grade, label, description, min, max, colorClass, bgClass, borderClass } = rule;
            await addDoc(collection(db, 'config_grading_rules'), {
                icon, grade, label, description, min, max, colorClass, bgClass, borderClass,
                updatedAt: serverTimestamp()
            });
        }
        await fetchRules();
    }

    useEffect(() => {
        fetchRules();
    }, []);

    return { rules, loading, fetchRules, addRule, updateRule, deleteRule, seedDefaults };
};
