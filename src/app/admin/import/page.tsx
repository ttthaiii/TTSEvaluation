'use client';

import { useState } from 'react';
import { parseExcelFile, validateData } from '@/utils/excelParser';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useModal } from '../../../context/ModalContext';
import { LateAbsentRow, LeaveRow, WarningRow, OtherScoreRow } from '@/types/import-data';

export default function ImportPage() {
  const { showAlert } = useModal();
  const [fileType, setFileType] = useState<'attendance' | 'leave' | 'warning' | 'other'>('attendance');
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const parseTimeStr = (str?: string): number => {
    if (!str) return 0;
    // Format "HH:mm" or "H:mm"
    const parts = str.split(':');
    if (parts.length >= 2) {
      return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
    }
    return 0;
  };

  const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    return 0;
  };

  const processAndSaveData = async (rawData: any[], type: typeof fileType) => {
    // 1. Fetch All Users to Map EmployeeID -> DocID
    const usersRef = collection(db, 'users');
    const userSnap = await getDocs(usersRef);
    const empMap = new Map<string, string>(); // employeeId -> docId

    userSnap.forEach(doc => {
      const d = doc.data();
      if (d.employeeId) empMap.set(d.employeeId, doc.id);
    });

    console.log(`Found ${empMap.size} users in DB`);

    // 2. Prepare Data for Batch Update
    const updates = new Map<string, any>(); // docId -> { data to merge }

    if (type === 'attendance') {
      (rawData as LateAbsentRow[]).forEach(row => {
        const eid = row['รหัสพนักงาน'];
        const uid = empMap.get(eid);
        if (uid) {
          const lateMins = parseTimeStr(row['มาสาย\n ชม:นาที']);
          const absentDays = cleanNumber(row['ขาดงาน\n วัน']);

          updates.set(uid, {
            totalLateMinutes: lateMins,
            totalAbsentDays: absentDays
          });
        }
      });
    } else if (type === 'leave') {
      (rawData as LeaveRow[]).forEach(row => {
        const eid = row['รหัส']; // Note: Leave file uses 'รหัส'
        const uid = empMap.get(eid);
        if (uid) {
          const sickDays = cleanNumber(row['ลาป่วย']);
          const sickNoPay = cleanNumber(row['ลาป่วย(ไม่รับค่าจ้าง)']);
          // Combine or just use 'ลาป่วย'? Usually 'totalSickLeaveDays' implies paid+unpaid or just paid?
          // Using just 'ลาป่วย' based on field name match.

          updates.set(uid, {
            totalSickLeaveDays: sickDays + sickNoPay
          });
        }
      });
    } else if (type === 'warning') {
      // Warning is a list of incidents. We need to COUNT them per employee.
      const warningCounts = new Map<string, number>();

      (rawData as WarningRow[]).forEach(row => {
        const eid = row['รหัสพนักงาน'];
        const uid = empMap.get(eid);
        if (uid) {
          const current = warningCounts.get(uid) || 0;
          warningCounts.set(uid, current + 1);
        }
      });

      warningCounts.forEach((count, uid) => {
        updates.set(uid, { warningCount: count });
      });
    } else if (type === 'other') {
      // Other Scores: Map all numeric columns (except keys) to yearlyStats
      (rawData as OtherScoreRow[]).forEach(row => {
        const eid = row['รหัสพนักงาน'];
        const uid = empMap.get(eid);
        if (uid) {
          const scoreData: any = {};
          Object.keys(row).forEach(key => {
            if (key !== 'รหัสพนักงาน' && key !== 'ลำดับ' && key !== 'ชื่อ-นามสกุล') {
              // Assume it's a score if it's numeric or convertible
              const val = row[key];
              if (!isNaN(Number(val))) {
                // Map specific known keys or keep raw?
                // Request said: "Import other scores... stored in yearlyStats"
                // If the key is "AI Score", map to aiScore
                if (key.toLowerCase().includes('ai')) {
                  scoreData['aiScore'] = Number(val);
                } else {
                  // Clean key for Firestore (no spaces, special chars ideally)
                  const safeKey = key.replace(/[ .]/g, '_');
                  scoreData[safeKey] = Number(val);
                }
              }
            }
          });
          if (Object.keys(scoreData).length > 0) {
            updates.set(uid, scoreData);
          }
        }
      });
    }

    // 3. Execute Batch Write (Chunked 500)
    const updateList = Array.from(updates.entries());
    const totalUpdates = updateList.length;
    let processed = 0;

    while (processed < totalUpdates) {
      const batch = writeBatch(db);
      const chunk = updateList.slice(processed, processed + 500);

      chunk.forEach(([uid, data]) => {
        const statsRef = doc(db, 'users', uid, 'yearlyStats', String(currentYear));
        const mainRef = doc(db, 'users', uid); // Also update main doc for quick access

        // Merge with existing stats
        batch.set(statsRef, { ...data, year: currentYear }, { merge: true });

        // Update main user doc as well (as cache)
        batch.update(mainRef, data);
      });

      await batch.commit();
      processed += chunk.length;
    }

    return totalUpdates;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // 1. แปลงไฟล์ Excel เป็น JSON
      const rawData = await parseExcelFile(file, fileType);

      // 2. ตรวจสอบว่าไฟล์ถูกประเภทไหม
      const isValid = validateData(rawData, fileType);

      if (!isValid) {
        await showAlert("ข้อมูลไม่ถูกต้อง", 'รูปแบบไฟล์ไม่ถูกต้อง หรือคอลัมน์ไม่ครบถ้วน กรุณาตรวจสอบ Template');
        setLoading(false);
        e.target.value = ''; // Reset input
        return;
      }

      console.log(`Parsed ${fileType} data:`, rawData.length, 'rows');

      // 3. บันทึกลง Firestore
      const count = await processAndSaveData(rawData, fileType);

      await showAlert("สำเร็จ", `นำเข้าข้อมูลสำเร็จ ${count} รายการ (Updated YearlyStats ${currentYear})`);

    } catch (error) {
      console.error(error);
      await showAlert("ข้อผิดพลาด", 'เกิดข้อผิดพลาดในการอ่านไฟล์หรือบันทึกข้อมูล: ' + error);
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const getTemplateName = () => {
    switch (fileType) {
      case 'attendance': return 'DB_ขาดสาย.xlsx';
      case 'leave': return 'DB_การลา.xlsx';
      case 'warning': return 'DB_ใบเตือน.xlsx';
      case 'other': return 'Template_อื่นๆ.xlsx';
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">นำเข้าข้อมูลพนักงาน (Import Data)</h1>

      <div className="bg-white p-6 rounded-lg shadow-md border">

        {/* เลือกปี (Optional but good for yearlyStats) */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">ปีประเมิน (Year)</label>
          <input
            type="number"
            value={currentYear}
            onChange={(e) => setCurrentYear(Number(e.target.value))}
            className="w-32 p-2 border rounded font-bold"
          />
        </div>

        {/* เลือกประเภทไฟล์ */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">เลือกประเภทข้อมูลที่ต้องการนำเข้า</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value as any)}
            className="w-full p-2 border rounded"
          >
            <option value="attendance">1. ข้อมูลการขาด/ลา/มาสาย (DB_ขาดสาย)</option>
            <option value="leave">2. ข้อมูลสิทธิ์การลาคงเหลือ (DB_การลา)</option>
            <option value="warning">3. ประวัติการทำผิด/ใบเตือน (DB_ใบเตือน)</option>
            <option value="other">4. คะแนนส่วนอื่นๆ (Other Scores)</option>
          </select>
        </div>

        {/* ปุ่มดาวน์โหลด Template (ถ้าต้องการให้ HR โหลด) */}
        <div className="mb-6 p-4 bg-gray-50 rounded border border-dashed">
          <p className="text-sm text-gray-600 mb-2">
            *กรุณาใช้ไฟล์ Template <b>{getTemplateName()}</b> เท่านั้น
            <br /> หัวตารางต้องตรงตามต้นฉบับ ห้ามแก้ไขชื่อคอลัมน์
            {fileType === 'other' && <span className="block text-blue-600 mt-1">สำหรับคะแนนอื่นๆ: ต้องมีคอลัมน์ "รหัสพนักงาน" ส่วนคอลัมน์อื่นจะเป็นชื่อคะแนน</span>}
          </p>
          <button className="text-blue-600 text-sm hover:underline" onClick={async () => await showAlert("แจ้งเตือน", 'ฟังก์ชันดาวน์โหลด Template (คุณสามารถใส่ลิงก์ไฟล์จริงที่นี่)')}>
            ดาวน์โหลด Template: {getTemplateName()}
          </button>
        </div>

        {/* Input อัปโหลด */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">เลือกไฟล์ Excel (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={loading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {loading && <p className="text-blue-600 animate-pulse">กำลังประมวลผล... กรุณารอสักครู่ ({loading})</p>}
      </div>
    </div>
  );
}