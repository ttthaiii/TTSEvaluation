'use client';

import { useState } from 'react';
import { parseExcelFile, validateData } from '@/utils/excelParser';
import { Timestamp } from 'firebase/firestore';
import { useModal } from '../../../context/ModalContext'; // 🔥
// import { saveToFirebase } from '@/lib/firebase'; // (สมมติว่าคุณมีฟังก์ชันบันทึก)

export default function ImportPage() {
  const { showAlert } = useModal(); // 🔥
  const [fileType, setFileType] = useState<'attendance' | 'leave' | 'warning'>('attendance');
  const [loading, setLoading] = useState(false);

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
        await showAlert("ข้อมูลไม่ถูกต้อง", 'รูปแบบไฟล์ไม่ถูกต้อง หรืออัปโหลดผิดประเภทไฟล์ กรุณาตรวจสอบ Template');
        setLoading(false);
        return;
      }

      console.log(`Parsed ${fileType} data:`, rawData);

      // 3. (ขั้นตอนต่อไป) วนลูป rawData เพื่อบันทึกลง Firestore
      // ตัวอย่าง: processAndSaveData(rawData, fileType);

      await showAlert("สำเร็จ", `อ่านข้อมูลสำเร็จจำนวน ${rawData.length} รายการ (ดูใน Console)`);

    } catch (error) {
      console.error(error);
      await showAlert("ข้อผิดพลาด", 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    } finally {
      setLoading(false);
    }
  };

  const getTemplateName = () => {
    switch (fileType) {
      case 'attendance': return 'DB_ขาดสาย.xlsx';
      case 'leave': return 'DB_การลา.xlsx';
      case 'warning': return 'DB_ใบเตือน.xlsx';
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">นำเข้าข้อมูลพนักงาน (Import Data)</h1>

      <div className="bg-white p-6 rounded-lg shadow-md border">

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
          </select>
        </div>

        {/* ปุ่มดาวน์โหลด Template (ถ้าต้องการให้ HR โหลด) */}
        <div className="mb-6 p-4 bg-gray-50 rounded border border-dashed">
          <p className="text-sm text-gray-600 mb-2">
            *กรุณาใช้ไฟล์ Template <b>{getTemplateName()}</b> เท่านั้น
            <br /> หัวตารางต้องตรงตามต้นฉบับ ห้ามแก้ไขชื่อคอลัมน์
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

        {loading && <p className="text-blue-600">กำลังประมวลผล...</p>}
      </div>
    </div>
  );
}