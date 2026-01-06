# Specifications (ข้อกำหนด)

## Feature: [F-001] Data Import Management (ระบบนำเข้าข้อมูล)
**Status:** Implemented (Basic)

### 1. User Flow
1. **Access:** Admin เข้าสู่หน้า `/admin/import`
2. **Selection:** เลือก Tab ประเภทข้อมูล (Time Attendance / Leaves / Warnings)
3. **Upload:** เลือกไฟล์ Excel/CSV จากเครื่อง
4. **Preview:** ระบบ Parse ไฟล์ด้วย `xlsx`/`csv-parser` และแสดงตัวอย่างข้อมูลในตาราง
5. **Validation:** ตรวจสอบความถูกต้องเบื้องต้น (เช่น Header ต้องตรงตาม Format)
6. **Submit:** กดปุ่ม "Upload" เพื่อบันทึกข้อมูลโควตาลง Firestore (Batch Write)

### 2. Architecture
- **Component:** `src/app/admin/import/page.tsx`
- **Logic:** 
  - Frontend parsing เพื่อลด load server
  - Mapping column ภาษาไทย -> English Property Name (ตาม `src/types/import-data.ts`)

---

## Feature: [F-002] Employee Management (ระบบจัดการข้อมูลพนักงาน)
**Status:** Implemented

### 1. User Flow
1. **View List:** เข้าหน้า `/employees` เห็นรายชื่อพนักงานทั้งหมด
2. **Filtering:** กรองข้อมูลตาม "Department" หรือ "Section"
3. **Status Check:** แสดงสถานะพนักงาน (Active/Inactive)

### 2. Architecture
- **Component:** `src/app/employees/page.tsx`
- **Data Source:** Collection `users` ใน Firestore

---

## Feature: [F-003] Evaluation Engine (ระบบประเมินผล)
**Status:** Implemented (Complex Logic)

### 1. User Flow (Detailed)
1. **Access:** เข้าหน้า `/evaluations`
2. **Selection Context:**
   - เลือก "Section" -> ระบบกรองรายชื่อพนักงาน
   - เลือก "พนักงาน" -> ระบบดึงข้อมูล Profile และ Yearly Stats (สถิติการมาสาย/ลาป่วย)
3. **Auto-Calculation (Real-time):**
   - ทันทีที่เลือกพนักงาน ระบบจะคำนวณ **AI Score** และ **Discipline Score**
   - การคำนวณใช้ข้อมูลจาก Year Stats + สูตรใน `scoring_formulas`
4. **Manual Scoring:**
   - ผู้ประเมินเลื่อนดูหัวข้อ (Criteria) ที่แบ่งตาม Category
   - **UI Interaction:**
     - หัวข้อปกติ: กดปุ่มเลือกคะแนน 1-5 (Circle Button)
     - หัวข้อที่มีตัวช่วย: กดปุ่ม "ตัวช่วยคำนวณ" (Calculator Icon) -> เปิด **Popup**
5. **Popup Interaction (Sub-Criteria):**
   - แสดงรายการย่อย (Sub-items) ของหัวข้อนั้นๆ
   - ผู้ใช้ให้คะแนนรายการย่อย -> ระบบคำนวณค่าเฉลี่ย (Average)
   - กด "ใช้นำคะแนนนี้" -> ค่าเฉลี่ยจะถูกส่งกลับไปเป็นคะแนนของหัวข้อหลัก
6. **Submission:**
   - กดปุ่ม "บันทึกการประเมิน"
   - Confirm Dialog เด้งเตือน
   - บันทึกข้อมูลลง Collection `evaluations`

### 2. Architecture
- **Main Page:** `src/app/evaluations/page.tsx`
- **Config Data:** `src/data/evaluation-criteria.ts`
  - เก็บ Structure ของคำถาม, Tooltip text, และ Popup Sub-items
- **Core Logic:** ฟังก์ชัน `runDisciplineCalculation`
  - Library: `mathjs`
  - Process: 
    1. Load `scoring_formulas` (Firestore)
    2. Load `YearlyStats` (Firestore Subcollection)
    3. Create Math Scope (Context) with Stats + Current Manual Scores
    4. Evaluate Variables & Final Score
- **UI Components:**
  - `InfoTooltip`: แสดงคำอธิบายเมื่อ Hover
  - `Scoring Buttons`: ปุ่มกลม 1-5 เปลี่ยนสีเมื่อ Active
  - `Popup Modal`: Overlay สำหรับประเมินข้อย่อย

---

## Feature: [F-004] Criteria Configuration (Admin)
**Status:** Implemented

### 1. User Flow
1. Admin เข้าหน้า `/admin/criteria`
2. แสดงรายการเกณฑ์ปัจจุบัน
3. CRUD (Create/Read/Update/Delete) เกณฑ์การประเมิน

---

## Feature: [F-005] Scoring Logic Configuration (Admin)
**Status:** Implemented

### 1. User Flow
1. Admin เข้าหน้า `/admin/scoring`
2. จัดการ "Scoring Variables" (ตัวแปรซับซ้อน เช่น `VAR_LeaveScore`)
3. จัดการ "Scoring Formulas" (สูตรสุดท้าย เช่น `DisciplineScore = AI_Score + Head_Score`)
4. ระบบ `EvalPage` จะดึงสูตรเหล่านี้ไปใช้คำนวณ Dynamic
