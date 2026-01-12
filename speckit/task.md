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

### [T-020] Fix Login Hang & Redirect
- **Concept:** แก้ไขปัญหา Login แล้วค้าง และ Dashboard โหลดไม่เสร็จ
- **Principle:** Handle 'unauthenticated' state & Force Full Redirect
- **Implementation Detail:**
  1. Login Page: Use `window.location.href` instead of `router.push`.
  2. Dashboard Hook: Set `loading(false)` when `status === 'unauthenticated'`.
- **Confirm Task:**
  - [x] Login สำเร็จแล้ว Redirect ไป Dashboard ได้
  - [x] Dashboard ไม่ค้างหน้า Loading เมื่อไม่ได้ Login

### [T-021] Fix Session Persistence (Data Not Loading)
- **Concept:** แก้ไขปัญหา Login แล้วหน้า Dashboard ไม่มีข้อมูล และ Navbar แสดงสถานะเหมือนยังไม่ Login
- **Principle:** Server-side Session Passing & Dynamic BaseURL
- **Implementation Detail:**
  1. [x] `layout.tsx`: Fetch `await auth()` and pass to Providers.
  2. [x] `Providers.tsx`: Receive `session` prop.
  3. [x] `auth.ts`: Relax redirect validation.
  4. [x] `auth.ts`: Rename cookie to `__session`.
  5. [x] `Navbar.tsx`: Fix logout redirect 0.0.0.0 issue.
- **Confirm Task:**
  - [ ] Navbar แสดงชื่อผู้ใช้หลัง Login
  - [ ] Dashboard แสดงข้อมูลกราฟและตาราง

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

### [T-008] Enhance UX/UI Theme
- **Concept:** ปรับเปลี่ยน Theme และ Visual Design ให้ดูทันสมัย (Premium & Modern) ลดความหนาหนักของสีเดิม
- **Principle:** Modern Clean UI / Glassmorphism / Soft Shadows
- **Implementation Detail:**
  1. **Global Theme:**
     - Update `globals.css` with new variables (Surface colors, Primary accents).
     - Switch font to 'IBM Plex Sans Thai'.
  2. **Layout & Navbar:**
     - Make Navbar sticky and cleaner (white background + shadow).
  3. **Components:**
     - **Cards:** White bg, rounded-xl, soft shadow.
     - **Buttons:** Modern gradient or outline styles.
     - **Inputs:** Clean border, focus ring.
- **Confirm Task:**
  - [x] หน้าเว็บดูสะอาด เสมือน App สมัยใหม่
  - [x] การใช้งานดูลื่นไหล (Transitions/Animations)

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

### [T-018] Employee Management Enhancements
- **Concept:** ปรับปรุงหน้าจัดการพนักงานให้ค้นหา/แก้ไขข้อมูลได้ง่ายขึ้น
- **Principle:** Comprehensive Admin Dashboard
- **Implementation Detail:**
  1. **Filters & Search:** 
     - Add Text Search (Name/ID).
     - Add Section Filter.
     - Add "Evaluator" Filter (Show only users who have subordinates).
  2. **Employee Edit Modal:**
     - Tab 1: General Info (ReadOnly for now/Base info).
     - Tab 2: Yearly Stats (Editable: Late/Absent/Sick).
     - Tab 3: Credentials (Set custom password).
  3. **Auth Update:** Update `auth.ts` to check custom password if set. And allow login by Custom Username.
- **Confirm Task:**
  - [x] Search & Filter ใช้งานได้จริง
  - [x] แก้ไขข้อมูล Yearly Stats และบันทึกลง Firestore ได้
  - [x] ตั้งรหัสผ่านใหม่และ Login ด้วยรหัสใหม่ได้
  - [ ] ตั้ง Username ใหม่และ Login ได้
  - [x] Links นำทางถูกต้อง

### [T-019] Import System Enhancements
- **Concept:** ปรับปรุงระบบ Import ให้ครบถ้วนและ User-friendly
- **Requirements:**
  1. [ ] **Templates:** เพิ่มปุ่ม Download Template สำหรับทุกหัวข้อ (Attendance, Leave, Warning, Employee Master).
  2. [ ] **Master Data Import:** เพิ่มเมนูสำหรับนำเข้าไฟล์รายชื่อพนักงาน (`employees.csv`).
  3. [ ] **Upsert Logic:** การนำเข้าพนักงานต้องเป็นการ Update ข้อมูลเดิม (ถ้ามี) หรือ Create ใหม่ (ถ้าไม่มี) โดยไม่ลบประวัติเก่า.
- **Confirm Task:**
  - [x] มีปุ่มโหลด Template ครบทุกอัน
  - [x] Import รายชื่อพนักงานได้
  - [x] ข้อมูลเก่าไม่หายเมื่อ Import ซ้ำ

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

### [T-022] Excel Export for Employee List
- **Concept:** ส่งออกข้อมูลพนักงานพร้อมคะแนนและเกรดเป็น Excel
- **Principle:** `xlsx` generation & dynamic grade calculation
- **Implementation Detail:**
  1. Add "Export" button in `EmployeeListPage`.
  2. Implement `handleExportExcel` logic using `xlsx`.
  3. Calculate grade dynamically using `useGradingRules`.
- **Confirm Task:**
  - [x] Export file contains ID, Name, Section, Dept, Score, Grade.
  - [x] Grade calculation matches current rules.


### [T-007] Refactor Evaluation Page Structure
- **Concept:** ปรับโครงสร้าง Code ของหน้า Evaluation ให้แยก Component และ Logic เพื่อความสะอาดและ Maintain ง่าย (Clean Architecture)
- **Principle:** Component Separation / Custom Hook
- **Implementation Detail:**
  1. Extract `EvaluationHeader`, `EmployeeSelector`, `EmployeeInfoCard`, `EmployeeStatsCard`, `EvaluationSection`, `ScoreHelperPopup`
  2. Implement `useEvaluation` hook for logic
  3. Refactor `evaluations/page.tsx` to use new structure
- **Confirm Task:**
  - [x] หน้าเว็บทำงานได้เหมือนเดิม (Functionality Parity)
  - [x] Code สะอาดและอ่านง่ายขึ้น


#### Error Log
- **[T-006-E1-1]** (TypeScript Set Iteration Error)
  - **Date:** 2025-01-06
  - **Status:** Resolved
  - **Cause:** TypeScript config (downlevelIteration) does not support `[...new Set(warnings)]`.
  - **Solution:** Replaced with `.filter()` for deduplication.


---

## Phase 3: Future Enhancement
### [T-003] Dashboard & Reporting
- **Concept:** สร้างหน้า Dashboard สรุปผลภาพรวมรายปี
- **Principle:** Data Visualization / Aggregation Queries

### [T-009] Support Evaluation Score Import
- **Concept:** รองรับการนำเข้าคะแนนประเมินรายหัวข้อ (เช่น AI Score) จาก Excel
- **Principle:** Flexible Mapping via Dynamic Criteria
- **Implementation Detail:**
  1. Update `ImportModal` in `employees/page.tsx` to support "Evaluation Score" type.
  2. implemented "Download Template" feature.
  3. Map imported scores to `evaluations` collection (`scores` map).
- **Confirm Task:**
  - [x] Import Modal มีตัวเลือก "Evaluation Score"
  - [x] สามารถดาวน์โหลด Template ที่มีรหัสพนักงานได้
  - [x] นำเข้าคะแนนและบันทึกลง Firestore ได้ถูกต้อง

### [T-010] Enhance Evaluation Form Display
- **Concept:** Support 'Raw Score' display for imported items (like AI Score) without 1-5 rating buttons.
- **Principle:** `isReadOnly` flag in `QuestionItem`.
- **Implementation Detail:**
  1. Add `isReadOnly` to `QuestionItem` interface (`types/evaluation.ts` & `admin/criteria/page.tsx`).
  2. Update Admin UI to allow toggling Read-Only mode.
  3. Update `EvaluationSection` to render raw score badge instead of buttons if `isReadOnly` is true.
- **Confirm Task:**
  - [x] Admin can set question as "Read Only".
  - [x] Evaluation Page displays imported score correctly without edit buttons.

### [T-011] Conditional Scoring Logic & Total Score Persistence
- **Concept:** Support complex annual scoring formulas that vary by employee level/section, and ensure the calculated Total Score is saved and used.
- **Principle:** Conditional formulas (ternary operators) and named variable mapping.
- **Implementation Detail:**
  1. Inject `Employee` context (`Level`, `Section`, `isHO`, etc.) into the math calculation engine.
  2. Implement `totalScore` persistence in `useEvaluation.ts` by capturing `VAR_TOTAL_SCORE`.
  3. Ensure `disciplineScore` is correctly mapped from a named rule (e.g., `DISCIPLINE_SCORE`).
  4. Fix formula engine to handle bracketed IDs (`[O_1]`) and raw variable names.
- **Confirm Task:**
  - [x] Context variables available in formula engine.
  - [x] `TOTAL_SCORE` is saved to `evaluations` collection.
  - [x] Employee List displays the correct Total Score.
  - [x] `DISCIPLINE_SCORE` calculates correctly.

#### Error Log
- **[T-011-E1-1]** (Calculation Order Issue)
  - **Date:** 2025-01-07
  - **Status:** Resolved
  - **Cause:** Variables are sorted by name length, causing Summations to be calculated before their Components. Components evaluate to 0 in the first pass.
  - **Solution:** Implemented a 2-pass calculation loop. Pass 1 handles foundational values, Pass 2 handles dependent values (Summations).
- **[T-011-E2-1]** (Thai Variable Syntax Error)
  - **Date:** 2025-01-07
  - **Status:** Resolved
  - **Cause:** `math.js` parser threw SyntaxError on `[ThaiName]` variables in formulas.
  - **Solution:** Implemented pre-evaluation substitution: `[ThaiName]` -> `(numericValue)`.
- **[T-011-E3-1]** (Discipline Score Mismatch)
  - **Date:** 2025-01-07
  - **Status:** Resolved
  - **Cause:** System did not recognize Thai variable `รวมคะแนนขาดลามาสาย` as `DISCIPLINE_SCORE`, causing fallback to incorrect default or other score.
  - **Solution:** Explicitly mapped `รวมคะแนนขาดลามาสาย` to `DISCIPLINE_SCORE` logic in `useEvaluation.ts`.
- **[T-011-E4-1]** (Dependency Depth Issue)
  - **Date:** 2025-01-07
  - **Status:** Resolved
  - **Cause:** 2-pass calculation is insufficient for 3-layer dependencies (Discipline -> Behavior -> Total Score). Total Score reads stale Behavior score from Pass 1.
  - **Solution:** Increase calculation passes to 5 to handle deeper dependency chains.
### [T-012] Implement Grade Calculation & Display
- **Concept:** แสดงเกรด (A/B/C) และสีตามช่วงคะแนน Total Score
- **Principle:** Configuration-based Grade Ranges
- **Implementation Detail:**
  1. Create `src/utils/grade-calculation.ts` definition.
  2. Integrate into `EmployeeStatsCard` to show Grade, Label, and dynamic colors.
- **Confirm Task:**
  - [x] Create Grade Utility.
  - [x] UI Displays correct Grade & Color based on Score.

### [T-013] Migrate Grade Config to Firestore
- **Concept:** Move hardcoded Grade logic to Database for flexibility.
- **Principle:** Dynamic Configuration vs Hardcorded Rule.
- **Implementation Detail:**
  1. **Schema:** `config_grading_rules` collection.
  2. **Admin UI:** Add "Grading Criteria" tab in `admin/scoring`.
  3. **Logic:** Refactor `useEvaluation` to fetch rules and pass to `EmployeeStatsCard`.
- **Confirm Task:**
  - [x] Admin UI can Create/Edit/Delete Grade Rules.
  - [x] Evaluation Page reflects dynamic rules.
