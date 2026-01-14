import { useState, useMemo } from 'react';
import { Employee } from '@/types/employee';
import { GRADE_RANGES } from '@/utils/grade-calculation';

// Define filter state interface
export interface FilterState {
    section: string;
    grade: string;
    pdNumber: string;
    info: string; // Text search (Name/ID)
}

// Hook options
interface UseEmployeeFilterOptions {
    initialSection?: string;
}

export const useEmployeeFilter = (employees: Employee[], options: UseEmployeeFilterOptions = {}) => {
    // --- State ---
    const [filters, setFilters] = useState<FilterState>({
        section: options.initialSection || 'All',
        grade: 'All',
        pdNumber: 'All',
        info: ''
    });

    // --- Actions ---
    const setFilter = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            section: 'All',
            grade: 'All',
            pdNumber: 'All',
            info: ''
        });
    };

    // --- Logic: Filter Subset (Internal Helper) ---
    // ใช้สำหรับหาว่าตัวเลือกใน Dropdown แต่ละอันควรเหลืออะไรบ้าง (Dependency Filtering)
    const filterSubset = (
        data: Employee[],
        criteria: Partial<FilterState>
    ) => {
        return data.filter(item => {
            // [Refactor] ใช้ item.grade?.grade จาก dashboard logic หรือคำนวณใหม่?
            // เนื่องจาก Employee Type ปกติอาจไม่มี field 'grade' ที่คำนวณแล้ว (Dashboard มีการ inject เข้าไป)
            // เราต้องตกลงกันว่า 'employees' ที่ส่งเข้ามาต้องมี grade หรือไม่
            // เพื่อความ Safe: Hook นี้ควรรับ Generic T extends Employee ที่มี grade? 
            // หรือรับ employees ธรรมดาแล้ว Hook คำนวณ Grade เอง? -> อาจจะ heavy ไป
            // Best approach: Assume input 'employees' already has necessary fields OR Handle safely.

            // Note: Dashboard creates a wrapper object with 'grade'. Employee List doesn't usually show Grade unless computed.
            // But EmployeeSearch wants to filter by Grade?
            // The Dashboard implementation expects 'item.grade?.grade'.
            // Let's support both: direct property or nested object if we want universal use.
            const itemGrade = (item as any).grade?.grade || (item as any).grade || '';
            const itemPd = (item as any).pdNumber || '';

            const matchSection = !criteria.section || criteria.section === 'All' || item.section === criteria.section;
            const matchGrade = !criteria.grade || criteria.grade === 'All' || itemGrade === criteria.grade;
            const matchPd = !criteria.pdNumber || criteria.pdNumber === 'All' || itemPd === criteria.pdNumber;

            return matchSection && matchGrade && matchPd;
        });
    };

    // --- Derived Options (Memoized) ---

    // 1. Available Sections (ขึ้นอยู่กับ Grade & Pd)
    const availableSections = useMemo(() => {
        const subset = filterSubset(employees, { grade: filters.grade, pdNumber: filters.pdNumber });
        return Array.from(new Set(subset.map(i => i.section))).sort();
    }, [employees, filters.grade, filters.pdNumber]);

    // 2. Available Grades (ขึ้นอยู่กับ Section & Pd)
    const availableGrades = useMemo(() => {
        const subset = filterSubset(employees, { section: filters.section, pdNumber: filters.pdNumber });
        const grades = new Set<string>();
        subset.forEach(i => {
            const g = (i as any).grade?.grade || (i as any).grade;
            if (g) grades.add(g);
        });
        // Return full GradeCriteria objects that match
        return GRADE_RANGES.filter(g => grades.has(g.grade));
    }, [employees, filters.section, filters.pdNumber]);

    // 3. Available PD Numbers (ขึ้นอยู่กับ Section & Grade)
    const availablePdNumbers = useMemo(() => {
        const subset = filterSubset(employees, { section: filters.section, grade: filters.grade });
        return Array.from(new Set(subset.map(i => (i as any).pdNumber).filter((p: any): p is string => !!p))).sort();
    }, [employees, filters.section, filters.grade]);

    // 4. Available Employee Options (For Autocomplete) - Respects ALL dropdowns
    const availableEmployeeOptions = useMemo(() => {
        const subset = filterSubset(employees, {
            section: filters.section,
            grade: filters.grade,
            pdNumber: filters.pdNumber
        });
        const result = subset.map((e, idx) => {
            // Direct string concatenation to avoid any template literal weirdness (unlikely but being paranoid)
            const debugLabel = (e.firstName || "-") + " " + (e.lastName || "-");
            const debugValue = e.id ? String(e.id) : "MISSING_ID";

            const obj = {
                value: debugValue,
                label: `${e.employeeId || '?'} - ${debugLabel}`,
                searchTerms: `${e.employeeId || ''} ${e.firstName || ''} ${e.lastName || ''}`,
                description: `${e.section || '-'} | ${e.position || '-'}`,
                _debug_id: e.id // Add purely for debugging
            };

            // Debug first item
            if (idx === 0) console.log("[useEmployeeFilter] Mapped Item 0 (Raw):", e, "Mapped:", obj);

            return obj;
        });
        return result;
    }, [employees, filters.section, filters.grade, filters.pdNumber]);


    // --- Final Filtered Data ---
    const filteredEmployees = useMemo(() => {
        // 1. Apply Dropdown Filters
        const subset = filterSubset(employees, filters);

        // 2. Apply Text Search (Info/Name/ID)
        // If searched by ID from Autocomplete -> filters.info might be ID.
        // If typed manually -> filters.info is text.
        if (!filters.info) return subset;

        const searchLower = filters.info.toLowerCase().trim();
        return subset.filter(item => {
            const fullNameString = `${item.employeeId} ${item.firstName} ${item.lastName}`.toLowerCase();

            // Allow exact match by Document ID (when selected from Dropdown)
            if (item.id === filters.info) return true;

            return item.employeeId.toLowerCase().includes(searchLower) ||
                item.firstName.toLowerCase().includes(searchLower) ||
                item.lastName.toLowerCase().includes(searchLower) ||
                fullNameString.includes(searchLower);
        });
    }, [employees, filters]);

    return {
        filters,
        setFilter,
        resetFilters,
        filteredEmployees,
        // Options for UI
        availableSections,
        availableGrades,
        availablePdNumbers,
        employeeOptionsResolved: availableEmployeeOptions // Renamed to force update
    };
};
