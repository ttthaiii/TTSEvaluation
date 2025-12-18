import * as XLSX from 'xlsx';
import { LateAbsentRow, LeaveRow, WarningRow } from '@/types/import-data';

// ฟังก์ชันหลักสำหรับการอ่านไฟล์
export const parseExcelFile = async (file: File, type: 'attendance' | 'leave' | 'warning') => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  let jsonData: any[] = [];

  // กำหนด Logic การอ่านตามประเภทไฟล์
  if (type === 'attendance') {
    // DB_ขาดสาย: Header อยู่แถวที่ 2 (index 1) เพราะแถวแรกเป็นตัวเลข 1,2,3... 
    jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1 }); 
  } else {
    // DB_การลา [cite: 2] และ DB_ใบเตือน[cite: 3]: Header อยู่แถวแรกปกติ
    jsonData = XLSX.utils.sheet_to_json(worksheet);
  }

  return jsonData;
};

// ฟังก์ชันตรวจสอบความถูกต้อง (Validation) เบื้องต้น
export const validateData = (data: any[], type: 'attendance' | 'leave' | 'warning') => {
  if (data.length === 0) return false;

  const firstRow = data[0];
  
  // เช็ค Key สำคัญว่ามีอยู่จริงไหม เพื่อป้องกัน HR อัปโหลดผิดไฟล์
  if (type === 'attendance' && !('รหัสพนักงาน' in firstRow)) return false;
  if (type === 'leave' && !('ลาพักร้อน' in firstRow)) return false;
  if (type === 'warning' && !('รายละเอียดความผิด' in firstRow)) return false;

  return true;
};