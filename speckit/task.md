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

### [T-025] Implement Firebase Security Bridge (Rules)
- **Concept:** เชื่อมต่อ NextAuth กับ Firebase Auth เพื่อล็อค Rule
- **Principle:** Custom Token Exchange
- **Implementation Detail:**
  1. `firebase-admin.ts`: Setup Admin SDK.
  2. `/api/auth/firebase-token`: Endpoint for token minting.
  3. `FirebaseAuthSync.tsx`: Client-side sync.
  4. Update `firestore.rules`.
- **Confirm Task:**
  - [ ] Login แล้วได้ Firebase Token (User ใน Firebase Console Active)
  - [ ] Data โหลดได้ปกติเมื่อเปิด Rule `request.auth != null`

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
  - [x] Code สะอาดและอ่านง่ายขึ้น

### [T-023] Link Dashboard to Evaluation Page
- **Concept:** คลิกชื่อพนักงานใน Dashboard เพื่อไปหน้าประเมินได้ทันที
- **Principle:** URL Query Parameters (`?employeeId=...`)
- **Implementation Detail:**
  1. Update `EmployeeTable` in Dashboard to link name to `/evaluations`.
  2. Update `useEvaluation` hook to read `employeeId` from URL and auto-select.
  - [x] Evaluation Page auto-selects the correct employee.

### [T-024] Replace Web Alerts with Modals
- **Concept:** เปลี่ยน `alert()` / `confirm()` ของ Browser เป็น Custom Modal UI
- **Principle:** React Context + Promise-based Modal
- **Implementation Detail:**
  1. Create `Dialog` Component & `ModalContext`.
  2. Implement `useModal` hook (`showAlert`, `showConfirm`).
  3. Replace native calls in `useEvaluation`, `EmployeeListPage`, `AdminPages`.
- **Confirm Task:**
  - [ ] Alert แสดงเป็น Modal สวยงาม
  - [ ] Confirm แสดงเป็น Modal และ return promise (true/false) ถูกต้อง





#### Error Log
- **[T-006-E1-1]** (TypeScript Set Iteration Error)
  - **Date:** 2025-01-06
  - **Status:** Resolved
  - **Cause:** TypeScript config (downlevelIteration) does not support `[...new Set(warnings)]`.
  - **Solution:** Replaced with `.filter()` for deduplication.

- **[T-043-E1-1]** (Edge Runtime Error with Firebase Admin)
  - **Date:** 2026-01-22
  - **Status:** Resolved
  - **Cause:** `firebase-admin` (Node.js only) was statically imported in `auth.ts` which is used by Middleware (Edge Runtime).
  - **Solution:** Converted `firebase-admin` import in `auth.ts` to Dynamic Import (`await import(...)`) to lazy load it only when needed on Server.

- **[T-043-E2-1]** (Permission Denied in Security Setup)
  - **Date:** 2026-01-22
  - **Status:** Resolved
  - **Cause:** `api/security/setup/route.ts` used Client SDK to write to `system_keys` which is restricted by Firestore Rules.
  - **Solution:** Refactor API route to use Admin SDK (`getAdminDb`) to bypass rules. Verified success.


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
- **[T-009-E1-1]** (Invalid Field Path in Score Import)
  - **Date:** 2026-01-13
  - **Status:** Resolved
  - **Cause:** Firestore dot notation does not support keys with special characters (e.g., `[O]-1`).
  - **Solution:** Switched to using `FieldPath` object for dynamic updates in `batch.update`.
- **[T-009-E2-1]** (Firebase Token 500 Error)
  - **Date:** 2026-01-13
  - **Status:** Resolved
  - **Cause:** `firebase-admin` initialization failed in production because `service-account.json` file is missing.
  - **Solution:** Added support for `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable in `src/lib/firebase-admin.ts`.
- **[T-009-E2-2]** (Persistent 500 Error on Production)
  - **Date:** 2026-01-13
  - **Status:** In Progress
  - **Cause:** Deployment via CLI ignores `.env.local`. Also, "Crash on Startup" prevented error handling.
  - **Solution:** 
    1. Renamed env var to `APP_SERVICE_ACCOUNT_KEY` to avoid reserved prefix.
    2. Refactored `firebase-admin.ts` to **Lazy Loading** pattern to prevent server crash and allow `route.ts` to catch init errors and return them as JSON.
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
### [T-FIX-001] Fix Score Popup Auto-close
- **Concept:** Ensure Score Calculator popup closes immediately after clicking "Use this score".
- **Status:** Done
- **Implementation Detail:**
  1. Verify `onClose` calls in `ScoreHelperPopup`.
  2. Check for event propagation issues.
  3. **Fix:** Added `type="button"` to allow explicit onClick handling without side effects. Added Thai comments.

### [T-026] Default Section Selection
- **Concept:** Auto-select section if evaluator has only one section.
- **Status:** Done
- **Implementation Detail:**
  1. Check `sections` length in `useEvaluation` hook.
  2. If `length === 1`, set `selectedSection` to that value.

### [T-FIX-002] Remove Success Modal from Main Page
- **Concept:** Remove redundant success alert after saving evaluation.
- **Status:** Done
- **Implementation Detail:** Remove `showAlert` in `useEvaluation` default success flow.

### [T-027] Evaluation Draft State
- **Concept:** Allow saving incomplete evaluations as Draft.
- **Status:** Done
- **Implementation Detail:**
  1. Add `status: 'Draft' | 'Completed'` to `EvaluationRecord`.
  2. Implement `validateCompletion` in `useEvaluation`.
  3. Show Draft Modal if incomplete.
  4. Update Dashboard to show (Draft) label style.

### [T-028] Waiting Status in Dashboard
- **Concept:** Show "Waiting" status for unevaluated employees.
- **Status:** Done
- **Implementation Detail:**
  1. Map all employees in Dashboard.
  2. Handle null evaluation as "Waiting".
  3. Style "Waiting" rows as gray/disabled.

### [T-029] Two-Step Exit Confirmation
- **Concept:** Prevent accidental exit with 2-step check.
- **Status:** Done
- **Implementation Detail:**
  1. Trigger on close/change employee.
  2. Step 1: Confirm Exit?
  3. Step 2: Check incompleteness -> Ask to Save Draft.

### [T-030] Add PdNumber Filter & Enhance Search
- **Concept:** เพิ่ม Filter PdNumber และปรับปรุงช่องค้นหาเป็น Autocomplete
- **Implementation Detail:**
  1. Add `pdNumber` to `Employee` type and fetch logic.
  2. Implement `PdNumber` filter in Dashboard.
  3. Enhance Search Box to Autocomplete (Display: "ID Name Surname").
- **Confirm Task:**
  - [x] Filter PdNumber works.
  - [x] Search Autocomplete works.

### [T-031] Chart Drill-Down Support (Section -> PdNumber)
- **Concept:** คลิกกราฟแท่ง Section เพื่อดูรายละเอียดราย PdNumber
- **Implementation Detail:**
  1. Modify `SectionStackChart` to support drill-down state.
  2. Implement grouping logic by `pdNumber`.
  3. Add Back button to reset view.
- **Confirm Task:**
  - [x] Click Section -> Shows PdNumbers.
  - [x] Click Back -> Shows Sections.

### [T-032] Configurable Tenure Eligibility
- **Concept:** กำหนดเกณฑ์อายุงานขั้นต่ำสำหรับผู้ที่จะได้รับการประเมิน
- **Implementation Detail:**
  1. Add `getRawTenure` util.
  2. Implement Admin UI to set Rule (Min Tenure, Unit).
  3. Filter employees in `useEvaluation`.
- **Confirm Task:**
  - [ ] Set Rule (e.g. 1 Year).
  - [ ] Verify New employees are hidden.

### [T-033] Fix Re-evaluation Exit Prompt Bug
- **Concept:** Fix issue where confirming re-evaluation triggers immediate exit prompt.
- **Status:** Done
- **Implementation Detail:**
  1. Refactor `switchEmployee` in `useEvaluation.ts` to delay state update until after confirmation.
  2. Harden `Dialog.tsx` with `stopPropagation` to prevent efficient bubbling.

### [T-034] Fix Page Disabled (Overlay) Issue
- **Concept:** Fix z-index conflict where Portal Backdrop covers Non-Portal Drawer.
- **Status:** Done
- **Implementation Detail:**
  1. Portal the Drawer Content alongside the Backdrop.
  2. Lower Backdrop z-index (40) and raise Drawer Content (50).
  3. Clean up Dashboard spacer styles.
### [T-035] System Refactoring Phase 1 (Core Logic)
- **Concept:** ลดความซ้ำซ้อนของ Code Filter และ History Fetching ระหว่าง Dashboard และ Employee List
- **Principle:** DRY (Don't Repeat Yourself) via Custom Hooks
- **Implementation Detail:**
  1. Create `useEmployeeFilter` hook to centralize section/grade/search logic.
  2. Create `useHistoricalData` hook to centralize history fetching logic.
  3. Refactor `dashboard/page.tsx` and `employees/page.tsx` to use these hooks.
- **Confirm Task:**
  - [x] หน้าเว็บใช้งานได้ปกติเหมือนเดิม (Regression Test)
  - [x] Code ลดความซ้ำซ้อนและอ่านง่ายขึ้น
### [T-036] System Refactoring Phase 2 (Maintainability)
- **Concept:** จัดระเบียบ Hardcoded Values (สี, ข้อความ) ให้อยู่ในที่เดียว
- **Principle:** Centralized Configuration (Constants)
- **Implementation Detail:**
  1. Create `src/constants/colors.ts` for grade/chart colors.
  2. Create `src/constants/text.ts` for recurring UI text.
  3. Refactor components to import from constants.
- **Confirm Task:**
  - [x] Code ไม่มี Magic String/Color code กระจายอยู่
  - [x] การเปลี่ยนสีธีมทำได้ง่ายในไฟล์เดียว

### [T-037] System Refactoring Phase 3 (Performance)
- **Concept:** ลดการดึงข้อมูลซ้ำซ้อนเมื่อเปลี่ยนหน้าระหว่าง Dashboard และ Employee List
- **Principle:** Client-side Caching (Context or Module-level)
- **Implementation Detail:**
  1. [x] Implement `EvaluationContext` (Global State).
  2. [x] Modify `useEvaluation` to consume Context.
  3. [x] Validate Data Freshness (Instant Switch).
- **Confirm Task:**
  - [x] สลับหน้าระหว่าง Dashboard/List แล้วโหลดทันที (ไม่ต้องรอ Spinner)
  - [x] มีปุ่ม Force Refresh ข้อมูลได้ (via explicit logic or Context internal)

### [T-038] Dashboard Refinements (Post-Launch)
- **Concept:** ปรับแก้หน้า Dashboard ตาม Feedback
- **Status:** Done
- **Items:**
  1. [x] **Filter Executives:** ไม่นับรวมผู้บริหาร (คนที่ไม่มี evaluatorId) ในจำนวนพนักงานทั้งหมด
  2.- [x] Resize Donut Chart (Chart 1)

### [T-041] Evaluation UI & Modal Refinements (Re-fixing)
- **Concept:** ปรับปรุงตำแหน่งของ Modal ประวัติ และตัวช่วยคำนวณให้ถูกต้อง (ใช้ Portal) พร้อมแก้ข้อมูลเกรด
- **Status:** Done
- **Sub-tasks:**
  - [x] **History Modal:** แก้ไขการจัดวางให้กึ่งกลางหน้าจอ (ใช้ Portal เพื่อป้องกันการตกขอบ)
  - [x] **Score Helper:** ย้ายไปแสดงเป็น Modal แบบ Floating กึ่งกลางจอจริงๆ (ใช้ Portal)
  - [x] **History Data:** แก้ไขให้แสดงเกรดในปี 2025 (คำนวณเกรดอัตโนมัติหากไม่มีใน DB)
  - [x] **Visual Layout:** ตรวจสอบ Responsive สำหรับหน้าจอมือถือขนาดเล็ก

### [T-042] Responsive Login Page
- **Concept:** ปรับปรุงหน้า Login ให้แสดงผลสวยงามบนทุกอุปกรณ์ (Mobile/Tablet/Desktop)
- **Status:** [x] Done
- **Implementation Detail:**
  1. **Mobile:** ลด Padding, เพิ่ม margin ด้านข้างไม่ให้ชิดขอบ, ปรับขนาด Font.
  2. **Tablet/Desktop:** จัดให้อยู่กึ่งกลางพร้อม Shadow สวยงาม.
  3. **Visuals:** ตรวจสอบ Gradient และ Element scaling.
### [T-039] Mobile & UX Refinements
- **Concept:** ปรับปรุง UX/UI สำหรับการใช้งานบนมือถือและแก้ปัญหาความลื่นไหลของ Flow
- **Status:** Done
- **Sub-tasks:**
  - [x] **Mobile Navigation:** สร้าง Bottom Navigation Bar สำหรับมือถือ
  - [x] **Filter Bar Layout:** ปรับจัดวางปุ่ม Reset/Compare ให้ประหยัดพื้นที่
  - [x] **Card View:** แสดงข้อมูล Employee เป็น Card แทน Table ในหน้าจอเล็ก
  - [x] **Evaluation Flow:** เปลี่ยนจาก Drawer เป็น Redirect ไปหน้าประเมินเต็มจอ
  - [x] **Evaluation UI:** ปุ่มคะแนนเรียงแถวเดียว, ปรับปุ่มตัวช่วย, เปลี่ยนตัวช่วยเป็น Modal
### [T-043] Responsive Employee Page & Enhanced Export
- **Concept:** ปรับปรุงหน้าพนักงานให้แสดงผลเป็น Card บนมือถือ และเพิ่มข้อมูลปีก่อนหน้าใน Excel
- **Status:** [x] Done
- **Implementation Detail:**
  1. **Responsive UI:** สร้าง Card View สำหรับมือถือ (hidden md:block for Table, block md:hidden for Cards).
  2. **Excel Export:** 
     - เมื่อกด Export ให้ Fetch ข้อมูลปี `currentYear - 1`
     - เพิ่มคอลัมน์ `Score (Year-1)` และ `Grade (Year-1)`
- **Confirm Task:**
  - [x] Mobile View แสดงเป็น Card สวยงาม
  - [x] Excel มีข้อมูลปีย้อนหลัง 1 ปี (Score/Grade) ถูกต้อง
