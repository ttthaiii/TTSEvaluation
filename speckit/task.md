# Task Plan (แผนงาน)

## Phase 1: Feature Implementation (Completed)
### [T-000] Initial Core Development
- **Concept:** พัฒนาระบบพื้นฐาน (MVP)
- **Status:** [x] Done

## Phase 2: Optimization & Verification (Current)

### [T-001] Verify & Optimize Data Import
- **Concept (เป้าหมาย):** ตรวจสอบระบบนำเข้าข้อมูลให้รองรับไฟล์ขนาดใหญ่และภาษาไทย
- **Principle:** Batch Processing, Strong Validation
- **Implementation Detail:**
  1. Review Code `ImportPage` (Found Issue: Header parsing needs robust mapping)
  2. Implement `csv-parser` / `xlsx` with UTF-8 support
  3. Validate Data Types against `LateAbsentRow` / `LeaveRow`
- **Confirm Task:** 
  - [ ] Import Excel/CSV ภาษาไทยได้ 100%
  - [ ] ข้อมูลลง Firestore ครบถ้วน (Check Collections: `users`, `evaluations`)
- **SubTasks:**
  - [ ] Unit Test Parser logic

### [T-002] Verify Evaluation Calculation logic
- **Concept:** ตรวจสอบความถูกต้องของการคำนวณคะแนน (Scoring Engine)
- **Principle:** Usage of `mathjs` context
- **Implementation Detail:**
  1. Audit `runDisciplineCalculation` function in `page.tsx`
  2. Verify Tooltip & Popup Data flow from `evaluation-criteria.ts`
- **Confirm Task:**
  - [ ] สูตรคำนวณซับซ้อน (Variables -> Final Score) ทำงานถูกต้อง
- [ ] Popup Calculator ส่งค่าเฉลี่ยกลับมาถูกต้อง

### [T-004] Migrate to Dynamic Criteria (Phase 1)
- **Concept:** เปลี่ยนการดึงหัวข้อการประเมินจาก Static File เป็น Firestore
- **Principle:** Fetch `evaluation_categories` from DB
- **Implementation Detail:**
  1. [x] Refactor `evaluations/page.tsx` to fetch categories/questions from Firestore
  2. [x] Update Filtering Logic (Level/Section) to work with dynamic data
  3. [x] Ensure Popup & Calculation Logic works with new data structure
- **Confirm Task:**
  - [x] UI แสดงหัวข้อครบตาม DB
  - [x] การกรอง Monthly Staff / HO Section ทำงานถูกต้อง
  - [x] การคำนวณคะแนนและ Popup ใช้งานได้

### [T-005] Refactor Admin Navigation
- **Concept:** ปรับปรุง Menu Bar ให้รวมกลุ่มเมนู Admin และใช้ชื่อที่สื่อความหมายชัดเจน
- **Principle:** Dropdown Menu UI (Tailwind CSS)
- **Implementation Detail:**
  1. Group links (`/admin/criteria`, `/admin/scoring`) under "⚙️ ผู้ดูแลระบบ (Admin)"
  2. Create Hover Dropdown component in `layout.tsx`
  3. Rename sub-menus for clarity:
     - "จัดการแบบประเมิน (Form Config)"
     - "ตั้งค่าสูตรคำนวณ (Scoring Rules)"
- **Confirm Task:**
  - [x] Dropdown ใช้งานได้ (Hover/Click)
  - [x] Links นำทางถูกต้อง

### [T-006] Scoring Safety Mechanism
- **Concept:** ป้องกัน Error จากสูตรคำนวณเมื่อหัวข้อประเมินเปลี่ยน (Scoring Integrity)
- **Principle:** Dynamic Validation
- **Implementation Detail:**
  1. Refactor `admin/scoring/page.tsx` to use Dynamic Categories (replacing static)
  2. Implement `validateScoringIntegrity` in `evaluations`
  3. Show Warning Banner if formula is broken
- **Confirm Task:**
  - [x] Admin Scoring ใช้ข้อมูลจริงจาก DB
  - [x] หน้า Eval แจ้งเตือนเมื่อสูตรเสีย
  - [x] หน้า Criteria แจ้งเตือนห้ามลบหากถูกใช้ในสูตร

---

## Phase 3: Future Enhancement
### [T-003] Dashboard & Reporting
- **Concept:** สร้างหน้า Dashboard สรุปผลภาพรวมรายปี
- **Principle:** Data Visualization / Aggregation Queries
