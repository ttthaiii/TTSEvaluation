'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { calculateScores } from '../../utils/score-engine';
import { collection, query, where, getDocs, orderBy, writeBatch, Timestamp, serverTimestamp, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Employee } from '../../types/employee';
import * as XLSX from 'xlsx';
import { getCurrentPeriod, getEvaluationYear } from '../../utils/dateUtils';
import { Search, Filter, Lock, Edit2, Users, RotateCcw } from 'lucide-react';
import EmployeeEditModal from '@/components/admin/EmployeeEditModal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { getGrade } from '../../utils/grade-calculation';
import { useGradingRules } from '../../hooks/useGradingRules';
import { useEmployeeFilter } from '@/hooks/useEmployeeFilter'; // [Refactor]
import { useHistoricalData } from '@/hooks/useHistoricalData'; // [Refactor]
import { GRADE_COLORS } from '@/constants/colors';
import { UI_TEXT } from '@/constants/text';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// --- Helper Functions ---
const parseLateTime = (value: any): number => {
    if (!value) return 0;
    const str = String(value).trim();
    const parts = str.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return (hours * 60) + minutes;
    }
    return 0;
};

const parseLeaveTime = (value: any): number => {
    if (!value) return 0;
    const str = String(value).trim();
    const parts = str.split(':');
    if (parts.length >= 3) {
        const days = parseInt(parts[0]) || 0;
        const hours = parseInt(parts[1]) || 0;
        const minutes = parseInt(parts[2]) || 0;
        const totalDays = days + (hours / 8) + (minutes / 480);
        return Math.round(totalDays * 100) / 100;
    }
    return parseFloat(str) || 0;
};

// ... (Top Imports)
import { useModal } from '../../context/ModalContext';

export default function EmployeeListPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // 🔥 Modal Hook
    const { showAlert, showConfirm } = useModal();
    const router = useRouter();
    const { data: session } = useSession();

    // 🔥 Page Protection: Only Admin can access this page
    useEffect(() => {
        if (!loading && session?.user) {
            if ((session.user as any).role !== 'Admin') {
                router.replace('/dashboard');
            }
        }
    }, [session, loading, router]);


    // 👇 State for Grading Rules (ใช้สำหรับคำนวณเกรดตอน Export)
    const { rules: gradingRules } = useGradingRules();

    // 👇 State for Filtering (Replacing simple states with Hook)
    // const [searchTerm, setSearchTerm] = useState('');     <-- Moved to Hook
    // const [selectedSection, setSelectedSection] = useState('All'); <-- Moved to Hook
    const [showEvaluatorsOnly, setShowEvaluatorsOnly] = useState(false);
    const [sections, setSections] = useState<string[]>([]); // Keep for initial loading or move to context?
    // Actually filter hook derives sections from data, 
    // BUT fetchEmployees sets this 'sections' state from DB.
    // We can keep 'sections' state here as the "Source of Truth" for *All Possible Sections*
    // or rely on hook. Hook derives from valid employees. 
    // DB fetch sees all users. So safer to keep logic if we want to show sections even if no emp fits?
    // Current logic: fetchEmployees calculates unique sections from DB users.
    // Hook calculates available sections from *passed employees*.
    // If 'employees' contains all users, then hook.availableSections == sections.
    // So we can Remove 'sections' state if we trust hook.
    // Let's keep 'sections' for now if it's used elsewhere, otherwise deprecate.
    // 'sections' used in line 282 for options. Hook provides availableSections.

    // 🔥 Initialize Filter Hook
    const {
        filters,
        setFilter,
        resetFilters,
        filteredEmployees: hookFilteredEmployees,
        availableSections,
        employeeOptionsResolved: availableEmployeeOptions
    } = useEmployeeFilter(employees);

    // Filter Logic Extension: Show Evaluators Only (Local to this page)
    const filteredEmployees = useMemo(() => {
        let res = hookFilteredEmployees;
        if (showEvaluatorsOnly) {
            res = res.filter(e => e.isEvaluator);
        }
        return res;
    }, [hookFilteredEmployees, showEvaluatorsOnly]);

    // 👇 State for Edit Modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string, name: string, isEvaluator?: boolean } | null>(null);

    // 👇 State for History Comparison
    // [Refactor] Support Multi-Year Comparison
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [selectedHistoricals, setSelectedHistoricals] = useState<number[]>([2024]);

    // 🔥 Use Historical Data Hook
    const { historicalData } = useHistoricalData(isCompareMode, selectedHistoricals);

    // 🔥 Dropdown Logic (Click Outside)
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsYearDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // ดึงข้อมูลปีปัจจุบันมาแสดงในหัวตาราง
    const currentEvalYear = getEvaluationYear ? getEvaluationYear() : new Date().getFullYear();

    // ... (Fetch Logic unchanged) ...

    // ... (Render Logic) ...

    {
        isCompareMode && (
            <div className="relative ml-2" ref={dropdownRef}>
                <button
                    onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                    className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 rounded-md px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 transition shadow-sm outline-none active:scale-95 duration-100"
                >
                    <span>เลือกปี ({selectedHistoricals.length})</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-3 h-3 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {isYearDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 flex flex-col gap-1 anim-fade-in">
                        {[2024].map(year => (
                            <label key={year} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-orange-50 rounded transition select-none">
                                <input
                                    type="checkbox"
                                    checked={selectedHistoricals.includes(year)}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedHistoricals(prev => [...prev, year].sort((a, b) => b - a));
                                        } else {
                                            setSelectedHistoricals(prev => prev.filter(y => y !== year));
                                        }
                                    }}
                                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                                />
                                <span className="text-sm text-gray-700 font-medium">{year}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // 🔥 Fetch Historical Data Logic is now in useHistoricalData hook!
    // Removed duplicate useEffect.

    // --- Fetch Employees ---
    const fetchEmployees = async () => {
        try {
            setLoading(true);

            // 1. ดึง Users ทั้งหมด
            const usersQuery = await getDocs(collection(db, 'users'));

            // 2. ดึง Evaluations ของรอบปัจจุบัน
            const currentPeriod = getCurrentPeriod ? getCurrentPeriod() : `${currentEvalYear}-Annual`;
            const evalsQuery = query(collection(db, 'evaluations'), where('period', '==', currentPeriod));
            const evalsSnapshot = await getDocs(evalsQuery);

            const scoreMap = new Map<string, any>();
            evalsSnapshot.forEach(doc => {
                const d = doc.data();
                const finalScore = d.totalScore !== undefined ? d.totalScore : d.disciplineScore;
                scoreMap.set(d.employeeDocId, finalScore);
            });

            // Build temporary evaluation set for quick lookup of "who is an evaluator"
            // Actually, we need to check 'evaluatorId' in all users to determine IS_EVALUATOR status
            // BUT, wait. A user IS an evaluator if ANYONE else has them as their evaluatorId.
            // So we need to process the whole list first.

            const allUsersData: any[] = [];
            const evaluatorIds = new Set<string>();
            const sectionSet = new Set<string>();

            usersQuery.forEach((doc) => {
                const d = doc.data();
                allUsersData.push({ id: doc.id, ...d });
                if (d.section) sectionSet.add(d.section);
                if (d.evaluatorId) evaluatorIds.add(d.evaluatorId);
            });

            setSections(Array.from(sectionSet).sort());

            const data: Employee[] = allUsersData.map(d => {
                const isEvaluator = evaluatorIds.has(d.employeeId);
                const evalScore = scoreMap.get(d.id);

                return {
                    id: d.id,
                    employeeId: d.employeeId || "",
                    firstName: d.firstName || "",
                    lastName: d.lastName || "",
                    position: d.position || "",
                    department: d.department || "",
                    section: d.section || "",
                    level: d.level || "",
                    evaluatorName: d.evaluatorName || "",
                    startDate: d.startDate,
                    isActive: d.isActive ?? true,
                    totalLateMinutes: d.totalLateMinutes || 0,
                    totalSickLeaveDays: d.totalSickLeaveDays || 0,
                    warningCount: d.warningCount || 0,
                    totalAbsentDays: d.totalAbsentDays || 0,
                    evaluationScore: evalScore !== undefined ? evalScore : null,
                    isEvaluator: isEvaluator, // Extra Field for Logic
                    pdNumber: d.pdNumber || "", // [T-030]
                    birthDate: d.birthDate || null,
                    age: d.age || 0,
                } as any;
            });

            setEmployees(data);
        } catch (error) {
            console.error("❌ Error fetching employees:", error);
        } finally {
            setLoading(false);
        }
    };

    const addTestUser = async () => {
        try {
            const docRef = await addDoc(collection(db, "users"), {
                firstName: "Test",
                lastName: "User",
                isActive: true,
                employeeId: "TEST-" + Math.floor(Math.random() * 1000)
            });
            await showAlert("สำเร็จ", `เพิ่มข้อมูลสำเร็จ! ID: ${docRef.id}`);
            fetchEmployees();
        } catch (e) {
            await showAlert("ข้อผิดพลาด", "Error: " + e);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleEditClick = (emp: Employee) => {
        setSelectedEmployee({
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            isEvaluator: emp.isEvaluator
        });
        setEditModalOpen(true);

    };

    // --- Options for SearchableSelect ---
    const sectionOptions = useMemo(() => [
        { value: 'All', label: 'ทุกสังกัด / แผนก' },
        ...availableSections.map(s => ({ value: s, label: s }))
    ], [availableSections]);

    // Use availableEmployeeOptions from hook directly
    const employeeSelectOptions = useMemo(() => {
        console.log("!!! REFRESHED EMPLOYEE OPTIONS !!!");
        return [
            { value: '', label: 'ทั้งหมด (All)' },
            ...(availableEmployeeOptions || [])
        ];
    }, [availableEmployeeOptions]);

    // 🌟 Function to Export Excel (ฟังก์ชันส่งออก Excel)
    const handleExportExcel = async () => {
        if (filteredEmployees.length === 0) {
            await showAlert("แจ้งเตือน", "ไม่พบข้อมูลพนักงานที่จะส่งออก");
            return;
        }

        const prevYear = Number(currentEvalYear) - 1;
        const prevYearPeriod = `${prevYear}-Annual`; // Assuming pattern, verify dateUtils logic?
        // Actually, let's fetch logic explicitly to be safe. 
        // We know period format is usually `${year}-Annual`.

        // Fetch Previous Year Data Map
        const prevYearMap = new Map<string, { score: number, grade: string }>();
        try {
            const evalsQuery = query(collection(db, 'evaluations'), where('period', '==', prevYearPeriod));
            const evalsSnapshot = await getDocs(evalsQuery);
            evalsSnapshot.forEach(doc => {
                const d = doc.data();
                if (d.employeeDocId) {
                    prevYearMap.set(d.employeeDocId, {
                        score: Number(d.totalScore || d.disciplineScore || 0),
                        grade: d.finalGrade || "-"
                    });
                }
            });
        } catch (err) {
            console.error("Error fetching prev year data for export:", err);
            // Non-blocking error, just continue with empty prev year data
        }

        // 1. Prepare Data Logic (เตรียมข้อมูลสำหรับ Export)
        const exportData = filteredEmployees.map((emp: any) => {
            const score = emp.evaluationScore;
            // คำนวณเกรดโดยใช้ rules ปัจจุบัน
            const gradeInfo = score !== null ? getGrade(score, gradingRules) : null;
            const prevYearData = prevYearMap.get(emp.id);

            return {
                "รหัสพนักงาน": emp.employeeId,
                "ชื่อ-นามสกุล": `${emp.firstName} ${emp.lastName}`,
                "ส่วนงาน (Section)": emp.section,
                "แผนก (Department)": emp.department,
                "ตำแหน่ง": emp.position,
                [`คะแนนปี ${currentEvalYear}`]: score !== null ? Number(score).toFixed(2) : "รอประเมิน",
                "เกรด (Grade)": gradeInfo ? gradeInfo.grade : (score !== null ? "-" : ""),

                // Added Previous Year Columns
                [`คะแนนปี ${prevYear}`]: prevYearData ? prevYearData.score.toFixed(2) : "-",
                [`เกรดปี ${prevYear}`]: prevYearData ? prevYearData.grade : "-"
            };
        });

        // 2. Create Workbook & Sheet (สร้างไฟล์ Excel)
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Adjust column width (ปรับความกว้างคอลัมน์ให้อ่านง่าย)
        const wscols = [
            { wch: 15 }, // ID
            { wch: 30 }, // Name
            { wch: 20 }, // Section
            { wch: 20 }, // Department
            { wch: 20 }, // Position
            { wch: 15 }, // Score
            { wch: 10 }, // Grade
            { wch: 15 }, // Prev Score
            { wch: 10 }  // Prev Grade
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Evaluation_Result");

        // 3. Trigger Download
        XLSX.writeFile(wb, `Employee_Evaluations_${currentEvalYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) return <div className="p-10 text-center text-blue-600">⏳ กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{UI_TEXT.MANAGE_EMPLOYEES} ({filteredEmployees.length} คน)</h1>
                    <p className="text-gray-500 text-sm mt-1">ฐานข้อมูลพนักงานและสิทธิ์การใช้งาน</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {/* 🔥 Export Button */}
                    <button
                        onClick={handleExportExcel}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-colors text-sm md:text-base whitespace-nowrap"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                        Export Excel
                    </button>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg shadow hover:bg-green-700 transition-colors text-sm md:text-base whitespace-nowrap"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                        Import Data
                    </button>
                </div>
            </div>

            {/* 👇 Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Section Filter (Moved First) */}
                <SearchableSelect
                    label="สังกัด / แผนก"
                    placeholder="เลือกสังกัด..."
                    options={sectionOptions}
                    value={filters.section}
                    onChange={(val) => {
                        setFilter('section', val);
                        setFilter('info', ""); // Reset employee search when section changes
                    }}
                    className="w-full"
                />

                {/* Search (Dependent on Section) */}

                <SearchableSelect
                    label="ค้นหาพนักงาน"
                    placeholder="ค้นหาชื่อ หรือ รหัส..."
                    options={employeeSelectOptions}
                    value={filters.info}
                    onChange={(val) => setFilter('info', val)}
                    className="w-full"
                />

                {/* Reset Button */}
                <div className="flex pb-1">
                    <button
                        onClick={() => {
                            resetFilters();
                        }}
                        className="flex items-center justify-center w-full md:w-auto gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-gray-100 border border-transparent rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors h-[50px]"
                        title="ล้างตัวกรองทั้งหมด"
                    >
                        <RotateCcw className="w-4 h-4" />
                        รีเซ็ต
                    </button>
                </div>
            </div>

            {/* Toggle Filter */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* 🔥 Compare Mode Toggle */}
                <div className="flex items-center gap-2 mr-4 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isCompareMode}
                            onChange={e => setIsCompareMode(e.target.checked)}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm font-bold text-orange-700">เปรียบเทียบปี</span>
                    </label>

                    {isCompareMode && (
                        <div className="relative ml-2" ref={dropdownRef}>
                            <button
                                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                                className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 rounded-md px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 transition shadow-sm outline-none active:scale-95 duration-100"
                            >
                                <span>เลือกปี ({selectedHistoricals.length})</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-3 h-3 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>

                            {isYearDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 flex flex-col gap-1 anim-fade-in">
                                    {[2024].map(year => (
                                        <label key={year} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-orange-50 rounded transition select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedHistoricals.includes(year)}
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setSelectedHistoricals(prev => [...prev, year].sort((a, b) => b - a));
                                                    } else {
                                                        setSelectedHistoricals(prev => prev.filter(y => y !== year));
                                                    }
                                                }}
                                                className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{year}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition select-none border ${showEvaluatorsOnly ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input
                        type="checkbox"
                        checked={showEvaluatorsOnly}
                        onChange={e => setShowEvaluatorsOnly(e.target.checked)}
                        className="hidden" // Custom UI
                    />
                    <Users className="w-5 h-5" />
                    <span>แสดงเฉพาะผู้ประเมิน</span>
                </label>
            </div>


            {/* Mobile Card View (Visible on small screens) */}
            <div className="block md:hidden space-y-4">
                {filteredEmployees.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 bg-white rounded-xl shadow-sm border border-gray-100">
                        ไม่พบข้อมูลที่ค้นหา
                    </div>
                ) : (
                    filteredEmployees.map((emp: any) => (
                        <div key={emp.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${emp.isEvaluator ? 'bg-indigo-500' : 'bg-gray-400'}`}>
                                        {emp.firstName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">
                                            {emp.firstName} {emp.lastName}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">{emp.employeeId}</div>
                                    </div>
                                </div>
                                <div>
                                    {emp.evaluationScore !== null ? (
                                        <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded-lg font-bold shadow-sm text-xs">
                                            {Number(emp.evaluationScore).toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">{UI_TEXT.WAITING}</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                <div>{emp.section}</div>
                                <div className="text-right">{emp.position}</div>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <div className="flex gap-3">
                                    <span title="มาสาย" className={emp.totalLateMinutes > 0 ? 'text-red-600 font-bold' : 'text-gray-300'}>
                                        ⏰ {emp.totalLateMinutes > 0 ? emp.totalLateMinutes : '-'}
                                    </span>
                                    <span title="ลาป่วย" className={emp.totalSickLeaveDays > 0 ? 'text-orange-600 font-bold' : 'text-gray-300'}>
                                        🤒 {emp.totalSickLeaveDays > 0 ? emp.totalSickLeaveDays : '-'}
                                    </span>
                                    <span title="ขาดงาน" className={emp.totalAbsentDays > 0 ? 'text-red-800 font-black' : 'text-gray-300'}>
                                        🚫 {emp.totalAbsentDays > 0 ? emp.totalAbsentDays : '-'}
                                    </span>
                                    <span title="ใบเตือน" className={emp.warningCount > 0 ? 'text-red-600 font-bold' : 'text-gray-300'}>
                                        ⚠️ {emp.warningCount > 0 ? emp.warningCount : '-'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleEditClick(emp)}
                                    className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full font-medium transition-colors border border-blue-200"
                                >
                                    แก้ไข
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden md:block overflow-hidden shadow-lg rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-left font-semibold text-gray-600 uppercase text-sm tracking-wider">พนักงาน</th>
                            <th className="p-4 text-left font-semibold text-gray-600 uppercase text-sm tracking-wider hidden md:table-cell">สังกัด</th>
                            <th className="p-4 text-center font-semibold text-gray-600 uppercase text-sm tracking-wider">มาสาย/ลา/ขาด</th>
                            <th className="p-4 text-center font-semibold text-gray-600 uppercase text-sm tracking-wider">ใบเตือน</th>
                            <th className="p-4 text-center font-bold text-orange-600 bg-orange-50/50 uppercase text-sm tracking-wider">
                                คะแนนปี {currentEvalYear}
                            </th>
                            {/* 🔥 Historical Columns */}
                            {/* 🔥 Historical Columns (Grade Only) */}
                            {isCompareMode && selectedHistoricals.map(year => (
                                <th key={year} className="p-4 text-center font-bold text-gray-500 bg-gray-50 uppercase text-sm tracking-wider">
                                    เกรด {year}
                                </th>
                            ))}
                            <th className="p-4 text-center font-semibold text-gray-600 uppercase text-sm tracking-wider">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredEmployees.length === 0 ? (
                            <tr><td colSpan={isCompareMode ? 8 : 6} className="p-10 text-center text-gray-400">ไม่พบข้อมูลที่ค้นหา</td></tr>
                        ) : (
                            filteredEmployees.map((emp: any) => {
                                const history = historicalData.get(emp.id);
                                return (
                                    <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${emp.isEvaluator ? 'bg-indigo-500' : 'bg-gray-400'}`}>
                                                    {emp.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                                        {emp.firstName} {emp.lastName}
                                                        {emp.isEvaluator && (
                                                            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded border border-indigo-200 font-bold uppercase tracking-wide">
                                                                Evaluator
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500 font-mono">{emp.employeeId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600 text-sm hidden md:table-cell">
                                            <div className="font-medium">{emp.section}</div>
                                            <div className="text-xs text-gray-400">{emp.position}</div>
                                        </td>

                                        <td className="p-4 text-center">
                                            <div className="text-sm space-y-1">
                                                <div title="มาสาย (นาที)" className={`${emp.totalLateMinutes > 0 ? 'text-red-600 font-bold' : 'text-gray-300'}`}>
                                                    ⏰ {emp.totalLateMinutes > 0 ? `${emp.totalLateMinutes} น.` : '-'}
                                                </div>
                                                <div title="ลาป่วย (วัน)" className={`${emp.totalSickLeaveDays > 0 ? 'text-orange-600 font-bold' : 'text-gray-300'}`}>
                                                    🤒 {emp.totalSickLeaveDays > 0 ? `${emp.totalSickLeaveDays} วัน` : '-'}
                                                </div>
                                                <div title="ขาดงาน (วัน)" className={`${emp.totalAbsentDays > 0 ? 'text-red-800 font-black' : 'text-gray-300'}`}>
                                                    🚫 {emp.totalAbsentDays > 0 ? `${emp.totalAbsentDays} วัน` : '-'}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-4 text-center">
                                            <span className={`inline-block w-8 h-8 leading-8 rounded-full text-sm font-bold ${emp.warningCount > 0 ? `${GRADE_COLORS.NI.bg} ${GRADE_COLORS.NI.text}` : `${GRADE_COLORS.NA.text} ${GRADE_COLORS.NA.bg}`}`}>
                                                {emp.warningCount > 0 ? emp.warningCount : '-'}
                                            </span>
                                        </td>

                                        {/* Evaluation Score */}
                                        <td className="p-4 text-center bg-orange-50/10">
                                            {emp.evaluationScore !== null ? (
                                                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-lg font-bold shadow-sm text-sm">
                                                    {Number(emp.evaluationScore).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className={`${GRADE_COLORS.NA.text} text-xs italic`}>{UI_TEXT.WAITING}</span>
                                            )}
                                        </td>

                                        {/* 🔥 Comparisons */}
                                        {/* 🔥 Comparisons (Grade Only) */}
                                        {isCompareMode && selectedHistoricals.map(year => {
                                            const historyMap = historicalData.get(emp.id);
                                            const hData = historyMap?.get(year);
                                            const grade = hData?.grade || "-";
                                            return (
                                                <td key={year} className="p-4 text-center bg-gray-50/50">
                                                    {grade !== "-" ? (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold text-gray-700 ${grade === 'A' ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>{grade}</span>
                                                    ) : <span className={`${GRADE_COLORS.NA.text} text-xs italic`}>-</span>}
                                                </td>
                                            );
                                        })}

                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleEditClick(emp)}
                                                className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50"
                                                title="แก้ไขข้อมูล / ตั้งรหัสผ่าน"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {
                isImportModalOpen && (
                    <ImportModal onClose={() => setIsImportModalOpen(false)} onSuccess={() => fetchEmployees()} />
                )
            }

            {
                editModalOpen && selectedEmployee && (
                    <EmployeeEditModal
                        isOpen={editModalOpen}
                        onClose={() => setEditModalOpen(false)}
                        employeeId={selectedEmployee.id}
                        employeeName={selectedEmployee.name}
                        isEvaluator={(selectedEmployee as any).isEvaluator}
                        currentYear={Number(currentEvalYear)} // Cast to number just in case
                        onSaveSuccess={() => {
                            setEditModalOpen(false);
                            fetchEmployees();
                        }}
                    />
                )
            }
        </div >
    );
}

// ... (ImpactModal kept same or removed if separating file, assuming kept below in actual file but here just replacing main)

// --- ImportModal Component ---
function ImportModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const { showAlert, showConfirm } = useModal(); // 🔥 Use Modal Hook
    const [fileType, setFileType] = useState<'users' | 'attendance' | 'leave' | 'warning' | 'score' | 'other'>('attendance');
    // [T-Fix] Default to Evaluation Year (e.g. 2025 during Jan 2026) to prevent wrong year import
    const [selectedYear, setSelectedYear] = useState<string>(String(getEvaluationYear()));
    const [selectedScoreItem, setSelectedScoreItem] = useState<string>('');
    const [scoreItems, setScoreItems] = useState<any[]>([]);

    // ...



    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [sheetName, setSheetName] = useState('');

    const [tableHeaders, setTableHeaders] = useState<any[]>([]);
    const [tableRows, setTableRows] = useState<any[][]>([]);
    const [inputKey, setInputKey] = useState(Date.now());

    // Fetch Score Items when 'score' type is selected (ดึงข้อมูลหัวข้อคะแนนเมื่อเลือกประเภท 'score')
    useEffect(() => {
        if (fileType === 'score') {
            const fetchItems = async () => {
                // Query categories sorted by order (ดึงหมวดหมู่เรียงตามลำดับ)
                const q = query(collection(db, 'evaluation_categories'), orderBy('order'));
                const snapshot = await getDocs(q);
                const items: any[] = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.questions) {
                        data.questions.forEach((q: any) => {
                            items.push({ id: q.id, title: q.title, category: data.title });
                        });
                    }
                });
                setScoreItems(items);
                if (items.length > 0) setSelectedScoreItem(items[0].id);
            };
            fetchItems();
        }
    }, [fileType]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setLoading(true);
        setTableHeaders([]);
        setTableRows([]);
        setSheetName('');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);

            let foundHeaders: any[] = [];
            let foundBody: any[][] = [];
            let foundSheetName = "";

            for (const sheet of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheet];
                const rawData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1, raw: false, defval: ""
                }) as any[][];

                let headerIndex = -1;
                for (let i = 0; i < Math.min(rawData.length, 25); i++) {
                    const rowStr = JSON.stringify(rawData[i]);
                    if (rowStr.includes("รหัส") || rowStr.includes("ชื่อ") || rowStr.includes("ลำดับ") || (fileType === 'score' && rowStr.includes("EmployeeID"))) {
                        headerIndex = i;
                        break;
                    }
                }
                if (headerIndex !== -1) {
                    foundSheetName = sheet;
                    foundHeaders = rawData[headerIndex];
                    foundBody = rawData.slice(headerIndex + 1);
                    foundBody = foundBody.filter(row => row.length > 0 && row.some(cell => cell !== "" && cell !== null));
                    break;
                }
            }

            if (foundSheetName) {
                setSheetName(foundSheetName);
                setTableHeaders(foundHeaders);
                setTableRows(foundBody);
            } else {
                await showAlert("แจ้งเตือน", "❌ ไม่พบตารางข้อมูลพนักงานในไฟล์นี้");
                setFileName('');
            }
        } catch (error) {
            console.error(error);
            await showAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการอ่านไฟล์");
            setFileName('');
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        let fileName = "";
        let url = "";

        switch (fileType) {
            case 'users':
                fileName = "DB_พนักงาน.xls";
                url = "/templates/DB_พนักงาน.xls";
                break;
            case 'attendance':
                fileName = "DB_ขาดสาย.xlsx";
                url = "/templates/DB_ขาดสาย.xlsx";
                break;
            case 'leave':
                fileName = "DB_การลา.xlsx";
                url = "/templates/DB_การลา.xlsx";
                break;
            case 'warning':
                fileName = "DB_ใบเตือน.xlsx";
                url = "/templates/DB_ใบเตือน.xlsx";
                break;
            case 'score':
                // Score template is dynamic based on category, so keep generation
                generateScoreTemplate();
                return;
            case 'other':
                generateOtherTemplate();
                return;
        }

        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const generateUserTemplate = () => {
        const templateData = [{
            "EmployeeID": "EMP-001",
            "FirstName": "John",
            "LastName": "Doe",
            "Position": "Engineer",
            "Section": "IT",
            "Department": "Tech",
            "Level": "L1",
            "StartDate": "2024-01-01",
            "EvaluatorID": "EMP-999"
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Master_Employee.xlsx");
    };

    const generateScoreTemplate = async () => {
        setLoading(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const data: any[] = [];
            usersSnapshot.forEach(doc => {
                const d = doc.data();
                if (d.isActive !== false) {
                    data.push({
                        "EmployeeID": d.employeeId || "",
                        "Name": `${d.firstName} ${d.lastName}`,
                        "Score": ""
                    });
                }
            });
            data.sort((a, b) => a.EmployeeID.localeCompare(b.EmployeeID));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Scores");
            XLSX.writeFile(wb, `Template_Score_${selectedScoreItem || 'General'}.xlsx`);
        } catch (error) {
            console.error("Error generating score template:", error);
            await showAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการสร้าง Template");
        } finally {
            setLoading(false);
        }
    };

    const generateOtherTemplate = async () => {
        setLoading(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const data: any[] = [];
            usersSnapshot.forEach(doc => {
                const d = doc.data();
                if (d.isActive !== false) {
                    data.push({
                        "รหัสพนักงาน": d.employeeId || "",
                        "ชื่อ-นามสกุล": `${d.firstName} ${d.lastName}`,
                        "AI Score": "",
                        "Project Score": "",
                        "Other Score": ""
                    });
                }
            });
            data.sort((a, b) => a["รหัสพนักงาน"].localeCompare(b["รหัสพนักงาน"]));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "OtherScores");
            XLSX.writeFile(wb, "Template_Other_Scores.xlsx");
        } catch (error) {
            console.error("Error generating other template:", error);
            await showAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการสร้าง Template");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSave = async () => {
        if (tableRows.length === 0) return;
        setLoading(true);

        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const employeeMap = new Map<string, string>();
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.employeeId) employeeMap.set(String(data.employeeId), doc.id);
            });

            // 🔥 [URGENT FIX] Pre-fetch EXISTING evaluations to ensure we update the CORRECT document
            // This prevents creating duplicate "ghost" documents if the ID pattern doesn't match
            const currentPeriod = `${selectedYear}-Annual`;
            const qEvals = query(collection(db, 'evaluations'), where('period', '==', currentPeriod));
            const evalsSnapshot = await getDocs(qEvals);
            const evalMap = new Map<string, string>(); // employeeDocId -> evaluationDocId
            evalsSnapshot.forEach(doc => {
                const d = doc.data();
                if (d.employeeDocId) evalMap.set(d.employeeDocId, doc.id);
            });

            const batch = writeBatch(db);
            let updateCount = 0;
            const headerStr = tableHeaders.map(h => String(h).trim());

            // Flexible ID Column Finder
            const empIdIndex = headerStr.findIndex(h => h.includes("รหัส") || h.toLowerCase() === "employeeid");

            if (empIdIndex === -1) {
                await showAlert("ข้อมูลไม่ครบถ้วน", "❌ ไม่พบคอลัมน์ 'รหัสพนักงาน' (EmployeeID) ในไฟล์");
                setLoading(false);
                return;
            }


            // --------------------------------------------------------------------------------
            // [T-Sync] RECALCULATION LOGIC PREPARATION
            // --------------------------------------------------------------------------------
            let scoringRules: any[] = [];
            let categories: any[] = [];
            let gradeCriteria: any[] = [];
            const needsRecalc = ['attendance', 'leave', 'warning', 'score'].includes(fileType);

            if (needsRecalc) {
                try {
                    const catsSnap = await getDocs(query(collection(db, 'evaluation_categories'), orderBy('order', 'asc')));
                    categories = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                    const formulasSnap = await getDocs(collection(db, 'scoring_formulas'));
                    scoringRules = formulasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                    const rulesSnap = await getDocs(query(collection(db, 'config_grading_rules'), orderBy('min', 'desc')));
                    gradeCriteria = rulesSnap.docs.map(d => d.data());
                } catch (err) {
                    console.warn("⚠️ Failed to pre-fetch scoring rules for auto-recalc:", err);
                }
            }

            const tryRecalculateEvaluation = async (userDocId: string, currentYear: number, newStats: any, empId: string) => {
                try {
                    const evalPeriod = `${currentYear}-Annual`;
                    let targetEvalId = evalMap.get(userDocId);
                    let evalDoc = null;
                    let evalRef = null;

                    if (targetEvalId) {
                        evalRef = doc(db, 'evaluations', targetEvalId);
                        const snap = await getDoc(evalRef);
                        if (snap.exists()) evalDoc = snap;
                    }

                    if (!evalDoc) {
                        const qEval = query(
                            collection(db, 'evaluations'),
                            where('employeeDocId', '==', userDocId),
                            where('period', '==', evalPeriod)
                        );
                        const snap = await getDocs(qEval);
                        if (!snap.empty) {
                            evalDoc = snap.docs[0];
                            evalRef = evalDoc.ref;
                        }
                    }

                    if (evalDoc && evalRef) {
                        const evalData = evalDoc.data();
                        const currentScores = evalData.scores || {};

                        const userSnap = await getDoc(doc(db, 'users', userDocId));
                        const userData = userSnap.data();

                        const fullStats = { ...newStats, year: currentYear };
                        if (fullStats.aiScore !== undefined) {
                            currentScores['[O]-1'] = fullStats.aiScore;
                        }

                        const { disciplineScore, totalScore } = calculateScores(
                            fullStats,
                            currentScores,
                            scoringRules,
                            categories,
                            userData as any
                        );

                        const newGrade = getGrade(totalScore, gradeCriteria);

                        batch.update(evalRef, {
                            disciplineScore,
                            totalScore,
                            grade: newGrade,
                            scores: currentScores,
                            updatedAt: serverTimestamp()
                        });
                        console.log(`🔄 Recalculated for ${empId}: ${totalScore} (${newGrade})`);
                    }
                } catch (e) {
                    console.error("Auto-recalc failed for", userDocId, e);
                }
            };

            if (fileType === 'users') {
                // --- Master Data Import Logic (Upsert) - Matching migrate.js ---
                // Mapping: migrate.js uses specific Thai column names. We should support them.
                const findCol = (keywords: string[]) => headerStr.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));

                const firstNameIdx = findCol(["ชื่อไทย", "FirstName", "ชื่อ"]);
                const lastNameIdx = findCol(["นามสกุลไทย", "LastName", "นามสกุล"]);
                const positionIdx = findCol(["ชื่อตำแหน่ง", "Position", "ตำแหน่ง"]);
                const sectionIdx = findCol(["ชื่อส่วน", "Section", "สังกัด"]);
                const deptIdx = findCol(["ชื่อแผนก", "Department", "แผนก"]);
                const levelIdx = findCol(["Level", "ระดับ"]);
                const startIdx = findCol(["วันที่เริ่มงาน", "StartDate", "เริ่มงาน"]);
                const evalIdIdx = findCol(["รหัสผู้ประเมิน", "EvaluatorID"]);
                const evalNameIdx = findCol(["ผู้ประเมิน", "EvaluatorName"]);
                const pdNoIdx = findCol(["PDnumber", "PDNumber"]);

                // Helper for Date Parsing (DD/MM/YYYY to Firestore Timestamp)
                const parseDate = (dateStr: any) => {
                    if (!dateStr || typeof dateStr !== 'string') return null;
                    try {
                        const parts = dateStr.trim().split('/');
                        if (parts.length !== 3) return null;

                        // Handle formatting (Thai months or numeric) - Simplified for DD/MM/YYYY
                        // Attempt standard parse first
                        // If implementing migrate.js strict month Map:
                        const MONTH_MAP: any = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
                        let day = parseInt(parts[0]);
                        let monthStr = parts[1].trim();
                        let year = parseInt(parts[2]);

                        let month = MONTH_MAP[monthStr];
                        if (month === undefined) month = parseInt(monthStr) - 1; // Try numeric month

                        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                            return Timestamp.fromDate(new Date(year, month, day));
                        }
                        return null;
                    } catch (e) { return null; }
                };

                for (const row of tableRows) {
                    const empId = String(row[empIdIndex]).trim();
                    if (!empId) continue;

                    const existingDocId = employeeMap.get(empId);

                    // Map Data
                    // [T-History] ตรวจหาคอลัมน์ผลประเมินปี 2024 (Ultra Flexible)
                    // Normalize header: remove spaces/newlines, lower case

                    // 1. Find SCORE Column (Keywords: "score", "คะแนน")
                    // Must match "2024" AND ("score" OR "คะแนน")
                    // Should NOT match "grade" or "ผล" (except "ผลคะแนน" which technically has score intent)
                    const score2024Idx = headerStr.findIndex(h => {
                        const norm = String(h).replace(/\s/g, '').toLowerCase();
                        return norm.includes("2024") && (
                            norm.includes("score") || norm.includes("คะแนน")
                        ) && !norm.includes("grade") && !norm.includes("เกรด");
                    });

                    // 2. Find GRADE Column (Keywords: "grade", "เกรด")
                    const grade2024Idx = headerStr.findIndex(h => {
                        const norm = String(h).replace(/\s/g, '').toLowerCase();
                        return norm.includes("2024") && (
                            norm.includes("grade") || norm.includes("เกรด") || norm.includes("ผล")
                        );
                    });

                    console.log("DEBUG: 2024 Import Check V3", {
                        headers: headerStr,
                        normalizedHeaders: headerStr.map(h => String(h).replace(/\s/g, '').toLowerCase()),
                        scoreIndex: score2024Idx,
                        gradeIndex: grade2024Idx
                    });

                    // 🔥 Map Data logic starts here
                    const userData: any = {
                        employeeId: empId,
                        updatedAt: serverTimestamp(),
                        role: 'user',
                        isActive: true
                    };

                    // ... (Existing mapping code) ...

                    // [T-History] Save 2024 Evaluation if found
                    // ใช้ userRef.id (ไม่ว่าจะเป็น New หรือ Existing) เพื่อผูก ID
                    const targetUserRef = existingDocId ? doc(db, 'users', existingDocId) : doc(collection(db, 'users'));
                    const targetUserId = targetUserRef.id;

                    if (score2024Idx !== -1 || grade2024Idx !== -1) {
                        let finalScore = 0;
                        let finalGrade = "";

                        // 1. Extract Score (Priority: Numeric from Score Col)
                        if (score2024Idx !== -1) {
                            const rawScore = String(row[score2024Idx]).trim();
                            const parsed = parseFloat(rawScore.replace(/,/g, ''));
                            if (!isNaN(parsed)) {
                                finalScore = parsed;
                            }
                        }

                        // 2. Extract Grade (Priority: String from Grade Col)
                        if (grade2024Idx !== -1) {
                            finalGrade = String(row[grade2024Idx]).trim();
                        } else if (finalScore === 0 && score2024Idx !== -1) {
                            // Fallback: If score col found but parsed as NaN (e.g. "A"), treat score col as Grade
                            const rawVal = String(row[score2024Idx]).trim();
                            if (isNaN(parseFloat(rawVal.replace(/,/g, ''))) && rawVal.length > 0) {
                                finalGrade = rawVal;
                            }
                        }

                        // บันทึกเมื่อมีข้อมูลอย่างใดอย่างหนึ่ง
                        if (finalScore > 0 || finalGrade) {
                            const eval2024Ref = doc(db, 'evaluations', `${targetUserId}_2024`);
                            const evalData = {
                                employeeId: empId,
                                employeeDocId: targetUserId,
                                employeeName: `${String(row[firstNameIdx] || '')} ${String(row[lastNameIdx] || '')}`.trim(),
                                department: String(row[deptIdx] || '').trim(),
                                section: String(row[sectionIdx] || '').trim(),
                                level: userData.level || String(row[levelIdx] || '').trim(),
                                totalScore: finalScore,
                                finalGrade: finalGrade,
                                evaluationYear: 2024,
                                period: "2024-Annual",
                                status: "Imported",
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            };
                            batch.set(eval2024Ref, evalData, { merge: true });
                        }
                    }

                    if (firstNameIdx !== -1) userData.firstName = String(row[firstNameIdx] || '').trim();
                    if (lastNameIdx !== -1) userData.lastName = String(row[lastNameIdx] || '').trim();
                    if (positionIdx !== -1) userData.position = String(row[positionIdx] || '').trim();
                    if (sectionIdx !== -1) userData.section = String(row[sectionIdx] || '').trim();
                    if (deptIdx !== -1) userData.department = String(row[deptIdx] || '').trim();
                    if (deptIdx !== -1) userData.department = String(row[deptIdx] || '').trim();
                    if (levelIdx !== -1) {
                        // 🔥 Level Mapping Logic
                        let rawLevel = String(row[levelIdx] || '').trim();
                        const lowerLevel = rawLevel.toLowerCase().replace(/\s/g, ''); // remove spaces for comparison

                        if (lowerLevel === 'level1') {
                            userData.level = 'Monthly Staff';
                        } else if (lowerLevel === 'level2') {
                            userData.level = 'Supervisor';
                        } else if (lowerLevel === 'level3') {
                            userData.level = 'Management';
                        } else {
                            userData.level = rawLevel; // Keep original if no match (e.g. valid values)
                        }
                    }
                    if (pdNoIdx !== -1) userData.pdNumber = String(row[pdNoIdx] || '').trim();

                    if (evalIdIdx !== -1) userData.evaluatorId = String(row[evalIdIdx] || '').trim();
                    if (evalNameIdx !== -1) userData.evaluatorName = String(row[evalNameIdx] || '').trim();

                    // 🔥 New Fields: Birthday & Age
                    const birthDateIdx = findCol(["วันเดือนปีเกิด", "BirthDate", "DOB"]);
                    const ageIdx = findCol(["อายุ", "Age"]);

                    if (birthDateIdx !== -1) {
                        const dateVal = parseDate(row[birthDateIdx]);
                        if (dateVal) userData.birthDate = dateVal;
                    }

                    if (ageIdx !== -1) {
                        const rawAge = row[ageIdx];
                        const ageNum = parseInt(String(rawAge).trim());
                        if (!isNaN(ageNum)) userData.age = ageNum;
                    }

                    if (startIdx !== -1) {
                        const dateVal = parseDate(row[startIdx]);
                        if (dateVal) userData.startDate = dateVal;
                    }

                    if (existingDocId) {
                        // UPDATE (Merge)
                        batch.set(targetUserRef, userData, { merge: true });
                    } else {
                        // CREATE (Initial Set)
                        userData.createdAt = serverTimestamp();
                        userData.password = empId; // Default password
                        batch.set(targetUserRef, userData);
                    }
                    updateCount++;
                }

            } else if (fileType === 'score') {
                if (!selectedScoreItem) { await showAlert("ข้อมูลไม่ครบถ้วน", "กรุณาเลือกหัวข้อคะแนน"); setLoading(false); return; }

                const scoreIndex = headerStr.findIndex(h => h.includes("Score") || h.includes("คะแนน"));
                if (scoreIndex === -1) { await showAlert("ข้อมูลไม่ครบถ้วน", "ไม่พบคอลัมน์ 'Score' หรือ 'คะแนน'"); setLoading(false); return; }

                // Using for..of to allow await
                for (const row of tableRows) {
                    const empId = String(row[empIdIndex]).trim();
                    const userDocId = employeeMap.get(empId);

                    if (userDocId) {
                        const rawScore = parseFloat(row[scoreIndex]);
                        if (!isNaN(rawScore)) {
                            const statsRef = doc(db, 'users', userDocId, 'yearlyStats', selectedYear);
                            let targetKey = selectedScoreItem;
                            const aiAliases = ['[O]-1', '[0]-1', 'O-1', '0-1'];
                            if (aiAliases.includes(targetKey)) {
                                targetKey = 'aiScore';
                            }

                            const updateData = {
                                [targetKey]: rawScore,
                                year: parseInt(selectedYear)
                            };

                            batch.set(statsRef, updateData, { merge: true });

                            if (targetKey === 'aiScore') {
                                batch.set(doc(db, 'users', userDocId), { aiScore: rawScore }, { merge: true });

                                // Also update any existing evaluation structure with AI Score
                                let targetEvalId = evalMap.get(userDocId) || `${userDocId}_${selectedYear}`;
                                batch.set(doc(db, 'evaluations', targetEvalId), {
                                    aiScore: rawScore,
                                    employeeDocId: userDocId,
                                    period: currentPeriod,
                                    evaluationYear: parseInt(selectedYear),
                                    updatedAt: serverTimestamp()
                                }, { merge: true });
                            }

                            // 🔥 SMART RECALCULATION
                            // We construct the stats object as best we can. 
                            // Since we only have ONE field here, we assume other stats are in DB.
                            // But 'tryRecalculateEvaluation' fetches the User Doc, but NOT the Yearly Stats doc.
                            // We should probably fetch the FULL Yearly Stats doc inside 'tryRecalculateEvaluation' 
                            // OR merge what we have.
                            // Better: 'tryRecalculateEvaluation' should fetch the LATEST stats from DB + merge our new change.

                            // Let's modify 'tryRecalculateEvaluation' slightly to fetch stats if needed.
                            // BUT wait, we are inside the 'score' block.
                            // We can just pass the updateData.
                            // BUT 'calculateScores' needs ALL stats (late, sick, absent).
                            // So 'tryRecalculateEvaluation' MUST fetch the current stats from DB.

                            // Re-implementing 'tryRecalculateEvaluation' inline or helper needs to handle this.
                            // I will fetch stats inside the helper.

                            // First, wait for the helper.
                            // Fetch existing stats for this user to combine with new update
                            const currentStatsSnap = await getDoc(statsRef);
                            const currentStats = currentStatsSnap.exists() ? currentStatsSnap.data() : {};
                            const fullStats = { ...currentStats, ...updateData };

                            await tryRecalculateEvaluation(userDocId, parseInt(selectedYear), fullStats, empId);

                            updateCount++;
                        }
                    }
                }


            } else if (fileType === 'attendance') {
                const lateIndex = headerStr.findIndex(h => h.includes("มาสาย"));
                const absentIndex = headerStr.findIndex(h => h.includes("ขาดงาน"));

                if (lateIndex === -1) { await showAlert("ข้อมูลไม่ครบถ้วน", "ไม่พบคอลัมน์ 'มาสาย'"); setLoading(false); return; }

                for (const row of tableRows) {
                    const empId = String(row[empIdIndex]).trim();
                    const docId = employeeMap.get(empId);

                    if (docId) {
                        const rawLate = row[lateIndex];
                        const minutes = parseLateTime(rawLate);

                        let absentDays = 0;
                        if (absentIndex !== -1) {
                            absentDays = parseFloat(String(row[absentIndex])) || 0;
                        }

                        const statsRef = doc(db, 'users', docId, 'yearlyStats', selectedYear);
                        const updateData = {
                            totalLateMinutes: minutes,
                            totalAbsentDays: absentDays,
                            year: parseInt(selectedYear)
                        };

                        batch.set(statsRef, updateData, { merge: true });
                        batch.set(doc(db, 'users', docId), {
                            totalLateMinutes: minutes,
                            totalAbsentDays: absentDays
                        }, { merge: true });

                        // 🔥 SMART RECALCULATION
                        const currentStatsSnap = await getDoc(statsRef);
                        const currentStats = currentStatsSnap.exists() ? currentStatsSnap.data() : {};
                        const fullStats = { ...currentStats, ...updateData };
                        await tryRecalculateEvaluation(docId, parseInt(selectedYear), fullStats, empId);

                        updateCount++;
                    }
                }

            } else if (fileType === 'leave') {
                const sickIndex = headerStr.findIndex(h => h === "ลาป่วย" || h.includes("ลาป่วย"));
                if (sickIndex === -1) { await showAlert("ข้อมูลไม่ครบถ้วน", "ไม่พบคอลัมน์ 'ลาป่วย'"); setLoading(false); return; }

                for (const row of tableRows) {
                    const empId = String(row[empIdIndex]).trim();
                    const docId = employeeMap.get(empId);

                    if (docId) {
                        const rawValue = row[sickIndex];
                        const days = parseLeaveTime(rawValue);

                        const statsRef = doc(db, 'users', docId, 'yearlyStats', selectedYear);
                        const updateData = {
                            totalSickLeaveDays: days,
                            year: parseInt(selectedYear)
                        };

                        batch.set(statsRef, updateData, { merge: true });
                        batch.set(doc(db, 'users', docId), { totalSickLeaveDays: days }, { merge: true });

                        // 🔥 SMART RECALCULATION
                        const currentStatsSnap = await getDoc(statsRef);
                        const currentStats = currentStatsSnap.exists() ? currentStatsSnap.data() : {};
                        const fullStats = { ...currentStats, ...updateData };
                        await tryRecalculateEvaluation(docId, parseInt(selectedYear), fullStats, empId);

                        updateCount++;
                    }
                }

            } else if (fileType === 'warning') {
                const warningDetails = new Map<string, any[]>();
                const missingIds: string[] = [];

                // 1. Find Column Indices
                const findIndex = (keywords: string[]) => headerStr.findIndex(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase())));

                const dateIdx = findIndex(['วันที่กระทำความผิด', 'วันที่', 'Date']);
                const ruleIdx = findIndex(['ข้อบังคับ', 'Rule']);
                const detailIdx = findIndex(['รายละเอียด', 'Detail']);

                // 2. Process Rows
                for (const row of tableRows) {
                    const empId = String(row[empIdIndex]).trim();
                    if (empId) {
                        const docId = employeeMap.get(empId);
                        if (docId) {
                            const currentList = warningDetails.get(docId) || [];

                            // Safe Value Extraction
                            const getVal = (idx: number) => idx !== -1 ? String(row[idx] || '-').trim() : '-';

                            const record = {
                                date: getVal(dateIdx),
                                rule: getVal(ruleIdx),
                                details: getVal(detailIdx)
                            };

                            currentList.push(record);
                            warningDetails.set(docId, currentList);
                        } else {
                            if (!missingIds.includes(empId)) missingIds.push(empId);
                            console.warn(`❌ Warning Import: Found ID '${empId}' in CSV but not in DB.`);
                        }
                    }
                }

                // 3. Batch Update
                for (const [docId, list] of Array.from(warningDetails)) {
                    // Find original EmpID for logging/recalc (reverse lookup or store in map?)
                    // docId is the key here. We need empId for logging.
                    // Optimization: We can just use docId since we have it.
                    const empId = String(list[0]?.empId || "UNKNOWN"); // Parsing from list? No, list doesn't have empId.
                    // But we iterate warningDetails which is keyed by docId.

                    const statsRef = doc(db, 'users', docId, 'yearlyStats', selectedYear);
                    const updateData = {
                        warningCount: list.length,
                        warnings: list, // 🔥 Save Details
                        year: parseInt(selectedYear)
                    };

                    batch.set(statsRef, updateData, { merge: true });
                    // Update Main User Doc (Optional cache)
                    batch.set(doc(db, 'users', docId), { warningCount: list.length }, { merge: true });

                    // 🔥 SMART RECALCULATION
                    const currentStatsSnap = await getDoc(statsRef);
                    const currentStats = currentStatsSnap.exists() ? currentStatsSnap.data() : {};
                    const fullStats = { ...currentStats, ...updateData };
                    await tryRecalculateEvaluation(docId, parseInt(selectedYear), fullStats, "System");

                    updateCount++;
                }

                if (missingIds.length > 0) {
                    await showAlert("แจ้งเตือน", `⚠️ พบรหัสพนักงานที่ไม่รู้จัก ${missingIds.length} รายการ: ${missingIds.slice(0, 5).join(', ')}...`);
                }

            } else if (fileType === 'other') {
                const header = tableRows.length > 0 ? tableHeaders : [];

                for (const row of tableRows) {
                    const empId = String(row[empIdIndex]).trim();
                    const userDocId = employeeMap.get(empId);

                    if (userDocId) {
                        const scoreData: any = {};

                        header.forEach((colName, idx) => {
                            const key = String(colName).trim();
                            if (key !== 'รหัสพนักงาน' && key !== 'ลำดับ' && key !== 'ชื่อ-นามสกุล' && key !== 'EmployeeID' && key !== 'Name') {
                                const val = row[idx];
                                if (val !== undefined && val !== null && val !== "") {
                                    const numVal = parseFloat(val);
                                    if (!isNaN(numVal)) {
                                        const lowerKey = key.toLowerCase();
                                        if (lowerKey.includes('ai') && lowerKey.includes('score') ||
                                            key === '[0]-1' || key === '[O]-1' || key === 'O-1' || key === '0-1') {
                                            scoreData['aiScore'] = numVal;
                                        } else {
                                            const safeKey = key.replace(/[ .]/g, '_');
                                            scoreData[safeKey] = numVal;
                                        }
                                    }
                                }
                            }
                        });

                        if (Object.keys(scoreData).length > 0) {
                            const statsRef = doc(db, 'users', userDocId, 'yearlyStats', selectedYear);
                            const updateData = {
                                ...scoreData,
                                year: parseInt(selectedYear)
                            };

                            batch.set(statsRef, updateData, { merge: true });

                            if (scoreData['aiScore'] !== undefined) {
                                batch.set(doc(db, 'users', userDocId), {
                                    aiScore: scoreData['aiScore']
                                }, { merge: true });

                                let targetEvalId = evalMap.get(userDocId) || `${userDocId}_${selectedYear}`;
                                batch.set(doc(db, 'evaluations', targetEvalId), {
                                    aiScore: scoreData['aiScore'],
                                    employeeDocId: userDocId,
                                    period: currentPeriod,
                                    evaluationYear: parseInt(selectedYear),
                                    updatedAt: serverTimestamp()
                                }, { merge: true });
                            }

                            // 🔥 SMART RECALCULATION
                            const currentStatsSnap = await getDoc(statsRef);
                            const currentStats = currentStatsSnap.exists() ? currentStatsSnap.data() : {};
                            const fullStats = { ...currentStats, ...updateData };
                            await tryRecalculateEvaluation(userDocId, parseInt(selectedYear), fullStats, empId);

                            updateCount++;
                        }
                    }
                }
            }

            if (updateCount > 0) {
                await batch.commit();
                await showAlert("สำเร็จ", `✅ บันทึกข้อมูลเรียบร้อย! (${updateCount} รายการ)`);
                onSuccess();
                onClose();
            } else {
                await showAlert("แจ้งเตือน", "⚠️ ไม่พบข้อมูลพนักงานที่ตรงกันในฐานข้อมูลเลย");
            }
        } catch (error) {
            console.error("Error saving data:", error);
            await showAlert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setTableHeaders([]); setTableRows([]); setFileName(''); setSheetName(''); setInputKey(Date.now());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white rounded-xl shadow-2xl w-full ${tableRows.length > 0 ? 'max-w-6xl' : 'max-w-lg'} overflow-hidden transition-all duration-300`}>
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-800">
                        {tableRows.length > 0 ? 'ตรวจสอบความถูกต้อง (Preview)' : 'นำเข้าข้อมูลจาก Excel'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>

                <div className="p-6">
                    {tableRows.length === 0 ? (
                        <div className="mb-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ปีงบประมาณ (Year)</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                                >
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">เลือกประเภทข้อมูล</label>
                                <select
                                    value={fileType}
                                    onChange={(e) => setFileType(e.target.value as any)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="users">0. ฐานข้อมูลพนักงาน (Master Employee Data)</option>
                                    <option value="attendance">1. ขาด/ลา/มาสาย (DB_ขาดสาย)</option>
                                    <option value="leave">2. สิทธิ์การลาคงเหลือ (DB_การลา)</option>
                                    <option value="warning">3. ใบเตือน/ความผิด (DB_ใบเตือน)</option>
                                    <option value="score">4. คะแนนประเมิน / คะแนนอื่นๆ (Evaluation / Other Scores)</option>
                                </select>
                            </div>

                            {/* Template Download Button (Visible for all types now) */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-sm font-bold text-gray-700 mb-2">📥 ดาวน์โหลดแบบฟอร์ม (Template)</p>
                                {fileType === 'score' && (
                                    <div className="mb-2">
                                        <label className="text-xs text-gray-500 block mb-1">เลือกหัวข้อคะแนน:</label>
                                        <select
                                            value={selectedScoreItem}
                                            onChange={e => setSelectedScoreItem(e.target.value)}
                                            className="w-full p-2 border rounded text-xs"
                                        >
                                            {scoreItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    [{item.id}] {item.title} ({item.category})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <button
                                    onClick={downloadTemplate}
                                    className="w-full py-2 bg-white border border-blue-300 text-blue-600 rounded hover:bg-blue-50 text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    ดาวน์โหลด Template (.xlsx)
                                </button>
                            </div>

                            {fileType === 'score' && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <label className="block text-sm font-bold text-blue-800 mb-2">🎯 นำเข้าคะแนน</label>
                                    <p className="text-xs text-blue-600 mb-2">กรุณาเลือกหัวข้อคะแนนด้านบนก่อนอัปโหลดไฟล์</p>
                                </div>
                            )}

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative group">
                                <input
                                    key={inputKey} type="file" accept=".xlsx, .xls"
                                    onChange={handleFileChange} disabled={loading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center gap-2 group-hover:scale-105 transition-transform duration-200">
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-blue-50 rounded-full text-blue-500 mb-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            </div>
                                            <p className="text-gray-700 font-medium">คลิกเพื่ออัปโหลดไฟล์ Excel</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-blue-800 font-bold">ไฟล์: {fileName}</p>
                                        <span className="text-xs bg-white px-2 py-0.5 rounded border text-gray-500">Sheet: {sheetName}</span>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200 font-bold">Year: {selectedYear}</span>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">พบข้อมูลจำนวน {tableRows.length} แถว</p>
                                    {fileType === 'score' && <p className="text-xs font-bold text-purple-600 mt-1">Target: {selectedScoreItem}</p>}
                                </div>
                                <button onClick={handleReset} className="text-xs text-red-500 hover:text-red-700 underline">ยกเลิก / เลือกใหม่</button>
                            </div>

                            <div className="border rounded-lg overflow-auto max-h-[400px]">
                                <table className="min-w-full text-xs text-left text-gray-500">
                                    <thead className="bg-gray-100 text-gray-700 uppercase sticky top-0 shadow-sm z-10">
                                        <tr>
                                            {tableHeaders.map((header, i) => (
                                                <th key={i} className="px-4 py-3 whitespace-nowrap border-b bg-gray-100 border-r last:border-r-0 min-w-[100px]">
                                                    {header || <span className="text-gray-300 italic">(ว่าง)</span>}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableRows.slice(0, 100).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b hover:bg-gray-50">
                                                {tableHeaders.map((_, colIndex) => (
                                                    <td key={colIndex} className="px-4 py-2 whitespace-nowrap truncate max-w-[200px] border-r last:border-r-0">
                                                        {row[colIndex]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={handleReset} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">ยกเลิก</button>
                                <button
                                    onClick={handleConfirmSave}
                                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? 'กำลังบันทึก...' : `ยืนยันการบันทึก (${tableRows.length})`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
