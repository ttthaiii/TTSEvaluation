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

/**
 * คำนวณปีประเมิน (Evaluation Year)
 * Logic: ถ้าปัจจุบันคือเดือน ม.ค.(0) - มี.ค.(2) ให้ถือว่าเป็นรอบการประเมินของ "ปีที่แล้ว"
 * แต่ถ้าเป็นเดือน เม.ย. ขึ้นไป ให้ถือว่าเป็นรอบของ "ปีปัจจุบัน"
 */
export const getEvaluationYear = (): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 1 = Feb, ...

  // ถ้าอยู่ในช่วง มกรา - มีนา (Quarter 1) ให้ return ปีที่แล้ว
  if (currentMonth <= 2) {
    return currentYear - 1;
  }

  return currentYear;
};

/**
 * สร้าง string สำหรับ Period เช่น "2025-Annual" หรือ "2025-H1"
 */
export const getCurrentPeriod = (): string => {
  const year = getEvaluationYear();
  // คุณสามารถเปลี่ยน Logic ตรงนี้ได้ถ้ามีแบ่ง H1/H2
  // เบื้องต้นให้เป็น Annual (ทั้งปี) ไปก่อนตามโจทย์
  return `${year}-Annual`;
};

export const getRawTenure = (startDate: string | Timestamp | null | undefined, targetDate?: Date): { years: number, months: number, days: number, totalDays: number } => {
  if (!startDate) return { years: 0, months: 0, days: 0, totalDays: 0 };

  let start: Date;
  if (typeof startDate === 'object' && 'toDate' in startDate) {
    start = startDate.toDate();
  } else if (typeof startDate === 'string') {
    start = new Date(startDate);
  } else {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }

  const end = targetDate || new Date();
  const diffTime = end.getTime() - start.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Rough estimate

  // Precise YMD calculation
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    // Get days in previous month
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days, totalDays };
};

export const formatDateToThai = (dateInput: string | Timestamp | null | undefined): string => {
  if (!dateInput) return "-";

  let date: Date;
  if (typeof dateInput === 'object' && 'toDate' in dateInput) {
    date = dateInput.toDate();
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else {
    return "-";
  }

  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};