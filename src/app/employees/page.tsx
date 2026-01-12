'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, doc, writeBatch, serverTimestamp, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Employee } from '../../types/employee';
import * as XLSX from 'xlsx';
// 👇 1. เพิ่ม Import เพื่อหาปีประเมินปัจจุบัน
import { getCurrentPeriod, getEvaluationYear } from '../../utils/dateUtils';

// --- 1. Helper Functions ---
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
        const totalDays = days + (hours / 24) + (minutes / 1440);
        return Math.round(totalDays * 100) / 100;
    }
    return parseFloat(str) || 0;
};

import { Search, Filter, Lock, Edit2, Users } from 'lucide-react';
import EmployeeEditModal from '@/components/admin/EmployeeEditModal';

// ... (keep previous Helper Functions)

export default function EmployeeListPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // 👇 State for Filtering & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSection, setSelectedSection] = useState('All');
    const [showEvaluatorsOnly, setShowEvaluatorsOnly] = useState(false);
    const [sections, setSections] = useState<string[]>([]);

    // 👇 State for Edit Modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string, name: string } | null>(null);

    // ดึงปีปัจจุบันมาแสดงในหัวตาราง
    const currentEvalYear = getEvaluationYear ? getEvaluationYear() : new Date().getFullYear();

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
                    isEvaluator: isEvaluator // Extra Field for Logic
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
            alert(`เพิ่มข้อมูลสำเร็จ! ID: ${docRef.id}`);
            fetchEmployees();
        } catch (e) {
            alert("Error: " + e);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleEditClick = (emp: Employee) => {
        setSelectedEmployee({ id: emp.id, name: `${emp.firstName} ${emp.lastName}` });
        setEditModalOpen(true);
    };

    // --- Filtering Logic ---
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch =
            emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSection = selectedSection === 'All' || emp.section === selectedSection;

        const matchesEvaluator = showEvaluatorsOnly ? (emp as any).isEvaluator : true;

        return matchesSearch && matchesSection && matchesEvaluator;
    });

    if (loading) return <div className="p-10 text-center text-blue-600">⏳ กำลังโหลดข้อมูล...</div>;

    return (
        <div className="p-10 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">จัดการพนักงาน ({filteredEmployees.length} คน)</h1>
                    <p className="text-gray-500 text-sm mt-1">ฐานข้อมูลพนักงานและสิทธิ์การใช้งาน</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg shadow hover:bg-green-700 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                        นำเข้าข้อมูล (Excel)
                    </button>
                    {/* <button onClick={addTestUser} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow transition-colors">
                        + ทดสอบ
                    </button> */}
                </div>
            </div>

            {/* 👇 Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    {/* Section Filter */}
                    <div className="w-full md:w-48">
                        <select
                            value={selectedSection}
                            onChange={e => setSelectedSection(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="All">ทุกสังกัด / แผนก</option>
                            {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select>
                    </div>
                </div>

                {/* Toggle Filter */}
                <div className="flex items-center gap-2">
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition select-none border ${showEvaluatorsOnly ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <input
                            type="checkbox"
                            checked={showEvaluatorsOnly}
                            onChange={e => setShowEvaluatorsOnly(e.target.checked)}
                            className="hidden" // Custom UI
                        />
                        <Users className="w-5 h-5" />
                        <span>แสดงเฉพาะรายชื่อผู้ประเมิน</span>
                    </label>
                </div>
            </div>

            {/* ตารางแสดงผล */}
            <div className="overflow-hidden shadow-lg rounded-xl border border-gray-200 bg-white">
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
                            <th className="p-4 text-center font-semibold text-gray-600 uppercase text-sm tracking-wider">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredEmployees.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400">ไม่พบข้อมูลที่ค้นหา</td></tr>
                        ) : (
                            filteredEmployees.map((emp: any) => (
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
                                        <span className={`inline-block w-8 h-8 leading-8 rounded-full text-sm font-bold ${emp.warningCount > 0 ? 'bg-red-100 text-red-700' : 'text-gray-300 bg-gray-50'}`}>
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
                                            <span className="text-gray-300 text-xs italic">รอประเมิน</span>
                                        )}
                                    </td>

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
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isImportModalOpen && (
                <ImportModal onClose={() => setIsImportModalOpen(false)} onSuccess={() => fetchEmployees()} />
            )}

            {editModalOpen && selectedEmployee && (
                <EmployeeEditModal
                    isOpen={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    employeeId={selectedEmployee.id}
                    employeeName={selectedEmployee.name}
                    currentYear={Number(currentEvalYear)} // Cast to number just in case
                    onSaveSuccess={() => {
                        setEditModalOpen(false);
                        fetchEmployees();
                    }}
                />
            )}
        </div>
    );
}

// ... (ImpactModal kept same or removed if separating file, assuming kept below in actual file but here just replacing main)

// --- ImportModal Component ---
function ImportModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [fileType, setFileType] = useState<'users' | 'attendance' | 'leave' | 'warning' | 'score'>('attendance');
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [selectedScoreItem, setSelectedScoreItem] = useState<string>('');
    const [scoreItems, setScoreItems] = useState<any[]>([]);

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
                alert("❌ ไม่พบตารางข้อมูลพนักงานในไฟล์นี้");
                setFileName('');
            }
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
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
            alert("เกิดข้อผิดพลาดในการสร้าง Template");
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

            const batch = writeBatch(db);
            let updateCount = 0;
            const headerStr = tableHeaders.map(h => String(h).trim());

            // Flexible ID Column Finder
            const empIdIndex = headerStr.findIndex(h => h.includes("รหัส") || h.toLowerCase() === "employeeid");

            if (empIdIndex === -1) {
                alert("❌ ไม่พบคอลัมน์ 'รหัสพนักงาน' (EmployeeID) ในไฟล์");
                setLoading(false);
                return;
            }

            if (fileType === 'users') {
                // --- Master Data Import Logic (Upsert) - Matching migrate.js ---
                // Mapping: migrate.js uses specific Thai column names. We should support them.
                const findCol = (keywords: string[]) => headerStr.findIndex(h => keywords.some(k => h.includes(k) || h === k));

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
                    const userData: any = {
                        employeeId: empId,
                        updatedAt: serverTimestamp(),
                        // Default Role if new
                        role: 'user',
                        isActive: true
                    };

                    if (firstNameIdx !== -1) userData.firstName = String(row[firstNameIdx] || '').trim();
                    if (lastNameIdx !== -1) userData.lastName = String(row[lastNameIdx] || '').trim();
                    if (positionIdx !== -1) userData.position = String(row[positionIdx] || '').trim();
                    if (sectionIdx !== -1) userData.section = String(row[sectionIdx] || '').trim();
                    if (deptIdx !== -1) userData.department = String(row[deptIdx] || '').trim();
                    if (levelIdx !== -1) userData.level = String(row[levelIdx] || '').trim();
                    if (pdNoIdx !== -1) userData.pdNumber = String(row[pdNoIdx] || '').trim();

                    if (evalIdIdx !== -1) userData.evaluatorId = String(row[evalIdIdx] || '').trim();
                    if (evalNameIdx !== -1) userData.evaluatorName = String(row[evalNameIdx] || '').trim();

                    if (startIdx !== -1) {
                        const dateVal = parseDate(row[startIdx]);
                        if (dateVal) userData.startDate = dateVal;
                    }

                    if (existingDocId) {
                        // UPDATE
                        const userRef = doc(db, 'users', existingDocId);
                        batch.set(userRef, userData, { merge: true }); // Use merge for safety
                    } else {
                        // CREATE
                        const newRef = doc(collection(db, 'users'));
                        userData.createdAt = serverTimestamp();
                        userData.password = empId; // Default password
                        batch.set(newRef, userData);
                    }
                    updateCount++;
                }

            } else if (fileType === 'score') {
                if (!selectedScoreItem) { alert("กรุณาเลือกหัวข้อคะแนน"); setLoading(false); return; }

                const scoreIndex = headerStr.findIndex(h => h.includes("Score") || h.includes("คะแนน"));
                if (scoreIndex === -1) { alert("ไม่พบคอลัมน์ 'Score' หรือ 'คะแนน'"); setLoading(false); return; }

                const currentPeriod = getCurrentPeriod ? getCurrentPeriod() : `${selectedYear}-Annual`;

                // Loop through each row in Excel and save (วนลูปบันทึกข้อมูลทีละแถว)
                for (const row of tableRows) {
                    const empId = String(row[empIdIndex]).trim();
                    const userDocId = employeeMap.get(empId);

                    if (userDocId) {
                        const rawScore = parseFloat(row[scoreIndex]);
                        if (!isNaN(rawScore)) {
                            // Find Evaluation Doc (ค้นหาเอกสารการประเมินที่มีอยู่)
                            const evalsQuery = query(
                                collection(db, 'evaluations'),
                                where('employeeDocId', '==', userDocId),
                                where('period', '==', currentPeriod)
                            );
                            const evalSnaps = await getDocs(evalsQuery);

                            let evalRef;
                            if (evalSnaps.empty) {
                                // Create new if not exists
                                evalRef = doc(collection(db, 'evaluations'));
                                batch.set(evalRef, {
                                    employeeDocId: userDocId,
                                    period: currentPeriod,
                                    scores: { [selectedScoreItem]: rawScore },
                                    createdAt: serverTimestamp(),
                                    updatedAt: serverTimestamp()
                                });
                            } else {
                                // Update existing
                                evalRef = evalSnaps.docs[0].ref;
                                batch.update(evalRef, {
                                    [`scores.${selectedScoreItem}`]: rawScore,
                                    updatedAt: serverTimestamp()
                                });
                            }
                            updateCount++;
                        }
                    }
                }

            } else if (fileType === 'attendance') {
                const lateIndex = headerStr.findIndex(h => h.includes("มาสาย"));
                const absentIndex = headerStr.findIndex(h => h.includes("ขาดงาน"));

                if (lateIndex === -1) { alert("ไม่พบคอลัมน์ 'มาสาย'"); setLoading(false); return; }

                tableRows.forEach(row => {
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
                        batch.set(statsRef, {
                            totalLateMinutes: minutes,
                            totalAbsentDays: absentDays,
                            year: parseInt(selectedYear)
                        }, { merge: true });

                        // Always sync to main doc for list view consistency
                        batch.set(doc(db, 'users', docId), {
                            totalLateMinutes: minutes,
                            totalAbsentDays: absentDays
                        }, { merge: true });
                        updateCount++;
                    }
                });

            } else if (fileType === 'leave') {
                const sickIndex = headerStr.findIndex(h => h === "ลาป่วย" || h.includes("ลาป่วย"));
                if (sickIndex === -1) { alert("ไม่พบคอลัมน์ 'ลาป่วย'"); setLoading(false); return; }

                tableRows.forEach(row => {
                    const empId = String(row[empIdIndex]).trim();
                    const docId = employeeMap.get(empId);

                    if (docId) {
                        const rawValue = row[sickIndex];
                        const days = parseLeaveTime(rawValue);

                        const statsRef = doc(db, 'users', docId, 'yearlyStats', selectedYear);
                        batch.set(statsRef, {
                            totalSickLeaveDays: days,
                            year: parseInt(selectedYear)
                        }, { merge: true });

                        // Always sync to main doc
                        batch.set(doc(db, 'users', docId), { totalSickLeaveDays: days }, { merge: true });
                        updateCount++;
                    }
                });

            } else if (fileType === 'warning') {
                const warningCounts = new Map<string, number>();
                tableRows.forEach(row => {
                    const empId = String(row[empIdIndex]).trim();
                    if (empId) {
                        const currentCount = warningCounts.get(empId) || 0;
                        warningCounts.set(empId, currentCount + 1);
                    }
                });

                warningCounts.forEach((count, empId) => {
                    const docId = employeeMap.get(empId);
                    if (docId) {
                        const statsRef = doc(db, 'users', docId, 'yearlyStats', selectedYear);
                        batch.set(statsRef, {
                            warningCount: count,
                            year: parseInt(selectedYear)
                        }, { merge: true });

                        // Always sync to main doc
                        batch.set(doc(db, 'users', docId), { warningCount: count }, { merge: true });
                        updateCount++;
                    }
                });
            }

            if (updateCount > 0) {
                await batch.commit();
                alert(`✅ บันทึกข้อมูลเรียบร้อย! (${updateCount} รายการ)`);
                onSuccess();
                onClose();
            } else {
                alert("⚠️ ไม่พบข้อมูลพนักงานที่ตรงกันในฐานข้อมูลเลย");
            }
        } catch (error) {
            console.error("Error saving data:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setTableHeaders([]); setTableRows([]); setFileName(''); setSheetName(''); setInputKey(Date.now());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
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
                                    <option value="score">4. คะแนนประเมินรายหัวข้อ (Evaluation Score)</option>
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
