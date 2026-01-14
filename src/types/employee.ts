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
}