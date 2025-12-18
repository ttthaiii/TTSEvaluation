// src/utils/dateUtils.ts
import { Timestamp } from 'firebase/firestore';

export const calculateServiceTenure = (startDate: string | Timestamp | null | undefined, evaluationYear: number): string => {
  if (!startDate) return "-";

  let start: Date;

  // แปลงค่า startDate ให้เป็น Date Object ของ JavaScript
  if (typeof startDate === 'object' && 'toDate' in startDate) {
    // กรณีเป็น Firestore Timestamp
    start = startDate.toDate();
  } else if (typeof startDate === 'string') {
    // กรณีเป็น String "YYYY-MM-DD"
    start = new Date(startDate);
  } else {
    return "-";
  }

  // กำหนดวันสิ้นสุดคือ 31 ธ.ค. ของปีประเมิน
  const end = new Date(evaluationYear, 11, 31); // เดือน 11 = ธันวาคม

  if (start > end) return "0 ปี 0 เดือน";

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  // Logic การยืมเดือน/ปี (เหมือนสูตร DATEDIF)
  if (days < 0) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return `${years} ปี ${months} เดือน`;
};