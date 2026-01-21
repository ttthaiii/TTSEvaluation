import { Timestamp } from 'firebase/firestore';

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  section: string;
  level: string;
  // 👇 แก้ตรงนี้: ให้รองรับทั้ง String (คีย์เอง) และ Timestamp (ระบบเลือก)
  startDate: string | Timestamp | null;
  isActive: boolean;
  evaluatorId?: string;
  evaluatorName?: string;
  pdNumber?: string;
  isEvaluator?: boolean; // Added for UI logic
  birthDate?: string | Timestamp | null; // Added field
  age?: number; // Added field
  aiScore?: number; // 🔥 Added for Dashboard fallback
  warnings?: WarningRecord[]; // 🔥 Added for Warning Letter feature (บันทึกรายการใบเตือน)
}

// 🔥 Struct for Warning Record (โครงสร้างข้อมูลใบเตือน)
export interface WarningRecord {
  date: string; // วันที่กระทำความผิด
  rule: string; // ข้อบังคับการทำงาน
  details: string; // รายละเอียดการกระทำความผิด
}