import { useState, useEffect, useMemo } from 'react';
import { useEvaluationContext } from '../context/EvaluationContext';

export interface HistoricalRecord {
    score: number;
    grade: string;
}

// Map<EmployeeDocID, Map<Year, Record>>
export type HistoricalDataMap = Map<string, Map<number, HistoricalRecord>>;

export const useHistoricalData = (isCompareMode: boolean, selectedYears: (string | number)[]) => {
    const { fetchHistory, historyCache } = useEvaluationContext();
    const [loading, setLoading] = useState(false);

    // Normalize years
    const numericYears = useMemo(() =>
        selectedYears.map(y => Number(y)).filter(y => !isNaN(y)),
        [selectedYears]);

    // 1. Fetch Missing Data
    useEffect(() => {
        if (!isCompareMode || numericYears.length === 0) return;

        const loadData = async () => {
            setLoading(true);
            await fetchHistory(numericYears);
            setLoading(false);
        };
        loadData();
    }, [isCompareMode, numericYears, fetchHistory]);

    // 2. Transform Cache to Map (Memoized)
    const historicalData = useMemo(() => {
        const map: HistoricalDataMap = new Map();

        if (!isCompareMode || numericYears.length === 0) return map;

        numericYears.forEach((year: number) => {
            const records = historyCache[year] || [];
            records.forEach(rec => {
                const docId = rec.employeeDocId;
                if (docId) {
                    if (!map.has(docId)) {
                        map.set(docId, new Map());
                    }
                    map.get(docId)?.set(year, {
                        score: Number(rec.totalScore) || 0,
                        grade: rec.finalGrade || "-"
                    });
                }
            });
        });

        return map;
    }, [historyCache, numericYears, isCompareMode]);

    return { historicalData, loading };
};
