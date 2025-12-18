'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, writeBatch, doc, query, where } from 'firebase/firestore'; 
import { db } from '../../lib/firebase';
import { Employee } from '../../types/employee';
import * as XLSX from 'xlsx';

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

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // --- Fetch Employees ---
  const fetchEmployees = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const data: Employee[] = [];
      querySnapshot.forEach((doc) => {
        const d = doc.data();
        data.push({
          id: doc.id,
          employeeId: d.employeeId || "",
          firstName: d.firstName || "",
          lastName: d.lastName || "",
          position: d.position || "",
          department: d.department || "",
          section: d.section || "",
          level: d.level || "",
          startDate: d.startDate,
          isActive: d.isActive ?? true,
          // ดึง Snapshot ปัจจุบันมาแสดง
          totalLateMinutes: d.totalLateMinutes || 0,
          totalSickLeaveDays: d.totalSickLeaveDays || 0,
          warningCount: d.warningCount || 0,
          totalAbsentDays: d.totalAbsentDays || 0,
        } as any);
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

  if (loading) return <div className="p-10 text-center text-blue-600">⏳ กำลังโหลดข้อมูล...</div>;

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">รายชื่อพนักงาน ({employees.length})</h1>
            <p className="text-gray-500 text-sm mt-1">จัดการฐานข้อมูลพนักงานทั้งหมด</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded shadow hover:bg-green-700 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                นำเข้าข้อมูล (Excel)
            </button>
            <button onClick={addTestUser} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow transition-colors">
            + ทดสอบเพิ่มข้อมูล
            </button>
        </div>
      </div>
      
      {/* ตารางแสดงผล */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b p-4 text-left font-semibold text-gray-600">รหัส</th>
              <th className="border-b p-4 text-left font-semibold text-gray-600">ชื่อ-นามสกุล</th>
              <th className="border-b p-4 text-left font-semibold text-gray-600">มาสาย (นาที)</th>
              <th className="border-b p-4 text-left font-semibold text-gray-600">ลาป่วย (วัน)</th>
              <th className="border-b p-4 text-left font-semibold text-gray-600">ขาดงาน (วัน)</th>
              <th className="border-b p-4 text-left font-semibold text-gray-600">ใบเตือน</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
               <tr><td colSpan={6} className="p-10 text-center text-gray-500">ไม่พบข้อมูลพนักงาน</td></tr>
            ) : (
              employees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border-b p-4 text-gray-700">{emp.employeeId}</td>
                  <td className="border-b p-4 text-gray-700">{emp.firstName} {emp.lastName}</td>
                  
                  <td className={`border-b p-4 font-mono ${emp.totalLateMinutes > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {emp.totalLateMinutes > 0 ? emp.totalLateMinutes : '-'}
                  </td>
                  <td className={`border-b p-4 font-mono ${emp.totalSickLeaveDays > 0 ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
                    {emp.totalSickLeaveDays > 0 ? emp.totalSickLeaveDays : '-'}
                  </td>
                  {/* เพิ่มคอลัมน์ขาดงาน */}
                   <td className={`border-b p-4 font-mono ${emp.totalAbsentDays > 0 ? 'text-red-800 font-bold' : 'text-gray-400'}`}>
                    {emp.totalAbsentDays > 0 ? emp.totalAbsentDays : '-'}
                  </td>
                  <td className={`border-b p-4 font-mono ${emp.warningCount > 0 ? 'text-red-700 font-bold' : 'text-gray-400'}`}>
                    {emp.warningCount > 0 ? emp.warningCount : '-'}
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
    </div>
  );
}

// --- ImportModal Component ---
function ImportModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [fileType, setFileType] = useState<'attendance' | 'leave' | 'warning'>('attendance');
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [sheetName, setSheetName] = useState('');
    
    const [tableHeaders, setTableHeaders] = useState<any[]>([]);
    const [tableRows, setTableRows] = useState<any[][]>([]);
    const [inputKey, setInputKey] = useState(Date.now()); 

    const getTemplateInfo = () => {
        switch(fileType) {
            case 'attendance': return { name: 'DB_ขาดสาย.xlsx', path: '/templates/DB_ขาดสาย.xlsx' };
            case 'leave': return { name: 'DB_การลา.xlsx', path: '/templates/DB_การลา.xlsx' };
            case 'warning': return { name: 'DB_ใบเตือน.xlsx', path: '/templates/DB_ใบเตือน.xlsx' };
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (Logic เดิม ไม่ต้องแก้) ...
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
                    if (rowStr.includes("รหัส") || rowStr.includes("ชื่อ") || rowStr.includes("ลำดับ")) {
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

    // --- Logic การบันทึก (ฉบับสมบูรณ์) ---
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
            const empIdIndex = headerStr.findIndex(h => h.includes("รหัส")); 

            if (empIdIndex === -1) {
                alert("❌ ไม่พบคอลัมน์ 'รหัสพนักงาน' ในไฟล์");
                setLoading(false);
                return;
            }

            // --- 1. DB_ขาดสาย (มาสาย + ขาดงาน) ---
            if (fileType === 'attendance') {
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

                        // A. ลง Yearly Stats
                        const statsRef = doc(db, 'users', docId, 'yearlyStats', selectedYear);
                        batch.set(statsRef, { 
                            totalLateMinutes: minutes,
                            totalAbsentDays: absentDays,
                            year: parseInt(selectedYear) 
                        }, { merge: true });

                        // B. ลง Snapshot ที่ User Root (เฉพาะถ้าเป็นปีปัจจุบัน)
                        if (selectedYear === String(new Date().getFullYear())) {
                            batch.set(doc(db, 'users', docId), {
                                totalLateMinutes: minutes,
                                totalAbsentDays: absentDays
                            }, { merge: true });
                        }
                        updateCount++;
                    }
                });

            // --- 2. DB_การลา (ลาป่วย) ---
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

                        if (selectedYear === String(new Date().getFullYear())) {
                             batch.set(doc(db, 'users', docId), { totalSickLeaveDays: days }, { merge: true });
                        }
                        updateCount++;
                    }
                });

            // --- 3. DB_ใบเตือน ---
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

                        if (selectedYear === String(new Date().getFullYear())) {
                             batch.set(doc(db, 'users', docId), { warningCount: count }, { merge: true });
                        }
                        updateCount++;
                    }
                });
            }

            if (updateCount > 0) {
                await batch.commit();
                alert(`✅ บันทึกข้อมูลประจำปี ${selectedYear} สำเร็จ! (${updateCount} รายการ)`);
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
                                    <option value="attendance">1. ขาด/ลา/มาสาย (DB_ขาดสาย)</option>
                                    <option value="leave">2. สิทธิ์การลาคงเหลือ (DB_การลา)</option>
                                    <option value="warning">3. ใบเตือน/ความผิด (DB_ใบเตือน)</option>
                                </select>
                            </div>
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